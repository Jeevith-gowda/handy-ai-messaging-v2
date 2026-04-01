'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { quoAPI } from '@/utils/quo-api';
import { loadContacts, getContactName } from '@/utils/contactCache';

export default function ConversationList({ selectedId, onSelect }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const listRef = useRef(null);

  const fetchConversations = useCallback(async (token = null) => {
    try {
      setLoading(true);

      const params = token ? { pageToken: token } : {};
      const conversationsPromise = quoAPI.getConversations(params);

      // Contacts are best-effort only; conversation list should still render without names.
      try {
        await loadContacts(quoAPI);
      } catch (contactsError) {
        console.warn('Contacts fetch failed, using phone numbers in list:', contactsError);
      }

      const data = await conversationsPromise;

      if (token) {
        setConversations(prev => [...prev, ...(data.data || [])]);
      } else {
        setConversations(data.data || []);
      }

      setNextPageToken(data.nextPageToken || null);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100 && nextPageToken && !loading) {
      fetchConversations(nextPageToken);
    }
  }, [nextPageToken, loading, fetchConversations]);

  const getPreview = (conversation) => {
    const lastMessage = conversation.lastMessage?.body || '';
    return lastMessage.length > 40 ? lastMessage.substring(0, 40) + '...' : lastMessage;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    
    const isThisWeek = (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
    if (isThisWeek) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getParticipantName = (conversation) => {
    const participants = conversation.participants || [];
    if (participants.length === 0) return 'Unknown';
    return getContactName(participants[0]);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {conversations.length === 0 && !loading ? (
          <div className="p-4 text-center text-gray-500">
            No conversations yet
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={`w-full px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition ${
                  selectedId === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-gray-900 truncate flex-1">
                    {getParticipantName(conversation)}
                  </div>
                  <span className="text-xs text-gray-500 ml-2 shrink-0">
                    {formatTime(conversation.lastMessageAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {getPreview(conversation)}
                </p>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="p-4 text-center text-gray-400 text-sm">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
