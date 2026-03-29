'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MetricCard from '@/components/MetricCard';
import ProjectCard from '@/components/ProjectCard';
import MessageCard from '@/components/MessageCard';
import HandymanCard from '@/components/HandymanCard';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingQuotes: 0,
    monthlyRevenue: 0,
    avgResponseTime: null,
    pendingMessages: 0,
  });
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [handymen, setHandymen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [projectsRes, pendingRes, allMessagesRes, quotesRes, usersRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/messages?status=pending_review'),
          fetch('/api/messages'),
          fetch('/api/quotes'),
          fetch('/api/users?role=handyman'),
        ]);

        const projectsData = projectsRes.ok ? await projectsRes.json() : [];
        const pendingData = pendingRes.ok ? await pendingRes.json() : [];
        const allMessagesData = allMessagesRes.ok ? await allMessagesRes.json() : [];
        const quotesData = quotesRes.ok ? await quotesRes.json() : [];
        const usersData = usersRes.ok ? await usersRes.json() : [];

        const activeProjects = projectsData.filter(
          (p) => !['completed', 'handyman_paid', 'customer_paid'].includes(p.status)
        );
        const pendingQuotes = quotesData.filter((q) => ['draft', 'sent'].includes(q.status));
        const completedProjects = projectsData.filter((p) => ['completed', 'handyman_paid', 'customer_paid'].includes(p.status));
        const monthlyRevenue = completedProjects.reduce(
          (sum, p) => sum + (p.finalAmount || p.quoteAmount || 0), 0
        );

        const avgResponseTime = calcAvgResponseTime(allMessagesData);

        setStats({
          activeProjects: activeProjects.length,
          pendingQuotes: pendingQuotes.length,
          monthlyRevenue,
          avgResponseTime,
          pendingMessages: pendingData.length,
        });

        setProjects(projectsData.slice(0, 5));
        setMessages(allMessagesData.slice(0, 5));
        setHandymen(usersData);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* AI Notification Bar */}
      {stats.pendingMessages > 0 && (
        <div className="bg-blue-600 rounded-xl p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">
                {stats.pendingMessages} message{stats.pendingMessages !== 1 ? 's' : ''} awaiting review
              </p>
              <p className="text-sm text-blue-100">AI has drafted responses — review and approve to send</p>
            </div>
          </div>
          <Link
            href="/admin/messages"
            className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-sm"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Projects"
          value={stats.activeProjects}
          subtitle="Currently in progress"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          title="Pending Quotes"
          value={stats.pendingQuotes}
          subtitle="Awaiting response"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          subtitle="Completed jobs"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Avg Response Time"
          value={stats.avgResponseTime || '—'}
          subtitle="Inbound to sent"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Two-column: Recent Messages + Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Messages</h2>
            <Link href="/admin/messages" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          {messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((message) => (
                <MessageCard key={message._id} message={message} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm text-gray-500">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Messages will appear here when customers text in</p>
            </div>
          )}
        </div>

        {/* Active Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
            <Link href="/admin/projects" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-gray-500">No active projects</p>
            </div>
          )}
        </div>
      </div>

      {/* Handymen Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Overview</h2>
          <Link href="/admin/team" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Manage team
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {handymen.map((handyman) => (
            <HandymanCard key={handyman._id} handyman={handyman} />
          ))}
        </div>
      </div>
    </div>
  );
}

function calcAvgResponseTime(messages) {
  const inboundMap = {};
  const responseTimes = [];

  const sorted = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const msg of sorted) {
    const custId = msg.customerId?._id || msg.customerId;
    if (msg.direction === 'inbound' && !inboundMap[custId]) {
      inboundMap[custId] = new Date(msg.createdAt);
    } else if (msg.direction === 'outbound' && msg.status === 'sent' && inboundMap[custId]) {
      const diff = new Date(msg.createdAt) - inboundMap[custId];
      if (diff > 0) responseTimes.push(diff);
      delete inboundMap[custId];
    }
  }

  if (responseTimes.length === 0) return null;

  const avgMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minutes = Math.round(avgMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMins = minutes % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}
