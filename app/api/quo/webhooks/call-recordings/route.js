import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CallRecording from '@/models/CallRecording';

export async function POST(request) {
  try {
    await dbConnect();
    const payload = await request.json();
    const call = payload.data?.object;
    if (!call || !call.id) return NextResponse.json({ ok: true });

    console.log(`[Webhook] call.recording.completed: ${call.id}`);

    if (call.media && call.media.length > 0) {
      const recording = call.media[0];
      await CallRecording.findOneAndUpdate(
        { quoCallId: call.id },
        {
          quoCallId: call.id,
          conversationId: call.conversationId || null,
          phoneNumberId: call.phoneNumberId || null,
          recordingUrl: recording.url,
          recordingType: recording.type,
          recordingDuration: recording.duration || null,
          quoCreatedAt: call.createdAt,
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Recording error:', err);
    return NextResponse.json({ ok: true });
  }
}
