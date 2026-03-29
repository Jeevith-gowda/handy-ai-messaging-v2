import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  let query = {};
  if (search) {
    query = { name: { $regex: search, $options: 'i' } };
  }

  const customers = await Customer.find(query).sort({ updatedAt: -1 });
  return NextResponse.json(customers);
}

export async function POST(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const body = await request.json();
    const customer = await Customer.create(body);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
