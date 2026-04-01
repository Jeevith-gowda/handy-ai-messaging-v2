// lib/quo-fetch.js
// Next.js automatically loads .env.local — DO NOT import dotenv

const QUO_BASE = 'https://api.openphone.com/v1';

export async function quoFetch(endpoint, options = {}) {
  const API_KEY = process.env.QUO_API_KEY;
  const url = endpoint.startsWith('http') ? endpoint : `${QUO_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.message || `Quo API error: ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
