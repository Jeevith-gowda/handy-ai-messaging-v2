import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CallRecording from '@/models/CallRecording';

export async function POST(request) {
  try {
    await dbConnect();
    const payload = await request.json();
    const call = payload.data?.object;
    if (!call || !call.id) return NextResponse.json({ ok: true });

    console.log(`[Webhook] ${payload.type}: ${call.id}`);

    if (call.voicemail) {
      await CallRecording.findOneAndUpdate(
        { quoCallId: call.id },
        {
          quoCallId: call.id,
          conversationId: call.conversationId || null,
          phoneNumberId: call.phoneNumberId || null,
          voicemailUrl: call.voicemail.url,
          voicemailType: call.voicemail.type,
          voicemailDuration: call.voicemail.duration,
          quoCreatedAt: call.createdAt,
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Call error:', err);
    return NextResponse.json({ ok: true });
  }
}
