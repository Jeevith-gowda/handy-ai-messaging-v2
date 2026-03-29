'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-lg mx-auto md:max-w-none">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Profile</h1>
        <p className="text-gray-500 mt-1 text-base">Account & preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
            {session?.user?.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900 truncate">{session?.user?.name || 'Customer'}</p>
            <p className="text-sm text-gray-500 truncate">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Explore</h2>
        <Link
          href="/customer/diy"
          className="flex items-center justify-between min-h-[48px] py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 font-medium active:bg-gray-100 transition-colors"
        >
          DIY tutorials
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/customer/projects"
          className="flex items-center justify-between min-h-[48px] py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-900 font-medium active:bg-gray-100 transition-colors"
        >
          Your projects
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <button
        type="button"
        onClick={() => router.push('/api/auth/signout?callbackUrl=/customer/login')}
        className="w-full min-h-[48px] py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-900 font-semibold bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
