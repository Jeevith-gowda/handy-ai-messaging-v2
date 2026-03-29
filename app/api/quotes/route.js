import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Quote from '@/models/Quote';
import Project from '@/models/Project';
import { requireAuth, getSession } from '@/lib/auth';

export async function GET(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const projectId = searchParams.get('projectId');

  let query = {};
  if (projectId) query.projectId = projectId;

  if (session.user.role === 'handyman') {
    query.submittedBy = session.user.id;
    if (projectId) {
      const project = await Project.findById(projectId).select('handymanId');
      if (!project || project.handymanId?.toString() !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      // Project detail: show full quote history (draft through customer-facing statuses).
      query.status = status
        ? status
        : { $in: ['handyman_draft', 'sent', 'accepted', 'revised', 'rejected'] };
    } else {
      query.status = status || 'handyman_draft';
    }
  } else if (status) {
    query.status = status;
  }

  if (session.user.role === 'customer') {
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required for customers' }, { status: 400 });
    }
    const project = await Project.findById(projectId).select('customerId');
    if (!project || project.customerId?.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    query.status = { $in: ['sent', 'accepted'] };
  }

  const quotes = await Quote.find(query)
    .populate('projectId', 'title status serviceType projectNumber')
    .populate('customerId', 'name phone')
    .populate('submittedBy', 'name role')
    .sort({ createdAt: -1 });

  return NextResponse.json(quotes);
}

export async function POST(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  await dbConnect();

  try {
    const body = await request.json();
    body.submittedBy = session.user.id;

    if (session.user.role === 'handyman') {
      const project = await Project.findById(body.projectId);
      if (!project || project.handymanId?.toString() !== session.user.id) {
        return NextResponse.json({ error: 'You can only submit quotes for your assigned projects' }, { status: 403 });
      }
      if (project.status !== 'inquiry') {
        return NextResponse.json(
          { error: 'You can only submit a quote while the project is in inquiry. If you already submitted, wait for admin review.' },
          { status: 400 }
        );
      }
      body.status = 'handyman_draft';
    }

    const quote = await Quote.create(body);

    if (session.user.role === 'handyman' && body.projectId) {
      await Project.findByIdAndUpdate(body.projectId, {
        $set: { status: 'quoted_by_handyman' },
        $push: {
          timeline: {
            date: new Date(),
            event: `Handyman ${session.user.name} submitted a quote for admin review: $${body.totalAmount}`,
            by: session.user.name,
          },
        },
      });
    }

    if (body.status === 'sent' && body.projectId) {
      const project = await Project.findById(body.projectId).select('status');
      const update = { pendingCustomerAcceptance: true };
      if (project?.status === 'inquiry' || project?.status === 'quoted_by_handyman') {
        update.status = 'pending_customer_approval';
      }
      await Project.findByIdAndUpdate(body.projectId, { $set: update });
    }
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
