'use client';

import { useState, useEffect, useCallback } from 'react';

function hasLockedSchedule(project) {
  return Boolean(project?.scheduledDate);
}

/**
 * Lock schedule (initial or during reschedule) + optional current schedule summary & request reschedule.
 * Renders for `active` (needs date) or `scheduled` (locked date / reschedule), or legacy `active`+date.
 */
export default function ScheduleManager({
  project,
  projectId: projectIdProp,
  updatedByName,
  onSuccess,
  showRescheduleChat = false,
  variant = 'default',
  showScheduledSummary = true,
  showRequestRescheduleButton = true,
  className = '',
}) {
  const projectId = projectIdProp || project?._id;
  const [lockScheduledDate, setLockScheduledDate] = useState('');
  const [lockScheduledTime, setLockScheduledTime] = useState('');
  const [lockingSchedule, setLockingSchedule] = useState(false);
  const [requestingReschedule, setRequestingReschedule] = useState(false);

  const compact = variant === 'compact';
  const pad = compact ? 'p-3' : 'p-4';
  const titleCls = compact ? 'text-xs font-semibold' : 'text-sm font-semibold';

  const applySuccess = useCallback(
    (updated) => {
      if (updated && typeof onSuccess === 'function') onSuccess(updated);
    },
    [onSuccess]
  );

  useEffect(() => {
    if (!project?.isRescheduling && !showRescheduleChat) {
      setLockScheduledDate('');
      setLockScheduledTime('');
    }
  }, [project?.isRescheduling, showRescheduleChat, project?.scheduledDate]);

  async function handleLockSchedule(e) {
    e.preventDefault();
    if (!lockScheduledDate || !lockScheduledTime.trim()) {
      alert('Please select both date and time');
      return;
    }
    if (!projectId) return;
    setLockingSchedule(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockSchedule: { scheduledDate: lockScheduledDate, scheduledTime: lockScheduledTime.trim() },
          updatedBy: updatedByName,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLockScheduledDate('');
        setLockScheduledTime('');
        applySuccess(updated);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to lock schedule');
      }
    } catch {
      alert('Failed to lock schedule');
    } finally {
      setLockingSchedule(false);
    }
  }

  async function handleRequestReschedule() {
    if (!projectId) return;
    setRequestingReschedule(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRescheduling: true, updatedBy: updatedByName }),
      });
      if (res.ok) {
        const updated = await res.json();
        applySuccess(updated);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to request reschedule');
      }
    } catch {
      alert('Failed to request reschedule');
    } finally {
      setRequestingReschedule(false);
    }
  }

  const isSchedulingPhase = project && ['active', 'scheduled'].includes(project.status);

  if (!isSchedulingPhase) {
    return null;
  }

  const canInitialLock = project.status === 'active' && !hasLockedSchedule(project);
  const hasScheduleLocked =
    hasLockedSchedule(project) && (project.status === 'scheduled' || project.status === 'active');
  const canRescheduleLock =
    hasScheduleLocked && (project.isRescheduling === true || showRescheduleChat);
  const canShowSummary =
    showScheduledSummary &&
    hasScheduleLocked &&
    !project.isRescheduling &&
    !showRescheduleChat;

  const dateInputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-gray-900';
  const minDate = new Date().toISOString().split('T')[0];

  const lockForm = (isReschedule) => (
    <div
      className={`bg-white rounded-xl border-2 ${isReschedule ? 'border-amber-200' : 'border-cyan-200'} ${pad}`}
    >
      <h3 className={`${titleCls} text-gray-900 mb-2`}>
        {isReschedule ? 'Lock new schedule' : 'Lock schedule'}
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        {isReschedule
          ? 'Agree on a new time with the customer, then pick the date and time below to lock it in.'
          : 'Once you and the customer agree on a time, select the date and time below and lock it in.'}
      </p>
      <form onSubmit={handleLockSchedule} className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-3 w-full min-w-0">
          <div className="w-full min-w-0 sm:flex-1">
            <label className="text-xs text-gray-500 block mb-1">Date</label>
            <input
              type="date"
              value={lockScheduledDate}
              onChange={(e) => setLockScheduledDate(e.target.value)}
              min={minDate}
              className={dateInputCls}
            />
          </div>
          <div className="w-full min-w-0 sm:flex-1">
            <label className="text-xs text-gray-500 block mb-1">Time</label>
            <input
              type="time"
              value={lockScheduledTime}
              onChange={(e) => setLockScheduledTime(e.target.value)}
              className={dateInputCls}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={lockingSchedule || !lockScheduledDate || !lockScheduledTime.trim()}
          className="w-full py-3 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {lockingSchedule ? 'Locking…' : 'Lock schedule'}
        </button>
      </form>
    </div>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {canInitialLock && lockForm(false)}
      {canRescheduleLock && lockForm(true)}
      {canShowSummary && (
        <div
          className={`bg-white rounded-xl border border-emerald-200 ${pad} ${
            compact ? 'shadow-sm' : ''
          }`}
        >
          <p className={`${titleCls} text-emerald-900 mb-1`}>Scheduled</p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">
              {new Date(project.scheduledDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {project.scheduledTime && (
              <span className="text-gray-600"> · {project.scheduledTime}</span>
            )}
          </p>
          {showRequestRescheduleButton && (
            <button
              type="button"
              onClick={handleRequestReschedule}
              disabled={requestingReschedule}
              className="mt-3 w-full min-h-[44px] py-2.5 text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestingReschedule ? 'Requesting…' : 'Request reschedule'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
