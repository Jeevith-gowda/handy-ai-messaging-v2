import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Project from '@/models/Project';
import { requireAuth } from '@/lib/auth';

export async function GET(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const { id } = context.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const projects = await Project.find({ customerId: customer._id })
      .populate('handymanId', 'name phone')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ ...customer.toObject(), projects });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const { id } = context.params;
    const body = await request.json();
    const customer = await Customer.findByIdAndUpdate(id, body, { new: true });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
