'use client';

import { useEffect, useState } from 'react';

export default function AdminSchedulingChat({ projectId, embedded = false }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let isMounted = true;

    async function fetchMessages(showLoading = true) {
      if (showLoading) setLoading(true);
      try {
        const res = await fetch(`/api/project-chat?projectId=${projectId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (isMounted) console.error('Failed to fetch scheduling chat:', e);
      } finally {
        if (isMounted && showLoading) setLoading(false);
      }
    }

    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [projectId]);

  const content = (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
        <div className="h-48 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <p className="text-xs text-gray-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-gray-500">No scheduling messages</p>
          ) : (
            messages.map((m) => (
              <div
                key={m._id}
                className={`flex ${m.senderRole === 'handyman' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                    m.senderRole === 'handyman'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-[10px] font-medium opacity-80 mb-0.5 capitalize">{m.senderRole}</p>
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.senderRole === 'handyman' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
  );

  if (embedded) return content;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Scheduling Chat</h3>
      <p className="text-xs text-gray-500 mb-3">Direct messages between Customer and Handyman to agree on a start time (read-only)</p>
      {content}
    </div>
  );
}
