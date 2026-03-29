'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_FILTER_OPTIONS = [
  { value: 'inquiry', label: 'Inquiry', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'quoted_by_handyman', label: 'Quoted by Handyman', color: 'bg-sky-100 text-sky-900 border-sky-200' },
  { value: 'pending_customer_approval', label: 'Pending Customer Approval', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'in_progress', label: 'In progress', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

const STATUS_EVENT_COLORS = {
  inquiry: 'bg-amber-100 border-l-4 border-amber-500 text-amber-900',
  quoted_by_handyman: 'bg-sky-100 border-l-4 border-sky-500 text-sky-900',
  pending_customer_approval: 'bg-blue-100 border-l-4 border-blue-500 text-blue-900',
  active: 'bg-emerald-100 border-l-4 border-emerald-500 text-emerald-900',
  in_progress: 'bg-green-100 border-l-4 border-green-500 text-green-900',
  completed: 'bg-gray-100 border-l-4 border-gray-500 text-gray-900',
  handyman_paid: 'bg-teal-100 border-l-4 border-teal-500 text-teal-900',
  customer_paid: 'bg-teal-100 border-l-4 border-teal-500 text-teal-900',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getEventDate(project) {
  if (project.scheduledDate) return new Date(project.scheduledDate);
  if (
    project.status === 'inquiry' ||
    project.status === 'quoted_by_handyman' ||
    project.status === 'pending_customer_approval'
  ) {
    return new Date(project.createdAt || project.updatedAt);
  }
  if (project.createdAt) return new Date(project.createdAt);
  return new Date(project.updatedAt);
}

function getDaysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length < totalCells) days.push(null);
  return days;
}

export default function CalendarPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [handymen, setHandymen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [statusFilters, setStatusFilters] = useState({
    inquiry: true,
    quoted_by_handyman: true,
    pending_customer_approval: true,
    active: true,
    scheduled: true,
    in_progress: true,
    completed: true,
  });
  const [handymanFilters, setHandymanFilters] = useState({});
  const [statusSectionOpen, setStatusSectionOpen] = useState(true);
  const [handymanSectionOpen, setHandymanSectionOpen] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, usersRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/users?role=handyman'),
        ]);
        if (projRes.ok) setProjects(await projRes.json());
        if (usersRes.ok) {
          const users = await usersRes.json();
          setHandymen(users);
          const initial = {};
          users.forEach((u) => (initial[u._id] = true));
          setHandymanFilters((prev) => (Object.keys(prev).length === 0 ? initial : prev));
        }
      } catch (e) {
        console.error('Calendar fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredProjects = useMemo(() => {
    const hasStatusFilter = STATUS_FILTER_OPTIONS.some((s) => statusFilters[s.value]);
    const hasHandymanFilter = Object.values(handymanFilters).some(Boolean);
    const statusSet = new Set(STATUS_FILTER_OPTIONS.filter((s) => statusFilters[s.value]).map((s) => s.value));
    const handymanSet = new Set(Object.entries(handymanFilters).filter(([, v]) => v).map(([k]) => k));

    return projects.filter((p) => {
      const statusMatch = !hasStatusFilter || statusSet.has(p.status);
      const handymanId = p.handymanId?._id?.toString?.() || p.handymanId?.toString?.() || p.handymanId;
      const handymanMatch = !hasHandymanFilter || (handymanId && handymanSet.has(handymanId));
      return statusMatch && handymanMatch;
    });
  }, [projects, statusFilters, handymanFilters]);

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredProjects.forEach((p) => {
      const d = getEventDate(p);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filteredProjects]);

  const calendarDays = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    return getDaysInMonth(y, m);
  }, [currentDate]);

  const prevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  const toggleStatus = (value) => setStatusFilters((prev) => ({ ...prev, [value]: !prev[value] }));
  const toggleHandyman = (id) => setHandymanFilters((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main calendar area */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-base font-semibold text-gray-900 min-w-[180px] text-center">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="Next month"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAY_NAMES.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = day !== null;
              const key = day ? `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` : `empty-${idx}`;
              const events = (day && eventsByDate[key]) || [];

              return (
                <div
                  key={key}
                  className={`min-h-[100px] border-b border-r border-gray-100 p-1 ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  {day && (
                    <span
                      className={`inline-block w-7 h-7 rounded-full text-sm flex items-center justify-center ${
                        day.toDateString() === new Date().toDateString()
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  )}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {events.slice(0, 3).map((p) => (
                      <button
                        key={p._id}
                        onClick={() => router.push(`/admin/projects/${p._id}`)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs truncate block hover:opacity-90 transition-opacity ${STATUS_EVENT_COLORS[p.status] || 'bg-gray-100 border-l-4 border-gray-400 text-gray-800'}`}
                        title={`${p.projectNumber} — ${p.title}`}
                      >
                        <span className="font-mono font-medium">{p.projectNumber}</span>
                        <span className="block truncate">{p.title}</span>
                        {p.handymanId?.name && (
                          <span className="block truncate text-[10px] opacity-80">{p.handymanId.name}</span>
                        )}
                      </button>
                    ))}
                    {events.length > 3 && (
                      <span className="text-[10px] text-gray-500 px-1">+{events.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right sidebar — filters */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
          </div>

          {/* Calendars / Status */}
          <div className="border-b border-gray-100">
            <button
              onClick={() => setStatusSectionOpen(!statusSectionOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">Calendars / Status</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${statusSectionOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {statusSectionOpen && (
              <div className="px-4 pb-4 space-y-2">
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={statusFilters[opt.value] ?? false}
                      onChange={() => toggleStatus(opt.value)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`flex-1 text-sm px-2 py-1 rounded ${opt.color} border`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Handymen */}
          <div>
            <button
              onClick={() => setHandymanSectionOpen(!handymanSectionOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">Handymen</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${handymanSectionOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {handymanSectionOpen && (
              <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                {handymen.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No handymen found</p>
                ) : (
                  handymen.map((h) => {
                    const id = h._id?.toString?.() || h._id;
                    const checked = handymanFilters[id] ?? true;
                    return (
                      <label key={id} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleHandyman(id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{h.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
