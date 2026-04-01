import { quoFetch } from '@/lib/quo-fetch';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await quoFetch('/phone-numbers');
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
