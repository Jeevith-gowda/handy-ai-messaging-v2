import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';

export async function POST(request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  await dbConnect();

  try {
    const body = await request.json();
    const { name, email, password, role, phone, skills, hourlyRate } = body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'handyman',
      phone,
      skills,
      hourlyRate,
    });

    return NextResponse.json(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
