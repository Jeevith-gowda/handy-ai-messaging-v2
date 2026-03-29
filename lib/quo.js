const QUO_BASE = 'https://api.openphone.com/v1';

function getHeaders() {
  const key = process.env.QUO_API_KEY;
  if (!key || key === 'user-will-fill-this') {
    throw new Error('QUO_API_KEY not configured');
  }
  return {
    Authorization: key,
    'Content-Type': 'application/json',
  };
}

export async function quoFetch(path, options = {}) {
  const url = `${QUO_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Quo API error ${res.status}`);
  }
  return data;
}

export async function listConversations(phoneNumberId, options = {}) {
  const { maxResults = 50, pageToken } = options;
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  params.append('phoneNumbers', phoneNumberId);
  if (pageToken) params.set('pageToken', pageToken);
  return quoFetch(`/conversations?${params}`);
}

export async function listMessages(phoneNumberId, participants) {
  if (!participants?.length) return { data: [] };
  const params = new URLSearchParams({ phoneNumberId });
  participants.forEach((p) => params.append('participants[]', p));
  return quoFetch(`/messages?${params}`);
}

export async function sendMessage(phoneNumberId, to, content) {
  return quoFetch('/messages', {
    method: 'POST',
    body: JSON.stringify({
      content,
      from: phoneNumberId,
      to: Array.isArray(to) ? to : [to],
    }),
  });
}
