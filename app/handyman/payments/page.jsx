'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  getHandymanUpToDateTotalFromProject,
  inferHandymanCompletionDate,
  isHandymanPaidByAdmin,
} from '@/lib/handymanJobTotals';

const TERMINAL_JOB_STATUSES = ['completed', 'handyman_paid', 'customer_paid'];

export default function HandymanPaymentsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/projects?handymanId=${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
      }
    } catch (e) {
      console.error('Payments page fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const completedJobs = useMemo(() => {
    const filtered = projects.filter((p) => TERMINAL_JOB_STATUSES.includes(p.status));
    return [...filtered].sort((a, b) => {
      const da = inferHandymanCompletionDate(a)?.getTime() ?? 0;
      const db = inferHandymanCompletionDate(b)?.getTime() ?? 0;
      return db - da;
    });
  }, [projects]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[40vh]">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-base text-gray-500">Loading payments…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-xl mx-auto md:max-w-none">
      <div className="px-0.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Payments</h1>
        <p className="text-base text-gray-500 mt-1.5">Completed jobs and payout status</p>
      </div>

      {completedJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-500">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-900">No completed jobs yet</p>
          <p className="text-base text-gray-500 mt-2 max-w-sm mx-auto">
            When you finish projects, they will appear here with totals and payment status.
          </p>
          <Link
            href="/handyman/projects"
            className="inline-flex min-h-[48px] items-center justify-center mt-6 px-6 rounded-xl bg-blue-600 text-white text-base font-semibold shadow-sm hover:bg-blue-700 transition-colors"
          >
            View projects
          </Link>
        </div>
      ) : (
        <ul className="space-y-4 list-none p-0 m-0">
          {completedJobs.map((project) => {
            const paid = isHandymanPaidByAdmin(project);
            const total = getHandymanUpToDateTotalFromProject(project);
            const completedAt = inferHandymanCompletionDate(project);
            const dateLabel = completedAt
              ? completedAt.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—';

            return (
              <li key={project._id}>
                <Link
                  href={`/handyman/projects/${project._id}`}
                  className="block bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 transition-all hover:shadow-md hover:border-gray-300 active:scale-[0.998]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      {project.projectNumber && (
                        <span className="text-xs font-mono font-semibold text-gray-500 tracking-wide block mb-1">
                          {project.projectNumber}
                        </span>
                      )}
                      <h2 className="text-lg font-bold text-gray-900 leading-snug">{project.title}</h2>
                    </div>
                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${
                        paid
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-amber-100 text-amber-950 border-amber-300'
                      }`}
                    >
                      {paid ? 'Paid' : 'Pending payment'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600 border-t border-gray-100 pt-3 mt-1">
                    <span>
                      <span className="text-gray-400">Completed</span>{' '}
                      <span className="font-medium text-gray-900">{dateLabel}</span>
                    </span>
                    <span className="text-base font-bold text-gray-900 tabular-nums">
                      Total owed{' '}
                      {total != null ? (
                        <>${total.toLocaleString()}</>
                      ) : (
                        <span className="text-gray-400 font-medium">—</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Base quote + customer-approved add-ons (when applicable).</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
