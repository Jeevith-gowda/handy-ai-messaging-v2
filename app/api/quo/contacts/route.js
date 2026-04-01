import { quoFetch } from '@/lib/quo-fetch';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams(searchParams);
    const rawMax = parseInt(params.get('maxResults') || '50', 10);
    const clampedMax = Number.isNaN(rawMax) ? 50 : Math.min(50, Math.max(1, rawMax));
    params.set('maxResults', String(clampedMax));
    const data = await quoFetch(`/contacts?${params}`);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
