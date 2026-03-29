'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import PhotoLightbox from '@/components/PhotoLightbox';

const ZELLE_HANDLE = '[Insert Zelle Handle Here]';

export default function CustomerProjectDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [requestingReschedule, setRequestingReschedule] = useState(false);
  const [showRescheduleChat, setShowRescheduleChat] = useState(false);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState({ open: false, index: 0 });

  async function fetchData() {
    try {
      const [projRes, quotesRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/quotes?projectId=${id}`),
      ]);
      if (projRes.ok) setProject(await projRes.json());
      if (quotesRes.ok) setQuotes(await quotesRes.json());
    } catch (e) {
      console.error('Failed to fetch:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  // Poll project data every 4s so the other user sees chat when reschedule is requested
  useEffect(() => {
    if (!id || !project) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [id, project]);

  useEffect(() => {
    if (project && !project.isRescheduling) setShowRescheduleChat(false);
  }, [project?.isRescheduling]);

  async function handleRequestReschedule() {
    setRequestingReschedule(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRescheduling: true }),
      });
      if (res.ok) {
        setShowRescheduleChat(true);
        const updated = await res.json();
        setProject(updated);
        router.refresh();
        await fetchData();
      } else {
        const err = await res.json();
        console.error('Request reschedule failed:', err);
        alert(err.error || 'Failed to request reschedule');
      }
    } catch (e) {
      console.error('Request reschedule error:', e);
      alert('Failed to request reschedule');
    } finally {
      setRequestingReschedule(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Project not found</p>
        <Link
          href="/customer/dashboard"
          className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl px-4 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  const latestQuote = [...quotes]
    .filter((q) => q.status === 'sent' || q.status === 'accepted')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const acceptedQuoteId = String(project?.customerAcceptedQuoteId ?? '');
  const latestQuoteId = String(latestQuote?._id ?? '');
  const hasAcceptedLatest = latestQuote && acceptedQuoteId === latestQuoteId;
  const hasNewQuotePending = latestQuote && acceptedQuoteId !== latestQuoteId;
  const pendingAcceptance =
    (project?.pendingCustomerAcceptance === true ||
      (project?.status === 'pending_customer_approval' && project?.pendingCustomerAcceptance !== false) ||
      hasNewQuotePending) &&
    !hasAcceptedLatest;
  const canAccept = pendingAcceptance && !!latestQuote;
  /** Any acceptance after the initial pending_customer_approval quote (revised / in-progress, etc.) */
  const isRevisedQuote = canAccept && project?.status !== 'pending_customer_approval';

  const quoteTotal = latestQuote?.totalAmount ?? project?.quoteAmount ?? 0;
  const additionalCosts = project?.additionalCosts || [];
  const quoteLineItems = latestQuote?.lineItems || [];
  const hasAdditionalInQuote = quoteLineItems.some((i) => String(i?.description || '').startsWith('[Additional]'));
  const additionalTotal = hasAdditionalInQuote ? 0 : additionalCosts.reduce((s, c) => s + (c.totalCost || 0), 0);
  const totalProjectCost = quoteTotal + additionalTotal;
  const amountAlreadyPaid = project?.amountAlreadyPaid ?? 0;
  const balanceDue = Math.max(0, totalProjectCost - amountAlreadyPaid);
  const galleryPhotos = (project.photos || []).filter(Boolean);

  const chatCtaLabel =
    project?.status === 'active'
      ? 'Chat & schedule with handyman'
      : 'Chat with handyman';

  async function executeAcceptQuote() {
    if (!project || !canAccept) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptQuote: true }),
      });
      if (res.ok) {
        setAcceptModalOpen(false);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to accept quote');
      }
    } catch (e) {
      alert('Failed to accept quote');
    } finally {
      setAccepting(false);
    }
  }

  function openAcceptModal() {
    if (!canAccept) return;
    setAcceptModalOpen(true);
  }

  return (
    <div className="relative">
      {/* Main content — hidden when printing */}
      <div className="space-y-6 print:hidden">
      <Link
        href="/customer/dashboard"
        className="inline-flex items-center gap-2 min-h-[48px] px-3 -ml-1 rounded-xl text-base font-medium text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to projects
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6">
          {project?.projectNumber && (
            <span className="text-xs font-mono text-gray-400 block mb-1">{project.projectNumber}</span>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{project?.title ?? 'Project'}</h1>
          <span className="inline-block mt-2">
            <StatusBadge status={project?.status} isRescheduling={project?.isRescheduling} />
          </span>

          {project?.description && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-base text-gray-500">{project.description}</p>
            </div>
          )}

          {project?.serviceType && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Service</h2>
              <p className="text-sm text-gray-600 capitalize">{project.serviceType}</p>
            </div>
          )}

          {project?.handymanId && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Assigned handyman</h2>
              <p className="text-sm text-gray-600">{project.handymanId?.name ?? 'Assigned'}</p>
            </div>
          )}

          {(project?.scheduledDate || project?.scheduledTime) && (
            <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <h2 className="text-sm font-semibold text-cyan-900 mb-1">Scheduled</h2>
              <p className="text-sm text-cyan-800">
                {project?.scheduledDate && new Date(project.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {project?.scheduledDate && project?.scheduledTime && ' at '}
                {project?.scheduledTime}
              </p>
            </div>
          )}

          {galleryPhotos.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {galleryPhotos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setPhotoLightbox({ open: true, index: i })}
                    className="block aspect-square overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200/80 border-0 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    <img
                      src={url}
                      alt={`Project photo ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {latestQuote && (
          <div className="border-t border-gray-200 p-5 sm:p-6 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Your quote</h2>
            <div className="space-y-2">
              {latestQuote.lineItems?.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-3 items-start py-3 px-4 rounded-xl bg-white border border-gray-100 text-base"
                >
                  <span className="text-gray-500">{item?.description}</span>
                  <span className="font-semibold text-gray-900 shrink-0">${(item?.amount || 0).toLocaleString()}</span>
                </div>
              ))}
              {!hasAdditionalInQuote && additionalCosts.length > 0 && additionalCosts.map((c, i) => (
                <div
                  key={`ac-${i}`}
                  className="flex justify-between gap-3 py-3 px-4 rounded-xl bg-white border border-gray-100 text-base"
                >
                  <span className="text-gray-500">[Additional] {c?.description || 'Extra work'}</span>
                  <span className="font-semibold text-gray-900 shrink-0">${(c?.totalCost || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-3 px-1">
                <span>Total project cost</span>
                <span>${totalProjectCost.toLocaleString()}</span>
              </div>
              {amountAlreadyPaid > 0 && (
                <>
                  <div className="flex justify-between text-base text-gray-500 px-1">
                    <span>Previously paid</span>
                    <span>-${amountAlreadyPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200 px-1">
                    <span>Balance due</span>
                    <span>${balanceDue.toLocaleString()}</span>
                  </div>
                </>
              )}
              {amountAlreadyPaid === 0 && (
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 px-1">
                  <span>Total due</span>
                  <span>${balanceDue.toLocaleString()}</span>
                </div>
              )}
            </div>

            {canAccept && (
              <>
                <button
                  type="button"
                  onClick={openAcceptModal}
                  disabled={accepting}
                  className="w-full min-h-[48px] mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRevisedQuote ? 'Accept revised quote' : 'Accept quote'}
                </button>
                {isRevisedQuote && (
                  <p className="mt-3 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    The quote has been updated. Please review and accept the new amount to continue.
                  </p>
                )}
              </>
            )}

            {latestQuote && !pendingAcceptance && (
              <div className="mt-4 py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Quote Accepted</span>
              </div>
            )}
          </div>
        )}

        {!latestQuote && project?.status === 'pending_customer_approval' && (
          <div className="border-t border-gray-200 p-5 sm:p-6 bg-amber-50">
            <p className="text-sm text-amber-800">Quote details are being prepared. Please check back soon.</p>
          </div>
        )}

        {/* Chat — full-screen thread (after quote accepted) */}
        {project?.handymanId && ['active', 'scheduled', 'in_progress', 'completed'].includes(project?.status) && (
          <div className="border-t border-gray-200 p-5 sm:p-6">
            <Link
              href={`/customer/messages/${id}`}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-base font-bold shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition-colors px-4 py-3"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {chatCtaLabel}
            </Link>
            <p className="mt-3 text-sm text-gray-500 text-center">
              Message your handyman and coordinate your visit in one place.
            </p>
            {project?.status === 'completed' && (
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full min-h-[48px] mt-4 rounded-xl bg-gray-100 text-gray-900 font-semibold border border-gray-200 hover:bg-gray-200 active:bg-gray-300 transition-colors px-4 py-3 print:hidden"
              >
                Download statement
              </button>
            )}
          </div>
        )}

        {/* Request Reschedule — when scheduled and not rescheduling */}
        {(project?.status === 'scheduled' || (project?.status === 'active' && project?.scheduledDate)) &&
          project?.scheduledDate &&
          !project?.isRescheduling &&
          !showRescheduleChat && (
          <div className="border-t border-gray-200 p-5 sm:p-6">
            <button
              type="button"
              onClick={handleRequestReschedule}
              disabled={requestingReschedule}
              className="w-full min-h-[48px] py-3 text-base font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestingReschedule ? 'Requesting...' : 'Request Reschedule'}
            </button>
          </div>
        )}

        {/* Payment Options — when completed */}
        {project?.status === 'completed' && (
          <div className="border-t-2 border-emerald-200 p-5 sm:p-6 bg-emerald-50/50">
            <h2 className="text-base font-bold text-emerald-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payment Options
            </h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-36 h-36 rounded-xl border-2 border-dashed border-emerald-300 bg-white flex items-center justify-center">
                  <div className="text-center p-2">
                    <svg className="w-12 h-12 mx-auto text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <p className="text-[10px] text-emerald-600 mt-1 font-medium">Zelle QR Code</p>
                    <p className="text-[9px] text-emerald-500">(Placeholder)</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-900 mb-2">Pay with Zelle</p>
                <p className="text-sm text-emerald-800/90">
                  To settle your balance of <strong>${balanceDue.toLocaleString()}</strong>, send payment via Zelle to:
                </p>
                <p className="mt-2 px-3 py-2 bg-white rounded-lg border border-emerald-200 text-sm font-mono text-emerald-900">
                  {ZELLE_HANDLE}
                </p>
                <p className="mt-2 text-xs text-emerald-700/80">
                  We also accept Cash. Please include your project number ({project?.projectNumber || 'N/A'}) when paying.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Hidden Invoice — visible only when printing */}
      <div className="hidden print:block p-8 max-w-2xl mx-auto">
        <div className="border border-gray-300 rounded-lg p-8 bg-white">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Handy It Out</h1>
            <p className="text-sm text-gray-500 mt-1">Statement</p>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{project?.title ?? 'Project'}</h2>
          {project?.projectNumber && (
            <p className="text-sm text-gray-500 mb-4">Project: {project?.projectNumber}</p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-900">Description</th>
                <th className="text-right py-2 font-semibold text-gray-900">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(quoteLineItems || []).map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">{item?.description ?? ''}</td>
                  <td className="py-2 text-right text-gray-900">${(item.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
              {!hasAdditionalInQuote && (additionalCosts || []).map((c, i) => (
                <tr key={`ac-${i}`} className="border-b border-gray-100">
                  <td className="py-2 text-gray-700">[Additional] {c?.description || 'Extra work'}</td>
                  <td className="py-2 text-right text-gray-900">${(c.totalCost || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 pt-4 border-t-2 border-gray-300 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Total Project Cost</span>
              <span className="font-medium text-gray-900">${totalProjectCost.toLocaleString()}</span>
            </div>
            {amountAlreadyPaid > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Previously Paid</span>
                <span>-${amountAlreadyPaid.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-300">
              <span className="font-semibold text-gray-900">Balance Due</span>
              <span className="text-lg font-bold text-gray-900">${balanceDue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quote acceptance confirmation */}
      {acceptModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-quote-modal-title"
          onClick={() => !accepting && setAcceptModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="accept-quote-modal-title" className="text-lg font-bold text-gray-900">
              Confirm quote acceptance
            </h2>
            <p className="mt-3 text-base text-gray-600 leading-relaxed">
              You are agreeing to the total amount of{' '}
              <span className="font-bold text-gray-900">${totalProjectCost.toLocaleString()}</span>.
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => setAcceptModalOpen(false)}
                disabled={accepting}
                className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl border border-gray-300 bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAcceptQuote}
                disabled={accepting}
                className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl bg-emerald-600 text-white font-semibold shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {accepting ? 'Confirming…' : 'Confirm & accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PhotoLightbox
        photos={galleryPhotos}
        isOpen={photoLightbox.open}
        initialIndex={photoLightbox.index}
        onClose={() => setPhotoLightbox((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
