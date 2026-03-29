'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function HandymanProfile() {
  const { data: session, update: updateSession } = useSession();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/users/${session.user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user?.phone != null) setPhone(user.phone || '');
        if (user?.paymentDetails != null) setPaymentDetails(user.paymentDetails || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    const trimmedName = name?.trim() || '';
    const trimmedPhone = phone?.trim() || '';
    if (!trimmedName) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, phone: trimmedPhone }),
      });

      if (res.ok) {
        if (trimmedName !== session?.user?.name) {
          await updateSession();
        }
        setMessage({ type: 'success', text: 'Personal info saved' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to update' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My profile</h1>
        <p className="text-base text-gray-500 mt-1">Manage your account details</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Personal info</h2>
          <form onSubmit={handleSavePersonal} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-base"
                disabled={saving}
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. (555) 123-4567"
                className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-base"
                disabled={saving}
                autoComplete="tel"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !name?.trim()}
              className="w-full min-h-[48px] px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors md:w-auto"
            >
              {saving ? 'Saving…' : 'Save personal info'}
            </button>
          </form>
          {message && (
            <p className={`mt-3 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Account</h2>
        <p className="text-base text-gray-500">
          <span className="font-medium text-gray-900">Email:</span> {session?.user?.email}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Payment details</h2>
          <p className="text-xs text-gray-500 mb-3">
            Add your Zelle, Cash App, or other payment info so we can pay you for completed jobs.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!session?.user?.id) return;
              setSaving(true);
              setMessage(null);
              try {
                const res = await fetch(`/api/users/${session.user.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentDetails: paymentDetails.trim() }),
                });
                if (res.ok) {
                  setMessage({ type: 'success', text: 'Payment details updated' });
                } else {
                  const err = await res.json();
                  setMessage({ type: 'error', text: err.error || 'Failed to update' });
                }
              } catch {
                setMessage({ type: 'error', text: 'Failed to update' });
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
            <textarea
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder="e.g., Zelle: 555-0199 or Venmo: @handyman-name"
              rows={3}
              className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none text-base"
              disabled={saving || loading}
            />
            <button
              type="submit"
              disabled={saving || loading}
              className="w-full min-h-[48px] sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save payment details'}
            </button>
          </form>
        </div>
      </div>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-red-50 text-red-600 font-semibold border border-red-200 hover:bg-red-100 active:bg-red-100 transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
