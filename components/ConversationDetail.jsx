'use client';

import { useEffect, useState, useRef } from 'react';
import { quoAPI } from '@/utils/quo-api';
import { getContactName } from '@/utils/contactCache';

export default function ConversationDetail({ conversation, onSendMessage }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!conversation) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const participants = conversation.participants || [];
        if (participants.length === 0) return;

        // Get phone number ID from conversation or use first available
        const phoneNumberId = conversation.phoneNumberId;
        if (!phoneNumberId) return;

        const data = await quoAPI.getMessages(phoneNumberId, participants);
        setMessages(data.data || []);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Select a conversation to view messages</p>
        </div>
      </div>
    );
  }

  const participantName = getContactName(conversation.participants?.[0] || 'Unknown');

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">{participantName}</h3>
        <p className="text-sm text-gray-500">{conversation.participants?.[0]}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">No messages yet</p>
          </div>
        ) : (
          <div>
            {messages.map((message) => {
              const isOutgoing = message.direction === 'outgoing';
              return (
                <div
                  key={message.id || `${message.quoMessageId}-${message.createdAt}`}
                  className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOutgoing
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    {/* Message text */}
                    <p className="text-sm break-words">{message.body}</p>

                    {/* Media gallery */}
                    {message.media && message.media.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.media.map((media, idx) => (
                          <div key={idx} className="text-xs opacity-80">
                            {media.type === 'image' && (
                              <img src={media.url} alt="Message attachment" className="rounded max-w-sm" />
                            )}
                            {media.type === 'video' && (
                              <video src={media.url} controls className="rounded max-w-sm" />
                            )}
                            {media.type.includes('audio') && (
                              <audio src={media.url} controls className="w-full" />
                            )}
                            {!['image', 'video'].includes(media.type) && media.type.includes('audio') === false && (
                              <a href={media.url} target="_blank" rel="noopener noreferrer" className="underline">
                                {media.type} attachment
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className={`text-xs mt-1 opacity-70`}>
                      {new Date(message.createdAt || message.quoCreatedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Call to action */}
      {!loading && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-600">
          <p>Use the composer below to send a message</p>
        </div>
      )}
    </div>
  );
}
