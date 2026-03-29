'use client';

import { useState, useMemo } from 'react';
import { PRICE_BOOK } from '@/lib/priceBookData';

export default function PriceBookModal({ onClose, onSelectPrice }) {
  const [search, setSearch] = useState('');

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

  const handleSelect = (price) => {
    onSelectPrice?.(price);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="fixed inset-0 bg-gray-600/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white shadow-xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Price Book</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filtered.map((cat) => (
            <div key={cat.category}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {cat.category}
              </p>
              <div className="space-y-1">
                {cat.services.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(s.price)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors text-left"
                  >
                    <span className="text-sm text-gray-900">{s.name}</span>
                    <span className="text-sm font-bold text-blue-600">${s.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No services match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
