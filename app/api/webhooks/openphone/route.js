import { NextResponse } from 'next/server';
import { processIncomingMessage, processIncomingCall, processCallSummary } from '@/lib/messageHandler';

export async function POST(request) {
  return new Response(JSON.stringify({ status: 'legacy disabled' }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
  try {
    const rawBody = await request.text();
    
    console.log('--- OPENPHONE WEBHOOK DEBUG ---');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Raw Payload:', rawBody);

    let payload;
    try {
      payload = JSON.parse(rawBody || '{}');
    } catch (e) {
      console.error('Failed to parse JSON form raw payload:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    console.log("--- RAW WEBHOOK EVENT ---", payload?.type, payload);

    const webhookSecret = process.env.OPENPHONE_WEBHOOK_SECRET;
    if (webhookSecret && webhookSecret !== 'user-will-fill-this') {
      const signature = request.headers.get('x-openphone-signature');
      console.log('Webhook Secret Configured:', webhookSecret ? 'Yes' : 'No');
      console.log('Received x-openphone-signature:', signature);
      if (signature !== webhookSecret) {
        console.warn('Signature mismatch!');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Gracefully handle OpenPhone verification ping
    if (payload?.type === 'webhook.verification') {
      console.log('OpenPhone Verification Ping Received');
      return NextResponse.json({ received: true, note: 'Verification acknowledged' }, { status: 200 });
    }

    // Only process actual incoming messages
    const eventType = payload?.type || '';

    if (eventType === 'call.completed') {
      const callId = payload?.data?.object?.id;
      const direction = payload?.data?.object?.direction || 'incoming';
      const from = direction === 'incoming' ? payload?.data?.object?.from : payload?.data?.object?.to;
      const callDuration = payload?.data?.object?.duration || 0;
      const callStatus = payload?.data?.object?.status || '';
      console.log(`Processing Call: ${callId} from/to ${from} Status: ${callStatus}`);
      if (from && callId) {
        await processIncomingCall({ from, callId, callDuration, callStatus });
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (eventType === 'call.summary.completed' || eventType === 'callSummary') {
      const callId = payload?.data?.object?.id || payload?.data?.object?.callId;
      const summary = payload?.data?.object?.summary || [];
      const nextSteps = payload?.data?.object?.nextSteps || [];
      console.log(`Processing Call Summary: ${callId}`);
      if (callId) {
        await processCallSummary({ callId, summary, nextSteps });
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (eventType !== 'message.received') {
      // Return 200 to acknowledge verification pings and other events we don't handle yet
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const from = payload?.data?.object?.from || '';
    const body = payload?.data?.object?.body || '';
    const messageId = payload?.data?.object?.id || '';
    
    console.log('Incoming Media:', payload?.data?.object?.media);
    const mediaUrls = payload?.data?.object?.media?.map(item => item.url) || [];
    console.log('Saving to DB:', mediaUrls);

    if (!from || (!body && mediaUrls.length === 0)) {
      console.warn('Missing from or content fields in payload. Sending 200 to acknowledge.', payload);
      // Return 200 so OpenPhone doesn't mark the webhook as failing and disable it
      return NextResponse.json({ received: true, note: 'Missing from/content' }, { status: 200 });
    }

    console.log(`Processing SMS from: ${from}, messageId: ${messageId}, media: ${mediaUrls.length}`);
    const result = await processIncomingMessage({ from, body, messageId, mediaUrls });

    return NextResponse.json({ received: true, messageId: result?.message?._id }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
