'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export default function ProjectSchedulingChat({
  projectId,
  project,
  disabled = false,
  onRefresh,
  variant = 'default',
  className = '',
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const isCustomer = session?.user?.role === 'customer';
  const isThread = variant === 'thread';

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!projectId) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/project-chat?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to fetch chat:', e);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchMessages(false);
    const interval = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (loading) return;
    bottomRef.current?.scrollIntoView({ behavior: messages.length ? 'smooth' : 'auto' });
  }, [messages, loading]);

  const isChatPaused = project?.isChatEnabled === false;
  const chatClosedBanner =
    project?.status === 'completed'
      ? 'This project is completed. Chat is closed.'
      : 'Chat has been paused by the administrator.';

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || disabled || sending || isChatPaused) return;
    setSending(true);
    try {
      const res = await fetch('/api/project-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, text: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage('');
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        onRefresh?.();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send message');
      }
    } catch (e) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  if (disabled) return null;

  const scrollBoxClass = isThread
    ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [overscroll-behavior-y:contain]'
    : 'h-48 overflow-y-auto';

  const shellClass = isThread
    ? `flex flex-col flex-1 min-h-0 w-full bg-slate-100/90 ${className}`
    : `bg-white rounded-xl border border-gray-200 p-4 ${className}`;

  const isMine = (m) => m.senderRole === (isCustomer ? 'customer' : 'handyman');

  return (
    <div className={shellClass}>
      {!isThread && (
        <>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Chat with {isCustomer ? 'Handyman' : 'Customer'}
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            {isChatPaused
              ? 'Chat has been paused by the Admin.'
              : 'Message your handyman or customer directly.'}
          </p>
        </>
      )}

      {isThread ? (
        <>
          <div className={`${scrollBoxClass} px-4 py-4 space-y-3`}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-12 px-4">
                No messages yet. Send a professional greeting to start the thread.
              </p>
            ) : (
              messages.map((m) => {
                const mine = isMine(m);
                return (
                  <div key={m._id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[min(85%,28rem)] px-4 py-2.5 text-[15px] leading-snug shadow-sm ${
                        mine
                          ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl'
                          : 'bg-gray-100 text-gray-900 rounded-r-2xl rounded-tl-2xl border border-gray-200/90'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p
                        className={`text-[11px] mt-1.5 tabular-nums ${
                          mine ? 'text-blue-100/90' : 'text-gray-500'
                        }`}
                      >
                        {new Date(m.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} className="h-1 shrink-0" aria-hidden />
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.06)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {isChatPaused ? (
              <div className="py-3 text-center text-sm font-medium text-slate-700 bg-slate-100 rounded-xl border border-slate-200">
                {chatClosedBanner}
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2 items-end">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message…"
                  className="flex-1 min-h-[48px] max-h-32 px-4 py-3 border border-gray-300 rounded-xl text-[15px] focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-gray-900 bg-gray-50/80 touch-manipulation"
                  disabled={sending}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="min-h-[48px] min-w-[88px] px-4 text-[15px] font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors shadow-sm touch-manipulation"
                >
                  {sending ? '…' : 'Send'}
                </button>
              </form>
            )}
          </div>
        </>
      ) : (
        <div
          className={`border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex flex-col flex-1 min-h-0`}
        >
          <div className={`${scrollBoxClass} p-3 space-y-2`}>
            {loading ? (
              <p className="text-sm text-gray-500">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((m) => {
                const mine = isMine(m);
                return (
                  <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-base ${
                        mine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p>{m.text}</p>
                      <p
                        className={`text-xs mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}
                      >
                        {new Date(m.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
          {isChatPaused ? (
            <div className="p-3 border-t border-gray-200 bg-slate-100 text-slate-700 text-sm font-medium min-h-[48px] flex items-center justify-center text-center px-2">
              {chatClosedBanner}
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-2 p-2 border-t border-gray-200 bg-white">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 min-h-[48px] px-3 py-2 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="min-h-[48px] min-w-[48px] px-4 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? '…' : 'Send'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
