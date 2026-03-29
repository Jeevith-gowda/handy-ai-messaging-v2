import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Customer from '@/models/Customer';
import { requireAdmin } from '@/lib/auth';

/**
 * GET — List users for admin UI. Query: role=handyman | customer
 * Handymen are User documents; customers are Customer documents (separate collection).
 */
export async function GET(request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  if (role !== 'handyman' && role !== 'customer') {
    return NextResponse.json(
      { error: 'Query param "role" must be "handyman" or "customer"' },
      { status: 400 }
    );
  }

  await dbConnect();

  if (role === 'handyman') {
    const users = await User.find({ role: 'handyman' }).select('-password').sort({ name: 1 }).lean();
    return NextResponse.json(users);
  }

  const customers = await Customer.find({}).select('-password').sort({ name: 1 }).lean();
  return NextResponse.json(customers);
}

/**
 * POST — Create handyman (User) or customer (Customer). Admin only.
 * Passwords are hashed by User / Customer schema pre-save hooks.
 */
export async function POST(request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const role = body.role;
  if (role !== 'handyman' && role !== 'customer') {
    return NextResponse.json({ error: 'role must be "handyman" or "customer"' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const phone = (body.phone || '').trim();
  const password = body.password;

  if (!name) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }
  if (!password || String(password).length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  await dbConnect();

  if (role === 'handyman') {
    try {
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
      return NextResponse.json(obj, { status: 201 });
    } catch (error) {
      if (error.code === 11000) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message || 'Failed to create handyman' }, { status: 500 });
    }
  }

  try {
    const customer = await Customer.create({
      name,
      email: email || undefined,
      phone,
      password: String(password),
    });

    const obj = customer.toObject();
    delete obj.password;
    return NextResponse.json(obj, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create customer' }, { status: 500 });
  }
}
