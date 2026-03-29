'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PaymentsPage() {
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
        console.error('Payments fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handymanPayments = projects
    .filter((p) => p.payments?.some((pay) => pay.type === 'handyman' || !pay.type))
    .flatMap((p) =>
      (p.payments?.filter((pay) => pay.type === 'handyman' || !pay.type) || []).map((pay) => ({
        ...pay,
        project: p,
      }))
    )
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const customerPayments = projects
    .filter((p) => p.payments?.some((pay) => pay.type === 'customer'))
    .flatMap((p) =>
      (p.payments?.filter((pay) => pay.type === 'customer') || []).map((pay) => ({
        ...pay,
        project: p,
      }))
    )
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const pendingToHandyman = projects.filter((p) => {
    if (!['completed', 'customer_paid'].includes(p.status)) return false;
    const hasHandymanPay = p.payments?.some((pay) => pay.type === 'handyman' || !pay.type);
    return !hasHandymanPay;
  });

  const pendingFromCustomer = projects.filter((p) => {
    if (
      !['pending_customer_approval', 'active', 'scheduled', 'in_progress', 'completed', 'handyman_paid'].includes(
        p.status
      )
    )
      return false;
    const hasCustomerPay = p.payments?.some((pay) => pay.type === 'customer');
    return !hasCustomerPay;
  });

  function getHandymanAmount(project) {
    const ledgerTotal = (project.handymanLedger || []).reduce((s, e) => s + (e.amount || 0), 0);
    if (ledgerTotal > 0) return ledgerTotal;
    const pid = project._id?.toString?.() || project._id;
    const projectQuotes = quotes.filter((q) => {
      const qpid = q.projectId?._id?.toString?.() || q.projectId?.toString?.() || q.projectId;
      return qpid === pid;
    });
    const draft = projectQuotes.find((q) => q.status === 'handyman_draft');
    const baseAmount = draft?.totalAmount ?? project.quoteAmount ?? 0;
    const totalAdditional = (project.additionalCosts || []).reduce((s, c) => s + (c.totalCost || 0), 0);
    return baseAmount + totalAdditional;
  }

  function getHandymanLedgerBreakdown(project) {
    return project.handymanLedger || [];
  }

  function getCustomerAmount(project) {
    const pid = project._id?.toString?.() || project._id;
    const sentQuotes = quotes.filter((q) => {
      const qpid = q.projectId?._id?.toString?.() || q.projectId?.toString?.() || q.projectId;
      return qpid === pid && ['sent', 'accepted'].includes(q.status);
    });
    const latestSent = sentQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return latestSent?.totalAmount ?? project.finalAmount ?? project.quoteAmount ?? 0;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading payments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Payments from me to handyman */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-teal-50/50">
            <h2 className="text-sm font-semibold text-gray-900">Payments to Handymen</h2>
            <p className="text-xs text-gray-500 mt-0.5">Completed payments you&apos;ve made to handymen</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {handymanPayments.length > 0 ? (
              handymanPayments.map((pay, i) => (
                <Link
                  key={i}
                  href={`/admin/projects/${pay.project._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-xs font-mono text-gray-400">{pay.project.projectNumber}</span>
                    <p className="text-sm font-medium text-gray-900">{pay.project.title}</p>
                    <p className="text-xs text-gray-500">
                      {pay.project.handymanId?.name || 'Unassigned'} • {pay.date ? new Date(pay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">${pay.amount?.toLocaleString()}</span>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No payments recorded yet</div>
            )}
          </div>
        </div>

        {/* 2. Payments from customer to me */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-green-50/50">
            <h2 className="text-sm font-semibold text-gray-900">Payments from Customers</h2>
            <p className="text-xs text-gray-500 mt-0.5">Customer payments you&apos;ve received</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {customerPayments.length > 0 ? (
              customerPayments.map((pay, i) => (
                <Link
                  key={i}
                  href={`/admin/projects/${pay.project._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-xs font-mono text-gray-400">{pay.project.projectNumber}</span>
                    <p className="text-sm font-medium text-gray-900">{pay.project.title}</p>
                    <p className="text-xs text-gray-500">
                      {pay.project.customerId?.name || 'Customer'} • {pay.date ? new Date(pay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">${pay.amount?.toLocaleString()}</span>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No customer payments recorded yet</div>
            )}
          </div>
        </div>

        {/* 3. Pending payments to handyman */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/50">
            <h2 className="text-sm font-semibold text-gray-900">Pending — Pay Handymen</h2>
            <p className="text-xs text-gray-500 mt-0.5">Completed jobs awaiting payment to handyman</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {pendingToHandyman.length > 0 ? (
              pendingToHandyman.map((p) => {
                const ledger = getHandymanLedgerBreakdown(p);
                const total = getHandymanAmount(p);
                return (
                  <Link
                    key={p._id}
                    href={`/admin/projects/${p._id}`}
                    className="block px-5 py-3 hover:bg-amber-50/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono text-gray-400">{p.projectNumber}</span>
                        <p className="text-sm font-medium text-gray-900">{p.title}</p>
                        <p className="text-xs text-gray-500">{p.handymanId?.name || 'Unassigned'}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-700">${total.toLocaleString()}</span>
                    </div>
                    {ledger.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-amber-100/50">
                        <p className="text-[10px] font-medium text-amber-800/80 uppercase tracking-wide">Breakdown</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-amber-900/90 mt-1">
                          {ledger.map((e, i) => (
                            <span key={i}>{e.description || 'Line item'}: ${(e.amount || 0).toLocaleString()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No pending handyman payments</div>
            )}
          </div>
        </div>

        {/* 4. Pending payments from customer */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/50">
            <h2 className="text-sm font-semibold text-gray-900">Pending — From Customers</h2>
            <p className="text-xs text-gray-500 mt-0.5">Jobs awaiting customer payment</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {pendingFromCustomer.length > 0 ? (
              pendingFromCustomer.map((p) => (
                <Link
                  key={p._id}
                  href={`/admin/projects/${p._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-blue-50/50 transition-colors"
                >
                  <div>
                    <span className="text-xs font-mono text-gray-400">{p.projectNumber}</span>
                    <p className="text-sm font-medium text-gray-900">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.customerId?.name || 'Customer'}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-700">${getCustomerAmount(p).toLocaleString()}</span>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No pending customer payments</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
