'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProjectSchedulingChat from '@/components/ProjectSchedulingChat';
import ScheduleManager from '@/components/ScheduleManager';
import { HANDYMAN_MESSAGING_UI_DISABLED } from '@/lib/handymanMessagingUi';
import HandymanMessagingDisabledPlaceholder from '@/components/HandymanMessagingDisabledPlaceholder';

function customerName(customer) {
  if (!customer) return 'Customer';
  if (typeof customer === 'object' && customer.name) return customer.name;
  return 'Customer';
}

function CalendarIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

export default function HandymanMessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;
  const { data: session } = useSession();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(!HANDYMAN_MESSAGING_UI_DISABLED);
  const [showRescheduleChat, setShowRescheduleChat] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  useEffect(() => {
    if (HANDYMAN_MESSAGING_UI_DISABLED || !projectId || !session?.user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          if (!cancelled) setProject(null);
          return;
        }
        const data = await res.json();
        const hm = data.handymanId?._id?.toString?.() || data.handymanId?.toString?.();
        if (hm !== session.user.id) {
          if (!cancelled) setProject(null);
          return;
        }
        if (!cancelled) setProject(data);
      } catch {
        if (!cancelled) setProject(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, session?.user?.id]);

  useEffect(() => {
    if (project && !project.isRescheduling) setShowRescheduleChat(false);
  }, [project?.isRescheduling]);

  if (HANDYMAN_MESSAGING_UI_DISABLED) {
    return (
      <div className="max-w-xl md:max-w-2xl mx-auto -mx-4 sm:mx-auto px-4">
        <HandymanMessagingDisabledPlaceholder variant="thread" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-gray-900 font-semibold">Chat not available</p>
        <p className="text-gray-500 mt-2">You may not have access to this project.</p>
        <button
          type="button"
          onClick={() => router.push('/handyman/messages')}
          className="mt-6 min-h-[48px] px-5 rounded-xl bg-gray-100 text-gray-900 font-semibold"
        >
          Back to inbox
        </button>
      </div>
    );
  }

  const title = project.title || 'Project';
  const cname = customerName(project.customerId);
  const showScheduleTools = ['active', 'scheduled'].includes(project.status);

  return (
    <div className="flex flex-col w-full max-w-xl md:max-w-2xl mx-auto -mx-4 sm:mx-auto min-h-0 h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] overflow-hidden md:h-[calc(100vh-9.5rem)] md:max-h-[calc(100vh-9.5rem)]">
      {/* Strict column: fills viewport above mobile tab bar; only message list scrolls */}
      <header className="shrink-0 z-30 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate tracking-tight">{cname}</h1>
            <p className="text-sm text-gray-500 truncate mt-0.5">{title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end sm:justify-end">
            {showScheduleTools && (
              <button
                type="button"
                onClick={() => setScheduleModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 rounded-xl border border-gray-300 bg-white text-gray-800 text-sm font-semibold shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <CalendarIcon className="w-5 h-5 text-gray-600" />
                Lock schedule
              </button>
            )}
            <Link
              href={`/handyman/projects/${projectId}`}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-sm hover:bg-gray-800 active:bg-gray-950 transition-colors"
            >
              View project
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-x border-gray-200/80 md:border-x-0">
        <ProjectSchedulingChat
          projectId={projectId}
          project={project}
          variant="thread"
          className="flex-1 min-h-0"
          onRefresh={() => {
            fetch(`/api/projects/${projectId}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => d && setProject(d))
              .catch(() => {});
          }}
        />
      </div>

      {scheduleModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-modal-title"
          onClick={() => setScheduleModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-200 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 id="schedule-modal-title" className="text-lg font-semibold text-gray-900">
                  Lock or update schedule
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Set the visit date and time with the customer. You can stay in this chat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ScheduleManager
              project={project}
              projectId={projectId}
              updatedByName={session?.user?.name || 'handyman'}
              showRescheduleChat={showRescheduleChat}
              onSuccess={(updated) => {
                setProject(updated);
                setScheduleModalOpen(false);
                router.refresh();
              }}
              variant="default"
              className=""
            />
          </div>
        </div>
      )}
    </div>
  );
}
