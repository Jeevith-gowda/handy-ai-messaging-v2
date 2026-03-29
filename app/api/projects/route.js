import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Quote from '@/models/Quote';
import Customer from '@/models/Customer';
import { requireAuth, getSession } from '@/lib/auth';

export async function GET(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const handymanId = searchParams.get('handymanId');
  const customerId = searchParams.get('customerId');

  let query = {};
  if (session.user.role === 'customer') {
    query.customerId = session.user.id;
  } else {
    if (status) query.status = status;
    if (handymanId) {
      query.handymanId = handymanId;
      if (status && status !== 'customer_paid') query.status = status;
    }
    if (customerId) query.customerId = customerId;
  }

  const projects = await Project.find(query)
    .populate('customerId', 'name phone address')
    .populate('handymanId', 'name phone skills availability')
    .sort({ updatedAt: -1 });

  if (session.user.role === 'customer' && projects.length > 0) {
    const projectIds = projects.map((p) => p._id);
    const sentQuoteCounts = await Quote.aggregate([
      { $match: { projectId: { $in: projectIds }, status: { $in: ['sent', 'accepted'] } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]);
    const countByProject = Object.fromEntries(sentQuoteCounts.map((r) => [r._id.toString(), r.count]));

    const projectsWithFlag = projects.map((p) => {
      const pid = p._id.toString();
      const sentQuoteCount = countByProject[pid] || 0;
      const hasMultipleQuotes = sentQuoteCount > 1;
      const hasAdditionalCosts = !!p.additionalCostsSentToCustomerAt;
      const needsAcceptance =
        p.pendingCustomerAcceptance === true &&
        ['pending_customer_approval', 'active', 'scheduled', 'in_progress'].includes(p.status);

      let showRevisedQuote = false;
      let showAdditionalCost = false;
      if (needsAcceptance) {
        if (hasAdditionalCosts) {
          showAdditionalCost = true;
        } else if (hasMultipleQuotes) {
          showRevisedQuote = true;
        }
      }

      return {
        ...p.toObject(),
        revisedQuotePending: showRevisedQuote,
        additionalCostPending: showAdditionalCost,
      };
    });
    return NextResponse.json(projectsWithFlag);
  }

  if (
    session.user.role === 'handyman' &&
    handymanId === session.user.id &&
    projects.length > 0
  ) {
    const projectIds = projects.map((p) => p._id);
    const drafts = await Quote.find({
      projectId: { $in: projectIds },
      status: 'handyman_draft',
      submittedBy: session.user.id,
    }).select('projectId');
    const draftSet = new Set(drafts.map((d) => String(d.projectId)));
    const projectsWithDraft = projects.map((p) => ({
      ...p.toObject(),
      hasHandymanDraftPending: draftSet.has(String(p._id)),
    }));
    return NextResponse.json(projectsWithDraft);
  }

  return NextResponse.json(projects);
}

export async function POST(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  if (session.user.role === 'customer') {
    return NextResponse.json({ error: 'Customers cannot create projects' }, { status: 403 });
  }

  await dbConnect();

  try {
    const body = await request.json();

    const lastProject = await Project.findOne({ projectNumber: { $exists: true } })
      .sort({ projectNumber: -1 })
      .select('projectNumber');

    let nextNum = 1;
    if (lastProject?.projectNumber) {
      const match = lastProject.projectNumber.match(/HIO-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    body.projectNumber = `HIO-${String(nextNum).padStart(4, '0')}`;

    body.timeline = [
      {
        date: new Date(),
        event: 'Project created',
        by: 'system',
      },
    ];

    const project = await Project.create(body);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
