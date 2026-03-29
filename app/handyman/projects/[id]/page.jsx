'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/StatusBadge';
import ScheduleManager from '@/components/ScheduleManager';
import {
  getHandymanUpToDateTotal,
  getHandymanBaseAndApprovedParts,
  isAdditionalCostApprovedByCustomer,
  isHandymanPaidByAdmin,
} from '@/lib/handymanJobTotals';
import PhotoLightbox from '@/components/PhotoLightbox';
import { handymanTelHref } from '@/lib/handymanMessagingUi';

export default function HandymanJobDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState(null);
  const [existingQuotes, setExistingQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  /** @type {null | { type: 'agree' } | { type: 'revise'; lineItems: { description: string; amount: number }[]; totalAmount: number; notes: string }} */
  const [quoteConfirm, setQuoteConfirm] = useState(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [quoteMode, setQuoteMode] = useState(null); // null | 'agree' | 'revise'
  const [lineItems, setLineItems] = useState([{ description: '', amount: '' }]);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [jobNote, setJobNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [additionalCostDesc, setAdditionalCostDesc] = useState('');
  const [additionalCostMaterial, setAdditionalCostMaterial] = useState('');
  const [additionalCostLabor, setAdditionalCostLabor] = useState('');
  const [submittingAdditionalCost, setSubmittingAdditionalCost] = useState(false);
  const [showRescheduleChat, setShowRescheduleChat] = useState(false);
  const [startJobLoading, setStartJobLoading] = useState(false);
  /** Prevents re-seeding revise line items when project poll refetches (was reverting inputs). */
  const reviseLineItemsSeededRef = useRef(false);
  const [photoLightbox, setPhotoLightbox] = useState({ open: false, index: 0 });

  async function fetchJob() {
    try {
      const [projRes, quotesRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/quotes?projectId=${id}`),
      ]);
      if (projRes.ok) setProject(await projRes.json());
      if (quotesRes.ok) {
        const quotes = await quotesRes.json();
        setExistingQuotes(quotes);
      }
    } catch (e) {
      console.error('Failed to fetch job:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user?.id) fetchJob();
  }, [id, session]);

  // Poll project data every 4s so the other user sees chat when reschedule is requested
  useEffect(() => {
    if (!id || !project || !session?.user?.id) return;
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
  }, [id, project, session?.user?.id]);

  useEffect(() => {
    if (project && !project.isRescheduling) setShowRescheduleChat(false);
  }, [project?.isRescheduling]);

  useEffect(() => {
    if (quoteMode !== 'revise') {
      reviseLineItemsSeededRef.current = false;
      return;
    }
    if (!project || reviseLineItemsSeededRef.current) return;
    if (project.quoteBreakdown) {
      const b = project.quoteBreakdown;
      setLineItems([
        { description: 'Labour', amount: String(b.labour || 0) },
        { description: 'Materials', amount: String(b.materials || 0) },
        { description: 'Other', amount: String(b.other || 0) },
      ]);
    } else if (project.quoteAmount) {
      setLineItems([{ description: 'Estimated amount', amount: String(project.quoteAmount) }]);
    }
    reviseLineItemsSeededRef.current = true;
  }, [quoteMode, project]);

  function addLineItem() {
    setLineItems([...lineItems, { description: '', amount: '' }]);
  }

  function removeLineItem(idx) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx, field, value) {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setLineItems(updated);
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const hasMyHandymanDraft = existingQuotes.some(
    (q) =>
      q.status === 'handyman_draft' &&
      String(q.submittedBy?._id || q.submittedBy || '') === String(session?.user?.id || '')
  );
  const waitingOnAdminForQuote =
    project?.status === 'quoted_by_handyman' || (project?.status === 'inquiry' && hasMyHandymanDraft);

  function openReviseQuoteConfirm(e) {
    e.preventDefault();
    const filledItems = lineItems.filter((item) => item.description && item.amount);
    if (filledItems.length === 0) return;
    const mapped = filledItems.map((item) => ({
      description: item.description,
      amount: parseFloat(item.amount),
    }));
    const sum = mapped.reduce((s, item) => s + item.amount, 0);
    setQuoteConfirm({ type: 'revise', lineItems: mapped, totalAmount: sum, notes: quoteNotes });
  }

  async function executeConfirmedQuote() {
    if (!quoteConfirm || !project) return;
    setConfirmSubmitting(true);
    try {
      if (quoteConfirm.type === 'agree') {
        const amount = project.quoteBreakdown
          ? (project.quoteBreakdown.labour || 0) + (project.quoteBreakdown.materials || 0) + (project.quoteBreakdown.other || 0)
          : project.quoteAmount || 0;
        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: id,
            customerId: project.customerId?._id,
            lineItems: [{ description: 'Agreed with initial estimate', amount }],
            totalAmount: amount,
            notes: quoteNotes || 'Reviewed and confirmed — original estimate is accurate.',
          }),
        });
        if (res.ok) {
          setQuoteConfirm(null);
          setQuoteMode(null);
          await fetchJob();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to submit');
        }
      } else {
        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: id,
            customerId: project.customerId?._id,
            lineItems: quoteConfirm.lineItems.map((item) => ({
              description: item.description,
              amount: item.amount,
            })),
            totalAmount: quoteConfirm.totalAmount,
            notes: quoteConfirm.notes,
          }),
        });
        if (res.ok) {
          setQuoteConfirm(null);
          setQuoteMode(null);
          await fetchJob();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to submit quote');
        }
      }
    } catch (e) {
      alert('Failed to submit quote');
    } finally {
      setConfirmSubmitting(false);
    }
  }

  async function handleStartJob() {
    setStartJobLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', updatedBy: session.user.name }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProject(updated);
        await fetchJob();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start job');
      }
    } catch (e) {
      alert('Failed to start job');
    } finally {
      setStartJobLoading(false);
    }
  }

  async function handleMarkCompleted() {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          isChatEnabled: false,
          updatedBy: session.user.name,
        }),
      });
      if (res.ok) fetchJob();
      else {
        const err = await res.json();
        alert(err.error || 'Failed to mark completed');
      }
    } catch (e) {
      alert('Failed to mark completed');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSubmitAdditionalCost(e) {
    e.preventDefault();
    const material = parseFloat(additionalCostMaterial) || 0;
    const labor = parseFloat(additionalCostLabor) || 0;
    if (!additionalCostDesc.trim() && material === 0 && labor === 0) return;
    setSubmittingAdditionalCost(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addAdditionalCost: {
            description: additionalCostDesc.trim() || 'Additional work',
            materialCost: material,
            laborCost: labor,
          },
          updatedBy: session.user.name,
        }),
      });
      if (res.ok) {
        setAdditionalCostDesc('');
        setAdditionalCostMaterial('');
        setAdditionalCostLabor('');
        fetchJob();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add additional cost');
      }
    } catch (e) {
      alert('Failed to add additional cost');
    } finally {
      setSubmittingAdditionalCost(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!jobNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          $push: { timeline: { date: new Date(), event: `Note: ${jobNote}`, by: session.user.name } },
          updatedBy: session.user.name,
        }),
      });
      if (res.ok) {
        setJobNote('');
        fetchJob();
      }
    } catch (e) {
      alert('Failed to add note');
    } finally {
      setSavingNote(false);
    }
  }

  async function handlePhotoSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        const pushVal = data.urls.length > 1 ? { $each: data.urls } : data.urls[0];
        await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            $push: { photos: pushVal },
            updatedBy: session.user.name,
          }),
        });
        fetchJob();
      }
    } catch (err) {
      alert('Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading job details...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Job not found</p>
        <button
          type="button"
          onClick={() => router.push('/handyman/projects')}
          className="mt-4 min-h-[48px] px-4 rounded-xl font-semibold text-blue-700 bg-blue-50 border border-blue-100"
        >
          Back to jobs
        </button>
      </div>
    );
  }

  const customer = project.customerId;
  const addressLine = project.address || customer?.address;
  const mapsHref = addressLine ? `https://maps.google.com/?q=${encodeURIComponent(addressLine)}` : null;
  const canMessageCustomer = ['active', 'scheduled', 'in_progress'].includes(project.status);
  const hideAdminInitialEstimate = project.status !== 'inquiry';
  const showJobWorkspace = project.status === 'in_progress';
  const mySubmittedQuotes = [...existingQuotes]
    .filter((q) =>
      ['handyman_draft', 'sent', 'accepted', 'revised', 'rejected'].includes(q.status)
    )
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const galleryPhotos = (project.photos || []).filter(Boolean);

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-4">
      {/* Back button — touch-friendly */}
      <button
        type="button"
        onClick={() => router.push('/handyman/projects')}
        className="-ml-1 min-h-[48px] py-2 px-3 text-base font-medium text-gray-900 hover:bg-gray-100 flex items-center gap-2 rounded-xl transition-colors"
      >
        <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to jobs
      </button>

      {/* Job Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            {project.projectNumber && (
              <span className="text-xs font-mono text-gray-400">{project.projectNumber}</span>
            )}
            <h1 className="text-lg font-bold text-gray-900">{project.title}</h1>
          </div>
          <StatusBadge
            status={project.status}
            isRescheduling={project.isRescheduling}
            handymanPaidSettled={isHandymanPaidByAdmin(project)}
          />
        </div>
        {project.serviceType && (
          <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs capitalize text-gray-600 mb-3">
            {project.serviceType}
          </span>
        )}
        {(() => {
          const totalVal = getHandymanUpToDateTotal(project, mySubmittedQuotes);
          if (totalVal == null) return null;
          const parts = getHandymanBaseAndApprovedParts(project, mySubmittedQuotes);
          const showBreakdown =
            parts.approvedAdditional > 0 &&
            project.handymanLedger?.some((e) => e.description === 'Base Pay');
          return (
            <div className="rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-3 mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-800">Current total</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">${totalVal.toLocaleString()}</p>
              {showBreakdown && (
                <p className="text-xs text-blue-900/80 mt-1">
                  Base quote ${parts.base.toLocaleString()} + approved add-ons $
                  {parts.approvedAdditional.toLocaleString()}
                </p>
              )}
            </div>
          );
        })()}
        {project.description && (
          <p className="text-sm text-gray-600 mb-3">{project.description}</p>
        )}

        {/* Customer (name only) + job site info (address, phones, on-site contact) */}
        {(customer ||
          addressLine ||
          project.jobSiteContactName ||
          project.jobSiteContactPhone ||
          customer?.phone) && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            {customer && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Customer</p>
                <p className="text-sm font-medium text-gray-900">{customer.name}</p>
              </div>
            )}

            {(addressLine ||
              project.jobSiteContactName ||
              project.jobSiteContactPhone ||
              customer?.phone) && (
              <div className={`space-y-3 ${customer ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job site info</p>
                {project.jobSiteContactName && (
                  <p className="text-sm font-medium text-gray-900">{project.jobSiteContactName}</p>
                )}
                {addressLine && mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline min-w-0 max-w-full"
                  >
                    <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="break-words text-left">{addressLine}</span>
                  </a>
                )}
                {(() => {
                  const siteTel = handymanTelHref(project.jobSiteContactPhone);
                  const custTel = customer?.phone ? handymanTelHref(customer.phone) : null;
                  const displayTel = siteTel || (!project.jobSiteContactPhone ? custTel : null);
                  const displayLabel = project.jobSiteContactPhone || (!project.jobSiteContactPhone ? customer?.phone : null);
                  if (!displayTel || !displayLabel) return null;
                  return (
                    <a
                      href={displayTel}
                      className="inline-flex items-center gap-2 text-base font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      {displayLabel}
                    </a>
                  );
                })()}
              </div>
            )}

            {canMessageCustomer && customer && (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  disabled
                  className="flex w-full min-h-[48px] cursor-not-allowed items-center justify-center gap-2 rounded-xl border-none bg-gray-200 px-4 text-base font-semibold text-gray-500"
                >
                  <svg className="h-5 w-5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  In-app messaging (Coming Soon)
                </button>
                <p className="text-center text-xs text-gray-500 px-1">
                  Please use the phone number above to contact the customer.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Schedule */}
        {(project.scheduledDate || project.scheduledTime) && (
          <div className="border-t border-gray-100 pt-3 mt-3 flex gap-4 text-sm">
            {project.scheduledDate && (
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(project.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            )}
            {project.scheduledTime && (
              <div>
                <p className="text-xs text-gray-400">Time</p>
                <p className="font-medium text-gray-900">{project.scheduledTime}</p>
              </div>
            )}
          </div>
        )}

        {/* Admin's initial estimate — only during inquiry (before handyman submits a quote) */}
        {(project.quoteBreakdown || project.quoteAmount) && !hideAdminInitialEstimate && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs text-gray-400 mb-2">Admin&apos;s Initial Estimate</p>
            {project.quoteBreakdown ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Labour</span>
                  <span>${(project.quoteBreakdown.labour || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Materials</span>
                  <span>${(project.quoteBreakdown.materials || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Other</span>
                  <span>${(project.quoteBreakdown.other || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span>${((project.quoteBreakdown.labour || 0) + (project.quoteBreakdown.materials || 0) + (project.quoteBreakdown.other || 0)).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated amount</span>
                <span className="text-sm font-bold text-gray-700">${project.quoteAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {galleryPhotos.length > 0 && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs text-gray-400 mb-2">Photos</p>
            <div className="flex flex-wrap gap-2">
              {galleryPhotos.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setPhotoLightbox({ open: true, index: i })}
                  className="rounded-lg border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {mySubmittedQuotes.length > 0 && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs text-gray-400 mb-2">Your submitted quote</p>
            <div className="space-y-3">
              {mySubmittedQuotes.map((quote) => (
                <div key={quote._id} className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <StatusBadge status={quote.status} />
                    <span className="text-sm font-bold text-gray-900">${quote.totalAmount?.toLocaleString()}</span>
                  </div>
                  {quote.lineItems?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-600 gap-2">
                      <span className="min-w-0">{item.description}</span>
                      <span className="shrink-0">${item.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  {quote.notes && <p className="text-xs text-gray-500 italic mt-2">{quote.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Created date */}
        {project.createdAt && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <span className="text-xs text-gray-400">
              Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Quote Submission */}
      {project.status === 'inquiry' && !waitingOnAdminForQuote && (
        <div className="space-y-3">
          {/* Option picker — shown when no mode selected */}
          {!quoteMode && (
            <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Review &amp; Quote</h2>
              <p className="text-xs text-gray-500 mb-4">Review the job details above, then choose an option:</p>
              <div className="space-y-2">
                <button
                  onClick={() => setQuoteMode('agree')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Agree with Estimate</p>
                    <p className="text-xs text-gray-500">
                      The initial estimate of {project.quoteBreakdown
                        ? `$${((project.quoteBreakdown.labour || 0) + (project.quoteBreakdown.materials || 0) + (project.quoteBreakdown.other || 0)).toLocaleString()}`
                        : project.quoteAmount ? `$${project.quoteAmount.toLocaleString()}` : 'this job'} looks right
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setQuoteMode('revise')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Submit Revised Quote</p>
                    <p className="text-xs text-gray-500">I want to provide my own breakdown and pricing</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Agree with Estimate form */}
          {quoteMode === 'agree' && (
            <div className="bg-white rounded-xl border-2 border-green-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Confirm Estimate</h2>
                <button onClick={() => setQuoteMode(null)} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
              </div>
              {project.quoteAmount && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg mb-3">
                  <span className="text-sm text-gray-600">Estimated Amount</span>
                  <span className="text-lg font-bold text-gray-900">${project.quoteAmount.toLocaleString()}</span>
                </div>
              )}
              <textarea
                rows={2}
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="Optional notes for admin..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none text-gray-900 mb-3"
              />
              <button
                type="button"
                onClick={() => setQuoteConfirm({ type: 'agree' })}
                className="w-full min-h-[56px] py-3 px-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 transition-colors"
              >
                Submit Quote for Admin Review
              </button>
            </div>
          )}

          {/* Revised Quote form */}
          {quoteMode === 'revise' && (
            <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Submit Revised Quote</h2>
                <button onClick={() => setQuoteMode(null)} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
              </div>

              <form onSubmit={openReviseQuoteConfirm} className="space-y-4">
                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                      />
                      <input
                        type="number"
                        placeholder="$"
                        value={item.amount}
                        onChange={(e) => updateLineItem(idx, 'amount', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add line item
                  </button>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">${totalAmount.toLocaleString()}</span>
                </div>

                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Notes for admin (optional) — explain any changes from the estimate..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-900"
                />

                <button
                  type="submit"
                  className="w-full min-h-[48px] py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Submit Quote for Admin Review
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Quote submitted — waiting on admin */}
      {waitingOnAdminForQuote && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <svg className="w-8 h-8 text-emerald-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-emerald-900">Quote submitted</p>
          <p className="text-xs text-emerald-700 mt-1">Admin will review your quote and send it to the customer.</p>
        </div>
      )}

      {/* Confirm quote before sending to admin */}
      {quoteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => !confirmSubmitting && setQuoteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Confirm your quote</h3>
            <p className="text-sm text-gray-500 mt-1">Review the amounts below before sending to admin.</p>

            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm">
              {quoteConfirm.type === 'agree' && project.quoteBreakdown && (
                <>
                  <div className="flex justify-between text-gray-700">
                    <span>Labor</span>
                    <span className="font-medium">${(project.quoteBreakdown.labour || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Materials</span>
                    <span className="font-medium">${(project.quoteBreakdown.materials || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Other</span>
                    <span className="font-medium">${(project.quoteBreakdown.other || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                    <span>Total</span>
                    <span>
                      $
                      {(
                        (project.quoteBreakdown.labour || 0) +
                        (project.quoteBreakdown.materials || 0) +
                        (project.quoteBreakdown.other || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
              {quoteConfirm.type === 'agree' && !project.quoteBreakdown && (
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Estimated total</span>
                  <span>${(project.quoteAmount || 0).toLocaleString()}</span>
                </div>
              )}
              {quoteConfirm.type === 'revise' &&
                quoteConfirm.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-gray-700 gap-2">
                    <span className="min-w-0 truncate">{item.description}</span>
                    <span className="font-medium shrink-0">${item.amount.toLocaleString()}</span>
                  </div>
                ))}
              {quoteConfirm.type === 'revise' && (
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                  <span>Total</span>
                  <span>${quoteConfirm.totalAmount.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={confirmSubmitting}
                onClick={() => setQuoteConfirm(null)}
                className="flex-1 min-h-[48px] rounded-xl border border-gray-300 bg-gray-100 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={confirmSubmitting}
                onClick={executeConfirmedQuote}
                className="flex-1 min-h-[48px] rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {confirmSubmitting ? 'Sending…' : 'Confirm & Send to Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling: lock time, reschedule flow, current slot + request reschedule */}
      <ScheduleManager
        project={project}
        projectId={id}
        updatedByName={session?.user?.name || 'handyman'}
        showRescheduleChat={showRescheduleChat}
        onSuccess={(updated) => {
          setProject(updated);
          router.refresh();
          fetchJob();
        }}
        variant="default"
        className="space-y-4 sm:space-y-5"
      />

      {/* Start Job — pipeline: scheduled (or legacy active+date) → in_progress */}
      {(project.status === 'scheduled' || (project.status === 'active' && project.scheduledDate)) &&
        project.scheduledDate &&
        !project.isRescheduling &&
        !showRescheduleChat && (
        <div className="bg-white rounded-xl border-2 border-green-300 p-4 sm:p-5 shadow-md ring-1 ring-green-200/60">
          <p className="text-sm font-semibold text-gray-900 mb-1">Start job</p>
          <p className="text-sm text-gray-600 mb-4">Date and time are locked. Begin work when you&apos;re on site.</p>
          <button
            type="button"
            onClick={handleStartJob}
            disabled={startJobLoading}
            className="w-full min-h-[56px] py-3 px-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {startJobLoading ? 'Starting…' : 'Start Job'}
          </button>
        </div>
      )}

      {/* Job execution workspace — status in_progress */}
      {showJobWorkspace && (
        <div className="space-y-5">
          <div className="rounded-xl border-2 border-blue-200 bg-white p-4 sm:p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-1">Job notes &amp; photos</h2>
            <p className="text-xs text-gray-500 mb-4">
              Add on-site notes and photos for the office and customer record.
            </p>

            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 sm:p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline notes</h3>
              <form onSubmit={handleAddNote} className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  value={jobNote}
                  onChange={(e) => setJobNote(e.target.value)}
                  placeholder="e.g. Replaced faucet, checked for leaks..."
                  className="flex-1 min-h-[48px] px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
                />
                <button
                  type="submit"
                  disabled={savingNote || !jobNote.trim()}
                  className="min-h-[48px] px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shrink-0 sm:w-auto w-full"
                >
                  {savingNote ? 'Saving…' : 'Add note'}
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 sm:p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Photo upload</h3>
              <label className="flex min-h-[48px] items-center gap-3 px-3 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/80 transition-colors bg-white">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">{uploadingPhoto ? 'Uploading…' : 'Tap to add job photos'}</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} disabled={uploadingPhoto} className="hidden" />
              </label>
            </div>
          </div>

          {/* Additional Costs */}
          <div className="bg-white rounded-xl border-2 border-amber-200 p-4 sm:p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Add additional costs</h3>
            <p className="text-xs text-gray-500 mb-3">Record extra work beyond the original scope (materials, labor)</p>
            <p className="text-xs text-amber-900/80 mb-4 rounded-lg bg-amber-50/80 border border-amber-100 px-3 py-2">
              Your <span className="font-semibold">Current total</span> at the top includes base pay plus any add-ons the
              customer has already approved.
            </p>
            {project.additionalCosts?.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recorded additional costs</p>
                {project.additionalCosts.map((cost, i) => {
                  const approved = isAdditionalCostApprovedByCustomer(project, cost);
                  return (
                    <div
                      key={cost._id || i}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-gray-900 pr-2">{cost.description || 'Additional work'}</p>
                        <span
                          className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                            approved
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-950 border border-amber-300'
                          }`}
                        >
                          {approved ? 'Approved by Customer' : 'Awaiting Customer Approval'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>Materials: ${(cost.materialCost || 0).toLocaleString()}</span>
                        <span>Labor: ${(cost.laborCost || 0).toLocaleString()}</span>
                        <span className="font-semibold text-gray-900">
                          Line total: ${(cost.totalCost || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <form onSubmit={handleSubmitAdditionalCost} className="space-y-3">
              <input
                type="text"
                value={additionalCostDesc}
                onChange={(e) => setAdditionalCostDesc(e.target.value)}
                placeholder="Description of extra work"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Material cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={additionalCostMaterial}
                    onChange={(e) => setAdditionalCostMaterial(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Labor cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={additionalCostLabor}
                    onChange={(e) => setAdditionalCostLabor(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Total: ${((parseFloat(additionalCostMaterial) || 0) + (parseFloat(additionalCostLabor) || 0)).toLocaleString()}
                </span>
                <button
                  type="submit"
                  disabled={submittingAdditionalCost || (!additionalCostDesc.trim() && !additionalCostMaterial && !additionalCostLabor)}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {submittingAdditionalCost ? 'Adding...' : 'Add Additional Cost'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border-2 border-green-200 p-4 sm:p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-800 mb-3">All done with this job?</p>
            <button
              type="button"
              onClick={handleMarkCompleted}
              disabled={updatingStatus}
              className="w-full min-h-[52px] py-3 px-4 bg-green-600 text-white text-base font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {updatingStatus ? 'Updating…' : 'Mark job completed'}
            </button>
          </div>
        </div>
      )}

      {project.status === 'completed' && (
        <div className="space-y-4">
          {project.additionalCosts?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Additional costs (record)</p>
              <div className="space-y-3">
                {project.additionalCosts.map((cost, i) => {
                  const approved = isAdditionalCostApprovedByCustomer(project, cost);
                  return (
                    <div
                      key={cost._id || i}
                      className="rounded-xl border border-gray-200 bg-gray-50/80 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-gray-900">{cost.description || 'Additional work'}</p>
                        <span
                          className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                            approved
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-950 border border-amber-300'
                          }`}
                        >
                          {approved ? 'Approved by Customer' : 'Awaiting Customer Approval'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>Materials: ${(cost.materialCost || 0).toLocaleString()}</span>
                        <span>Labor: ${(cost.laborCost || 0).toLocaleString()}</span>
                        <span className="font-semibold text-gray-900">
                          Line total: ${(cost.totalCost || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-green-800">Job completed</p>
            <p className="text-xs text-green-700 mt-1">Thank you for completing this project.</p>
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
