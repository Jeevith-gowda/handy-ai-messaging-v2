import { NextResponse } from 'next/server';
import { cleanupWebhookMedia } from '@/lib/webhookMediaCleanup';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const summary = await cleanupWebhookMedia({
      activeConversationIds: body?.activeConversationIds || [],
      conversations: body?.conversations || [],
    });

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
