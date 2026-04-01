import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import DeletedConversation from '@/models/DeletedConversation';
import { verifyWebhookSignature } from '@/lib/webhook-verify';

export async function POST(request) {
  try {
    await dbConnect();

    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    const SIGNING_SECRET = process.env.OPENPHONE_WEBHOOK_SECRET;
    if (SIGNING_SECRET && SIGNING_SECRET !== 'user-will-fill-this') {
      const signature = request.headers.get('openphone-signature');
      if (!verifyWebhookSignature(SIGNING_SECRET, signature, rawBody)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const type = String(payload?.type || '').toLowerCase();
    const conversation = payload?.data?.object;
    const conversationId = conversation?.id || payload?.data?.conversationId;

    if (!conversationId) {
      return NextResponse.json({ ok: true });
    }

    if (type.includes('conversation.deleted') || conversation?.deletedAt) {
      await DeletedConversation.findOneAndUpdate(
        { conversationId: String(conversationId) },
        {
          conversationId: String(conversationId),
          deletedAt: conversation?.deletedAt ? new Date(conversation.deletedAt) : new Date(),
          source: 'webhook',
          rawPayload: payload,
        },
        { upsert: true, new: true },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Conversation processing error:', err);
    return NextResponse.json({ ok: true });
  }
}
