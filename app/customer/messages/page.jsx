'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { pickCustomerChatProject } from '@/lib/customerChatProject';

export default function CustomerMessagesIndexPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id || session.user.role !== 'customer') return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok || cancelled) {
          if (!cancelled) setDone(true);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const pick = pickCustomerChatProject(list);
        if (pick?._id) {
          router.replace(`/customer/messages/${pick._id}`);
          return;
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) setDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, session, status]);

  if (status === 'loading' || !done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] py-16">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-base text-gray-500">Opening messages…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center py-16 px-4">
      <p className="text-lg font-bold text-gray-900">No active conversation</p>
      <p className="text-gray-500 mt-2 text-base leading-relaxed">
        Once your quote is accepted, you can message your handyman here. You can also open chat from any
        project.
      </p>
      <Link
        href="/customer/dashboard"
        className="mt-8 inline-flex min-h-[48px] items-center justify-center px-6 rounded-xl bg-emerald-600 text-white font-semibold shadow-sm hover:bg-emerald-700 transition-colors"
      >
        View my projects
      </Link>
    </div>
  );
}
