import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Message from '@/models/Message';
import User from '@/models/User';
import Project from '@/models/Project';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const modelName = searchParams.get('model');

  if (!modelName) {
    return NextResponse.json({ error: 'Model query parameter required' }, { status: 400 });
  }

  await dbConnect();

  try {
    let data = [];
    if (modelName === 'Customers') {
      data = await Customer.find().sort({ createdAt: -1 }).limit(50).lean();
    } else if (modelName === 'Messages') {
      data = await Message.find().sort({ createdAt: -1 }).limit(50).lean();
    } else if (modelName === 'Handymen') {
      data = await User.find({ role: 'handyman' }).sort({ createdAt: -1 }).limit(50).lean();
    } else if (modelName === 'Projects') {
      data = await Project.find().sort({ createdAt: -1 }).limit(50).lean();
    } else {
      return NextResponse.json({ error: 'Unknown model requested' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Database query failed' }, { status: 500 });
  }
}
