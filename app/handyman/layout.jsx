'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

function ProjectsIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function MessagesIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function PaymentsIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function ProfileIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default function HandymanLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isProjects = pathname === '/handyman/projects' || pathname?.startsWith('/handyman/projects/');
  const isMessages = pathname?.startsWith('/handyman/messages');
  const isPayments = pathname === '/handyman/payments' || pathname?.startsWith('/handyman/payments/');
  const isProfile = pathname?.startsWith('/handyman/profile');

  const mobileNavItem = (href, label, Icon, active) => (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center min-h-[52px] flex-1 min-w-0 rounded-xl py-1 transition-colors active:scale-[0.98] ${
        active ? 'text-blue-700' : 'text-gray-500'
      }`}
    >
      <Icon active={active} />
      <span className={`text-[10px] sm:text-[11px] font-semibold mt-1 leading-tight text-center px-0.5 ${active ? 'text-blue-700' : 'text-gray-500'}`}>{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-base text-gray-900 antialiased">
      {/* Desktop header only — no mobile top bar */}
      <header className="hidden md:block sticky top-0 z-[90] bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between h-16 px-4 lg:px-8 max-w-4xl mx-auto gap-4">
          <h1 className="text-lg font-bold text-gray-900 truncate shrink-0">Handy It Out</h1>
          <nav className="flex items-center gap-1 flex-1 justify-center flex-wrap">
            <Link
              href="/handyman/projects"
              className={`min-h-[48px] px-3 lg:px-4 rounded-xl text-sm lg:text-base font-semibold inline-flex items-center ${isProjects ? 'text-blue-700 bg-blue-50 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Projects
            </Link>
            <Link
              href="/handyman/messages"
              className={`min-h-[48px] px-3 lg:px-4 rounded-xl text-sm lg:text-base font-semibold inline-flex items-center ${isMessages ? 'text-blue-700 bg-blue-50 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Messages
            </Link>
            <Link
              href="/handyman/payments"
              className={`min-h-[48px] px-3 lg:px-4 rounded-xl text-sm lg:text-base font-semibold inline-flex items-center ${isPayments ? 'text-blue-700 bg-blue-50 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Payments
            </Link>
            <Link
              href="/handyman/profile"
              className={`min-h-[48px] px-3 lg:px-4 rounded-xl text-sm lg:text-base font-semibold inline-flex items-center ${isProfile ? 'text-blue-700 bg-blue-50 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Profile
            </Link>
          </nav>
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <span className="text-sm text-gray-500 truncate max-w-[120px] lg:max-w-[160px]">{session.user.name}</span>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm">
              {session.user.name?.charAt(0)?.toUpperCase() || 'H'}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto px-4 py-4 sm:p-5 md:px-6 lg:px-8 md:py-6 pb-24 md:pb-10">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] w-full bg-white border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Primary"
      >
        <div className="flex justify-around items-stretch max-w-lg mx-auto px-0.5 pt-1 gap-0.5">
          {mobileNavItem('/handyman/projects', 'Projects', ProjectsIcon, isProjects)}
          {mobileNavItem('/handyman/messages', 'Messages', MessagesIcon, isMessages)}
          {mobileNavItem('/handyman/payments', 'Payments', PaymentsIcon, isPayments)}
          {mobileNavItem('/handyman/profile', 'Profile', ProfileIcon, isProfile)}
        </div>
      </nav>
    </div>
  );
}
