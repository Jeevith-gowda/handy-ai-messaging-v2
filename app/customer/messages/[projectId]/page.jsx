'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProjectSchedulingChat from '@/components/ProjectSchedulingChat';

function handymanDisplayName(handyman) {
  if (!handyman) return 'Handyman';
  if (typeof handyman === 'object' && handyman.name) return handyman.name;
  return 'Handyman';
}

const CHAT_STATUSES = ['active', 'scheduled', 'in_progress', 'completed'];

export default function CustomerMessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;
  const { data: session, status: sessionStatus } = useSession();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === 'loading' || !projectId || !session?.user?.id) return;
    if (session.user.role !== 'customer') return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          if (!cancelled) setProject(null);
          return;
        }
        const data = await res.json();
        const custId = data.customerId?._id?.toString?.() || data.customerId?.toString?.();
        if (custId !== session.user.id) {
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
  }, [projectId, session?.user?.id, session?.user?.role, sessionStatus]);

  useEffect(() => {
    if (!projectId || !project || sessionStatus === 'loading' || session?.user?.role !== 'customer') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const custId = data.customerId?._id?.toString?.() || data.customerId?.toString?.();
          if (custId === session.user.id) setProject(data);
        }
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId, project, session?.user?.id, session?.user?.role, sessionStatus]);

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project || !CHAT_STATUSES.includes(project.status)) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-gray-900 font-semibold">Chat isn&apos;t available</p>
        <p className="text-gray-500 mt-2 text-base">
          Open this thread after your quote is accepted, or return to your project.
        </p>
        <Link
          href={projectId ? `/customer/projects/${projectId}` : '/customer/dashboard'}
          className="mt-6 inline-flex min-h-[48px] items-center justify-center px-5 rounded-xl bg-emerald-600 text-white font-semibold"
        >
          Back to project
        </Link>
      </div>
    );
  }

  const hname = handymanDisplayName(project.handymanId);
  const title = project.title || 'Project';

  return (
    <div className="flex flex-col w-full max-w-xl md:max-w-2xl mx-auto -mx-4 sm:mx-auto min-h-0 h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)] overflow-hidden md:h-[calc(100vh-9.5rem)] md:max-h-[calc(100vh-9.5rem)]">
      <header className="shrink-0 z-30 min-h-[4.25rem] flex items-center bg-white border-b border-gray-200 px-3 sm:px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
          <Link
            href={`/customer/projects/${projectId}`}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 sm:px-3 rounded-xl text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate">Back to project</span>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate tracking-tight">{hname}</h1>
            <p className="text-sm text-gray-500 truncate">{title}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-50 border-x border-gray-200/80 md:border-x-0">
        <ProjectSchedulingChat
          projectId={projectId}
          project={project}
          variant="thread"
          className="flex-1 min-h-0"
          onRefresh={() => {
            fetch(`/api/projects/${projectId}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                if (!d) return;
                const custId = d.customerId?._id?.toString?.() || d.customerId?.toString?.();
                if (custId === session?.user?.id) setProject(d);
              })
              .catch(() => {});
          }}
        />
      </div>
    </div>
  );
}
