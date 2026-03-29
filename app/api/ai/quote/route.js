import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Quote from '@/models/Quote';
import { requireAuth } from '@/lib/auth';
import { generateQuote } from '@/lib/ai';

export async function POST(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const { projectId } = await request.json();

    const project = await Project.findById(projectId)
      .populate('customerId')
      .populate('handymanId');

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const context = {
      customer: project.customerId,
      project,
      handyman: project.handymanId,
    };

    const { lineItems, totalAmount, reasoning } = await generateQuote(project.description, context);

    const quote = await Quote.create({
      projectId: project._id,
      customerId: project.customerId._id,
      lineItems,
      totalAmount,
      aiGenerated: true,
      notes: reasoning,
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
