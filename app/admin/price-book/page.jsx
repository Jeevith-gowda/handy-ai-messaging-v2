'use client';

import { useState, useMemo } from 'react';
import { PRICE_BOOK } from '@/lib/priceBookData';

export default function PriceBookPage() {
  const [search, setSearch] = useState('');
  const [openCategory, setOpenCategory] = useState(PRICE_BOOK[0]?.category ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PRICE_BOOK;
    return PRICE_BOOK.map((cat) => {
      const matchesCategory = cat.category.toLowerCase().includes(q);
      const matchingServices = cat.services.filter(
        (s) => matchesCategory || s.name.toLowerCase().includes(q)
      );
      if (matchingServices.length === 0 && !matchesCategory) return null;
      return {
        ...cat,
        services: matchingServices.length > 0 ? matchingServices : cat.services,
      };
    }).filter(Boolean);
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Price Book</h1>
        <p className="text-sm text-gray-500 mt-1">Standard pricing for common handyman services</p>
      </div>

      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services or categories..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((cat) => {
          const isOpen = openCategory === cat.category;
          return (
            <div
              key={cat.category}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : cat.category)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{cat.category}</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cat.services.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                      >
                        <span className="text-sm font-medium text-gray-900">{s.name}</span>
                        <span className="text-sm font-bold text-blue-600">${s.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No services match your search.</p>
        </div>
      )}
    </div>
  );
}
