import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';

/**
 * POST — Create a new handyman user (admin only).
 * Password is hashed by User schema pre-save hook.
 */
export async function POST(request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  await dbConnect();

  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim() || undefined;
    const password = body.password;

    if (!name) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'Temporary password must be at least 8 characters' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const user = await User.create({
      name,
      email,
      password: String(password),
      role: 'handyman',
      phone,
    });

    const obj = user.toObject();
    delete obj.password;

    return NextResponse.json(
      {
        ...obj,
        _id: user._id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to create handyman' }, { status: 500 });
  }
}
