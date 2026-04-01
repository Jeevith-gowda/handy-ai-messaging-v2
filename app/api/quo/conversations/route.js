import { quoFetch } from '@/lib/quo-fetch';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import DeletedConversation from '@/models/DeletedConversation';
import { cleanupWebhookMedia } from '@/lib/webhookMediaCleanup';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams(searchParams);

    // Always scope conversations to the CLT Professional number on the server.
    const cltPhoneNumberId = process.env.QUO_PHONE_NUMBER_ID || 'PNmyACDF3W';
    params.delete('phoneNumbers[]');
    params.append('phoneNumbers[]', cltPhoneNumberId);

    const query = params.toString();
    const endpoint = query ? `/conversations?${query}` : '/conversations';

    const data = await quoFetch(endpoint);

    const list = Array.isArray(data?.data) ? data.data : [];

    // Tombstones from webhook conversation.deleted events.
    let deletedIds = new Set();
    try {
      await dbConnect();
      const deletedDocs = await DeletedConversation.find({}, { conversationId: 1 }).lean();
      deletedIds = new Set(deletedDocs.map((doc) => String(doc.conversationId)));
    } catch {
      // If DB is unavailable, still return Quo-filtered results.
    }

    // Keep only active conversations.
    const active = list.filter(
      (conversation) => !conversation?.deletedAt && !deletedIds.has(String(conversation?.id)),
    );

    // Deduplicate by primary participant number, keeping the most recent by lastActivityAt.
    const byParticipant = new Map();
    for (const conversation of active) {
      const participants = Array.isArray(conversation?.participants) ? conversation.participants : [];
      const participant = participants[0] || conversation?.participant || conversation?.phoneNumber || conversation?.id;
      const key = String(participant || conversation?.id);

      const existing = byParticipant.get(key);
      const currentTs = new Date(conversation?.lastActivityAt || conversation?.updatedAt || 0).getTime();
      const existingTs = existing
        ? new Date(existing?.lastActivityAt || existing?.updatedAt || 0).getTime()
        : -1;

      if (!existing || currentTs > existingTs) {
        byParticipant.set(key, conversation);
      }
    }

    const deduped = Array.from(byParticipant.values()).sort(
      (a, b) =>
        new Date(b?.lastActivityAt || b?.updatedAt || 0).getTime() -
        new Date(a?.lastActivityAt || a?.updatedAt || 0).getTime(),
    );

    await cleanupWebhookMedia({
      activeConversationIds: deduped.map((conversation) => conversation?.id).filter(Boolean),
    });

    return NextResponse.json(
      {
        ...data,
        data: deduped,
        totalItems: deduped.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
