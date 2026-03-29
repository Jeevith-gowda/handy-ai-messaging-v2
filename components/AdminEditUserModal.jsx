'use client';

import { useEffect, useState } from 'react';

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

/**
 * Shared admin modal to edit a handyman (User) or customer (Customer).
 * PATCH /api/admin/users/[id] — password optional, min 8 chars when set.
 */
export default function AdminEditUserModal({ open, onClose, recordKind, record, onSaved }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !record) return;
    setName(record.name || '');
    setEmail(record.email || '');
    setPhone(record.phone || '');
    setPassword('');
    setError('');
  }, [open, record]);

  if (!open || !record) return null;

  const title = recordKind === 'handyman' ? 'Edit handyman' : 'Edit customer';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (recordKind === 'handyman' && !email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (password && password.length < 8) {
      setError('New password must be at least 8 characters, or leave blank to keep the current password.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
      };
      if (password) body.password = password;

      const res = await fetch(`/api/admin/users/${record._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Update failed');
        return;
      }
      onSaved?.(data);
      onClose();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="admin-edit-user-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-gray-900/60 backdrop-blur-[1px]" onClick={() => !saving && onClose()} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 sm:p-7 max-h-[min(90vh,40rem)] overflow-y-auto">
        <h2 id="admin-edit-user-title" className="text-lg font-bold text-gray-900">
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {recordKind === 'customer'
            ? 'Customers sign in with phone on the customer portal. Leave password blank to keep the current login password (shared default or one you set here).'
            : 'Leave password blank to keep the current password.'}
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</div>}
          <div>
            <label htmlFor="edit-user-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="edit-user-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="edit-user-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email {recordKind === 'customer' && <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <input
              id="edit-user-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder={recordKind === 'customer' ? '—' : ''}
            />
          </div>
          <div>
            <label htmlFor="edit-user-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              id="edit-user-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="edit-user-password" className="block text-sm font-medium text-gray-700 mb-1">
              New password <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="edit-user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder="Leave blank to keep current"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
