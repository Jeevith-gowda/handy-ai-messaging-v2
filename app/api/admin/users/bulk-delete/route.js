import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Customer from '@/models/Customer';
import { requireAdmin } from '@/lib/auth';

export async function POST(request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ids, role } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No IDs provided for bulk deletion' }, { status: 400 });
  }

  await dbConnect();

  try {
    if (role === 'handyman') {
      await User.deleteMany({ _id: { $in: ids }, role: 'handyman' });
    } else {
      await Customer.deleteMany({ _id: { $in: ids } });
    }
    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Bulk delete failed' }, { status: 500 });
  }
}
