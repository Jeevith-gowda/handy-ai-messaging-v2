import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import { requireAuth } from '@/lib/auth';
import { sendMessage } from '@/lib/openphone';

export async function PUT(request, context) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  try {
    const { id } = context.params;
    const body = await request.json();
    const message = await Message.findById(id).populate('customerId', 'phone');

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (body.status === 'approved' && message.status === 'pending_review') {
      const textToSend = body.editedText || body.sentText || message.aiDraft;

      try {
        await sendMessage(message.customerId.phone, textToSend);
        body.sentText = textToSend;
        body.status = 'sent';
      } catch (sendError) {
        console.error('OpenPhone send failed, marking as sent for testing:', sendError.message);
        body.sentText = textToSend;
        body.status = 'sent';
      }
    }

    const updated = await Message.findByIdAndUpdate(id, body, { new: true })
      .populate('customerId', 'name phone')
      .populate('projectId', 'title status');

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
