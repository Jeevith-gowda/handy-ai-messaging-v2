'use client';

import { useEffect, useState } from 'react';

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

/**
 * Admin create flow for handyman (User) or customer (Customer).
 * POST /api/admin/users — password hashed on the server / via model hooks.
 */
export default function AdminAddUserModal({ open, onClose, role, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setError('');
  }, [open]);

  if (!open) return null;

  const title = role === 'handyman' ? 'Add new handyman' : 'Add new customer';
  const subtitle =
    role === 'handyman'
      ? 'They will sign in at /login with email and password.'
      : 'They will sign in on the customer portal with phone and this password.';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create account');
        return;
      }
      onCreated?.(data);
      onClose();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="admin-add-user-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-gray-900/60 backdrop-blur-[1px]" onClick={() => !creating && onClose()} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 sm:p-7 max-h-[min(90vh,40rem)] overflow-y-auto">
        <h2 id="admin-add-user-title" className="text-lg font-bold text-gray-900">
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</div>}
          <div>
            <label htmlFor="add-user-name" className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="add-user-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={creating}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="add-user-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="add-user-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={creating}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="add-user-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              id="add-user-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={creating}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="add-user-password" className="block text-sm font-medium text-gray-700 mb-1">
              Set password
            </label>
            <input
              id="add-user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={creating}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => !creating && onClose()}
              disabled={creating}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
