'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAddUserModal from '@/components/AdminAddUserModal';
import AdminEditUserModal from '@/components/AdminEditUserModal';

function formatCreatedAt(createdAt) {
  if (!createdAt) return '—';
  try {
    return new Date(createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Admin list + edit flow for handymen (User) or customers (Customer).
 * @param {string} [addNewLabel] — If set, shows a primary button that opens the create modal.
 */
export default function AdminUsersDirectory({ title, subtitle, apiRole, recordKind, addNewLabel }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users?role=${apiRole}`);
      const data = res.ok ? await res.json() : [];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiRole]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  function handleSaved(updated) {
    if (!updated?._id) {
      fetchRows();
      return;
    }
    const id = String(updated._id);
    setRows((prev) => prev.map((r) => (String(r._id) === id ? { ...r, ...updated } : r)));
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to completely delete this user? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => String(r._id) !== String(id)));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Network error while deleting user');
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete these ${selectedIds.length} items? This cannot be undone.`)) return;
    
    try {
      const res = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, role: apiRole }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchRows();
        // Optional minimal native toast approach or just rely on DOM refresh
        alert(`Successfully deleted ${selectedIds.length} users.`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to bulk-delete users');
      }
    } catch (e) {
      alert('Network error while bulk deleting users');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-2 items-center">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center justify-center shrink-0 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow-sm min-h-[44px]"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
          {addNewLabel && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center justify-center shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm min-h-[44px]"
            >
              {addNewLabel}
            </button>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No records yet.</div>
        ) : (
          rows.map((row) => (
            <div key={row._id} className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm relative ${selectedIds.includes(String(row._id)) ? 'bg-blue-50/20 border-blue-200' : ''}`}>
              <div className="absolute top-4 right-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(String(row._id))}
                  onChange={() => {
                    const id = String(row._id);
                    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5 cursor-pointer"
                />
              </div>
              <p className="font-semibold text-gray-900 pr-8">{row.name || '—'}</p>
              <p className="text-sm text-gray-600 mt-1">{row.email || '—'}</p>
              <p className="text-sm text-gray-600">{row.phone || '—'}</p>
              <p className="text-xs text-gray-400 mt-2">Joined {formatCreatedAt(row.createdAt)}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditRecord(row)}
                  className="w-full py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row._id)}
                  className="w-full py-2.5 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(rows.map(r => String(r._id)));
                      else setSelectedIds([]);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Account created</th>
                <th className="px-4 py-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No records yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className={`hover:bg-gray-50/80 ${selectedIds.includes(String(row._id)) ? 'bg-blue-50/20' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(String(row._id))}
                        onChange={() => {
                          const id = String(row._id);
                          setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCreatedAt(row.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditRecord(row)}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row._id)}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-red-300 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminAddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        role={apiRole}
        onCreated={() => fetchRows()}
      />

      <AdminEditUserModal
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        recordKind={recordKind}
        record={editRecord}
        onSaved={handleSaved}
      />
    </div>
  );
}
