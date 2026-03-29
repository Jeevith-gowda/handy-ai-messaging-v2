import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import ProjectChat from '@/models/ProjectChat';
import { requireAuth, getSession } from '@/lib/auth';

export async function GET(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const project = await Project.findById(projectId)
    .select('customerId handymanId status isRescheduling isChatEnabled')
    .lean();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const isAdmin = session.user.role === 'admin';
  const isCustomer = session.user.role === 'customer';
  const isHandyman = session.user.role === 'handyman';
  const isProjectCustomer = project.customerId?.toString() === session.user.id;
  const isAssignedHandyman = project.handymanId?.toString() === session.user.id;

  if (isAdmin) {
    const messages = await ProjectChat.find({ projectId }).sort({ createdAt: 1 }).lean();
    return NextResponse.json(messages);
  }

  if (isCustomer && !isProjectCustomer) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (isHandyman && !isAssignedHandyman) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!isCustomer && !isHandyman) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Chat when job is live (customer accepted) or finished
  const chatOpenStatuses = ['active', 'scheduled', 'in_progress', 'completed'];
  const chatClosed = !chatOpenStatuses.includes(project.status);
  if (chatClosed) {
    return NextResponse.json([]);
  }

  const messages = await ProjectChat.find({ projectId }).sort({ createdAt: 1 }).lean();
  return NextResponse.json(messages);
}

export async function POST(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  await dbConnect();

  try {
    const body = await request.json();
    const { projectId, text } = body;

    if (!projectId || !text?.trim()) {
      return NextResponse.json({ error: 'projectId and text required' }, { status: 400 });
    }

    const project = await Project.findById(projectId)
      .select('customerId handymanId status isRescheduling isChatEnabled')
      .lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isCustomer = session.user.role === 'customer';
    const isHandyman = session.user.role === 'handyman';
    const isProjectCustomer = project.customerId?.toString() === session.user.id;
    const isAssignedHandyman = project.handymanId?.toString() === session.user.id;

    if (isCustomer && !isProjectCustomer) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (isHandyman && !isAssignedHandyman) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (!isCustomer && !isHandyman) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const chatOpenStatuses = ['active', 'scheduled', 'in_progress', 'completed'];
    const chatClosed = !chatOpenStatuses.includes(project.status);
    if (chatClosed) {
      return NextResponse.json({ error: 'Chat is closed' }, { status: 400 });
    }
    if (project.isChatEnabled === false) {
      return NextResponse.json({ error: 'Chat has been paused by the Admin' }, { status: 400 });
    }

    const senderRole = isCustomer ? 'customer' : 'handyman';
    const message = await ProjectChat.create({
      projectId,
      senderRole,
      senderId: session.user.id,
      text: text.trim(),
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
