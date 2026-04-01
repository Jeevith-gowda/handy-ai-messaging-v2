import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listMessages, sendMessage } from '@/lib/quo';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import Customer from '@/models/Customer';

export async function GET(request) {
  // const authError = await requireAuth();
  // if (authError) return authError;

  const phoneNumberId = process.env.QUO_PHONE_NUMBER_ID;
  if (!phoneNumberId || phoneNumberId === 'user-will-fill-this') {
    return NextResponse.json({ error: 'QUO_PHONE_NUMBER_ID not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const participantsParam = searchParams.get('participants');
    const participants = participantsParam ? participantsParam.split(',').map((p) => p.trim()).filter(Boolean) : [];

    if (participants.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const rawData = await listMessages(phoneNumberId, participants);
    const quoMessages = rawData?.data || rawData || [];

    // Inject mediaUrl mapping from local MongoDB by openphoneMessageId
    await dbConnect();
    const customers = await Customer.find({ phone: { $in: participants } });
    const cIds = customers.map((c) => c._id);

    if (cIds.length > 0 && Array.isArray(quoMessages)) {
      const localMsgs = await Message.find({
        customerId: { $in: cIds },
        $or: [
          { openphoneMessageId: { $ne: null } },
          { isCall: true }
        ]
      });

      const localMap = {};
      const callMsgs = [];
      localMsgs.forEach((m) => {
        if (m.isCall) {
          callMsgs.push(m);
        } else if (m.openphoneMessageId) {
          localMap[m.openphoneMessageId] = m.mediaUrls || [];
        }
      });

      quoMessages.forEach((msg) => {
        if (localMap[msg.id]) {
          msg.mediaUrls = localMap[msg.id];
        }
      });

      callMsgs.forEach((cMsg) => {
        quoMessages.push({
          id: cMsg._id.toString(),
          isCall: true,
          callDuration: cMsg.callDuration,
          callStatus: cMsg.callStatus,
          callSummary: cMsg.callSummary || [],
          callNextSteps: cMsg.callNextSteps || [],
          createdAt: cMsg.createdAt,
          direction: cMsg.direction || 'inbound',
        });
      });
      
      // Since we appended MongoDB objects, ensure array is strictly chronological
      quoMessages.sort((a,b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }

    return NextResponse.json(rawData);
  } catch (error) {
    console.error('Quo messages list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: error.message?.includes('402') ? 402 : 500 }
    );
  }
}

export async function POST(request) {
  // const authError = await requireAuth();
  // if (authError) return authError;

  const defaultPhoneNumberId = process.env.QUO_PHONE_NUMBER_ID;
  const fromNumber = process.env.QUO_FROM_NUMBER;
  try {
    const body = await request.json();
    const { to, content, text, phoneNumberId: requestedPhoneNumberId } = body;
    const phoneNumberId = requestedPhoneNumberId || defaultPhoneNumberId;
    if (!phoneNumberId || phoneNumberId === 'user-will-fill-this') {
      return NextResponse.json({ error: 'QUO_PHONE_NUMBER_ID not configured' }, { status: 500 });
    }

    const messageText = (typeof text === 'string' ? text : content) || '';
    const toArr = Array.isArray(to) ? to : to ? [to] : [];

    if (!messageText.trim() || toArr.length === 0) {
      return NextResponse.json({ error: 'Missing text/content or to' }, { status: 400 });
    }

    const data = await sendMessage(
      phoneNumberId,
      toArr.map((n) => (n.startsWith('+') ? n : `+1${n.replace(/\D/g, '')}`)),
      messageText.trim(),
    );
    return NextResponse.json(data, { status: 202 });
  } catch (error) {
    console.error('Quo send message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: error.message?.includes('402') ? 402 : 500 }
    );
  }
}
