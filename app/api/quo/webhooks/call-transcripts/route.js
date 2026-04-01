import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log(`[Webhook] call.transcript.completed: ${payload.data?.object?.callId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: true });
  }
}
