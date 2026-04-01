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

const BASIC_EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎',
  '🤔', '😢', '😭', '😡', '👍', '👎', '👏', '🙏',
  '🎉', '❤️', '🔥', '⭐', '✅', '❌', '💯', '📌',
  '📞', '📩', '📅', '⏰', '💬', '🚀', '🏠', '🛠️',
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

function isIncomingDirection(value) {
  return String(value || '').toLowerCase() === 'incoming';
}

function hasVoicemail(call) {
  return Boolean(
    call?.voicemail ||
      call?.voicemailUrl ||
      call?.voicemailId ||
      call?.hasVoicemail ||
      call?.recordingType === 'voicemail',
  );
}

function toTime(value) {
  const ts = new Date(value || 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
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

function FilterDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-sm"
      >
        <span>{selected.label}</span>
        <svg className={`h-3 w-3 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 min-w-48 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <span className="inline-flex w-4 items-center justify-center text-slate-300">{option.icon || ''}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
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
  const [deletedConversationNotice, setDeletedConversationNotice] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lastPollTime, setLastPollTime] = useState(() => new Date());
  const lastPollTimeRef = useRef(lastPollTime);

  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [composerToast, setComposerToast] = useState('');
  const [composerDrafting, setComposerDrafting] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDraftAt, setScheduleDraftAt] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // New state for action icons
  const [unreadConversations, setUnreadConversations] = useState(new Set());
  const [openedConversations, setOpenedConversations] = useState(new Set());
  const [clearedConversations, setClearedConversations] = useState(new Set());
  const [archivedConversations, setArchivedConversations] = useState(new Set());
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [conversationPreviewById, setConversationPreviewById] = useState({});

  // New state for new conversation input
  const [showNewConversationInput, setShowNewConversationInput] = useState(false);
  const [newConversationPhone, setNewConversationPhone] = useState('');

  // New state for Chats/Calls tabs
  const [selectedTab, setSelectedTab] = useState('chats');
  const [callsList, setCallsList] = useState([]);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [callsLoading, setCallsLoading] = useState(false);

  // Chats tab filters
  const [chatOpenFilter, setChatOpenFilter] = useState('open'); // open | closed | all
  const [chatQuickFilter, setChatQuickFilter] = useState(''); // '' | unread | unresponded
  const [showChatAdvancedFilters, setShowChatAdvancedFilters] = useState(false);
  const [chatDateFrom, setChatDateFrom] = useState('');
  const [chatDateTo, setChatDateTo] = useState('');
  const [chatPhoneSearch, setChatPhoneSearch] = useState('');

  // Calls tab filters
  const [callOpenFilter, setCallOpenFilter] = useState('open'); // open | closed | all
  const [callQuickFilter, setCallQuickFilter] = useState(''); // '' | missed | voicemail | unresponded
  const [callDirectionFilter, setCallDirectionFilter] = useState('all'); // all | incoming | outgoing
  const [showCallAdvancedFilters, setShowCallAdvancedFilters] = useState(false);
  const [callDateFrom, setCallDateFrom] = useState('');
  const [callDateTo, setCallDateTo] = useState('');
  const [callPhoneSearch, setCallPhoneSearch] = useState('');

  // Ref for auto-scrolling to latest message
  const messagesEndRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const conversationsRef = useRef([]);
  const openedConversationsRef = useRef(new Set());

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
      setDeletedConversationNotice('');
      setNextPageToken(conversationRes?.nextPageToken || '');
      setPhoneNumbers(phoneRes?.data || []);

      await cleanupWebhookMedia({
        activeConversationIds: list.map((conversation) => conversation?.id).filter(Boolean),
      });

      await hydrateConversationPreviews(list, { markUnread: true });

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

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    openedConversationsRef.current = openedConversations;
  }, [openedConversations]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('clearedConversations');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setClearedConversations(new Set(parsed.map(String)));
      }
    } catch {
      // Ignore localStorage parse issues.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('clearedConversations', JSON.stringify(Array.from(clearedConversations)));
    } catch {
      // Ignore localStorage write issues.
    }
  }, [clearedConversations]);

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

  const replaceConversationList = useCallback((incomingConversations = []) => {
    const sorted = (Array.isArray(incomingConversations) ? incomingConversations : []).sort(
      (a, b) => toTime(b?.lastActivityAt || b?.updatedAt) - toTime(a?.lastActivityAt || a?.updatedAt),
    );
    setConversations(sorted);
  }, []);

  const cleanupWebhookMedia = useCallback(async ({ activeConversationIds = [], conversations = [] } = {}) => {
    const hasActiveIds = Array.isArray(activeConversationIds) && activeConversationIds.length > 0;
    const hasConversations = Array.isArray(conversations) && conversations.length > 0;
    if (!hasActiveIds && !hasConversations) return;

    try {
      await fetch('/api/quo/webhooks/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activeConversationIds, conversations }),
      });
    } catch (err) {
      console.warn('Failed to clean webhook media:', err);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const fetchLatestConversationActivity = useCallback(async (conversation) => {
    const phoneNumberId = conversation?.phoneNumberId;
    const participant = conversation?.participants?.[0];
    const lastActivityId = String(conversation?.lastActivityId || '');
    const lastActivityType = String(conversation?.lastActivityType || '').toLowerCase();
    if (!phoneNumberId || !participant) {
      return {
        type: 'none',
        text: 'No messages yet',
        direction: '',
        isPlaceholder: true,
        isMissedCall: false,
        createdAt: conversation?.lastActivityAt || '',
      };
    }

    const [messagesRes, callsRes] = await Promise.all([
      quoAPI.getMessages(phoneNumberId, [participant], { maxResults: '25' }).catch(() => ({ data: [] })),
      quoAPI.getCalls(phoneNumberId, [participant], { maxResults: '25' }).catch(() => ({ data: [] })),
    ]);

    const messages = Array.isArray(messagesRes?.data) ? messagesRes.data : [];
    const calls = Array.isArray(callsRes?.data) ? callsRes.data : [];

    const buildMessagePreview = (message) => {
      const direction = String(message?.direction || '').toLowerCase();
      const media = Array.isArray(message?.media) ? message.media : [];
      const rawText = String(message?.text || message?.body || '').trim();

      let previewText = rawText;
      if (!previewText && media.length > 0) {
        const firstType = String(media?.[0]?.type || media?.[0]?.mimeType || '').toLowerCase();
        previewText = firstType.includes('video') ? '🎥 Video' : '📷 Image';
      }
      if (!previewText) {
        previewText = 'No messages yet';
      }

      if (direction === 'outgoing') {
        previewText = `You: ${previewText}`;
      }

      return {
        type: 'message',
        text: previewText,
        direction,
        isPlaceholder: previewText === 'No messages yet',
        isMissedCall: false,
        createdAt: message?.createdAt || message?.quoCreatedAt || conversation?.lastActivityAt || '',
      };
    };

    const buildCallPreview = (call) => {
      const direction = String(call?.direction || '').toLowerCase();
      const status = String(call?.status || '').toLowerCase();
      const duration = Number(call?.duration || 0);
      const isMissed = status === 'missed' || (duration === 0 && direction === 'incoming');
      const text = isMissed
        ? '📞 Missed call'
        : `📞 ${direction === 'incoming' ? 'Incoming' : 'Outgoing'} call · ${formatDuration(duration)}`;

      return {
        type: 'call',
        text,
        direction,
        isPlaceholder: false,
        isMissedCall: isMissed,
        createdAt: call?.createdAt || call?.startedAt || conversation?.lastActivityAt || '',
      };
    };

    const messageById = messages.find((message) => String(message?.id || '') === lastActivityId);
    const callById = calls.find((call) => String(call?.id || call?.callId || '') === lastActivityId);

    if (lastActivityType.includes('call') && callById) {
      return buildCallPreview(callById);
    }
    if (lastActivityType.includes('message') && messageById) {
      return buildMessagePreview(messageById);
    }
    if (callById) {
      return buildCallPreview(callById);
    }
    if (messageById) {
      return buildMessagePreview(messageById);
    }

    const latestMessage = messages
      .slice()
      .sort((a, b) => toTime(b?.createdAt || b?.quoCreatedAt) - toTime(a?.createdAt || a?.quoCreatedAt))[0] || null;
    const latestCall = calls
      .slice()
      .sort((a, b) => toTime(b?.createdAt || b?.startedAt) - toTime(a?.createdAt || a?.startedAt))[0] || null;

    const messageTs = toTime(latestMessage?.createdAt || latestMessage?.quoCreatedAt);
    const callTs = toTime(latestCall?.createdAt || latestCall?.startedAt);

    if (!latestMessage && !latestCall) {
      return {
        type: 'none',
        text: 'No messages yet',
        direction: '',
        isPlaceholder: true,
        isMissedCall: false,
        createdAt: conversation?.lastActivityAt || '',
      };
    }

    if (latestMessage && (!latestCall || messageTs >= callTs)) {
      return buildMessagePreview(latestMessage);
    }

    return buildCallPreview(latestCall);
  }, []);

  const hydrateConversationPreviews = useCallback(
    async (conversationList = [], options = {}) => {
      const { markUnread = false } = options;
      if (!Array.isArray(conversationList) || conversationList.length === 0) return;

      const previewEntries = await Promise.all(
        conversationList.map(async (conversation) => {
          try {
            if (clearedConversations.has(String(conversation.id))) {
              return [conversation.id, {
                type: 'none',
                text: 'No messages yet',
                direction: '',
                isPlaceholder: true,
                isMissedCall: false,
                createdAt: conversation?.lastActivityAt || '',
              }];
            }
            const preview = await fetchLatestConversationActivity(conversation);
            return [conversation.id, preview];
          } catch {
            return [conversation.id, {
              type: 'none',
              text: 'No messages yet',
              direction: '',
              isPlaceholder: true,
              isMissedCall: false,
              createdAt: conversation?.lastActivityAt || '',
            }];
          }
        }),
      );

      const previewMap = Object.fromEntries(previewEntries);
      setConversationPreviewById((prev) => ({ ...prev, ...previewMap }));

      if (markUnread) {
        setUnreadConversations((prev) => {
          const next = new Set(prev);
          for (const conversation of conversationList) {
            const preview = previewMap[conversation.id];
            const isIncomingMessage = preview?.type === 'message' && isIncomingDirection(preview?.direction);
            const isOpened = openedConversationsRef.current.has(conversation.id);
            const isSelected = selectedConversation?.id === conversation.id;
            if (isIncomingMessage && !isOpened && !isSelected) {
              next.add(conversation.id);
            }
          }
          return next;
        });
      }
    },
    [fetchLatestConversationActivity, selectedConversation?.id, clearedConversations],
  );

  // Build Calls tab list from conversations whose last activity is a call.
  const loadCalls = useCallback(async () => {
    try {
      setCallsLoading(true);
      const conversationRes = await quoAPI.getConversations({ maxResults: '50' });
      const allConversations = Array.isArray(conversationRes?.data) ? conversationRes.data : [];

      const callConversations = allConversations.filter((conversation) =>
        String(conversation?.lastActivityId || '').toUpperCase().startsWith('AC'),
      );

      const callRows = await Promise.all(
        callConversations.map(async (conversation) => {
          const participant = conversation?.participants?.[0];
          const phoneNumberId = conversation?.phoneNumberId;
          if (!phoneNumberId || !participant) return null;

          try {
            const callRes = await quoAPI.getCalls(phoneNumberId, [participant], { maxResults: '20' });
            const calls = Array.isArray(callRes?.data) ? callRes.data : [];
            const activityCallId = String(conversation?.lastActivityId || '');
            const matched = calls.find((call) => String(call?.id || call?.callId || '') === activityCallId) || calls[0];
            if (!matched) return null;

            return {
              ...matched,
              id: matched.id || matched.callId,
              participant,
              conversationId: conversation.id,
              createdAt: matched.createdAt || matched.startedAt || conversation.lastActivityAt,
            };
          } catch {
            return null;
          }
        }),
      );

      const cleaned = callRows.filter(Boolean).sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );

      setCallsList(cleaned);
    } catch (err) {
      console.warn('Failed to load calls:', err);
      setCallsList([]);
    } finally {
      setCallsLoading(false);
    }
  }, []);

  const loadConversationDetail = useCallback(
    async (conversation, options = {}) => {
      const { silent = false } = options;
      if (!conversation) {
        setTimeline([]);
        return;
      }

      if (clearedConversations.has(String(conversation.id))) {
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
        if (!silent) {
          setDetailLoading(true);
        }

        // Step 9.1: fetch messages and calls in parallel and build unified timeline.
        const [messagesRes, callsRes] = await Promise.all([
          quoAPI.getMessages(phoneNumberId, participantList),
          quoAPI.getCalls(phoneNumberId, participantList),
        ]);

        const unifiedTimeline = [];

        for (const msg of (messagesRes?.data || []).filter((message) => !message?.deletedAt)) {
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

        for (const call of (callsRes?.data || []).filter((entry) => !entry?.deletedAt)) {
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
        if (!silent) {
          setDetailLoading(false);
        }
      }
    },
    [clearedConversations],
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
    if (!refreshed) {
      setDeletedConversationNotice('This conversation has been deleted');
      setTimeline([]);
      setSelectedConversation(null);
      return;
    }

    // Update selected conversation only when key fields actually change.
    const changed =
      refreshed.lastActivityAt !== selectedConversation.lastActivityAt ||
      refreshed.lastActivityId !== selectedConversation.lastActivityId ||
      refreshed.lastMessageAt !== selectedConversation.lastMessageAt;

    if (changed) {
      setDeletedConversationNotice('');
      setSelectedConversation(refreshed);
    }
  }, [conversations, selectedConversation]);

  const refreshCurrentConversation = useCallback(async () => {
    if (!selectedConversation) return;
    await loadConversationDetail(selectedConversation, { silent: true });
  }, [selectedConversation, loadConversationDetail]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const convos = await quoAPI.getConversations({
          maxResults: '50',
        });

        const freshList = Array.isArray(convos?.data) ? convos.data : [];
        const existingById = new Map(conversationsRef.current.map((conversation) => [conversation.id, conversation]));
        const freshIds = new Set(freshList.map((conversation) => String(conversation.id)));
        const removedConversations = conversationsRef.current.filter(
          (conversation) => conversation?.id && !freshIds.has(String(conversation.id)),
        );

        const changedConversations = freshList.filter((conversation) => {
          const existing = existingById.get(conversation.id);
          if (!existing) return true;
          return (
            existing.lastActivityAt !== conversation.lastActivityAt ||
            existing.lastActivityId !== conversation.lastActivityId ||
            existing.lastMessageAt !== conversation.lastMessageAt
          );
        });

        if (changedConversations.length > 0) {
          await hydrateConversationPreviews(changedConversations, { markUnread: true });
        }

        replaceConversationList(freshList);

        if (removedConversations.length > 0) {
          await cleanupWebhookMedia({ conversations: removedConversations });
        }

        if (selectedConversation?.id && !freshIds.has(String(selectedConversation.id))) {
          setDeletedConversationNotice('This conversation has been deleted');
          setTimeline([]);
          setSelectedConversation(null);
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
  }, [selectedConversation, refreshCurrentConversation, replaceConversationList, hydrateConversationPreviews]);

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
      setSelectedAttachment(null);
      setScheduledAt('');
      await quoAPI.sendMessage(fromPhone, participant, text);

      await loadConversationDetail(selectedConversation, { silent: true });
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

  useEffect(() => {
    if (!showEmojiPicker) return undefined;

    const handleOutsideClick = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showEmojiPicker]);

  const handleSparkleDraft = useCallback(() => {
    setComposerDrafting(true);
    setComposerText((prev) => {
      const base = String(prev || '').trim();
      if (!base) {
        return `Hi ${selectedName || 'there'}, just checking in on your request. Let me know if you need anything else.`;
      }

      const normalized = base.replace(/\s+/g, ' ').trim();
      const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
      return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    });
    setComposerDrafting(false);
  }, [selectedName]);

  const handleQuickEdit = useCallback(() => {
    if (!composerText.trim()) {
      setComposerToast('Type a message first to edit it.');
      return;
    }

    setComposerText((prev) =>
      prev
        .replace(/\bu\b/gi, 'you')
        .replace(/\bpls\b/gi, 'please')
        .replace(/\bthx\b/gi, 'thanks')
        .replace(/\bmsg\b/gi, 'message')
        .replace(/\s+/g, ' ')
        .trim(),
    );
  }, [composerText]);

  const handleAttachmentClick = useCallback(() => {
    attachmentInputRef.current?.click();
  }, []);

  const handleAttachmentSelected = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedAttachment(file);
    setComposerToast(`Attached: ${file.name}`);
  }, []);

  const handleEmojiToggle = useCallback(() => {
    setShowEmojiPicker((prev) => !prev);
  }, []);

  const handleEmojiInsert = useCallback((emoji) => {
    setComposerText((prev) => `${prev || ''}${prev ? ' ' : ''}${emoji}`);
    setShowEmojiPicker(false);
  }, []);

  const handleTimerToggle = useCallback(() => {
    if (!showSchedulePicker) {
      const defaultTime = scheduledAt || new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16);
      setScheduleDraftAt(defaultTime);
    }
    setShowSchedulePicker((prev) => !prev);
  }, [showSchedulePicker, scheduledAt]);

  const handleApplySchedule = useCallback(() => {
    if (!scheduleDraftAt) {
      setComposerToast('Pick a date and time first.');
      return;
    }

    const selected = new Date(scheduleDraftAt);
    if (Number.isNaN(selected.getTime())) {
      setComposerToast('Invalid date/time selected.');
      return;
    }

    setScheduledAt(scheduleDraftAt);
    setShowSchedulePicker(false);
    setComposerToast(
      `Scheduled for ${selected.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    );
  }, [scheduleDraftAt]);

  const handleClearSchedule = useCallback(() => {
    setScheduledAt('');
    setScheduleDraftAt('');
    setShowSchedulePicker(false);
    setComposerToast('Schedule cleared.');
  }, []);

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

  const handleClearChat = useCallback(() => {
    if (!selectedConversation?.id) return;
    const confirmed = window.confirm(
      'Are you sure you want to clear this chat? This will only remove messages from your dashboard view, not from Quo.',
    );
    if (!confirmed) return;

    const conversationId = String(selectedConversation.id);
    setClearedConversations((prev) => {
      const next = new Set(prev);
      next.add(conversationId);
      return next;
    });
    setTimeline([]);
    setConversationPreviewById((prev) => ({
      ...prev,
      [conversationId]: {
        type: 'none',
        text: 'No messages yet',
        direction: '',
        isPlaceholder: true,
        isMissedCall: false,
        createdAt: selectedConversation?.lastActivityAt || '',
      },
    }));
    setShowMoreMenu(false);
    setComposerToast('Chat cleared locally.');
  }, [selectedConversation]);

  const handleRestoreChat = useCallback(async () => {
    if (!selectedConversation?.id) return;
    const conversationId = String(selectedConversation.id);
    setClearedConversations((prev) => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
    await hydrateConversationPreviews([selectedConversation], { markUnread: false });
    await loadConversationDetail(selectedConversation, { silent: true });
    setShowMoreMenu(false);
    setComposerToast('Chat restored.');
  }, [selectedConversation, hydrateConversationPreviews, loadConversationDetail]);

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

  const filteredConversations = useMemo(() => {
    return visibleConversations.filter((conversation) => {
      const participant = String(conversation?.participants?.[0] || '');
      const preview = conversationPreviewById[conversation.id] || {};
      const lastDirection = String(preview?.direction || '').toLowerCase();
      const previewType = String(preview?.type || '');
      const activityTs = toTime(conversation?.lastActivityAt || conversation?.updatedAt);
      const deleted = Boolean(conversation?.deletedAt);

      if (chatOpenFilter === 'open' && deleted) return false;
      if (chatOpenFilter === 'closed' && !deleted) return false;

      if (chatQuickFilter === 'unread' && !unreadConversations.has(conversation.id)) return false;
      if (chatQuickFilter === 'unresponded' && !(previewType === 'message' && lastDirection === 'incoming')) return false;

      if (chatPhoneSearch && !participant.includes(chatPhoneSearch.trim())) return false;

      if (chatDateFrom) {
        const fromTs = toTime(`${chatDateFrom}T00:00:00`);
        if (activityTs < fromTs) return false;
      }

      if (chatDateTo) {
        const toTs = toTime(`${chatDateTo}T23:59:59`);
        if (activityTs > toTs) return false;
      }

      return true;
    });
  }, [
    visibleConversations,
    conversationPreviewById,
    unreadConversations,
    chatOpenFilter,
    chatQuickFilter,
    chatPhoneSearch,
    chatDateFrom,
    chatDateTo,
  ]);

  const filteredCalls = useMemo(() => {
    return callsList.filter((call) => {
      const participant = String(call?.participant || call?.source?.phoneNumber || call?.from || '');
      const direction = String(call?.direction || '').toLowerCase();
      const status = String(call?.status || '').toLowerCase();
      const callTs = toTime(call?.createdAt || call?.startedAt);
      const deleted = Boolean(call?.deletedAt);

      if (callOpenFilter === 'open' && deleted) return false;
      if (callOpenFilter === 'closed' && !deleted) return false;

      if (callDirectionFilter !== 'all' && direction !== callDirectionFilter) return false;

      if (callQuickFilter === 'missed') {
        const isMissed = status === 'missed' || (!call?.answeredAt && status === 'completed' && direction === 'incoming');
        if (!isMissed) return false;
      }

      if (callQuickFilter === 'voicemail' && !hasVoicemail(call)) return false;

      if (callQuickFilter === 'unresponded') {
        if (direction !== 'incoming') return false;
        const relatedConversation = conversations.find((conversation) =>
          String(conversation?.participants?.[0] || '') === participant,
        );
        if (!relatedConversation) return false;
        const latestTs = toTime(relatedConversation?.lastActivityAt || relatedConversation?.updatedAt);
        const latestActivityId = String(relatedConversation?.lastActivityId || '');
        const callId = String(call?.id || call?.callId || '');
        const unresolved = latestTs <= callTs || latestActivityId === callId;
        if (!unresolved) return false;
      }

      if (callPhoneSearch && !participant.includes(callPhoneSearch.trim())) return false;

      if (callDateFrom) {
        const fromTs = toTime(`${callDateFrom}T00:00:00`);
        if (callTs < fromTs) return false;
      }

      if (callDateTo) {
        const toTs = toTime(`${callDateTo}T23:59:59`);
        if (callTs > toTs) return false;
      }

      return true;
    });
  }, [
    callsList,
    conversations,
    callOpenFilter,
    callQuickFilter,
    callDirectionFilter,
    callPhoneSearch,
    callDateFrom,
    callDateTo,
  ]);

  // Handler for tab change
  const handleTabChange = useCallback((tab) => {
    setSelectedTab(tab);
    setSelectedConversation(null);
    setSelectedCallId(null);
    setTimeline([]);
    if (tab === 'calls') {
      loadCalls();
    }
  }, [loadCalls]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="w-95 shrink-0 border-r border-gray-200 flex flex-col bg-white">
        {/* Header with Tabs and Icons */}
        <div className="shrink-0 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            {/* Tabs */}
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={() => handleTabChange('chats')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  selectedTab === 'chats'
                    ? 'text-gray-900 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Chats
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('calls')}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  selectedTab === 'calls'
                    ? 'text-gray-900 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Calls
              </button>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-md p-2 hover:bg-gray-100 text-gray-600" aria-label="Phone">
                📞
              </button>
              <button 
                type="button" 
                onClick={() => setShowNewConversationInput(true)}
                className="rounded-md p-2 hover:bg-gray-100 text-gray-600" 
                aria-label="New message"
              >
                💬
              </button>
            </div>
          </div>

          {/* Filter Pills Section */}
          {selectedTab === 'chats' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <FilterDropdown
                  value={chatOpenFilter}
                  onChange={setChatOpenFilter}
                  options={[
                    { value: 'open', label: 'Open' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'all', label: 'All' },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => {
                    setChatOpenFilter('open');
                    setChatQuickFilter((prev) => (prev === 'unread' ? '' : 'unread'));
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    chatQuickFilter === 'unread' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Unread
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatOpenFilter('open');
                    setChatQuickFilter((prev) => (prev === 'unresponded' ? '' : 'unresponded'));
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    chatQuickFilter === 'unresponded' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Unresponded
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowChatAdvancedFilters((prev) => !prev)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ≡ Filter
              </button>
              {showChatAdvancedFilters ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 grid grid-cols-1 gap-2">
                  <input
                    type="date"
                    value={chatDateFrom}
                    onChange={(event) => setChatDateFrom(event.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={chatDateTo}
                    onChange={(event) => setChatDateTo(event.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="To"
                  />
                  <input
                    type="text"
                    value={chatPhoneSearch}
                    onChange={(event) => setChatPhoneSearch(event.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="Search phone"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <FilterDropdown
                  value={callOpenFilter}
                  onChange={setCallOpenFilter}
                  options={[
                    { value: 'open', label: 'Open' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'all', label: 'All' },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCallOpenFilter('open');
                    setCallQuickFilter((prev) => (prev === 'missed' ? '' : 'missed'));
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    callQuickFilter === 'missed' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Missed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCallOpenFilter('open');
                    setCallQuickFilter((prev) => (prev === 'voicemail' ? '' : 'voicemail'));
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    callQuickFilter === 'voicemail' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Voicemail
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCallOpenFilter('open');
                    setCallQuickFilter((prev) => (prev === 'unresponded' ? '' : 'unresponded'));
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    callQuickFilter === 'unresponded' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Unresponded
                </button>
                <FilterDropdown
                  value={callDirectionFilter}
                  onChange={setCallDirectionFilter}
                  options={[
                    { value: 'all', label: 'Direction', icon: '↕' },
                    { value: 'incoming', label: 'Incoming', icon: '↙' },
                    { value: 'outgoing', label: 'Outgoing', icon: '↗' },
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCallAdvancedFilters((prev) => !prev)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ≡ Filter
              </button>
              {showCallAdvancedFilters ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 grid grid-cols-1 gap-2">
                  <input
                    type="date"
                    value={callDateFrom}
                    onChange={(event) => setCallDateFrom(event.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={callDateTo}
                    onChange={(event) => setCallDateTo(event.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="To"
                  />
                  <input
                    type="text"
                    value={callPhoneSearch}
                    onChange={(event) => setCallPhoneSearch(event.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="Search phone"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
            {selectedTab === 'chats' ? (
              <>
                {/* New Conversation Input */}
                {showNewConversationInput ? (
                  <div className="sticky top-0 bg-white border-b border-gray-100 p-3 z-10">
                    <input
                      type="text"
                      value={newConversationPhone}
                      onChange={(e) => setNewConversationPhone(e.target.value)}
                      onKeyDown={handleNewConversationKeyDown}
                      placeholder="Send a message..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                ) : null}

                {/* Conversations List */}
                {loading ? (
                  <p className="px-4 py-6 text-sm text-gray-500">Loading conversations...</p>
                ) : filteredConversations.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500">No conversations found.</p>
                ) : (
                  <ul>
                    {filteredConversations.map((conversation) => {
                      const participant = conversation?.participants?.[0];
                      const contactName = getContactName(participant);
                      const active = selectedConversation?.id === conversation.id;
                      const isUnread = unreadConversations.has(conversation.id);
                      const preview = conversationPreviewById[conversation.id];
                      const previewText = preview?.text || getConversationListPreview(conversation);
                      const previewClass = preview?.isMissedCall
                        ? 'mt-1 truncate text-sm text-red-600'
                        : preview?.isPlaceholder
                          ? 'mt-1 truncate text-sm italic text-gray-400'
                          : isUnread
                            ? 'mt-1 truncate text-sm font-semibold text-gray-900'
                            : 'mt-1 truncate text-sm text-gray-500';

                      return (
                        <li key={conversation.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletedConversationNotice('');
                              setSelectedConversation(conversation);
                              setOpenedConversations((prev) => {
                                const next = new Set(prev);
                                next.add(conversation.id);
                                return next;
                              });
                              setUnreadConversations((prev) => {
                                const next = new Set(prev);
                                next.delete(conversation.id);
                                return next;
                              });
                            }}
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
                                  <span className="shrink-0 text-xs text-gray-500">
                                    {formatTimestamp(preview?.createdAt || conversation.lastActivityAt || conversation.lastMessageAt)}
                                  </span>
                                </div>
                                <p className={previewClass}>{previewText}</p>
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
              </>
            ) : (
              <>
                {/* Calls List */}
                {callsLoading ? (
                  <p className="px-4 py-6 text-sm text-gray-500">Loading calls...</p>
                ) : filteredCalls.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500">No calls found.</p>
                ) : (
                  <ul>
                    {filteredCalls.map((call) => {
                      const participant = call.participant || call.source?.phoneNumber || call.from || 'Unknown';
                      const contactName = getContactName(participant);
                      const active = selectedCallId === call.id;
                      const callEndedText = call.direction === 'incoming' ? '↙ Call ended' : '↗ Call ended';
                      const direction = String(call?.direction || '').toLowerCase();
                      const status = String(call?.status || '').toLowerCase();
                      const duration = Number(call?.duration || 0);
                      const isMissed = status === 'missed' || (direction === 'incoming' && duration === 0);
                      const isVoicemail = hasVoicemail(call);
                      const isAiHandled = Boolean(call?.aiHandled);

                      return (
                        <li key={call.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCallId(call.id);
                              setSelectedConversation(null);
                              setTimeline([]);
                            }}
                            className={`w-full border-b border-gray-100 px-4 py-3 text-left transition ${
                              active ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <PersonIconSmall />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{contactName || participant}</p>
                                    <div className="mt-0.5 flex items-center gap-2">
                                      {isMissed ? <p className="text-xs text-red-600">📞 Missed</p> : null}
                                      {!isMissed ? <p className="text-xs text-emerald-600">📞 {formatDuration(duration)}</p> : null}
                                      {isVoicemail ? <p className="text-xs text-amber-700">📩 Voicemail</p> : null}
                                      {isAiHandled ? <p className="text-xs text-indigo-700">🤖 Handled by Sona AI</p> : null}
                                      {!isMissed && !isVoicemail && !isAiHandled ? <p className="text-xs text-gray-500">{callEndedText}</p> : null}
                                      <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-semibold">
                                        SU
                                      </span>
                                    </div>
                                  </div>
                                  <span className="shrink-0 text-xs text-gray-500">{formatTimestamp(call.createdAt)}</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">You answered · {formatDuration(call.duration)}</p>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {error ? <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50 min-w-0 relative">
        <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
          {selectedTab === 'chats' && selectedConversation ? (
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
                    {clearedConversations.has(String(selectedConversation.id)) ? (
                      <button
                        type="button"
                        onClick={handleRestoreChat}
                        className="block w-full text-left px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        Restore chat
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleClearChat}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Clear chat
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : selectedTab === 'calls' && selectedCallId ? (
            <div className="flex items-center gap-3">
              <PersonIcon />
              <div>
                <p className="text-lg font-semibold text-gray-900">Call Details</p>
                <p className="text-sm text-gray-500">{callsList.find((call) => call.id === selectedCallId)?.participant || selectedCallId}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Choose a {selectedTab === 'chats' ? 'conversation' : 'call'}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {selectedTab === 'chats' ? (
            <div className="space-y-4">
              {deletedConversationNotice ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {deletedConversationNotice}
                </p>
              ) : null}
              {detailLoading ? (
                <p className="text-sm text-gray-500">Loading timeline...</p>
              ) : !selectedConversation ? (
                <p className="text-sm text-gray-500">Choose a conversation to view details.</p>
              ) : timeline.length === 0 ? (
                <p className="text-sm text-gray-500">No timeline items yet.</p>
              ) : (
                <>
                  {timeline.map((item, index) => {
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
                  })}
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">You're all caught up</p>
                  </div>
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="space-y-4">
              {!selectedCallId ? (
                <p className="text-sm text-gray-500">Choose a call to view details.</p>
              ) : callsList.find((c) => c.id === selectedCallId) ? (
                <CallCard item={callsList.find((c) => c.id === selectedCallId)} />
              ) : (
                <p className="text-sm text-gray-500">Call details not available.</p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4">
            {selectedTab === 'chats' && selectedConversation ? (
              <>
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
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAttachmentSelected}
                />
                {(selectedAttachment || scheduledAt) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selectedAttachment ? (
                      <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                        📎 {selectedAttachment.name}
                      </span>
                    ) : null}
                    {scheduledAt ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        ⏱ Scheduled
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {showSchedulePicker ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <label className="mb-1 block text-xs font-medium text-amber-800">Schedule send time</label>
                    <input
                      type="datetime-local"
                      value={scheduleDraftAt}
                      onChange={(event) => setScheduleDraftAt(event.target.value)}
                      className="w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplySchedule}
                        className="rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSchedulePicker(false)}
                        className="rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                      >
                        Cancel
                      </button>
                      {scheduledAt ? (
                        <button
                          type="button"
                          onClick={handleClearSchedule}
                          className="rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 text-gray-500">
                    <button
                      type="button"
                      onClick={handleSparkleDraft}
                      className="rounded-md p-2 hover:bg-gray-100 disabled:opacity-50"
                      aria-label="Sparkle"
                      disabled={composerDrafting}
                    >
                      ✦
                    </button>
                    <button type="button" onClick={handleQuickEdit} className="rounded-md p-2 hover:bg-gray-100" aria-label="Edit">✎</button>
                    <button type="button" onClick={handleAttachmentClick} className="rounded-md p-2 hover:bg-gray-100" aria-label="Attachment">📎</button>
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        type="button"
                        onClick={handleEmojiToggle}
                        className="rounded-md p-2 hover:bg-gray-100"
                        aria-label="Emoji"
                      >
                        ☺
                      </button>
                      {showEmojiPicker ? (
                        <div className="absolute bottom-11 left-0 z-40 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                          <p className="mb-2 text-xs font-medium text-gray-500">Emoji picker</p>
                          <div className="grid grid-cols-8 gap-1">
                            {BASIC_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleEmojiInsert(emoji)}
                                className="rounded-md p-1 text-xl hover:bg-gray-100"
                                aria-label={`Insert ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <button type="button" onClick={handleTimerToggle} className="rounded-md p-2 hover:bg-gray-100" aria-label="Timer">⏱</button>
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
              </>
            ) : null}
        </div>

        {/* Info Panel */}
        {showInfoPanel && selectedTab === 'chats' && selectedConversation ? (
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
