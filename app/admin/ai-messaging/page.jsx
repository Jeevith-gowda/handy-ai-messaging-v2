'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quoAPI } from '@/utils/quo-api';
import { getContactName, loadContacts } from '@/utils/contactCache';

const AVATAR_COLORS = [
  'bg-rose-200 text-rose-700',
  'bg-amber-200 text-amber-700',
  'bg-lime-200 text-lime-700',
  'bg-emerald-200 text-emerald-700',
  'bg-sky-200 text-sky-700',
  'bg-indigo-200 text-indigo-700',
  'bg-violet-200 text-violet-700',
  'bg-fuchsia-200 text-fuchsia-700',
];

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getConversationPreview(conversation) {
  const text = conversation?.lastMessage?.body || conversation?.lastMessage?.text || '';
  return text.length > 60 ? `${text.slice(0, 60)}...` : text || 'No messages yet';
}

function getAvatarColor(value) {
  const text = String(value || 'unknown');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getAvatarInitial(value) {
  const text = String(value || '').trim();
  if (!text) return '?';
  return text.charAt(0).toUpperCase();
}

function isCallActivity(conversation) {
  const type = String(conversation?.lastActivityType || '').toLowerCase();
  const activityId = String(conversation?.lastActivityId || '').toLowerCase();
  return type.includes('call') || activityId.startsWith('ca') || activityId.includes('call');
}

function getConversationListPreview(conversation) {
  if (isCallActivity(conversation)) return '📞 Called you';

  const media = conversation?.lastMessage?.media;
  if (Array.isArray(media) && media.length > 0) {
    return '🖼️ Image';
  }

  return getConversationPreview(conversation);
}

function normalizeMediaType(media) {
  if (!media) return '';
  if (media.type) return media.type;
  if (media.mimeType) return media.mimeType;
  return '';
}

function normalizeAttachmentType(type = '') {
  if (!type) return 'application/octet-stream';
  if (type.includes('/')) return type;
  if (type === 'image') return 'image/*';
  if (type === 'video') return 'video/*';
  if (type === 'audio') return 'audio/*';
  return `application/${type}`;
}

export function formatDuration(seconds) {
  const numeric = Number(seconds);
  if (!numeric || numeric <= 0) return '0s';
  const m = Math.floor(numeric / 60);
  const s = Math.floor(numeric % 60);
  return m === 0 ? `${s}s` : `${m}m ${s}s`;
}

export function formatTranscriptTime(seconds) {
  const numeric = Number(seconds) || 0;
  const m = Math.floor(numeric / 60);
  const s = Math.floor(numeric % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Function to format phone number to E.164 format
function formatToE164(input) {
  if (!input) return '';
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  // If 10 digits, assume US and add country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // If 11 digits starting with 1, assume US
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  // If other lengths, just add + prefix
  if (digits.length > 0) {
    return `+${digits}`;
  }
  return '';
}

// Person icon component - replaces colored avatars
function PersonIcon() {
  return (
    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
      <svg
        className="w-6 h-6 text-white"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

// Smaller person icon for sidebar items
function PersonIconSmall() {
  return (
    <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
      <svg
        className="w-5 h-5 text-white"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

function MediaAttachment({ media }) {
  if (!media || media.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {media.map((item, index) => {
        const mediaType = normalizeAttachmentType(normalizeMediaType(item));
        const mediaUrl = item.url || item.mediaUrl;
        if (!mediaUrl) return null;

        if (mediaType.startsWith('image/')) {
          return (
            <img
              key={index}
              src={mediaUrl}
              alt="Attachment"
              className="w-80 min-w-52 rounded-xl cursor-pointer object-cover"
              loading="lazy"
              onClick={() => window.open(mediaUrl, '_blank')}
            />
          );
        }

        if (mediaType.startsWith('video/')) {
          return (
            <video
              key={index}
              src={mediaUrl}
              controls
              className="max-w-75 rounded-lg"
            />
          );
        }

        if (mediaType.startsWith('audio/')) {
          return <audio key={index} src={mediaUrl} controls className="w-full" />;
        }

        return (
          <a
            key={index}
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            Attachment {mediaType.split('/')[1]?.toUpperCase() || 'FILE'}
          </a>
        );
      })}
    </div>
  );
}

function CallCard({ item }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [recordingOpen, setRecordingOpen] = useState(false);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [recordingLoading, setRecordingLoading] = useState(false);

  const [summaryData, setSummaryData] = useState(null);
  const [transcriptData, setTranscriptData] = useState(null);
  const [recordingData, setRecordingData] = useState([]);
  const [summaryError, setSummaryError] = useState('');
  const [transcriptError, setTranscriptError] = useState('');
  const [recordingError, setRecordingError] = useState('');

  const directionLabel = item.direction ? `${item.direction.charAt(0).toUpperCase()}${item.direction.slice(1)}` : 'Unknown';
  const statusLabel = item.status ? `${item.status.charAt(0).toUpperCase()}${item.status.slice(1)}` : 'Unknown';

  const loadSummary = useCallback(async () => {
    if (summaryData || summaryLoading) return;
    try {
      setSummaryError('');
      setSummaryLoading(true);
      const res = await quoAPI.getCallSummary(item.id);
      // Expected shape: { data: { status, summary: [...], nextSteps: [...] } }
      setSummaryData(res?.data && typeof res.data === 'object' ? res.data : null);
    } catch (error) {
      setSummaryError(error?.message || 'Not available');
    } finally {
      setSummaryLoading(false);
    }
  }, [item.id, summaryData, summaryLoading]);

  const loadTranscript = useCallback(async () => {
    if (transcriptData || transcriptLoading) return;
    try {
      setTranscriptError('');
      setTranscriptLoading(true);
      const res = await quoAPI.getCallTranscript(item.id);
      // Expected shape: { data: { dialogue: [...] } }
      setTranscriptData(res?.data && typeof res.data === 'object' ? res.data : null);
    } catch (error) {
      setTranscriptError(error?.message || 'Not available');
    } finally {
      setTranscriptLoading(false);
    }
  }, [item.id, transcriptData, transcriptLoading]);

  const loadRecording = useCallback(async () => {
    if (recordingData.length > 0 || recordingLoading) return;
    try {
      setRecordingError('');
      setRecordingLoading(true);
      const res = await quoAPI.getCallRecording(item.id);
      // Expected shape: { data: [{ url, type, duration }] }
      setRecordingData(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      setRecordingError(error?.message || 'Not available');
    } finally {
      setRecordingLoading(false);
    }
  }, [item.id, recordingData.length, recordingLoading]);

  const toggleSummary = async () => {
    const next = !summaryOpen;
    setSummaryOpen(next);
    if (next) await loadSummary();
  };

  const toggleTranscript = async () => {
    const next = !transcriptOpen;
    setTranscriptOpen(next);
    if (next) await loadTranscript();
  };

  const toggleRecording = async () => {
    const next = !recordingOpen;
    setRecordingOpen(next);
    if (next) await loadRecording();
  };

  const summaryPoints = Array.isArray(summaryData?.summary) ? summaryData.summary : [];
  const nextSteps = Array.isArray(summaryData?.nextSteps) ? summaryData.nextSteps : [];
  const dialogue = Array.isArray(transcriptData?.dialogue) ? transcriptData.dialogue : [];
  const recordingUrl = recordingData?.[0]?.url || '';

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-gray-900">
          <span className="mr-2 text-emerald-600">📞</span>
          {statusLabel === 'Completed' ? 'Call ended' : `${directionLabel} call`} · {formatDuration(item.duration)}
        </p>
        <span className="text-xs text-gray-500">{formatTimestamp(item.createdAt)}</span>
      </div>

      <p className="mt-1 text-sm text-gray-600">You answered · {formatDuration(item.duration)}</p>

      {item.aiHandled ? <p className="mt-2 text-sm text-emerald-700">Handled by Sona AI</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleSummary}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          {summaryOpen ? '▲ Summary' : '▼ Summary'}
        </button>
        <button
          type="button"
          onClick={toggleTranscript}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          {transcriptOpen ? '▲ Transcript' : '▼ Transcript'}
        </button>
        <button
          type="button"
          onClick={toggleRecording}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          {recordingOpen ? '▲ Recording' : '▼ Recording'}
        </button>
      </div>

      {summaryOpen ? (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          {summaryLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              <span>Loading summary...</span>
            </div>
          ) : null}
          {!summaryLoading && summaryData ? (
            <div className="space-y-2 text-sm text-gray-700">
              <p>Status: {summaryData?.status || 'unknown'}</p>
              {summaryPoints.length > 0 ? (
                <ul className="list-disc pl-5">
                  {summaryPoints.map((point, idx) => (
                    <li key={`summary-${idx}`}>{point}</li>
                  ))}
                </ul>
              ) : (
                <p>No summary available.</p>
              )}
              {nextSteps.length > 0 ? (
                <div>
                  <p className="font-medium">Next Steps</p>
                  <ul className="list-disc pl-5">
                    {nextSteps.map((step, idx) => (
                      <li key={`next-${idx}`}>{step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          {!summaryLoading && !summaryData ? <p className="text-sm text-gray-500">{summaryError || 'Not available'}</p> : null}
        </div>
      ) : null}

      {transcriptOpen ? (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          {transcriptLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              <span>Loading transcript...</span>
            </div>
          ) : null}
          {!transcriptLoading && transcriptData ? (
            dialogue.length > 0 ? (
              <div className="space-y-2 text-sm text-gray-700">
                {dialogue.map((entry, idx) => (
                  <div key={`line-${idx}`} className="rounded-md bg-white p-2 border border-gray-200">
                    <p className="text-xs text-gray-500">
                      [{formatTranscriptTime(entry.start)}] {entry.userId ? 'You' : entry.identifier || 'Unknown'}
                    </p>
                    <p className="mt-1">{entry.content || ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not available.</p>
            )
          ) : null}
          {!transcriptLoading && !transcriptData ? <p className="text-sm text-gray-500">{transcriptError || 'Not available'}</p> : null}
        </div>
      ) : null}

      {recordingOpen ? (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          {recordingLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              <span>Loading recording...</span>
            </div>
          ) : null}
          {!recordingLoading ? (
            recordingUrl ? (
              <audio src={recordingUrl} controls className="w-full" />
            ) : (
              <p className="text-sm text-gray-500">{recordingError || 'Not available'}</p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TimelineItem({ item, participantLabel, showOutgoingAvatar }) {
  if (item.type === 'call') {
    return <CallCard item={item} />;
  }

  const isOutgoing = item.direction === 'outgoing';
  const incomingLabel = item.from || participantLabel || 'Unknown';
  const avatarColor = getAvatarColor(incomingLabel);
  const incomingInitial = getAvatarInitial(incomingLabel);
  const bubbleClasses = isOutgoing
    ? 'self-end bg-indigo-600 text-white rounded-2xl rounded-br-sm'
    : 'self-start bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-sm';

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
      {!isOutgoing ? (
        <div className={`mr-3 mt-5 h-8 w-8 shrink-0 rounded-full ${avatarColor} flex items-center justify-center text-xs font-semibold`}>
          {incomingInitial}
        </div>
      ) : null}
      <div className="max-w-[75%]">
        {!isOutgoing ? <p className="mb-1 text-xs text-gray-500">{incomingLabel}</p> : null}
        <div className={`px-4 py-3 ${bubbleClasses}`}>
          <p className="text-sm whitespace-pre-wrap">{item.text || ''}</p>
          <MediaAttachment media={item.media || []} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-xs text-gray-500">{formatTimestamp(item.createdAt)}</p>
          {isOutgoing && showOutgoingAvatar ? (
            <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-semibold">
              SU
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AIMessagingCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [conversations, setConversations] = useState([]);
  const [nextPageToken, setNextPageToken] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState([]);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lastPollTime, setLastPollTime] = useState(() => new Date());
  const lastPollTimeRef = useRef(lastPollTime);

  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [composerToast, setComposerToast] = useState('');

  // New state for action icons
  const [unreadConversations, setUnreadConversations] = useState(new Set());
  const [archivedConversations, setArchivedConversations] = useState(new Set());
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // New state for new conversation input
  const [showNewConversationInput, setShowNewConversationInput] = useState(false);
  const [newConversationPhone, setNewConversationPhone] = useState('');

  // Ref for auto-scrolling to latest message
  const messagesEndRef = useRef(null);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [conversationRes, phoneRes] = await Promise.all([
        quoAPI.getConversations({ maxResults: '50' }),
        quoAPI.getPhoneNumbers(),
      ]);

      // Contacts are optional for rendering; fall back to phone numbers if this fails.
      try {
        await loadContacts(quoAPI);
      } catch (contactsError) {
        console.warn('Contacts lookup unavailable, rendering with phone numbers:', contactsError);
      }

      const list = conversationRes?.data || [];
      setConversations(list);
      setNextPageToken(conversationRes?.nextPageToken || '');
      setPhoneNumbers(phoneRes?.data || []);

      if (list.length > 0) {
        setSelectedConversation(list[0]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    lastPollTimeRef.current = lastPollTime;
  }, [lastPollTime]);

  const updateConversationList = useCallback((incomingConversations = []) => {
    if (!Array.isArray(incomingConversations) || incomingConversations.length === 0) return;

    setConversations((prev) => {
      const byId = new Map(prev.map((conversation) => [conversation.id, conversation]));

      for (const incoming of incomingConversations) {
        if (!incoming?.id) continue;
        const existing = byId.get(incoming.id);

        if (!existing) {
          byId.set(incoming.id, incoming);
          continue;
        }

        const existingTime = new Date(existing.lastActivityAt || existing.updatedAt || 0).getTime();
        const incomingTime = new Date(incoming.lastActivityAt || incoming.updatedAt || 0).getTime();
        byId.set(incoming.id, incomingTime >= existingTime ? { ...existing, ...incoming } : existing);
      }

      return Array.from(byId.values()).sort(
        (a, b) =>
          new Date(b.lastActivityAt || b.updatedAt || 0).getTime() -
          new Date(a.lastActivityAt || a.updatedAt || 0).getTime(),
      );
    });
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadConversationDetail = useCallback(
    async (conversation) => {
      if (!conversation) {
        setTimeline([]);
        return;
      }

      const { phoneNumberId, participants = [] } = conversation;
      const participantList = Array.isArray(participants) ? participants.filter(Boolean) : [];

      if (!phoneNumberId || participantList.length === 0) {
        setTimeline([]);
        return;
      }

      try {
        setDetailLoading(true);

        // Step 9.1: fetch messages and calls in parallel and build unified timeline.
        const [messagesRes, callsRes] = await Promise.all([
          quoAPI.getMessages(phoneNumberId, participantList),
          quoAPI.getCalls(phoneNumberId, participantList),
        ]);

        const unifiedTimeline = [];

        for (const msg of messagesRes?.data || []) {
          unifiedTimeline.push({
            type: 'message',
            id: msg.id,
            createdAt: msg.createdAt || msg.quoCreatedAt,
            direction: msg.direction,
            text: msg.text || msg.body || '',
            from: msg.from,
            to: msg.to,
            status: msg.status,
            media: msg.media || [],
          });
        }

        for (const call of callsRes?.data || []) {
          unifiedTimeline.push({
            type: 'call',
            id: call.id || call.callId,
            createdAt: call.createdAt || call.startedAt,
            direction: call.direction,
            status: call.status,
            duration: call.duration,
            answeredAt: call.answeredAt,
            completedAt: call.completedAt,
            aiHandled: call.aiHandled,
          });
        }

        unifiedTimeline.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setTimeline(unifiedTimeline);
      } catch (err) {
        setError(err?.message || 'Failed to load conversation details');
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadConversationDetail(selectedConversation);
  }, [selectedConversation, loadConversationDetail]);

  // Auto-scroll to latest message when timeline updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline]);

  useEffect(() => {
    if (!selectedConversation?.id) return;
    const refreshed = conversations.find((conversation) => conversation.id === selectedConversation.id);
    if (refreshed && refreshed !== selectedConversation) {
      setSelectedConversation(refreshed);
    }
  }, [conversations, selectedConversation]);

  const refreshCurrentConversation = useCallback(async () => {
    if (!selectedConversation) return;
    await loadConversationDetail(selectedConversation);
  }, [selectedConversation, loadConversationDetail]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const pollFrom = lastPollTimeRef.current;
        const convos = await quoAPI.getConversations({
          updatedAfter: pollFrom.toISOString(),
          maxResults: '20',
        });

        if ((convos?.data || []).length > 0) {
          updateConversationList(convos.data);
        }

        if (selectedConversation) {
          await refreshCurrentConversation();
        }

        setLastPollTime(new Date());
      } catch (pollError) {
        console.warn('Realtime poll failed:', pollError);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedConversation, refreshCurrentConversation, updateConversationList]);

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken) return;
    try {
      const result = await quoAPI.getConversations({
        maxResults: '50',
        pageToken: nextPageToken,
      });

      setConversations((prev) => [...prev, ...(result?.data || [])]);
      setNextPageToken(result?.nextPageToken || '');
    } catch (err) {
      setError(err?.message || 'Failed to load more conversations');
    }
  }, [nextPageToken]);

  const selectedName = useMemo(() => {
    const participant = selectedConversation?.participants?.[0];
    return getContactName(participant);
  }, [selectedConversation]);

  const handleSendMessage = useCallback(async () => {
    const text = composerText.trim();
    if (!text || !selectedConversation) return;

    const participant = selectedConversation?.participants?.[0];
    const fromPhone = selectedConversation?.phoneNumberId;

    if (!fromPhone || !participant) {
      setError('Missing sender or recipient for this conversation.');
      return;
    }

    const optimisticId = `tmp-${Date.now()}`;
    const optimisticMessage = {
      type: 'message',
      id: optimisticId,
      createdAt: new Date().toISOString(),
      direction: 'outgoing',
      text,
      from: fromPhone,
      to: [participant],
      status: 'queued',
      media: [],
    };

    const previousText = composerText;

    try {
      setSending(true);
      setComposerToast('');
      setTimeline((prev) => [...prev, optimisticMessage].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      setComposerText('');
      await quoAPI.sendMessage(fromPhone, participant, text);

      await loadConversationDetail(selectedConversation);
    } catch (err) {
      // Restore composer text and remove optimistic message on failure.
      setComposerText(previousText);
      setTimeline((prev) => prev.filter((item) => item.id !== optimisticId));
      setComposerToast(err?.message || 'Failed to send message');
      setError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [composerText, selectedConversation, loadConversationDetail]);

  const handleComposerKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!sending && composerText.trim()) {
          handleSendMessage();
        }
      }
    },
    [sending, composerText, handleSendMessage],
  );

  useEffect(() => {
    if (!composerToast) return;
    const timer = setTimeout(() => setComposerToast(''), 4000);
    return () => clearTimeout(timer);
  }, [composerToast]);

  // Handler for phone icon - open tel: link
  const handleCallClick = useCallback(() => {
    if (!selectedConversation) return;
    const phone = selectedConversation?.participants?.[0];
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  }, [selectedConversation]);

  // Handler for checkmark icon - archive conversation
  const handleArchiveClick = useCallback(() => {
    if (!selectedConversation?.id) return;
    setArchivedConversations((prev) => {
      const next = new Set(prev);
      next.add(selectedConversation.id);
      return next;
    });
    // Move to next conversation or clear selection
    const nextIndex = conversations.findIndex((c) => c.id === selectedConversation.id) + 1;
    const nextConversation = conversations[nextIndex] || conversations[0];
    if (nextConversation?.id !== selectedConversation.id) {
      setSelectedConversation(nextConversation);
    } else {
      setSelectedConversation(null);
    }
  }, [selectedConversation, conversations]);

  // Handler for mark unread icon - toggle unread state
  const handleMarkUnreadClick = useCallback(() => {
    if (!selectedConversation?.id) return;
    setUnreadConversations((prev) => {
      const next = new Set(prev);
      if (next.has(selectedConversation.id)) {
        next.delete(selectedConversation.id);
      } else {
        next.add(selectedConversation.id);
      }
      return next;
    });
  }, [selectedConversation]);

  // Handler for info icon - toggle info panel
  const handleInfoClick = useCallback(() => {
    setShowInfoPanel((prev) => !prev);
  }, []);

  // Handler for more menu - toggle dropdown
  const handleMoreClick = useCallback(() => {
    setShowMoreMenu((prev) => !prev);
  }, []);

  // Handler for dropdown actions
  const handleOpenInQuo = useCallback(() => {
    window.open('https://my.quo.com', '_blank');
    setShowMoreMenu(false);
  }, []);

  const handleRefreshConversation = useCallback(async () => {
    if (selectedConversation) {
      await refreshCurrentConversation();
    }
    setShowMoreMenu(false);
  }, [refreshCurrentConversation, selectedConversation]);

  const handleCopyPhoneNumber = useCallback(() => {
    const phone = selectedConversation?.participants?.[0];
    if (phone) {
      navigator.clipboard.writeText(phone);
      setComposerToast('Phone number copied!');
    }
    setShowMoreMenu(false);
  }, [selectedConversation]);

  // Handler for new conversation submission
  const handleNewConversationSubmit = useCallback(async () => {
    const formatted = formatToE164(newConversationPhone);
    if (!formatted) {
      setComposerToast('Please enter a valid phone number');
      return;
    }

    // Check if conversation already exists
    const existing = conversations.find((c) => c.participants?.[0] === formatted);
    if (existing) {
      setSelectedConversation(existing);
      setShowNewConversationInput(false);
      setNewConversationPhone('');
      return;
    }

    // Create new conversation object (it will get persisted when user sends first message)
    const newConversation = {
      id: `temp-${Date.now()}`,
      phoneNumberId: phoneNumbers[0]?.id || 'PNmyACDF3W',
      participants: [formatted],
      lastActivityAt: new Date().toISOString(),
      lastMessage: null,
      status: 'active',
    };

    setConversations((prev) => [newConversation, ...prev]);
    setSelectedConversation(newConversation);
    setShowNewConversationInput(false);
    setNewConversationPhone('');
  }, [newConversationPhone, conversations, phoneNumbers]);

  const handleNewConversationKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleNewConversationSubmit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setShowNewConversationInput(false);
        setNewConversationPhone('');
      }
    },
    [handleNewConversationSubmit],
  );

  const selectedParticipant = selectedConversation?.participants?.[0] || '';
  
  // Filter out archived conversations
  const visibleConversations = conversations.filter((c) => !archivedConversations.has(c.id));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="w-95 shrink-0 border-r border-gray-200 flex flex-col bg-white">
        <div className="shrink-0 p-4 border-b border-gray-200">
          <button 
            type="button" 
            onClick={() => setShowNewConversationInput(true)}
            className="w-full rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 mb-3"
          >
            + New Conversation
          </button>

          {showNewConversationInput ? (
            <div className="mb-3 p-3 border border-indigo-200 rounded-lg bg-indigo-50">
              <input
                type="text"
                value={newConversationPhone}
                onChange={(e) => setNewConversationPhone(e.target.value)}
                onKeyDown={handleNewConversationKeyDown}
                placeholder="Enter phone number"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleNewConversationSubmit}
                  className="flex-1 text-xs font-medium px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewConversationInput(false);
                    setNewConversationPhone('');
                  }}
                  className="flex-1 text-xs font-medium px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg bg-indigo-50 text-indigo-700 px-3 py-1.5 text-sm font-medium">Chats</button>
            <button type="button" className="rounded-lg text-gray-500 hover:bg-gray-100 px-3 py-1.5 text-sm font-medium">Calls</button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-medium">Open</button>
            <button type="button" className="rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-xs font-medium">Unread</button>
            <button type="button" className="rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-xs font-medium">Unresponded</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-gray-500">Loading conversations...</p>
            ) : visibleConversations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No conversations found.</p>
            ) : (
              <ul>
                {visibleConversations.map((conversation) => {
                  const participant = conversation?.participants?.[0];
                  const contactName = getContactName(participant);
                  const active = selectedConversation?.id === conversation.id;
                  const isUnread = unreadConversations.has(conversation.id);

                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full border-b border-gray-100 px-4 py-3 text-left transition ${
                          active ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 relative">
                            <PersonIconSmall />
                            {isUnread ? (
                              <div className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-blue-500 border border-white" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`truncate text-sm ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>
                                {contactName || participant}
                              </p>
                              <span className="shrink-0 text-xs text-gray-500">{formatTimestamp(conversation.lastMessageAt)}</span>
                            </div>
                            <p className="mt-1 truncate text-sm text-gray-500">{getConversationListPreview(conversation)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {nextPageToken ? (
              <div className="border-t border-slate-200 p-3">
                <button type="button" onClick={handleLoadMore} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Load more
                </button>
              </div>
            ) : null}
          {error ? <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50 min-w-0 relative">
        <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
          {selectedConversation ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <PersonIcon />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-gray-900">{selectedName || selectedParticipant}</p>
                  <p className="truncate text-sm text-gray-500">{selectedParticipant}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-gray-500 relative">
                <button 
                  type="button" 
                  onClick={handleCallClick}
                  className="rounded-md p-2 hover:bg-gray-100" 
                  aria-label="Call"
                >
                  📞
                </button>
                <button 
                  type="button" 
                  onClick={handleArchiveClick}
                  className="rounded-md p-2 hover:bg-gray-100" 
                  aria-label="Mark as done"
                >
                  ✓
                </button>
                <button 
                  type="button" 
                  onClick={handleMarkUnreadClick}
                  className="rounded-md p-2 hover:bg-gray-100" 
                  aria-label="Mark as unread"
                >
                  {unreadConversations.has(selectedConversation.id) ? '👁️' : '✉️'}
                </button>
                <button 
                  type="button" 
                  onClick={handleInfoClick}
                  className="rounded-md p-2 hover:bg-gray-100" 
                  aria-label="Show info"
                >
                  ⓘ
                </button>
                <button 
                  type="button" 
                  onClick={handleMoreClick}
                  className="rounded-md p-2 hover:bg-gray-100" 
                  aria-label="More options"
                >
                  ⋯
                </button>

                {showMoreMenu ? (
                  <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <button
                      type="button"
                      onClick={handleOpenInQuo}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                    >
                      Open in Quo
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshConversation}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Refresh conversation
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPhoneNumber}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 last:rounded-b-lg"
                    >
                      Copy phone number
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Choose a conversation</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {detailLoading ? (
              <p className="text-sm text-gray-500">Loading timeline...</p>
            ) : !selectedConversation ? (
              <p className="text-sm text-gray-500">Choose a conversation to view details.</p>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-gray-500">No timeline items yet.</p>
            ) : (
              timeline.map((item, index) => {
                const nextItem = timeline[index + 1];
                const showOutgoingAvatar = item.type === 'message' && item.direction === 'outgoing' && (!nextItem || nextItem.direction !== 'outgoing');
                return (
                  <TimelineItem
                    key={`${item.type}-${item.id}`}
                    item={item}
                    participantLabel={selectedParticipant}
                    showOutgoingAvatar={showOutgoingAvatar}
                  />
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4">
            {composerToast ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {composerToast}
              </div>
            ) : null}
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              placeholder="Write a message..."
              className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 text-gray-500">
                <button type="button" className="rounded-md p-2 hover:bg-gray-100" aria-label="Sparkle">✦</button>
                <button type="button" className="rounded-md p-2 hover:bg-gray-100" aria-label="Edit">✎</button>
                <button type="button" className="rounded-md p-2 hover:bg-gray-100" aria-label="Attachment">📎</button>
                <button type="button" className="rounded-md p-2 hover:bg-gray-100" aria-label="Emoji">☺</button>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <button type="button" className="rounded-md p-2 hover:bg-gray-100" aria-label="Timer">⏱</button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sending || !composerText.trim() || !selectedConversation}
                  className="rounded-md p-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Send"
                >
                  ➤
                </button>
              </div>
            </div>
        </div>

        {/* Info Panel */}
        {showInfoPanel && selectedConversation ? (
          <div className="absolute right-0 top-0 h-full w-64 bg-white border-l border-gray-200 shadow-lg flex flex-col">
            <div className="shrink-0 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Contact Info</h2>
              <button
                type="button"
                onClick={() => setShowInfoPanel(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Phone Number</p>
                <p className="mt-1 text-sm text-gray-900 break-all">{selectedParticipant}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Conversation ID</p>
                <p className="mt-1 text-sm text-gray-900 break-all font-mono">{selectedConversation.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Last Activity</p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedConversation.lastActivityAt 
                    ? new Date(selectedConversation.lastActivityAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                <p className="mt-1 text-sm text-gray-900 capitalize">{selectedConversation.status || 'active'}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
