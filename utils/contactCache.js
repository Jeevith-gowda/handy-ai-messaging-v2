// utils/contactCache.js

let contactMap = {};

export async function loadContacts(quoAPI) {
  const data = await quoAPI.getContacts(100);
  contactMap = {};
  for (const contact of data.data || []) {
    for (const field of contact.fields || []) {
      if (field.type === 'phone-number' && field.value) {
        contactMap[field.value] = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
      }
    }
  }
  return contactMap;
}

export function getContactName(phoneNumber) {
  return contactMap[phoneNumber] || formatPhoneNumber(phoneNumber);
}

export function formatPhoneNumber(number) {
  if (!number) return 'Unknown';
  const cleaned = number.replace(/^\+1/, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }
  return number;
}
