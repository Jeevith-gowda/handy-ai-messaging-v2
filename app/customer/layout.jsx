'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

function ProjectsIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function MessagesIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default function CustomerLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;
    if (pathname === '/customer/login') return;
    if (!session) {
      router.push('/customer/login');
      return;
    }
    if (session.user.role !== 'customer') {
      if (session.user.role === 'admin') router.push('/admin/dashboard');
      else router.push('/handyman/projects');
      return;
    }
  }, [session, status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLoginPage = pathname === '/customer/login';
  if (isLoginPage) return <>{children}</>;

  if (!session || session.user.role !== 'customer') {
    return null;
  }

  const isProjectsTab =
    pathname === '/customer/dashboard' || pathname.startsWith('/customer/projects');
  const isMessagesTab = pathname.startsWith('/customer/messages');

  const linkBase =
    'rounded-lg text-sm font-medium transition-colors flex items-center justify-center';
  const linkIdle = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  const linkActive = 'bg-emerald-50 text-emerald-700';

  const mobileNavItem = (href, label, Icon, active) => (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center min-h-[52px] flex-1 max-w-[34%] rounded-xl py-1 transition-colors active:scale-[0.98] ${
        active ? 'text-emerald-700' : 'text-gray-500'
      }`}
    >
      <Icon active={active} />
      <span className={`text-[11px] font-semibold mt-1 ${active ? 'text-emerald-700' : 'text-gray-500'}`}>{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-base">
      {/* Viewport zoom limits are set globally in app/layout.jsx (maximumScale: 1, userScalable: false). */}
      <header className="hidden md:block sticky top-0 z-[90] bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 print:hidden">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link href="/customer/dashboard" className="flex items-center gap-2 shrink-0 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 truncate">Handy It Out</span>
            </Link>

            <nav className="flex items-center gap-1 flex-1 justify-center">
              <Link
                href="/customer/dashboard"
                className={`px-4 py-2 ${linkBase} ${isProjectsTab ? linkActive : linkIdle}`}
              >
                My Projects
              </Link>
              <Link
                href="/customer/messages"
                className={`px-4 py-2 ${linkBase} ${isMessagesTab ? linkActive : linkIdle}`}
              >
                Messages
              </Link>
            </nav>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => router.push('/api/auth/signout?callbackUrl=/customer/login')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto print:p-0 pt-4 sm:pt-6 lg:pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 lg:pb-8 text-gray-900">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] w-full bg-white border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Primary"
      >
        <div className="flex justify-around items-stretch max-w-lg mx-auto px-1 pt-1">
          {mobileNavItem('/customer/dashboard', 'Projects', ProjectsIcon, isProjectsTab)}
          {mobileNavItem('/customer/messages', 'Messages', MessagesIcon, isMessagesTab)}
          <button
            type="button"
            onClick={() => router.push('/api/auth/signout?callbackUrl=/customer/login')}
            className="flex flex-col items-center justify-center min-h-[52px] flex-1 max-w-[34%] rounded-xl py-1 text-gray-500 active:scale-[0.98] transition-colors hover:text-gray-800"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="text-[11px] font-semibold mt-1 text-gray-500">Sign out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
