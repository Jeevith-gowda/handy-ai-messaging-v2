// utils/quo-api.js

async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`/api/quo${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API Error: ${response.status}`);
  }
  return response.json();
}

const CONVERSATION_ALLOWED_PARAMS = new Set([
  'phoneNumbers[]',
  'userId',
  'createdAfter',
  'createdBefore',
  'updatedAfter',
  'updatedBefore',
  'excludeInactive',
  'maxResults',
  'pageToken',
]);

function buildConversationQuery(params = {}) {
  const qs = new URLSearchParams();
  qs.set('maxResults', '50');

  for (const [key, value] of Object.entries(params || {})) {
    if (!CONVERSATION_ALLOWED_PARAMS.has(key) || value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          qs.append(key, String(item));
        }
      });
      continue;
    }

    qs.set(key, String(value));
  }

  return qs.toString();
}

export const quoAPI = {
  getPhoneNumbers: () => fetchAPI('/phone-numbers'),
  getUsers: () => fetchAPI('/users'),
  getContacts: (maxResults = 50) => fetchAPI(`/contacts?maxResults=${maxResults}`),

  getConversations: (params = {}) => {
    const qs = buildConversationQuery(params);
    return fetchAPI(`/conversations?${qs}`);
  },

  getMessages: (phoneNumberId, participants, params = {}) => {
    const qs = new URLSearchParams({ phoneNumberId, maxResults: '50', ...params });
    const parts = Array.isArray(participants) ? participants : [participants];
    parts.forEach(p => qs.append('participants', p));
    return fetchAPI(`/messages-with-media?${qs.toString()}`);
  },

  sendMessage: (phoneNumberId, to, text) => fetchAPI('/messages', {
    method: 'POST',
    body: JSON.stringify({ phoneNumberId, to: Array.isArray(to) ? to : [to], text }),
  }),

  getCalls: (phoneNumberId, participants, params = {}) => {
    const qs = new URLSearchParams({ phoneNumberId, maxResults: '50', ...params });
    const parts = Array.isArray(participants) ? participants : [participants];
    parts.forEach(p => qs.append('participants', p));
    return fetchAPI(`/calls?${qs.toString()}`);
  },

  getCallSummary: (callId) => fetchAPI(`/call-summary/${callId}`),
  getCallTranscript: (callId) => fetchAPI(`/call-transcript/${callId}`),
  getCallRecording: (callId) => fetchAPI(`/call-recording/${callId}`),
  getCallVoicemail: (callId) => fetchAPI(`/call-voicemail/${callId}`),
};
