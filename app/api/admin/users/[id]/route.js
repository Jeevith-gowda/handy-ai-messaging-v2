import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Customer from '@/models/Customer';
import { requireAdmin } from '@/lib/auth';

function trimOrUndef(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

/**
 * PATCH — Update a handyman (User) or customer (Customer) by id.
 * Password: optional; min 8 chars when provided. Hashed via model pre-save (User) or Customer pre-save.
 */
export async function PATCH(request, context) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = context.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById(id);
  if (user) {
    if (user.role !== 'handyman') {
      return NextResponse.json({ error: 'Only handyman accounts can be updated here' }, { status: 403 });
    }

    const name = trimOrUndef(body.name);
    const emailRaw = trimOrUndef(body.email);
    const phone = body.phone !== undefined ? trimOrUndef(body.phone) : undefined;

    if (name) user.name = name;
    if (emailRaw) {
      const email = emailRaw.toLowerCase();
      const taken = await User.findOne({ email, _id: { $ne: user._id } });
      if (taken) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      user.email = email;
    }
    if (phone !== undefined) user.phone = phone;

    const pwd = body.password;
    if (pwd !== undefined && pwd !== null && String(pwd).length > 0) {
      if (String(pwd).length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      user.password = String(pwd);
    }

    try {
      await user.save();
    } catch (e) {
      if (e.code === 11000) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      return NextResponse.json({ error: e.message || 'Update failed' }, { status: 500 });
    }

    const out = user.toObject();
    delete out.password;
    return NextResponse.json(out);
  }

  const customer = await Customer.findById(id);
  if (customer) {
    if (trimOrUndef(body.name) !== undefined) {
      customer.name = trimOrUndef(body.name) || 'Unknown';
    }
    if (body.email !== undefined) {
      customer.email = trimOrUndef(body.email);
    }
    if (body.phone !== undefined) {
      const p = String(body.phone || '').trim();
      if (!p) {
        return NextResponse.json({ error: 'Phone is required for customers' }, { status: 400 });
      }
      customer.phone = p;
    }

    const pwd = body.password;
    if (pwd !== undefined && pwd !== null && String(pwd).length > 0) {
      if (String(pwd).length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      customer.password = String(pwd);
    }

    try {
      await customer.save();
    } catch (e) {
      if (e.code === 11000) {
        return NextResponse.json({ error: 'Phone number already in use' }, { status: 400 });
      }
      return NextResponse.json({ error: e.message || 'Update failed' }, { status: 500 });
    }

    const out = customer.toObject();
    delete out.password;
    return NextResponse.json(out);
  }

  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}

export async function DELETE(request, context) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = context.params;

  await dbConnect();

  const user = await User.findById(id);
  if (user) {
    if (user.role !== 'handyman') {
      return NextResponse.json({ error: 'Only handyman accounts can be deleted here' }, { status: 403 });
    }
    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  }

  const customer = await Customer.findById(id);
  if (customer) {
    await Customer.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}
