'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { HANDYMAN_MESSAGING_UI_DISABLED } from '@/lib/handymanMessagingUi';
import HandymanMessagingDisabledPlaceholder from '@/components/HandymanMessagingDisabledPlaceholder';

const CHAT_OPEN_STATUSES = ['active', 'scheduled', 'in_progress', 'completed'];

function customerName(customer) {
  if (!customer) return 'Customer';
  if (typeof customer === 'object' && customer.name) return customer.name;
  return 'Customer';
}

/** Heuristic “needs attention” — no unread API yet; highlights threads worth opening. */
function threadNeedsAttention(p) {
  if (p.isRescheduling) return true;
  if (p.pendingCustomerAcceptance === true) return true;
  const t = new Date(p.updatedAt || p.createdAt || 0).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 48 * 60 * 60 * 1000;
}

export default function HandymanMessagesInboxPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(!HANDYMAN_MESSAGING_UI_DISABLED);

  useEffect(() => {
    if (HANDYMAN_MESSAGING_UI_DISABLED || !session?.user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects?handymanId=${session.user.id}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const threads = useMemo(
    () => projects.filter((p) => CHAT_OPEN_STATUSES.includes(p.status)),
    [projects]
  );

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(raw);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [loading, threads]);

  if (HANDYMAN_MESSAGING_UI_DISABLED) {
    return (
      <div className="max-w-xl mx-auto md:max-w-none">
        <HandymanMessagingDisabledPlaceholder variant="inbox" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[40vh]">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-base text-gray-500">Loading messages…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto md:max-w-none space-y-6">
      <div className="px-0.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Messages</h1>
        <p className="text-base text-gray-500 mt-1.5">Chats with customers by project</p>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 text-center">
          <p className="text-gray-900 font-bold text-lg">No active chats</p>
          <p className="text-gray-500 mt-2 text-base leading-relaxed max-w-sm mx-auto">
            When a project is active (customer accepted), messaging appears here.
          </p>
          <Link
            href="/handyman/projects"
            className="inline-flex min-h-[48px] items-center justify-center mt-6 px-6 rounded-xl bg-blue-600 text-white text-base font-semibold shadow-sm hover:bg-blue-700 transition-colors"
          >
            View projects
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {threads.map((p, i) => {
            const name = customerName(p.customerId);
            const title = p.title || 'Project';
            const attention = threadNeedsAttention(p);
            return (
              <Link
                key={p._id}
                id={`messages-thread-${p._id}`}
                href={`/handyman/messages/${p._id}`}
                className={`flex w-full items-center gap-3 text-left bg-white border-b border-gray-100 p-4 min-h-[64px] active:bg-slate-50 hover:bg-slate-50/80 transition-colors ${
                  i === threads.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <div className="relative shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {attention && (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-gray-900 truncate">{name}</p>
                    {attention && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shrink-0">
                        Update
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 leading-snug">{title}</p>
                  {p.projectNumber && (
                    <p className="text-xs font-mono font-medium text-gray-400 mt-1">{p.projectNumber}</p>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-gray-300 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
