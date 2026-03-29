/**
 * V1 handyman portal: hide in-app messaging UI; handymen use customer phone (tel:) instead.
 * Set to `false` to restore Messages inbox, thread, and the "Message customer" CTA.
 */
export const HANDYMAN_MESSAGING_UI_DISABLED = true;

/** Normalize phone for tel: links (keeps leading + and digits). */
export function handymanTelHref(phone) {
  if (phone == null || phone === '') return null;
  const s = String(phone).trim();
  if (!s) return null;
  const normalized = s.replace(/[^\d+]/g, '');
  if (normalized) return `tel:${normalized}`;
  return `tel:${encodeURIComponent(s)}`;
}
