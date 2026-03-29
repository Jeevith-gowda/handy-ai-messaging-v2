'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { getHandymanUpToDateTotalFromProject, isHandymanPaidByAdmin } from '@/lib/handymanJobTotals';

const cardBase = 'bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4';

/**
 * Priority 1: inquiry
 * Priority 2: in_progress, scheduled, active
 * Priority 3: quoted_by_handyman, pending_customer_approval
 * Priority 4: completed (handyman not yet paid)
 * Priority 5: paid / archived (handyman_paid, customer_paid, or completed + paid)
 */
function getSortTier(project) {
  const s = project.status;
  const paid = isHandymanPaidByAdmin(project);

  if (s === 'inquiry') return 1;
  if (s === 'in_progress' || s === 'scheduled' || s === 'active') return 2;
  if (s === 'quoted_by_handyman' || s === 'pending_customer_approval') return 3;
  if (s === 'completed' && !paid) return 4;
  if (s === 'handyman_paid' || s === 'customer_paid' || (s === 'completed' && paid)) return 5;
  return 99;
}

function sortProjectsByPriority(a, b) {
  const ta = getSortTier(a);
  const tb = getSortTier(b);
  if (ta !== tb) return ta - tb;
  const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return db - da;
}

/** Filter ids: All + pipeline groups */
const FILTER_OPTIONS = [
  { id: 'All', label: 'All' },
  { id: 'inquiry', label: 'Inquiry' },
  { id: 'active_work', label: 'On the job' },
  { id: 'waiting', label: 'Awaiting approval' },
  { id: 'completed', label: 'Done (unpaid)' },
  { id: 'paid', label: 'Paid' },
];

function projectMatchesFilter(project, filterId) {
  if (filterId === 'All') return true;
  const s = project.status;
  const paid = isHandymanPaidByAdmin(project);

  if (filterId === 'inquiry') return s === 'inquiry';
  if (filterId === 'active_work') return s === 'in_progress' || s === 'scheduled' || s === 'active';
  if (filterId === 'waiting') return s === 'quoted_by_handyman' || s === 'pending_customer_approval';
  if (filterId === 'completed') return s === 'completed' && !paid;
  if (filterId === 'paid') {
    return s === 'handyman_paid' || s === 'customer_paid' || (s === 'completed' && paid);
  }
  return true;
}

function listPhase(project) {
  const s = project.status;
  const draftPending = project.hasHandymanDraftPending === true;
  const badge = (label, className) => ({
    label,
    className: `px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm border ${className}`,
  });
  if (s === 'quoted_by_handyman' || (s === 'inquiry' && draftPending)) {
    return badge('Quote with admin', 'bg-sky-100 text-sky-900 border-sky-300');
  }
  if (s === 'pending_customer_approval') {
    return badge('Awaiting customer', 'bg-amber-100 text-amber-950 border-amber-400');
  }
  if (s === 'scheduled') {
    if (project.isRescheduling) {
      return badge('Rescheduling', 'bg-amber-100 text-amber-950 border-amber-400');
    }
    return badge('Scheduled', 'bg-emerald-100 text-emerald-900 border-emerald-400');
  }
  if (s === 'active') {
    const legacyLocked = Boolean(project.scheduledDate);
    if (legacyLocked && project.isRescheduling) {
      return badge('Rescheduling', 'bg-amber-100 text-amber-950 border-amber-400');
    }
    if (legacyLocked) {
      return badge('Scheduled', 'bg-emerald-100 text-emerald-900 border-emerald-400');
    }
    return badge('Needs scheduling', 'bg-orange-100 text-orange-950 border-orange-400 ring-2 ring-orange-200/90');
  }
  if (s === 'in_progress') {
    return badge('In progress', 'bg-green-100 text-green-900 border-green-400');
  }
  if (s === 'inquiry') {
    return badge('Inquiry', 'bg-amber-100 text-amber-900 border-amber-300');
  }
  if (['completed', 'handyman_paid', 'customer_paid'].includes(s)) {
    if (isHandymanPaidByAdmin(project)) {
      return badge('Paid', 'bg-emerald-500 text-white border-emerald-600 shadow-sm');
    }
    return badge('Completed', 'bg-slate-100 text-slate-800 border-slate-300');
  }
  return badge(s?.replace(/_/g, ' ') || 'Unknown', 'bg-slate-100 text-slate-700 border-slate-300');
}

function FilterFunnelIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

export default function HandymanProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterPanelRef = useRef(null);

  const fetchJobs = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/projects?handymanId=${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!filterMenuOpen) return;
    function handlePointerDown(e) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setFilterMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [filterMenuOpen]);

  const displayedProjects = useMemo(() => {
    const filtered = projects.filter((p) => projectMatchesFilter(p, activeFilter));
    return [...filtered].sort(sortProjectsByPriority);
  }, [projects, activeFilter]);

  const activeFilterLabel = FILTER_OPTIONS.find((f) => f.id === activeFilter)?.label ?? 'All';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[40vh]">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-base text-gray-500">Loading projects…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-xl mx-auto md:max-w-none">
      <div className="px-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Projects</h1>
            <p className="text-base text-gray-500 mt-1.5">All assigned jobs in one place</p>
          </div>
          <div className="relative shrink-0 pt-1" ref={filterPanelRef}>
            <button
              type="button"
              onClick={() => setFilterMenuOpen((o) => !o)}
              className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 rounded-xl text-sm font-semibold border transition-colors ${
                filterMenuOpen || activeFilter !== 'All'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              aria-expanded={filterMenuOpen}
              aria-haspopup="true"
              aria-label="Filter projects"
            >
              <FilterFunnelIcon className="w-5 h-5 shrink-0" />
              <span>Filter</span>
            </button>

            {filterMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 z-50 w-[min(calc(100vw-2rem),22rem)] rounded-2xl border border-gray-200 bg-white shadow-xl py-3 px-2"
                role="menu"
              >
                <p className="px-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</p>
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
                  {FILTER_OPTIONS.map((opt) => {
                    const active = activeFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setActiveFilter(opt.id);
                          setFilterMenuOpen(false);
                        }}
                        className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-colors ${
                          active
                            ? 'bg-blue-50 text-blue-800 border-blue-200 ring-2 ring-blue-500/25'
                            : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        {active && <span className="mr-1.5 text-blue-600" aria-hidden>✓</span>}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="px-2 pt-2 text-xs text-gray-400">Showing: {activeFilterLabel}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick chips when menu closed — optional horizontal scroll on very small screens */}
        {!filterMenuOpen && activeFilter !== 'All' && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">Filtered:</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              {activeFilterLabel}
              <button
                type="button"
                onClick={() => setActiveFilter('All')}
                className="ml-1 min-w-[22px] min-h-[22px] rounded-full hover:bg-blue-100 text-blue-700 font-bold leading-none"
                aria-label="Clear filter"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className={`${cardBase} py-14 text-center`}>
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-900">No projects yet</p>
          <p className="text-base text-gray-500 mt-2">Assigned work will show up here.</p>
        </div>
      ) : displayedProjects.length === 0 ? (
        <div className={`${cardBase} py-12 text-center`}>
          <p className="text-base font-semibold text-gray-900">No projects match this filter</p>
          <p className="text-sm text-gray-500 mt-2">Try another status or clear the filter.</p>
          <button
            type="button"
            onClick={() => setActiveFilter('All')}
            className="mt-4 min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Show all projects
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          {displayedProjects.map((project) => {
            const phase = listPhase(project);
            const detailHref = `/handyman/projects/${project._id}`;
            const needsQuoteAction =
              project.status === 'inquiry' && project.hasHandymanDraftPending !== true;
            const currentJobTotal = getHandymanUpToDateTotalFromProject(project);
            return (
              <div
                key={project._id}
                className={`${cardBase} transition-all duration-200 hover:shadow-md hover:border-gray-300 active:scale-[0.998]`}
              >
                <Link href={detailHref} className="block">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1 pr-2">
                      {project.projectNumber && (
                        <span className="text-xs font-mono font-semibold text-gray-500 tracking-wide block mb-1">
                          {project.projectNumber}
                        </span>
                      )}
                      <h2 className="text-lg font-bold text-gray-900 leading-snug">{project.title}</h2>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <span className={`inline-flex items-center ${phase.className}`}>{phase.label}</span>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-base text-gray-600 line-clamp-2 leading-relaxed">{project.description}</p>
                  )}
                </Link>
                {needsQuoteAction && (
                  <Link
                    href={detailHref}
                    className="mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 text-base font-bold text-amber-950 shadow-sm transition-colors hover:bg-amber-100"
                  >
                    Action required: review &amp; send quote
                    <span aria-hidden className="text-lg leading-none">→</span>
                  </Link>
                )}
                <Link
                  href={detailHref}
                  className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 ${needsQuoteAction ? 'pt-4 border-t border-gray-100' : 'pt-2'}`}
                >
                  <span className="flex items-center gap-2 min-w-0 text-sm font-medium text-gray-600">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate">{project.customerId?.name || 'Customer'}</span>
                  </span>
                  {project.scheduledDate && (
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(project.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {project.scheduledTime && ` · ${project.scheduledTime}`}
                    </span>
                  )}
                  {currentJobTotal != null && (
                    <span className="w-full sm:w-auto text-sm font-bold text-blue-900 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      Current total ${currentJobTotal.toLocaleString()}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
