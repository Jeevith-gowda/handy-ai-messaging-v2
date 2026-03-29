import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import Customer from '@/models/Customer';
import { normalizePhone } from '@/lib/openphone';

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    await dbConnect();

    // Aggregates unread inbound messages grouped by customer ID
    // direction: 'inbound' ignores outbound/staff messages
    const unreadCounts = await Message.aggregate([
      { $match: { isRead: false, direction: 'inbound' } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } }
    ]);

    if (!unreadCounts.length) {
      return NextResponse.json({});
    }

    const customerIds = unreadCounts.map(u => u._id);
    const customers = await Customer.find({ _id: { $in: customerIds } }).select('_id phone');

    // Create a map bridging phone numbers to their unread tally
    const resultMap = {};
    for (const group of unreadCounts) {
      const cust = customers.find(c => String(c._id) === String(group._id));
      if (cust && cust.phone) {
        // Enforce the same phone normalization style so the frontend UI matches it correctly
        const standardizedPhone = normalizePhone(cust.phone);
        resultMap[standardizedPhone] = group.count;
      }
    }

    return NextResponse.json(resultMap);
  } catch (err) {
    console.error('Failed to get unread counts:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: 'Missing phone' }, { status: 400 });

    const normalized = normalizePhone(phone);

    await dbConnect();
    const customer = await Customer.findOne({ phone: normalized });
    if (!customer) {
      return NextResponse.json({ success: true, note: 'Customer not found' });
    }

    await Message.updateMany(
      { customerId: customer._id, isRead: false, direction: 'inbound' },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to mark read:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
