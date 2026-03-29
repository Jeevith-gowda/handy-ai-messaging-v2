'use client';

import { useState, useEffect } from 'react';

const TABLES = ['Customers', 'Messages', 'Handymen', 'Projects'];

export default function DatabaseExplorerPage() {
  const [activeTable, setActiveTable] = useState('Customers');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/database-explorer?model=${activeTable}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const result = await res.json();
        setData(result);
      } catch (e) {
        setData({ error: e.message });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeTable]);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Database Explorer</h1>
          <p className="text-gray-500 mt-1.5 text-sm md:text-base">Raw JSON inspector for structural debugging and verification.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TABLES.map(table => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activeTable === table 
                  ? 'bg-gray-900 text-white shadow-md' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {table}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-gray-900 rounded-2xl shadow-xl border border-gray-800 overflow-hidden flex flex-col relative w-full">
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center">
            <span className="text-green-400 font-mono text-xs md:text-sm truncate mr-4">
              db.{activeTable.toLowerCase()}.find().sort(&#123; createdAt: -1 &#125;).limit(50)
            </span>
          </div>
          {loading && <span className="text-blue-400 text-xs font-mono animate-pulse shrink-0">FETCHING...</span>}
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
          {data ? (
            <pre className="text-green-400 text-[12px] md:text-[13px] font-mono whitespace-pre-wrap break-all md:break-words">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : !loading && (
            <span className="text-gray-500 font-mono text-sm">No data returned.</span>
          )}
        </div>
      </div>
    </div>
  );
}
