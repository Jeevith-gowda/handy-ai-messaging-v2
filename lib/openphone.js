export async function sendMessage(to, body) {
  // Placeholder — will be fully implemented in Phase 9
  console.log(`[OpenPhone] Would send to ${to}: ${body}`);
  return { success: true, messageId: null };
}

export function parseWebhook(payload) {
  // Placeholder — will be fully implemented in Phase 9
  return {
    from: payload?.data?.from || '',
    body: payload?.data?.body || '',
    messageId: payload?.data?.id || '',
  };
}

export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+1' + digits.slice(1);
  }
  if (digits.length === 10) {
    return '+1' + digits;
  }
  return '+' + digits;
}
