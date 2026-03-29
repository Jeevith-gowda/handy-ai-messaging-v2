'use client';

import { useEffect, useState, useRef } from 'react';

const POLL_INTERVAL_MS = 4000;

function formatPhone(phone) {
  if (!phone) return 'Unknown';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return phone;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString();
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isAiDraft, setIsAiDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const pollRef = useRef(null);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Allow a 100px buffer to safely define "bottom" explicitly.
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  async function fetchConversations() {
    try {
      const res = await fetch('/api/quo/conversations');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load conversations (${res.status})`);
      }
      const data = await res.json();
      const list = data?.data ?? data?.conversations ?? data?.items ?? (Array.isArray(data) ? data : []);
      setConversations(Array.isArray(list) ? list : []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(participant) {
    if (!participant) {
      setMessages([]);
      return;
    }
    try {
      const res = await fetch(`/api/quo/messages?participants=${encodeURIComponent(participant)}`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      const list = data?.data ?? data?.messages ?? data ?? [];
      const sorted = (Array.isArray(list) ? list : []).sort(
        (a, b) => new Date(a.createdAt || a.dateCreated || 0) - new Date(b.createdAt || b.dateCreated || 0)
      );
      setMessages(sorted);
    } catch (e) {
      setMessages([]);
    }
  }

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  async function fetchUnreadCounts() {
    try {
      const res = await fetch('/api/messages/unread');
      if (res.ok) setUnreadMap(await res.json());
    } catch {
      // silent
    }
  }

  function handleSelectParticipant(participant) {
    setSelectedParticipant(participant);
    isAtBottomRef.current = true;
    
    const conv = displayList.find(c => {
      const pArr = c.participants ?? c.phoneNumbers ?? c.participant ?? [];
      const arr = Array.isArray(pArr) ? pArr : [pArr].filter(Boolean);
      const ph = arr.map((x) => (typeof x === 'string' ? x : x?.phoneNumber ?? x?.number ?? x)).find(Boolean);
      return ph === participant;
    });

    setInputText('');
    setIsAiDraft(false);

    if (unreadMap[participant]) {
      setUnreadMap((prev) => ({ ...prev, [participant]: 0 }));
      fetch('/api/messages/unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: participant })
      }).catch(console.error);
    }
  }

  useEffect(() => {
    fetchConversations();
    fetchUnreadCounts();
  }, []);

  useEffect(() => {
    setMessages([]);
    fetchMessages(selectedParticipant);

    if (!selectedParticipant) {
      if (pollRef.current) clearInterval(pollRef.current);
      // Poll global list
      pollRef.current = setInterval(() => {
        fetchConversations();
        fetchUnreadCounts();
      }, POLL_INTERVAL_MS);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }

    pollRef.current = setInterval(() => {
      fetchMessages(selectedParticipant);
      fetchConversations();
      fetchUnreadCounts();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedParticipant]);

  // Auto-Prefill AI Draft from the most recent incoming message
  useEffect(() => {
    if (messages.length > 0 && selectedParticipant) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.aiDraft && (!inputText || isAiDraft)) {
        setInputText(lastMsg.aiDraft);
        setIsAiDraft(true);
      }
    }
  }, [messages, selectedParticipant]);

  async function handleSend(e) {
    e?.preventDefault();
    const text = inputText?.trim();
    if (!text || !selectedParticipant || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/quo/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedParticipant, content: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send');
      }

      setInputText('');
      setIsAiDraft(false);
      await fetchMessages(selectedParticipant);
    } catch (e) {
      alert(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const getParticipants = (c) => {
    const p = c.participants ?? c.phoneNumbers ?? c.participant ?? [];
    const arr = Array.isArray(p) ? p : [p].filter(Boolean);
    return arr.map((x) => (typeof x === 'string' ? x : x?.phoneNumber ?? x?.number ?? x)).filter(Boolean);
  };

  const convosWithParticipants = conversations
    .map((c) => ({ ...c, participants: getParticipants(c) }))
    .filter((c) => c.participants.length > 0);

  const displayList = convosWithParticipants.sort((a, b) => {
    const timeA = new Date(a.lastMessageAt ?? a.updatedAt ?? a.createdAt ?? 0);
    const timeB = new Date(b.lastMessageAt ?? b.updatedAt ?? b.createdAt ?? 0);
    return timeB - timeA;
  });

  const selectedConv = selectedParticipant ? displayList.find(c => c.participants.includes(selectedParticipant)) : null;

  return (
    <div className="flex-1 w-full h-[calc(100vh-64px)] flex flex-col relative overflow-hidden bg-gray-50">
      <div className="bg-red-600 text-white text-center py-2 font-bold text-sm tracking-wider w-full shadow-md z-50 flex-shrink-0">
        ⚠️ LEGACY INBOX DISABLED - USE AI MESSAGING TAB
      </div>
      <div className="flex-1 flex flex-col lg:flex-row bg-white rounded-xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden m-2">
      {/* Conversation list */}
      <div className="w-full lg:w-[320px] border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col h-full bg-white flex-shrink-0 z-10">
        <div className="p-5 border-b border-gray-50">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Inbox</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading conversations...</div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <p className="text-xs text-gray-500 mt-2">Check QUO_API_KEY and QUO_PHONE_NUMBER_ID in .env.local</p>
              <button
                onClick={() => { setLoading(true); fetchConversations(); }}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : displayList.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No conversations yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {displayList.map((conv) => {
                const participant = conv.participants?.[0] ?? conv.participants;
                const lastMsg = conv.lastMessage ?? conv.lastMessagePreview ?? conv.preview;
                const lastTime = conv.lastMessageAt ?? conv.updatedAt ?? conv.createdAt;
                const isSelected = selectedParticipant === participant;

                return (
                  <button
                    key={conv.id ?? conv._id ?? participant}
                    onClick={() => handleSelectParticipant(participant)}
                    className={`w-full text-left flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-xl mx-2 my-0.5 transition-colors relative ${isSelected ? 'bg-gray-100/80 mr-2 border-transparent' : 'border-transparent'}`}
                    style={{ width: 'calc(100% - 1rem)' }}
                  >
                    <div className="h-10 w-10 min-w-[40px] rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 overflow-hidden bg-gray-200">
                      <span className="text-gray-600 font-semibold text-sm">
                        {conv.contactName ? conv.contactName.slice(0, 2).toUpperCase() : '#'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center pr-10">
                      <p className="text-[15px] font-semibold text-gray-900 truncate flex items-center gap-2">
                        {conv.contactName || formatPhone(participant)}
                        {conv.isSpam && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase tracking-wider">
                            Spam
                          </span>
                        )}
                      </p>
                      {lastMsg && (
                        <p className="text-[13px] text-gray-500 truncate mt-0.5">
                          {typeof lastMsg === 'string' ? lastMsg : lastMsg?.text ?? lastMsg?.body ?? '—'}
                        </p>
                      )}
                      
                      {lastTime && (
                         <span className="text-[11px] text-gray-400 absolute right-4 top-4 flex flex-col items-end gap-1">
                           {formatTime(lastTime)}
                           {unreadMap[participant] > 0 && (
                               <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-blue-600 rounded-full mt-1 shadow-sm">
                                 {unreadMap[participant]}
                               </span>
                           )}
                         </span>
                       )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedParticipant ? (
          <>
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white z-10 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                  {selectedParticipant.slice(-2)}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[15px] leading-tight text-gray-900">
                    {formatPhone(selectedParticipant)}
                  </span>
                  <span className="text-xs text-gray-500 leading-tight">
                    {selectedParticipant}
                  </span>
                </div>
              </div>
            </div>
            
            {selectedConv?.isSpam && (
              <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-2 text-sm text-red-800 flex-shrink-0 z-10 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <strong>Agent 1 Alert:</strong> This conversation has been automatically marked as spam.
              </div>
            )}

            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-white"
            >
              {messages.map((msg) => {
                const dir = (msg.direction ?? msg.side ?? '').toLowerCase();
                const isOutgoing = dir === 'outgoing' || dir === 'outbound';
                
                if (msg.isCall) {
                  const isMissed = msg.callStatus === 'no-answer' || msg.callStatus === 'missed' || msg.callStatus === 'declined' || msg.callStatus === 'cancelled';
                  
                  return (
                    <div
                      key={msg.id ?? msg._id ?? Math.random()}
                      className={`flex w-full ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`shadow-sm rounded-xl p-4 w-full max-w-md flex flex-col border ${isMissed ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                        <div className={`flex items-center justify-between gap-2 font-medium pb-3 border-b ${isMissed ? 'border-red-100 text-red-800' : 'border-gray-100 text-gray-700'}`}>
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              {isMissed && <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l5 5m0-5l-5 5" className="text-red-500" />}
                            </svg>
                            <span className="text-sm">{isMissed ? 'Missed Call' : `Call Ended - ${formatDuration(msg.callDuration)}`}</span>
                          </div>
                          <span className={`text-[10px] uppercase font-bold tracking-wider float-right ${isMissed ? 'text-red-400' : 'text-gray-400'}`}>
                            {formatTime(msg.createdAt ?? msg.dateCreated ?? msg.sentAt)}
                          </span>
                        </div>
                        
                        {msg.callSummary && msg.callSummary.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mt-4 mb-2 flex items-center gap-1">✨ Call Summary</p>
                            <ul className={`list-disc ml-5 text-sm space-y-1.5 ${isMissed ? 'text-red-800' : 'text-gray-600'}`}>
                              {msg.callSummary.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        
                        {msg.callNextSteps && msg.callNextSteps.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-4 mb-2 flex items-center gap-1">🚀 Next Steps</p>
                            <ul className={`list-disc ml-5 text-sm space-y-1.5 ${isMissed ? 'text-red-800' : 'text-gray-600'}`}>
                              {msg.callNextSteps.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                const text = (msg.text ?? msg.body ?? msg.content ?? '').trim();
                
                // Safely grab urls from either Mongo message.mediaUrls or Quo message.media objects
                const rawMedia = msg.mediaUrls || msg.media || [];
                const urls = Array.isArray(rawMedia) ? rawMedia.map(m => (typeof m === 'object' ? m.url : m)).filter(Boolean) : [];

                return (
                  <div
                    key={msg.id ?? msg._id ?? Math.random()}
                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`shadow-sm flex flex-col p-3 rounded-2xl max-w-[80%] md:max-w-[70%] ${
                        isOutgoing ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      }`}
                    >
                      {text ? <p className="text-sm whitespace-pre-wrap break-words">{text}</p> : null}
                      
                      {urls.length > 0 && (
                        <div className={`flex flex-col gap-2 ${text ? 'mt-2' : ''}`}>
                          {urls.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="Attachment"
                              className="max-w-[250px] rounded-lg mt-2 shadow-sm object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <p className={`text-[10px] mt-1.5 font-medium flex ${isOutgoing ? 'justify-end text-blue-200/80' : 'justify-start text-gray-400'}`}>
                        {formatTime(msg.createdAt ?? msg.dateCreated ?? msg.sentAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-5 bg-white flex-shrink-0">
              <div className="w-full border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow rounded-xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] bg-white overflow-hidden flex flex-col relative">
                {isAiDraft && (
                  <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-purple-100 flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">✨ AI Draft</span>
                    <span className="text-xs text-purple-500">- Review and edit before sending</span>
                  </div>
                )}
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (e.target.value.trim() === '') setIsAiDraft(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!sending && inputText.trim()) handleSend(e);
                    }
                  }}
                  placeholder="Legacy Inbox Disabled"
                  className="w-full p-4 resize-none outline-none text-[15px] text-gray-500 bg-gray-50 min-h-[50px] max-h-[150px] cursor-not-allowed"
                  disabled={true}
                  rows={2}
                />
                <div className="flex justify-end items-center px-4 pb-3 flex-shrink-0">
                  <button
                    type="submit"
                    disabled={true}
                    className="flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white">
            <div className="p-4 rounded-full bg-gray-50 mb-4 shadow-sm">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="font-medium text-gray-600">Select a conversation</p>
            <p className="text-sm text-gray-400 mt-1 max-w-[200px] text-center">Your messages will dynamically load here instantly</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
