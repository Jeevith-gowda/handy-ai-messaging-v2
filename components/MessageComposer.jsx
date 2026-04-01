'use client';

import { useState } from 'react';
import { quoAPI } from '@/utils/quo-api';

export default function MessageComposer({ conversation, onMessageSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !conversation) return;

    try {
      setSending(true);
      setError(null);

      const phoneNumberId = conversation.phoneNumberId;
      const toNumber = conversation.participants?.[0];

      if (!phoneNumberId || !toNumber) {
        setError('Missing phone number information');
        return;
      }

      // Send message via quoAPI
      await quoAPI.sendMessage(phoneNumberId, toNumber, text.trim());

      // Clear input
      setText('');

      // Notify parent to refresh messages
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return (
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500 text-center">Select a conversation to compose a message</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-white">
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
