'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/customer/login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
