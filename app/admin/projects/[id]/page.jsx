'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import AdminSchedulingChat from '@/components/AdminSchedulingChat';
import PhotoLightbox from '@/components/PhotoLightbox';

const STATUS_FLOW_MAIN = [
  'inquiry',
  'quoted_by_handyman',
  'pending_customer_approval',
  'active',
  'scheduled',
  'in_progress',
  'completed',
];
const STATUS_COLORS_BAR = {
  inquiry: 'bg-amber-500',
  quoted_by_handyman: 'bg-sky-500',
  pending_customer_approval: 'bg-blue-500',
  active: 'bg-emerald-500',
  scheduled: 'bg-teal-500',
  in_progress: 'bg-green-500',
  completed: 'bg-gray-500',
  handyman_paid: 'bg-teal-500',
  customer_paid: 'bg-teal-500',
};

const RING_BY_STATUS = {
  inquiry: 'amber',
  quoted_by_handyman: 'sky',
  pending_customer_approval: 'blue',
  active: 'emerald',
  scheduled: 'teal',
  in_progress: 'green',
  completed: 'gray',
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [handymen, setHandymen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [timelineNote, setTimelineNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [editLineItems, setEditLineItems] = useState([]);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [adminOverrideDate, setAdminOverrideDate] = useState('');
  const [adminOverrideTime, setAdminOverrideTime] = useState('');
  const [adminOverriding, setAdminOverriding] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState({ open: false, index: 0 });

  async function fetchProject() {
    try {
      const [projRes, msgRes, quoteRes, usersRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/messages?projectId=${id}`),
        fetch(`/api/quotes?projectId=${id}`),
        fetch('/api/users?role=handyman'),
      ]);
      if (projRes.ok) {
        setProject(await projRes.json());
      } else {
        console.error('Project fetch failed:', projRes.status, await projRes.text());
      }
      if (msgRes.ok) setMessages(await msgRes.json());
      if (quoteRes.ok) setQuotes(await quoteRes.json());
      if (usersRes.ok) setHandymen(await usersRes.json());
    } catch (e) {
      console.error('Failed to fetch project:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function advanceStatus(newStatus) {
    const body = { status: newStatus, updatedBy: 'admin' };
    const totalAdditional = (project?.additionalCosts || []).reduce((s, c) => s + (c.totalCost || 0), 0);
    const latestSentQuote = [...(quotes || [])].filter((q) => q.status === 'sent' || q.status === 'accepted').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (newStatus === 'handyman_paid') {
      const handymanQuote = quotes.find((q) => q.status === 'handyman_draft');
      const baseAmount = handymanQuote?.totalAmount ?? project.quoteAmount ?? 0;
      body.paymentAmount = baseAmount + totalAdditional;
      body.paymentType = 'handyman';
    }
    if (newStatus === 'customer_paid') {
      body.paymentAmount = latestSentQuote?.totalAmount ?? project.finalAmount ?? project.quoteAmount;
      body.paymentType = 'customer';
    }
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) fetchProject();
  }

  async function handleReassign(handymanId) {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handymanId: handymanId || null, updatedBy: 'admin' }),
    });
    if (res.ok) {
      setShowReassign(false);
      fetchProject();
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/projects');
  }

  async function addTimelineEntry(e) {
    e.preventDefault();
    if (!timelineNote.trim()) return;
    setSavingTimeline(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        $push: { timeline: { date: new Date(), event: timelineNote, by: 'admin' } },
      }),
    });
    if (res.ok) {
      setTimelineNote('');
      fetchProject();
    }
    setSavingTimeline(false);
  }

  async function saveInternalNote(e) {
    e.preventDefault();
    if (!internalNote.trim()) return;
    setSavingNote(true);

    const existingNotes = project.description || '';
    const separator = existingNotes ? '\n\n---\n' : '';
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const noteEntry = `[${timestamp}] ${internalNote}`;

    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        $push: { timeline: { date: new Date(), event: `Note: ${internalNote}`, by: 'admin' } },
      }),
    });

    setInternalNote('');
    setSavingNote(false);
    fetchProject();
  }

  function startEditQuote(quote) {
    setEditingQuote(quote._id);
    setEditLineItems(quote.lineItems?.map((item) => ({ description: item.description, amount: String(item.amount || '') })) || [{ description: '', amount: '' }]);
  }

  function startUpdateQuoteWithAdditionalCosts() {
    const sentQuote = quotes.find((q) => q.status === 'sent' || q.status === 'accepted');
    const baseItems = sentQuote?.lineItems?.map((item) => ({ description: item.description, amount: String(item.amount || '') })) || [];
    const additionalItems = (project?.additionalCosts || []).map((c) => ({
      description: `[Additional] ${c.description || 'Extra work'}`,
      amount: String(c.totalCost || 0),
    }));
    setEditLineItems([...baseItems, ...additionalItems]);
    setEditingQuote('additional-costs');
  }

  function startReviseQuote() {
    const latestSent = [...(quotes || [])].filter((q) => q.status === 'sent' || q.status === 'accepted').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const items = latestSent?.lineItems?.map((item) => ({ description: item.description, amount: String(item.amount || '') })) || [{ description: '', amount: '' }];
    setEditLineItems(items);
    setEditingQuote('revise');
  }

  function cancelEditQuote() {
    setEditingQuote(null);
    setEditLineItems([]);
  }

  async function handleSendEditedQuote() {
    const filledItems = editLineItems.filter((item) => item.description && item.amount);
    if (filledItems.length === 0) return;
    setSendingQuote(true);

    try {
      const total = filledItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

      const quoteRes = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          customerId: project.customerId?._id,
          lineItems: filledItems.map((item) => ({
            description: item.description,
            amount: parseFloat(item.amount),
          })),
          totalAmount: total,
          status: 'sent',
          notes: editingQuote === 'additional-costs' ? 'Updated quote with additional costs from handyman' : editingQuote === 'revise' ? 'Revised quote sent to customer' : 'Final quote sent to customer (edited from handyman quote)',
        }),
      });

      if (quoteRes.ok) {
        const projectUpdate = { pendingCustomerAcceptance: true, updatedBy: 'admin' };
        if (editingQuote === 'additional-costs') {
          projectUpdate.additionalCostsSentToCustomerAt = new Date().toISOString();
        } else if (editingQuote !== 'revise') {
          projectUpdate.status = 'pending_customer_approval';
        }
        await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectUpdate),
        });
        setEditingQuote(null);
        setEditLineItems([]);
        fetchProject();
      }
    } catch (e) {
      alert('Failed to send quote');
    } finally {
      setSendingQuote(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading project...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Project not found</p>
        <Link href="/admin/projects" className="text-blue-600 text-sm mt-2 inline-block">Back to projects</Link>
      </div>
    );
  }

  const sentQuote = quotes.find((q) => q.status === 'sent' || q.status === 'accepted');
  const hasAdditionalCosts = (project.additionalCosts?.length ?? 0) > 0;
  const totalAdditionalCosts = (project.additionalCosts || []).reduce((sum, c) => sum + (c.totalCost || 0), 0);
  const latestSentQuote = [...(quotes || [])].filter((q) => q.status === 'sent' || q.status === 'accepted').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const quoteTotal = latestSentQuote?.totalAmount ?? project?.quoteAmount ?? 0;
  const quoteLineItems = latestSentQuote?.lineItems || [];
  const hasAdditionalInQuote = quoteLineItems.some((i) => String(i?.description || '').startsWith('[Additional]'));
  const totalProjectCost = hasAdditionalInQuote ? quoteTotal : quoteTotal + totalAdditionalCosts;
  const amountAlreadyPaid = project?.amountAlreadyPaid ?? 0;
  const balanceDue = Math.max(0, totalProjectCost - amountAlreadyPaid);
  const isReopened = project?.isReopened === true;

  const customer = project.customerId;
  const handyman = project.handymanId;
  const isPaid = ['handyman_paid', 'customer_paid'].includes(project.status);
  const effectiveFlowIdx = isPaid ? STATUS_FLOW_MAIN.length : STATUS_FLOW_MAIN.indexOf(project.status);
  const currentIdx = effectiveFlowIdx < 0 ? 0 : effectiveFlowIdx;
  const hasHandymanPayment = project.payments?.some((p) => p.type === 'handyman' || !p.type);
  const hasCustomerPayment = project.payments?.some((p) => p.type === 'customer');
  const showHandymanPaidTag = hasHandymanPayment && !isReopened;
  const showCustomerPaidTag = hasCustomerPayment && !isReopened;

  const handymanLedgerTotal = (project?.handymanLedger || []).reduce((s, e) => s + (e.amount || 0), 0);
  const handymanAmountOwed = handymanLedgerTotal > 0
    ? handymanLedgerTotal
    : (() => {
        const handymanQuote = quotes.find((q) => q.status === 'handyman_draft');
        const baseAmount = handymanQuote?.totalAmount ?? project?.quoteAmount ?? 0;
        const totalAdditional = (project?.additionalCosts || []).reduce((s, c) => s + (c.totalCost || 0), 0);
        return baseAmount + totalAdditional;
      })();

  async function addPayment(type) {
    if (recordingPayment) return;
    if (type === 'handyman' && hasHandymanPayment && !isReopened) return;
    if (type === 'customer' && hasCustomerPayment && !isReopened) return;
    setRecordingPayment(true);
    const body = { addPayment: { type }, updatedBy: 'admin' };
    const totalAdditional = (project?.additionalCosts || []).reduce((s, c) => s + (c.totalCost || 0), 0);
    if (type === 'handyman') {
      body.addPayment.amount = isReopened ? totalAdditional : handymanAmountOwed;
    } else {
      body.addPayment.amount = isReopened ? balanceDue : (latestSentQuote?.totalAmount ?? project?.finalAmount ?? project?.quoteAmount);
    }
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) fetchProject();
    } finally {
      setRecordingPayment(false);
    }
  }

  function recordPayment(type) {
    addPayment(type);
  }

  async function handleReopenJob(e) {
    e.preventDefault();
    if (!reopenReason.trim()) {
      alert('Please provide a reason for reopening');
      return;
    }
    setReopening(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reopenJob: true, reason: reopenReason.trim(), updatedBy: 'admin' }),
      });
      if (res.ok) {
        setShowReopenModal(false);
        setReopenReason('');
        const updated = await res.json();
        setProject(updated);
        router.refresh();
        fetchProject();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reopen job');
      }
    } catch (e) {
      alert('Failed to reopen job');
    } finally {
      setReopening(false);
    }
  }

  async function handleAdminOverrideReschedule(e) {
    e.preventDefault();
    if (!adminOverrideDate || !adminOverrideTime.trim()) {
      alert('Please select both date and time');
      return;
    }
    setAdminOverriding(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminOverrideReschedule: { scheduledDate: adminOverrideDate, scheduledTime: adminOverrideTime.trim() },
          updatedBy: 'admin',
        }),
      });
      if (res.ok) {
        setAdminOverrideDate('');
        setAdminOverrideTime('');
        fetchProject();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to override schedule');
      }
    } catch (e) {
      alert('Failed to override schedule');
    } finally {
      setAdminOverriding(false);
    }
  }

  const galleryPhotos = (project.photos || []).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/projects" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            {project.projectNumber && (
              <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-mono text-gray-500">{project.projectNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={project.status} isRescheduling={project.isRescheduling} />
            {project.serviceType && (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs capitalize text-gray-600">{project.serviceType}</span>
            )}
            {(project.status === 'active' ||
              project.status === 'scheduled' ||
              project.status === 'completed') &&
              (project.scheduledDate || project.scheduledTime) && (
              <span className="px-3 py-1.5 bg-cyan-50 border border-cyan-200 rounded-lg text-sm font-medium text-cyan-800">
                {project.scheduledDate && new Date(project.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {project.scheduledDate && project.scheduledTime && ' at '}
                {project.scheduledTime}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Status Flow Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          {STATUS_FLOW_MAIN.map((status, idx) => {
            const isCompleted = idx < currentIdx || (isPaid && idx === STATUS_FLOW_MAIN.length - 1);
            const isCurrent = idx === currentIdx && !isPaid;
            const isNext = idx === currentIdx + 1 && !isPaid;
            const blockPipelineClick =
              (project.status === 'active' && status === 'scheduled') ||
              (project.status === 'scheduled' && status === 'in_progress');
            const canClickAdvance = isNext && !blockPipelineClick;
            return (
              <div key={status} className="flex items-center flex-1">
                <button
                  onClick={() => (canClickAdvance ? advanceStatus(status) : null)}
                  disabled={!canClickAdvance}
                  className={`flex flex-col items-center flex-1 group ${canClickAdvance ? 'cursor-pointer' : 'cursor-default'}`}
                  title={canClickAdvance ? `Advance to ${status.replace(/_/g, ' ')}` : blockPipelineClick ? 'Set via handyman schedule / start job' : ''}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent ? `${STATUS_COLORS_BAR[status]} text-white ring-4 ring-offset-2 ring-${RING_BY_STATUS[status] || 'gray'}-200`
                    : isCompleted ? 'bg-green-500 text-white'
                    : isNext && !blockPipelineClick ? 'bg-gray-200 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:ring-2 group-hover:ring-blue-300'
                    : isNext && blockPipelineClick ? 'bg-gray-200 text-gray-400'
                    : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className={`mt-1.5 text-xs capitalize ${isCurrent ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                  {canClickAdvance && (
                    <span className="text-[10px] text-blue-500 font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to advance
                    </span>
                  )}
                </button>
                {idx < STATUS_FLOW_MAIN.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        {/* Payment checkboxes — both mandatory for full completion; when isReopened, show Balance Due */}
        {(project.status === 'completed' || isPaid || isReopened) && (
          <div className="mt-6 pt-5 border-t border-gray-200">
            {isReopened && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-900">Reopened — Balance Due</p>
                <p className="text-xs text-amber-800 mt-1">
                  Total: ${totalProjectCost.toLocaleString()} · Previously paid: ${amountAlreadyPaid.toLocaleString()} · <strong>Balance due: ${balanceDue.toLocaleString()}</strong>
                </p>
              </div>
            )}
            <p className="text-xs font-medium text-gray-500 mb-3">{isReopened ? 'Record balance payments' : 'Project completion (both required)'}</p>
            {!isReopened && (project?.handymanLedger?.length > 0 || handymanAmountOwed > 0) && (
              <div className="mb-3 p-3 rounded-lg bg-teal-50/50 border border-teal-100">
                <p className="text-xs font-semibold text-teal-900 mb-1.5">Handyman payout breakdown</p>
                {project?.handymanLedger?.length > 0 ? (
                  <div className="space-y-1 text-xs text-teal-800">
                    {project.handymanLedger.map((e, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{e.description || 'Line item'}</span>
                        <span>${(e.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold pt-1 border-t border-teal-200">
                      <span>Total owed</span>
                      <span>${handymanAmountOwed.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-teal-700">Total owed: ${handymanAmountOwed.toLocaleString()}</p>
                )}
              </div>
            )}
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                showHandymanPaidTag ? 'border-teal-300 bg-teal-50' : 'border-gray-200 hover:border-teal-200 hover:bg-teal-50/50'
              }`}>
                <input
                  type="checkbox"
                  checked={showHandymanPaidTag}
                  onChange={() => !showHandymanPaidTag && !recordingPayment && recordPayment('handyman')}
                  disabled={showHandymanPaidTag || recordingPayment}
                  className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="flex-1 text-sm font-medium text-gray-900">{isReopened ? `Handyman paid (new work $${totalAdditionalCosts.toLocaleString()})` : `Handyman paid ($${handymanAmountOwed.toLocaleString()})`}</span>
                {showHandymanPaidTag && (
                  <span className="text-xs text-teal-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Recorded
                  </span>
                )}
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                showCustomerPaidTag ? 'border-teal-300 bg-teal-50' : 'border-gray-200 hover:border-teal-200 hover:bg-teal-50/50'
              }`}>
                <input
                  type="checkbox"
                  checked={showCustomerPaidTag}
                  onChange={() => !showCustomerPaidTag && !recordingPayment && recordPayment('customer')}
                  disabled={showCustomerPaidTag || recordingPayment}
                  className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="flex-1 text-sm font-medium text-gray-900">{isReopened ? `Customer paid (balance $${balanceDue.toLocaleString()})` : 'Customer paid'}</span>
                {showCustomerPaidTag && (
                  <span className="text-xs text-teal-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Recorded
                  </span>
                )}
              </label>
            </div>
            {showHandymanPaidTag && showCustomerPaidTag && (
              <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-green-800">Fully complete</span>
              </div>
            )}
          </div>
        )}
        {/* Reopen Job — when completed, send back to handyman for rework */}
        {project.status === 'completed' && (
          <div className="mt-6 pt-5 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowReopenModal(true)}
              className="w-full py-2.5 text-sm font-medium text-red-700 bg-white border-2 border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              Reopen Job
            </button>
          </div>
        )}
      </div>

      {/* Two Column: Customer + Handyman */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>
          {customer ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                  {customer.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.phone}</p>
                </div>
              </div>
              {customer.email && <p className="text-xs text-gray-500">{customer.email}</p>}
              {(project.address || customer.address) && (
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {project.address || customer.address}
                </p>
              )}
              {(project.jobSiteContactName || project.jobSiteContactPhone) && (
                <div className="text-xs text-gray-500 pt-1">
                  <span className="font-medium text-gray-600">Job site contact:</span>{' '}
                  {[project.jobSiteContactName, project.jobSiteContactPhone].filter(Boolean).join(' — ')}
                </div>
              )}
              <div className="flex gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
                <span>{customer.jobCount || 0} jobs</span>
                <span>${(customer.totalSpent || 0).toLocaleString()} spent</span>
                {customer.tags?.length > 0 && (
                  <div className="flex gap-1">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] capitalize">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              {customer.notes && <p className="text-xs text-gray-400 italic">{customer.notes}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No customer assigned</p>
          )}

          {/* Quote Breakdown */}
          {(quotes.length > 0 || project.quoteAmount || project.quoteBreakdown) && (
            <div className="mt-5 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                {quotes.length > 0 ? 'Quotes' : 'Initial Estimate'}
              </h4>
              {project.quoteBreakdown && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-2">Initial estimate (admin)</p>
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
                    <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                      <span>Total</span>
                      <span>${((project.quoteBreakdown.labour || 0) + (project.quoteBreakdown.materials || 0) + (project.quoteBreakdown.other || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              {!project.quoteBreakdown && project.quoteAmount && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Initial estimate</span>
                    <span className="font-semibold text-gray-900">${project.quoteAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {quotes.length > 0 && (
              <div className="space-y-4">
                {quotes.map((quote) => {
                  const isHandymanQuote = quote.status === 'handyman_draft';
                  return (
                    <div key={quote._id} className={`rounded-lg p-3 ${isHandymanQuote ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                      {isHandymanQuote && (
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold text-amber-700">Handyman Quote — Review &amp; Edit Before Sending</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={quote.status} />
                          {quote.submittedBy && (
                            <span className="text-xs text-gray-400">by {quote.submittedBy.name}</span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900">${quote.totalAmount?.toLocaleString()}</span>
                      </div>
                      {quote.lineItems?.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-600">
                          <span>{item.description}</span>
                          <span>${item.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                      {quote.notes && (
                        <p className="text-xs text-gray-500 italic mt-2 pt-2 border-t border-gray-200">{quote.notes}</p>
                      )}

                      {/* Edit & Send to Customer — only for handyman_draft quotes */}
                      {isHandymanQuote && ['inquiry', 'quoted_by_handyman'].includes(project.status) && editingQuote !== quote._id && (
                        <div className="mt-3 pt-3 border-t border-amber-200">
                          <button
                            onClick={() => startEditQuote(quote)}
                            className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Edit &amp; Send to Customer
                          </button>
                        </div>
                      )}

                      {/* Inline editor */}
                      {editingQuote === quote._id && (
                        <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
                          <p className="text-xs font-semibold text-gray-700">Adjust pricing before sending to customer:</p>
                          <div className="space-y-2">
                            {editLineItems.map((item, i) => (
                              <div key={i} className="flex gap-2">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => {
                                    const updated = [...editLineItems];
                                    updated[i] = { ...updated[i], description: e.target.value };
                                    setEditLineItems(updated);
                                  }}
                                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                                />
                                <input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => {
                                    const updated = [...editLineItems];
                                    updated[i] = { ...updated[i], amount: e.target.value };
                                    setEditLineItems(updated);
                                  }}
                                  className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                                />
                                {editLineItems.length > 1 && (
                                  <button
                                    onClick={() => setEditLineItems(editLineItems.filter((_, idx) => idx !== i))}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => setEditLineItems([...editLineItems, { description: '', amount: '' }])}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add item
                            </button>
                          </div>
                          <div className="flex justify-between items-center text-sm font-semibold">
                            <span className="text-gray-900">Customer Total</span>
                            <span className="text-gray-900">
                              ${editLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelEditQuote}
                              className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSendEditedQuote}
                              disabled={sendingQuote}
                              className="flex-1 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {sendingQuote ? 'Sending...' : 'Send to Customer & Move to Quoted'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}

              {/* Balance Due breakdown — when customer has paid previously */}
              {amountAlreadyPaid > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-teal-50 border border-teal-200">
                  <p className="text-xs font-semibold text-teal-900 mb-2">Balance Due Summary</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>Total Project Cost</span>
                      <span>${totalProjectCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Previously Paid</span>
                      <span>-${amountAlreadyPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-teal-900 pt-1 border-t border-teal-200">
                      <span>Balance Due</span>
                      <span>${balanceDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Revise Quote — available at any stage until completed */}
              {sentQuote && !['completed', 'handyman_paid', 'customer_paid'].includes(project.status) && editingQuote !== 'revise' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={startReviseQuote}
                    className="w-full py-2.5 text-sm font-medium text-blue-600 border border-blue-300 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Revise Quote
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Edit and send an updated quote to the customer. They will need to accept the new amount.</p>
                </div>
              )}
              {editingQuote === 'revise' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                  <p className="text-xs font-semibold text-gray-700">Revise quote. Customer will need to accept the new amount.</p>
                  <div className="space-y-2">
                    {editLineItems.map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[i] = { ...updated[i], description: e.target.value };
                            setEditLineItems(updated);
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                        />
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[i] = { ...updated[i], amount: e.target.value };
                            setEditLineItems(updated);
                          }}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                        />
                        {editLineItems.length > 1 && (
                          <button
                            onClick={() => setEditLineItems(editLineItems.filter((_, idx) => idx !== i))}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setEditLineItems([...editLineItems, { description: '', amount: '' }])}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add item
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-gray-900">Customer Total</span>
                    <span className="text-gray-900">
                      ${editLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditQuote}
                      className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendEditedQuote}
                      disabled={sendingQuote}
                      className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {sendingQuote ? 'Sending...' : 'Send Revised Quote to Customer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Handyman Card + Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Handyman</h3>
            <button
              onClick={() => setShowReassign(!showReassign)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {showReassign ? 'Cancel' : handyman ? 'Reassign' : 'Assign'}
            </button>
          </div>

          {showReassign && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <select
                defaultValue={handyman?._id || ''}
                onChange={(e) => handleReassign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
              >
                <option value="">Unassigned</option>
                {handymen.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} — {h.skills?.join(', ')} ({h.availability})
                  </option>
                ))}
              </select>
            </div>
          )}

          {handyman ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                  {handyman.name?.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{handyman.name}</p>
                  <p className="text-xs text-gray-500">{handyman.phone}</p>
                </div>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  handyman.availability === 'available' ? 'bg-green-100 text-green-700'
                  : handyman.availability === 'busy' ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
                }`}>
                  {handyman.availability}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {handyman.skills?.map((skill) => (
                  <span key={skill} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 capitalize">{skill}</span>
                ))}
              </div>
              <div className="flex gap-3 text-xs text-gray-500 pt-1">
                <span>${handyman.hourlyRate}/hr</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {handyman.rating}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No handyman assigned</p>
          )}

          {/* Schedule Info */}
          <div className="mt-5 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Schedule</h4>
            <div className="space-y-1.5 text-sm">
              {project.scheduledDate ? (
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(project.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No date scheduled</p>
              )}
              {project.scheduledTime && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="text-gray-900 font-medium">{project.scheduledTime}</span>
                </div>
              )}
              {project.estimatedDuration && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-gray-900 font-medium">{project.estimatedDuration}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div className="mt-5 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat (read-only) + Admin Kill Switch */}
      {project.handymanId &&
        (project.status === 'active' ||
          project.status === 'scheduled' ||
          project.status === 'in_progress' ||
          project.status === 'completed') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Customer / Handyman Chat</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-medium text-gray-700">Enable Customer/Handyman Chat</span>
              <button
                type="button"
                role="switch"
                aria-checked={project.isChatEnabled !== false}
                onClick={async () => {
                  const next = project.isChatEnabled === false;
                  try {
                    const res = await fetch(`/api/projects/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isChatEnabled: next, updatedBy: 'admin' }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setProject(updated);
                    }
                  } catch (e) {
                    console.error('Failed to toggle chat:', e);
                  }
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  project.isChatEnabled !== false ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    project.isChatEnabled !== false ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {project.isChatEnabled === false
              ? 'Chat is paused. Customer and Handyman cannot send messages.'
              : 'Direct messages between Customer and Handyman (read-only)'}
          </p>
          <AdminSchedulingChat projectId={id} embedded />
        </div>
      )}

      {/* Admin Override Reschedule — when scheduled */}
      {(project.status === 'active' || project.status === 'scheduled') &&
        (project.scheduledDate || project.scheduledTime) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Admin Override Reschedule</h3>
          <p className="text-xs text-gray-500 mb-3">
            {project.isRescheduling ? 'Force-lock a new date/time to close the rescheduling chat.' : 'Update the scheduled date and time.'}
          </p>
          <form onSubmit={handleAdminOverrideReschedule} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Date</label>
              <input
                type="date"
                value={adminOverrideDate}
                onChange={(e) => setAdminOverrideDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Time</label>
              <input
                type="time"
                value={adminOverrideTime}
                onChange={(e) => setAdminOverrideTime(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={adminOverriding || !adminOverrideDate || !adminOverrideTime.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adminOverriding ? 'Updating...' : 'Override & Lock Schedule'}
            </button>
          </form>
        </div>
      )}

      {/* Photos + Created Date */}
      {(project.photos?.length > 0 || project.createdAt) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {project.photos?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Photos</h3>
              <div className="flex flex-wrap gap-3">
                {galleryPhotos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setPhotoLightbox({ open: true, index: i })}
                    className="block rounded-lg border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <img
                      src={url}
                      alt={`Project photo ${i + 1}`}
                      className="w-28 h-28 object-cover rounded-lg border border-gray-200 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          {project.createdAt && (
            <div className={project.photos?.length > 0 ? 'mt-4 pt-4 border-t border-gray-100' : ''}>
              <span className="text-xs text-gray-400">
                Created {new Date(project.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Additional Costs (from handyman during in-progress) */}
      {(hasAdditionalCosts || editingQuote === 'additional-costs') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Additional Costs</h3>
          <p className="text-xs text-gray-500 mb-4">Extra work submitted by handyman during the project</p>
          {hasAdditionalCosts && (
            <div className="space-y-3 mb-4">
              {(project?.additionalCosts || []).map((cost, i) => (
                <div key={i} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm font-medium text-gray-900">{cost.description || 'Additional work'}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-600">
                    <span>Materials: ${(cost.materialCost || 0).toLocaleString()}</span>
                    <span>Labor: ${(cost.laborCost || 0).toLocaleString()}</span>
                    <span className="font-semibold text-gray-900">Total: ${(cost.totalCost || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              <p className="text-sm font-semibold text-gray-900">Total additional: ${totalAdditionalCosts.toLocaleString()}</p>
            </div>
          )}
          {sentQuote && hasAdditionalCosts && editingQuote !== 'additional-costs' && (
            <button
              onClick={startUpdateQuoteWithAdditionalCosts}
              className="w-full py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Update Quote with Additional Costs
            </button>
          )}
          {editingQuote === 'additional-costs' && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
              <p className="text-xs font-semibold text-gray-700">Revise quote (original + additional costs). Review and edit before sending:</p>
              <div className="space-y-2">
                {editLineItems.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...editLineItems];
                        updated[i] = { ...updated[i], description: e.target.value };
                        setEditLineItems(updated);
                      }}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-900"
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => {
                        const updated = [...editLineItems];
                        updated[i] = { ...updated[i], amount: e.target.value };
                        setEditLineItems(updated);
                      }}
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-900"
                    />
                    {editLineItems.length > 1 && (
                      <button
                        onClick={() => setEditLineItems(editLineItems.filter((_, idx) => idx !== i))}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setEditLineItems([...editLineItems, { description: '', amount: '' }])}
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add item
                </button>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-900">Customer Total</span>
                <span className="text-gray-900">
                  ${editLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cancelEditQuote}
                  className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEditedQuote}
                  disabled={sendingQuote}
                  className="flex-1 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {sendingQuote ? 'Sending...' : 'Send Updated Quote to Customer'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Records</h3>
        {project.payments?.length > 0 ? (
          <div className="space-y-3">
            {project.payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">${p.amount?.toLocaleString()}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-teal-200/60 text-teal-800 capitalize">
                      {p.type === 'handyman' ? 'To handyman' : p.type === 'customer' ? 'From customer' : 'Payment'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {p.date ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    {p.method && ` • ${p.method}`}
                  </p>
                  {p.notes && <p className="text-xs text-gray-500 mt-1">{p.notes}</p>}
                </div>
                <span className="text-xs font-medium text-teal-700 uppercase">{p.status || 'Recorded'}</span>
              </div>
            ))}
          </div>
        ) : project.status === 'completed' ? (
          <p className="text-sm text-gray-500">Ready to record payment. Use the buttons above to mark handyman paid or customer paid.</p>
        ) : isPaid ? (
          <p className="text-sm text-gray-500">Use the buttons above to record additional payments.</p>
        ) : (
          <p className="text-sm text-gray-500">Payment will be recorded when you mark handyman paid or customer paid.</p>
        )}
      </div>

      {/* Internal Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Internal Note</h3>
        <form onSubmit={saveInternalNote} className="flex gap-3">
          <input
            type="text"
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="e.g. Customer prefers back door entry, bring extra supplies..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
          />
          <button
            type="submit"
            disabled={savingNote || !internalNote.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {savingNote ? 'Saving...' : 'Add Note'}
          </button>
        </form>
      </div>

      {/* Timeline + Conversation — two columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Timeline</h3>

          <form onSubmit={addTimelineEntry} className="flex gap-2 mb-5">
            <input
              type="text"
              value={timelineNote}
              onChange={(e) => setTimelineNote(e.target.value)}
              placeholder="Add an update..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
            />
            <button
              type="submit"
              disabled={savingTimeline || !timelineNote.trim()}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {savingTimeline ? '...' : 'Add'}
            </button>
          </form>

          {project.timeline && project.timeline.length > 0 ? (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {[...project.timeline].reverse().map((entry, i) => {
                  const isNote = entry.event?.startsWith('Note:');
                  return (
                    <div key={i} className="relative flex gap-3 pl-5">
                      <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isNote ? 'bg-amber-400' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm ${isNote ? 'text-amber-800' : 'text-gray-700'}`}>{entry.event}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="text-xs text-gray-400">by {entry.by}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No timeline entries yet</p>
          )}
        </div>

        {/* Conversation Log */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversation</h3>
          {messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg._id} className={`rounded-lg p-3 ${
                  msg.direction === 'inbound' ? 'bg-gray-50' : 'bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${
                      msg.direction === 'inbound' ? 'text-gray-600' : 'text-blue-600'
                    }`}>
                      {msg.direction === 'inbound'
                        ? msg.customerId?.name || 'Customer'
                        : msg.senderType === 'ai' ? 'AI Draft' : 'Admin'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {msg.sentText || msg.originalText || msg.aiDraft || '(empty)'}
                  </p>
                  {msg.status && <StatusBadge status={msg.status} />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No messages for this project</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDelete && (
        <ConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${project.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmStyle="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* Reopen Job Confirmation */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-gray-600/75" onClick={() => !reopening && setShowReopenModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reopen Job</h3>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              This will send the job back to the handyman for rework. Use this when the customer is unhappy with the work. The project will return to In Progress status.
            </p>
            <form onSubmit={handleReopenJob} className="space-y-4">
              <div>
                <label htmlFor="reopen-reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for reopening <span className="text-red-500">*</span>
                </label>
                <input
                  id="reopen-reason"
                  type="text"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Customer requested touch-up on paint finish"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900"
                  disabled={reopening}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !reopening && setShowReopenModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopening || !reopenReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reopening ? 'Reopening...' : 'Reopen Job'}
                </button>
              </div>
            </form>
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
