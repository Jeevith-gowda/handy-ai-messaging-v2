import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WebhookMessage from '@/models/WebhookMessage';
import { verifyWebhookSignature } from '@/lib/webhook-verify';

export async function POST(request) {
  try {
    await dbConnect();
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // Verify signature (skip if secret not set yet)
    const SIGNING_SECRET = process.env.OPENPHONE_WEBHOOK_SECRET;
    if (SIGNING_SECRET && SIGNING_SECRET !== 'user-will-fill-this') {
      const signature = request.headers.get('openphone-signature');
      if (!verifyWebhookSignature(SIGNING_SECRET, signature, rawBody)) {
        console.warn('[Webhook] Signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const msg = payload.data?.object;
    if (!msg || !msg.id) return NextResponse.json({ ok: true });

    console.log(`[Webhook] ${payload.type}: ${msg.id} | Media: ${msg.media?.length || 0} attachments`);

    const toNumber = Array.isArray(msg.to) ? msg.to[0] : msg.to;

    // Upsert message into MongoDB
    await WebhookMessage.findOneAndUpdate(
      { quoMessageId: msg.id },
      {
        quoMessageId: msg.id,
        conversationId: msg.conversationId || null,
        phoneNumberId: msg.phoneNumberId || null,
        fromNumber: msg.from || '',
        toNumber: toNumber || '',
        direction: msg.direction || 'incoming',
        body: msg.body || msg.text || '',
        status: msg.status || '',
        media: (msg.media || []).map(m => ({ url: m.url, type: m.type })),
        userId: msg.userId || null,
        quoCreatedAt: msg.createdAt || new Date(),
        rawPayload: payload,
      },
      { upsert: true, new: true }
    );

    if (msg.media?.length > 0) {
      msg.media.forEach(m => {
        console.log(`  -> Stored media: ${m.type} - ${m.url.substring(0, 80)}...`);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Message processing error:', err);
    return NextResponse.json({ ok: true }); // Always 200 to prevent Quo retries
  }
}
