import { quoFetch } from '@/lib/quo-fetch';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { callId } = await params;
    const data = await quoFetch(`/call-voicemails/${callId}`);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
