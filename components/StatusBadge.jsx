const STATUS_COLORS = {
  inquiry: 'bg-amber-100 text-amber-800',
  quoted_by_handyman: 'bg-sky-100 text-sky-900',
  pending_customer_approval: 'bg-blue-100 text-blue-900',
  active: 'bg-emerald-100 text-emerald-900',
  scheduled: 'bg-teal-100 text-teal-900',
  in_progress: 'bg-green-100 text-green-900',
  completed: 'bg-gray-100 text-gray-800',
  handyman_paid: 'bg-teal-100 text-teal-800',
  customer_paid: 'bg-teal-100 text-teal-800',
  // Quote statuses
  draft: 'bg-gray-100 text-gray-800',
  handyman_draft: 'bg-amber-100 text-amber-800',
  sent: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  revised: 'bg-orange-100 text-orange-800',
  // Message statuses
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-500',
};

/** Human-readable labels for project pipeline statuses */
const STATUS_LABELS = {
  quoted_by_handyman: 'Quoted by Handyman',
  pending_customer_approval: 'Pending Customer Approval',
  active: 'Active',
  in_progress: 'In progress',
};

export default function StatusBadge({ status, isRescheduling, handymanPaidSettled }) {
  const showRescheduling = isRescheduling && (status === 'active' || status === 'scheduled');
  const showHandymanPaid =
    handymanPaidSettled &&
    ['completed', 'handyman_paid', 'customer_paid'].includes(status);

  if (showHandymanPaid) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-sm border border-emerald-600">
        Paid
      </span>
    );
  }

  const colors = showRescheduling ? 'bg-amber-100 text-amber-800' : (STATUS_COLORS[status] || 'bg-gray-100 text-gray-600');
  const rawLabel = showRescheduling ? 'Rescheduling' : (STATUS_LABELS[status] || status?.replace(/_/g, ' ') || 'unknown');

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {showRescheduling && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
      {rawLabel}
    </span>
  );
}
