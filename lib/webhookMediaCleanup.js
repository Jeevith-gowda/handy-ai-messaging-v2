import dbConnect from '@/lib/db';
import WebhookMessage from '@/models/WebhookMessage';
import DeletedConversation from '@/models/DeletedConversation';

function toStringArray(values = []) {
  return Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
}

function extractConversationFromTombstone(doc = {}) {
  return doc?.rawPayload?.data?.object || doc?.rawPayload?.data?.conversation || doc?.rawPayload?.data || null;
}

function buildConversationQueries(conversation = {}) {
  const queries = [];
  const conversationId = String(conversation?.id || conversation?.conversationId || '').trim();
  const phoneNumberId = String(conversation?.phoneNumberId || '').trim();
  const participants = toStringArray(conversation?.participants);

  if (conversationId) {
    queries.push({ conversationId });
  }

  if (phoneNumberId && participants.length > 0) {
    queries.push({
      phoneNumberId,
      $or: [{ fromNumber: { $in: participants } }, { toNumber: { $in: participants } }],
    });
  }

  return queries;
}

export async function cleanupWebhookMedia({ activeConversationIds = [], conversations = [] } = {}) {
  await dbConnect();

  const summary = {
    tombstoneDocsDeleted: 0,
    explicitDocsDeleted: 0,
  };

  const activeSet = new Set(toStringArray(activeConversationIds));

  const deletedDocs = await DeletedConversation.find({}, { conversationId: 1, rawPayload: 1 }).lean();
  const deletedConversations = deletedDocs
    .map((doc) => ({
      ...extractConversationFromTombstone(doc),
      conversationId: doc?.conversationId,
    }))
    .filter((conversation) => String(conversation?.conversationId || conversation?.id || '').trim())
    .filter((conversation) => !activeSet.has(String(conversation?.conversationId || conversation?.id || '').trim()));

  for (const conversation of deletedConversations) {
    const queries = buildConversationQueries(conversation);
    for (const query of queries) {
      const result = await WebhookMessage.deleteMany(query);
      summary.tombstoneDocsDeleted += result?.deletedCount || 0;
    }
  }

  const explicitConversations = Array.isArray(conversations) ? conversations : [];
  for (const conversation of explicitConversations) {
    const queries = buildConversationQueries(conversation);
    for (const query of queries) {
      const result = await WebhookMessage.deleteMany(query);
      summary.explicitDocsDeleted += result?.deletedCount || 0;
    }
  }

  return summary;
}
