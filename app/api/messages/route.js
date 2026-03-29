import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import Customer from '@/models/Customer';
import Project from '@/models/Project';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');

  let query = {};
  if (customerId) query.customerId = customerId;
  if (projectId) query.projectId = projectId;
  if (status) query.status = status;

  const messages = await Message.find(query)
    .populate('customerId', 'name phone')
    .populate('projectId', 'title status serviceType')
    .populate('handymanId', 'name')
    .sort({ createdAt: -1 });

  return NextResponse.json(messages);
}

export async function POST(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const body = await request.json();
    const message = await Message.create(body);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
