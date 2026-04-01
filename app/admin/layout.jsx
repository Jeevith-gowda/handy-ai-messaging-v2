'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function AdminLayout({ children }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAIMessagingPage = pathname?.startsWith('/admin/ai-messaging');
  const [pendingMessages, setPendingMessages] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  /** Desktop (md+): sidebar expands while pointer is over it; mobile drawer unchanged. */
  const [sidebarDesktopExpanded, setSidebarDesktopExpanded] = useState(false);

  useEffect(() => {
    if (!session) return;
    async function fetchPending() {
      try {
        const res = await fetch('/api/messages?status=pending_review');
        if (res.ok) {
          const data = await res.json();
          setPendingMessages(data.length);
        }
      } catch (e) {
        // silently fail
      }
    }
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        pendingMessages={pendingMessages}
        collapsed={!sidebarDesktopExpanded}
        onDesktopMouseEnter={() => setSidebarDesktopExpanded(true)}
        onDesktopMouseLeave={() => setSidebarDesktopExpanded(false)}
      />

      {/* Mobile drawer — hamburger toggle only; no hover */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm w-full h-full cursor-default border-0 p-0"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        />
        <div
          id="admin-mobile-drawer"
          className={`absolute inset-y-0 left-0 w-[min(100vw-3rem,20rem)] max-w-full z-[110] shadow-2xl transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            isMobileDrawer
            pendingMessages={pendingMessages}
            collapsed={false}
            onToggleCollapse={() => setMobileMenuOpen(false)}
          />
        </div>
      </div>

      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ${
          sidebarDesktopExpanded ? 'md:pl-64' : 'md:pl-16'
        }`}
      >
        <Navbar user={session?.user} onMenuToggle={() => setMobileMenuOpen((o) => !o)} mobileMenuOpen={mobileMenuOpen} />
        <main
          className={
            isAIMessagingPage
              ? 'flex-1 overflow-hidden'
              : 'flex-1 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pt-6 md:pb-8 lg:p-8'
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
