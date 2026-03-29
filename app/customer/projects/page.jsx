'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Projects list lives on /customer/dashboard — keep this route for bookmarks and redirects.
 */
export default function CustomerProjectsIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/customer/dashboard');
  }, [router]);
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
