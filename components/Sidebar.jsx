'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const navSections = [
  {
    items: [
  {
    name: 'AI Messaging',
    href: '/admin/ai-messaging',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    name: 'Projects',
    href: '/admin/projects',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    name: 'Messages',
    href: '/admin/messages',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    name: 'Calendar',
    href: '/admin/calendar',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Payments',
    href: '/admin/payments',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2h-2m-4-1V7a2 2 0 012-2h2a2 2 0 012 2v1" />
      </svg>
    ),
  },
  {
    name: 'Database',
    href: '/admin/database',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4v10M12 11v10" />
      </svg>
    ),
  },
    ],
  },
  {
    heading: 'Users',
    items: [
      {
        name: 'Handymen',
        href: '/admin/users/handymen',
        icon: (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        name: 'Customers',
        href: '/admin/users/customers',
        icon: (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
    ],
  },
  {
    items: [
  {
    name: 'Team',
    href: '/admin/team',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
    ],
  },
];

export default function Sidebar({
  pendingMessages = 0,
  collapsed,
  onToggleCollapse,
  isMobileDrawer = false,
  onDesktopMouseEnter,
  onDesktopMouseLeave,
}) {
  const pathname = usePathname();
  const showCollapsed = !isMobileDrawer && collapsed;

  const asideClass = isMobileDrawer
    ? 'flex flex-col h-full w-full max-w-[min(100vw,20rem)] bg-gray-900 shadow-2xl'
    : `hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-gray-900 transition-all duration-300 ease-out z-0 ${
        collapsed ? 'md:w-16' : 'md:w-64'
      }`;

  return (
    <aside
      className={asideClass}
      onMouseEnter={!isMobileDrawer ? onDesktopMouseEnter : undefined}
      onMouseLeave={!isMobileDrawer ? onDesktopMouseLeave : undefined}
    >
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {isMobileDrawer ? (
          <div className="flex items-center justify-between h-14 min-h-[48px] shrink-0 border-b border-gray-800 px-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span className="text-base font-bold text-white truncate">Menu</span>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white -mr-1"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            className={`flex items-center h-16 min-h-[4rem] border-b border-gray-800 transition-all duration-300 ${
              collapsed ? 'px-2 justify-center' : 'gap-3 px-5'
            }`}
          >
            {!collapsed && (
              <>
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white truncate flex-1 min-w-0">Handy It Out</span>
              </>
            )}
            {collapsed && (
              <div
                className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0"
                title="Hover to expand"
                aria-hidden
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            )}
          </div>
        )}

        <nav
          className={`flex-1 px-3 py-3 md:py-4 space-y-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${showCollapsed ? 'px-2' : ''}`}
        >
          {navSections.map((section, sectionIndex) => (
            <div key={section.heading ?? `section-${sectionIndex}`} className={sectionIndex > 0 ? 'pt-3 mt-1 border-t border-gray-800/80' : ''}>
              {section.heading && (!showCollapsed || isMobileDrawer) && (
                <p className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.heading}</p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={showCollapsed ? item.name : undefined}
                      onClick={() => isMobileDrawer && onToggleCollapse?.()}
                      className={`group flex items-center gap-3 px-3 min-h-[44px] text-sm font-medium rounded-lg transition-colors ${
                        showCollapsed ? 'justify-center px-2' : ''
                      } ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}>
                        {item.icon}
                      </span>
                      {(!showCollapsed || isMobileDrawer) && (
                        <>
                          {item.name}
                          {item.badge && pendingMessages > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center min-w-[22px] min-h-[22px] px-1 rounded-full bg-red-500 text-white text-xs font-bold">
                              {pendingMessages}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`border-t border-gray-800 space-y-3 ${showCollapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
          {!showCollapsed && (
            <div className="px-3 py-2 rounded-lg bg-gray-800/50">
              <p className="text-xs text-gray-500">Service Area</p>
              <p className="text-sm text-gray-300 font-medium">Charlotte, NC Metro</p>
              <p className="text-xs text-gray-500 mt-0.5">Mon–Sat, 8AM–6PM</p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`w-full flex items-center gap-3 px-3 min-h-[44px] text-sm font-medium rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors ${
              showCollapsed ? 'justify-center' : ''
            }`}
            title={showCollapsed ? 'Sign Out' : undefined}
            type="button"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {(!showCollapsed || isMobileDrawer) && 'Sign Out'}
          </button>
        </div>
      </div>
    </aside>
  );
}
