'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Navbar({ user, onMenuToggle, mobileMenuOpen = false, pageTitle = '' }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-[90] bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between min-h-[3.5rem] h-14 md:h-16 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            aria-expanded={mobileMenuOpen}
            aria-controls="admin-mobile-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 truncate">
            {pageTitle || 'Handy It Out'}
          </h2>
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 md:gap-3 min-h-[44px] pr-1 pl-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-expanded={showDropdown}
            aria-haspopup="true"
          >
            <span className="text-sm text-gray-600 hidden sm:block max-w-[160px] truncate">{user?.name}</span>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </button>

          {showDropdown && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[95] cursor-default bg-transparent border-0 p-0"
                onClick={() => setShowDropdown(false)}
                aria-label="Close account menu"
              />
              <div className="absolute right-0 mt-1 w-52 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-[96]">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full text-left px-4 min-h-[44px] text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
