import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Project from '@/models/Project';
import Message from '@/models/Message';
import { normalizePhone } from '@/lib/openphone';

export async function processIncomingMessage({ from, body, messageId, mediaUrls = [] }) {
  await dbConnect();
  const phone = normalizePhone(from);
  
  // b. AI TRIAGE & MEMORY: Fetch the last 5 messages
  const recentMessages = await Message.find({ 
    $or: [{ from: phone }, { fromPhone: phone }] 
  }).sort({ createdAt: -1 }).limit(5);

  const formattedHistory = recentMessages.reverse().map(m => ({
    role: (m.direction === 'inbound' || m.senderType === 'customer') ? 'user' : 'assistant',
    content: m.body || m.originalText || ''
  })).filter(m => m.content.trim() !== '');

  // c. Send the context + new incoming message to Groq API
  let isSpamPayload = false;
  let draftPayload = '';

  if (body) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a handyman intake assistant. If the message is spam, return {"isSpam": true, "draft": ""}. If valid, return {"isSpam": false, "draft": "A brief, polite reply continuing the intake process"}. Return ONLY JSON.'
            },
            ...formattedHistory,
            { role: 'user', content: body }
          ],
          response_format: { type: 'json_object' }
        })
      });
      if (groqRes.ok) {
        const data = await groqRes.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(content);
            isSpamPayload = !!parsed.isSpam;
            draftPayload = parsed.draft || '';
          } catch (e) {
            console.error('[AGENT 1 ERROR] JSON parse failed', e);
          }
        }
      }
    } catch (e) {
      console.error('[AGENT 1 ERROR]', e);
    }
  }

  // d. CRM LOGIC: Look up the Customer by phone number.
  let customer = await Customer.findOne({ phone });

  // e. IF NO CUSTOMER EXISTS AND isSpam IS FALSE
  if (!customer && !isSpamPayload) {
    customer = await Customer.create({ phone, name: 'New Lead', firstName: 'New', lastName: 'Lead' });
  }

  let activeProject = null;
  if (customer) {
    activeProject = await Project.findOne({
      customerId: customer._id,
      status: { $nin: ['completed', 'handyman_paid', 'customer_paid'] },
    }).sort({ updatedAt: -1 });
  }

  // f. SAVE: Save the message to the DB.
  const message = await Message.create({
    customerId: (!isSpamPayload && customer) ? customer._id : undefined,
    from: phone,
    fromPhone: phone,
    projectId: activeProject?._id || undefined,
    body: body,
    originalText: body,
    mediaUrls: mediaUrls,
    isSpam: isSpamPayload,
    aiDraft: draftPayload,
    direction: 'inbound',
    senderType: 'customer',
    openphoneMessageId: messageId,
    status: 'pending_review',
    isRead: false
  });

  return { customer, message };
}

export async function processIncomingCall({ from, callId, callDuration, callStatus }) {
  await dbConnect();
  const phone = normalizePhone(from);
  let customer = await Customer.findOne({ phone });
  if (!customer) {
    customer = await Customer.create({ phone, name: 'New Lead', firstName: 'New', lastName: 'Lead' });
  }

  const message = await Message.create({
    customerId: customer._id,
    from: phone,
    fromPhone: phone,
    direction: 'inbound',
    senderType: 'customer',
    isCall: true,
    callId,
    callDuration,
    callStatus,
    isRead: false,
  });

  return { customer, message };
}

export async function processCallSummary({ callId, summary, nextSteps }) {
  await dbConnect();
  const message = await Message.findOneAndUpdate(
    { callId },
    { $set: { callSummary: summary, callNextSteps: nextSteps } },
    { new: true }
  );

  return { message };
}
