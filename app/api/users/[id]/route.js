import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAuth, getSession } from '@/lib/auth';

export async function GET(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  const { id } = context.params;

  if (session.user.role === 'handyman' && session.user.id !== id) {
    return NextResponse.json({ error: 'You can only view your own profile' }, { status: 403 });
  }
  if (session.user.role !== 'admin' && session.user.role !== 'handyman') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  await dbConnect();
  const user = await User.findById(id).select('-password');
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  const { id } = context.params;

  if (session.user.role === 'handyman' && session.user.id !== id) {
    return NextResponse.json({ error: 'You can only update your own profile' }, { status: 403 });
  }

  await dbConnect();

  try {
    const body = await request.json();
    delete body.password;
    delete body.role;

    const user = await User.findByIdAndUpdate(id, body, { new: true }).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
