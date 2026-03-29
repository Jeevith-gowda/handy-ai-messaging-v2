'use client';

import { useSession } from 'next-auth/react';
import CustomerProjectsList from '@/components/CustomerProjectsList';

const cardClass = 'bg-white rounded-2xl shadow-sm p-5 mb-4 border border-gray-100';

export default function CustomerDashboard() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      <div
        className={`${cardClass} overflow-hidden relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 border-0 text-white shadow-lg`}
      >
        <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">Welcome, {firstName}</h1>
          <p className="mt-2 text-emerald-100 text-base">Track your projects and updates in one place.</p>
        </div>
      </div>

      <CustomerProjectsList />
    </div>
  );
}
