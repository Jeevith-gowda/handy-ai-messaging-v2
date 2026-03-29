/** Project statuses where customer ↔ handyman chat is open */
export const CUSTOMER_CHAT_STATUSES = ['active', 'scheduled', 'in_progress', 'completed'];

const STATUS_PRIORITY = {
  in_progress: 0,
  scheduled: 1,
  active: 2,
  completed: 3,
};

/**
 * Pick the single best project for the customer "Messages" tab (one primary thread).
 */
export function pickCustomerChatProject(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return null;
  const eligible = projects.filter(
    (p) => p?.handymanId && CUSTOMER_CHAT_STATUSES.includes(p.status)
  );
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  })[0];
}
