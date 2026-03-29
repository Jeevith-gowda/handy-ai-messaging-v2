'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

function getProjectCosts(project, quotes) {
  const pid = project._id?.toString?.() || project._id;
  const sentQuotes = (quotes || []).filter(
    (q) => (q.projectId?._id?.toString?.() || q.projectId?.toString?.() || q.projectId) === pid && ['sent', 'accepted'].includes(q.status)
  );
  const latestSent = sentQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const quoteTotal = latestSent?.totalAmount ?? project?.quoteAmount ?? 0;
  const totalAdditional = (project.additionalCosts || []).reduce((s, c) => s + (c.totalCost || 0), 0);
  const hasAdditionalInQuote = (latestSent?.lineItems || []).some((i) => String(i?.description || '').startsWith('[Additional]'));
  const totalProjectCost = hasAdditionalInQuote ? quoteTotal : quoteTotal + totalAdditional;
  const amountAlreadyPaid = project?.amountAlreadyPaid ?? 0;
  const balanceDue = Math.max(0, totalProjectCost - amountAlreadyPaid);
  return { totalProjectCost, balanceDue };
}

export default function ReportsPage() {
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, quotesRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/quotes'),
        ]);
        if (projRes.ok) setProjects(await projRes.json());
        if (quotesRes.ok) setQuotes(await quotesRes.json());
      } catch (e) {
        console.error('Reports fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const completedStatuses = ['completed', 'handyman_paid', 'customer_paid'];
  const inProgressStatuses = [
    'inquiry',
    'quoted_by_handyman',
    'pending_customer_approval',
    'active',
    'scheduled',
    'in_progress',
  ];

  const totalRevenue = projects
    .filter((p) => completedStatuses.includes(p.status))
    .reduce((sum, p) => {
      const paid = p?.amountAlreadyPaid ?? 0;
      if (paid > 0) return sum + paid;
      const customerPayments = (p.payments || []).filter((pay) => pay.type === 'customer');
      const fromPayments = customerPayments.reduce((s, pay) => s + (pay.amount || 0), 0);
      return sum + (fromPayments > 0 ? fromPayments : getProjectCosts(p, quotes).totalProjectCost);
    }, 0);

  const pendingRevenue = projects
    .filter((p) => inProgressStatuses.includes(p.status))
    .reduce((sum, p) => {
      const { totalProjectCost } = getProjectCosts(p, quotes);
      return sum + totalProjectCost;
    }, 0);

  const totalJobsCompleted = projects.filter((p) => completedStatuses.includes(p.status)).length;

  function downloadCSV() {
    const headers = ['Title', 'Customer', 'Handyman', 'Status', 'Date Created', 'Total Cost', 'Balance Due'];
    const rows = projects.map((p) => {
      const { totalProjectCost, balanceDue } = getProjectCosts(p, quotes);
      const customerName = p.customerId?.name ?? '';
      const handymanName = p.handymanId?.name ?? 'Unassigned';
      const status =
        p.isRescheduling && (p.status === 'active' || p.status === 'scheduled')
          ? 'Rescheduling'
          : (p.status ?? '').replace(/_/g, ' ');
      const dateCreated = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      return [
        `"${(p.title || 'Untitled').replace(/"/g, '""')}"`,
        `"${customerName.replace(/"/g, '""')}"`,
        `"${handymanName.replace(/"/g, '""')}"`,
        `"${status.replace(/"/g, '""')}"`,
        `"${dateCreated}"`,
        totalProjectCost.toLocaleString(),
        balanceDue.toLocaleString(),
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Project overview and financial summary</p>
        </div>
        <button
          type="button"
          onClick={downloadCSV}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue (Completed Jobs)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Revenue (In Progress)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">${pendingRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Jobs Completed</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalJobsCompleted}</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">All Projects</h2>
        </div>
        <div className="overflow-x-auto -mx-1 px-1 md:mx-0 md:px-0 touch-pan-x">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-700">Project</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-700">Customer</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-700">Handyman</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-700">Date Created</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-700">Total Cost</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-700">Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const { totalProjectCost, balanceDue } = getProjectCosts(p, quotes);
                return (
                  <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/projects/${p._id}`} className="font-medium text-blue-600 hover:text-blue-700">
                        {p.title || 'Untitled'}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {p.customerId?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {p.handymanId?.name || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} isRescheduling={p.isRescheduling} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      ${totalProjectCost.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      <span className={balanceDue > 0 ? 'text-amber-600' : 'text-gray-500'}>
                        ${balanceDue.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {projects.length === 0 && (
          <div className="px-5 py-12 text-center text-gray-500">No projects yet</div>
        )}
      </div>
    </div>
  );
}
