import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const webhookSecret = process.env.QUO_WEBHOOK_SECRET;
    if (webhookSecret && webhookSecret !== 'user-will-fill-this') {
      const signature = request.headers.get('x-openphone-signature') || request.headers.get('x-quo-signature');
      if (signature !== webhookSecret) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = await request.json();
    const event = payload?.event;
    const data = payload?.data;

    if (!event || !data) {
      return NextResponse.json({ error: 'Missing event or data' }, { status: 400 });
    }

    if (event === 'message.received') {
      const body = data.body ?? data.text ?? '';
      const from = data.from ?? data.phoneNumber ?? '';
      const conversationId = data.conversationId;
      const messageId = data.id;

      if (!body && !from) {
        return NextResponse.json({ error: 'Missing body or from' }, { status: 400 });
      }

      // Webhook acknowledged. Client polls for new messages — no storage needed.
      // Log for debugging if needed.
      if (process.env.NODE_ENV === 'development') {
        console.log('[Quo webhook] message.received', { from, conversationId, messageId, bodyPreview: body?.slice(0, 50) });
      }
    }

    if (event === 'message.delivered') {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Quo webhook] message.delivered', data?.id);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Quo webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
