import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Quote from '@/models/Quote';
import { requireAuth } from '@/lib/auth';

export async function PUT(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const { id } = context.params;
    const body = await request.json();
    const quote = await Quote.findByIdAndUpdate(id, body, { new: true })
      .populate('projectId', 'title status')
      .populate('customerId', 'name phone');

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
