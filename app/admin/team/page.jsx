'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import HandymanCard from '@/components/HandymanCard';

export default function TeamPage() {
  const [handymen, setHandymen] = useState([]);
  const [paidProjects, setPaidProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch('/api/users?role=handyman'),
        fetch('/api/projects'),
      ]);
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const projectsData = projectsRes.ok ? await projectsRes.json() : [];
      setHandymen(usersData);
      setPaidProjects(projectsData.filter((p) => p.status === 'handyman_paid'));
    } catch (e) {
      console.error('Team fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openAddModal() {
    setCreateError('');
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setAddModalOpen(true);
  }

  async function handleCreateHandyman(e) {
    e.preventDefault();
    setCreateError('');
    if (!newName.trim()) {
      setCreateError('Full name is required.');
      return;
    }
    if (!newEmail.trim()) {
      setCreateError('Email is required.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setCreateError('Temporary password must be at least 8 characters.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || undefined,
          password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create handyman');
        return;
      }
      setAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      await fetchData();
    } catch {
      setCreateError('Something went wrong. Try again.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  const paymentsByHandyman = paidProjects.reduce((acc, p) => {
    const hid = p.handymanId?._id || p.handymanId;
    if (!hid) return acc;
    const name = p.handymanId?.name || 'Unassigned';
    if (!acc[hid]) acc[hid] = { name, payments: [] };
    const handymanPayments = p.payments?.filter((pay) => pay.type === 'handyman' || !pay.type) || [];
    if (handymanPayments.length > 0) {
      handymanPayments.forEach((pay) => {
        acc[hid].payments.push({
          projectId: p._id,
          projectNumber: p.projectNumber,
          title: p.title,
          ...pay,
        });
      });
    } else {
      acc[hid].payments.push({
        projectId: p._id,
        projectNumber: p.projectNumber,
        title: p.title,
        amount: p.finalAmount || p.quoteAmount || 0,
        date: p.updatedAt,
        method: 'manual',
        status: 'recorded',
      });
    }
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Handyman
        </button>
      </div>

      {/* Handymen */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Handymen</h2>
        {handymen.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {handymen.map((h) => (
              <HandymanCard key={h._id} handyman={h} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No handymen yet.</p>
        )}
      </div>

      {/* Payments to Handymen */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payments to Handymen</h2>
        <p className="text-sm text-gray-500 mb-4">Shared timeline of payments made to handymen. Payment integration coming soon.</p>
        {Object.keys(paymentsByHandyman).length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {Object.entries(paymentsByHandyman).map(([handymanId, { name, payments }]) => (
                <div key={handymanId} className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{name}</h3>
                  <div className="space-y-2">
                    {payments.map((pay, i) => (
                      <Link
                        key={i}
                        href={`/admin/projects/${pay.projectId}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div>
                          <span className="text-xs font-mono text-gray-400">{pay.projectNumber}</span>
                          <p className="text-sm font-medium text-gray-900">{pay.title}</p>
                          <p className="text-xs text-gray-500">
                            {pay.date ? new Date(pay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            {pay.method && ` • ${pay.method}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">${pay.amount?.toLocaleString()}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2h-2m-4-1V7a2 2 0 012-2h2a2 2 0 012 2v1" />
            </svg>
            <p className="text-sm text-gray-500">No payments recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">Payments appear here when you mark projects as Paid</p>
          </div>
        )}
      </div>

      {addModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-handyman-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-[1px]"
            onClick={() => !creating && setAddModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 sm:p-7">
            <h2 id="add-handyman-title" className="text-lg font-bold text-gray-900">
              Add New Handyman
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              They will sign in at <span className="font-mono text-gray-700">/login</span> with this email and password. Ask them to change the password after first login when you add that flow.
            </p>
            <form onSubmit={handleCreateHandyman} className="mt-5 space-y-4">
              {createError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{createError}</div>
              )}
              <div>
                <label htmlFor="hm-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full name
                </label>
                <input
                  id="hm-name"
                  type="text"
                  autoComplete="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  disabled={creating}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label htmlFor="hm-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="hm-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  disabled={creating}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label htmlFor="hm-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="hm-phone"
                  type="tel"
                  autoComplete="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  disabled={creating}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="+1 555 123 4567"
                />
              </div>
              <div>
                <label htmlFor="hm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Set temporary password
                </label>
                <input
                  id="hm-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={creating}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => !creating && setAddModalOpen(false)}
                  disabled={creating}
                  className="w-full sm:w-auto min-h-[48px] px-4 rounded-xl border border-gray-300 bg-white text-gray-800 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full sm:w-auto min-h-[48px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create handyman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
