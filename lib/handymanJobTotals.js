/**
 * Handyman-facing job value: base pay + customer-approved additional costs (via ledger).
 */

export function isAdditionalCostApprovedByCustomer(project, cost) {
  if (!cost?._id || !project?.handymanLedger?.length) return false;
  const id = cost._id?.toString?.() ?? String(cost._id);
  return project.handymanLedger.some((e) => {
    const lid = e.additionalCostId?.toString?.() ?? (e.additionalCostId && String(e.additionalCostId));
    return lid && lid === id;
  });
}

/**
 * Total owed to handyman per ledger (base + approved additionals), or best fallback from quotes/admin estimate.
 */
export function getHandymanUpToDateTotal(project, existingQuotes = []) {
  const quotes = Array.isArray(existingQuotes) ? existingQuotes : [];
  const ledger = project.handymanLedger || [];
  if (ledger.length > 0) {
    return ledger.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }
  const accepted = quotes.find((q) => q.status === 'accepted');
  if (accepted?.totalAmount != null) return Number(accepted.totalAmount);
  const sent = quotes.find((q) => q.status === 'sent');
  if (sent?.totalAmount != null) return Number(sent.totalAmount);
  const draft = quotes.find((q) => q.status === 'handyman_draft');
  if (draft?.totalAmount != null) return Number(draft.totalAmount);
  if (project.quoteBreakdown) {
    return (
      (Number(project.quoteBreakdown.labour) || 0) +
      (Number(project.quoteBreakdown.materials) || 0) +
      (Number(project.quoteBreakdown.other) || 0)
    );
  }
  if (project.quoteAmount != null) return Number(project.quoteAmount);
  return null;
}

/** Same as getHandymanUpToDateTotal but list cards only have `project` (no quotes fetch). */
export function getHandymanUpToDateTotalFromProject(project) {
  return getHandymanUpToDateTotal(project, []);
}

/** True when admin has marked the handyman as paid (status and/or handyman payment record). */
export function isHandymanPaidByAdmin(project) {
  if (!project) return false;
  const s = project.status;
  if (s === 'handyman_paid' || s === 'customer_paid') return true;
  return (project.payments || []).some((p) => p.type === 'handyman');
}

/**
 * Best-effort completion timestamp for handyman payment views (timeline → updatedAt).
 */
export function inferHandymanCompletionDate(project) {
  if (!project) return null;
  const tl = [...(project.timeline || [])].reverse();
  const hit = tl.find((t) => {
    const e = (t.event || '').toLowerCase();
    return (
      e.includes('completed') &&
      (e.includes('status') || e.includes('mark') || e.includes('changed'))
    );
  });
  const d = hit?.date || project.updatedAt || project.createdAt;
  return d ? new Date(d) : null;
}

export function getHandymanBaseAndApprovedParts(project, existingQuotes = []) {
  const ledger = project.handymanLedger || [];
  const baseEntry = ledger.find((e) => e.description === 'Base Pay');
  const approvedAdditional = ledger
    .filter((e) => e.additionalCostId)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  if (baseEntry != null) {
    return {
      base: Number(baseEntry.amount) || 0,
      approvedAdditional,
      total: (Number(baseEntry.amount) || 0) + approvedAdditional,
    };
  }
  const total = getHandymanUpToDateTotal(project, existingQuotes);
  return {
    base: total ?? 0,
    approvedAdditional: 0,
    total: total ?? 0,
  };
}
