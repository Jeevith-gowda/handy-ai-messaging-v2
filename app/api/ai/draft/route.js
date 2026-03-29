import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import { requireAuth } from '@/lib/auth';
import { generateAIDraft } from '@/lib/ai';

export async function POST(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const { messageId } = await request.json();

    const message = await Message.findById(messageId)
      .populate('customerId')
      .populate('projectId')
      .populate('handymanId');

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const context = {
      customer: message.customerId,
      currentProject: message.projectId,
      assignedHandyman: message.handymanId,
    };

    const { draft, reasoning, confidence } = await generateAIDraft(message.originalText, context);

    message.aiDraft = draft;
    message.aiReasoning = reasoning;
    message.confidence = confidence;
    await message.save();

    return NextResponse.json({ draft, reasoning, confidence });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
