'use client';

import Link from 'next/link';

/**
 * Shown when HANDYMAN_MESSAGING_UI_DISABLED — keeps nav tab but masks chat UI.
 * @param {'inbox' | 'thread'} variant
 */
export default function HandymanMessagingDisabledPlaceholder({ variant = 'inbox' }) {
  const linkHref = variant === 'thread' ? '/handyman/messages' : '/handyman/projects';
  const linkLabel = variant === 'thread' ? 'Back to Messages' : 'View projects';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-[min(70dvh,32rem)] max-w-md mx-auto">
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-5 ring-1 ring-slate-200/80"
        aria-hidden
      >
        <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
      <p className="text-base text-gray-600 mt-3 leading-relaxed">
        Messaging will be available in future phases.
      </p>
      <Link
        href={linkHref}
        className="mt-8 inline-flex min-h-[48px] items-center justify-center px-6 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
