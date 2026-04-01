import { quoFetch } from '@/lib/quo-fetch';
import dbConnect from '@/lib/db';
import WebhookMessage from '@/models/WebhookMessage';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    // 1. Build query params for Quo REST API
    const params = new URLSearchParams();
    const phoneNumberId = searchParams.get('phoneNumberId');
    const maxResults = searchParams.get('maxResults') || '50';
    const createdAfter = searchParams.get('createdAfter');
    const createdBefore = searchParams.get('createdBefore');
    const pageToken = searchParams.get('pageToken');
    const participants = searchParams.getAll('participants');

    if (phoneNumberId) params.set('phoneNumberId', phoneNumberId);
    params.set('maxResults', maxResults);
    if (createdAfter) params.set('createdAfter', createdAfter);
    if (createdBefore) params.set('createdBefore', createdBefore);
    if (pageToken) params.set('pageToken', pageToken);
    participants.forEach(p => params.append('participants', p));

    // 2. Fetch from Quo REST API
    const apiData = await quoFetch(`/messages?${params.toString()}`);

    // 3. Enrich each message with media from our webhook MongoDB collection
    const apiMessages = (apiData.data || []).filter((msg) => !msg?.deletedAt);
    const messageIds = apiMessages.map((message) => String(message?.id || '')).filter(Boolean);
    const messageIdSet = new Set(messageIds);
    const webhookDocs = messageIds.length > 0
      ? await WebhookMessage.find({
        quoMessageId: { $in: messageIds },
      }).lean()
      : [];

    const mediaMap = {};
    webhookDocs.forEach(doc => {
      if (!messageIdSet.has(String(doc?.quoMessageId || ''))) {
        return;
      }
      if (doc.media && doc.media.length > 0) {
        mediaMap[doc.quoMessageId] = doc.media;
      }
    });

    const enrichedMessages = apiMessages.map((msg) => ({
      ...msg,
      body: msg.body || msg.text || '',
      text: msg.text || msg.body || '',
      media: mediaMap[msg.id] || msg.media || msg.attachments || [],
      _source: 'api',
    }));

    return NextResponse.json({
      data: enrichedMessages,
      totalItems: apiData.totalItems,
      nextPageToken: apiData.nextPageToken,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
