'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import CreateProjectModal from '@/components/CreateProjectModal';
import ConfirmModal from '@/components/ConfirmModal';

const STATUS_TABS = [
  'all',
  'inquiry',
  'quoted_by_handyman',
  'pending_customer_approval',
  'active',
  'scheduled',
  'in_progress',
  'completed',
  'paid',
];
const SERVICE_TYPES = ['all', 'plumbing', 'electrical', 'carpentry', 'painting', 'general', 'remodeling', 'hvac', 'other'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [projectsWithDraftQuote, setProjectsWithDraftQuote] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteProject, setDeleteProject] = useState(null);

  async function fetchProjects() {
    try {
      const [projRes, quotesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/quotes?status=handyman_draft'),
      ]);
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data);
      }
      if (quotesRes.ok) {
        const quotes = await quotesRes.json();
        const ids = new Set(quotes.map((q) => q.projectId?._id || q.projectId).filter(Boolean));
        setProjectsWithDraftQuote(ids);
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) => {
    if (activeTab !== 'all') {
      if (activeTab === 'paid') {
        if (!['handyman_paid', 'customer_paid'].includes(p.status)) return false;
      } else if (p.status !== activeTab) return false;
    }
    if (serviceFilter !== 'all' && p.serviceType !== serviceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchCustomer = p.customerId?.name?.toLowerCase().includes(q);
      const matchDescription = p.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchCustomer && !matchDescription) return false;
    }
    return true;
  });

  async function handleDeleteProject(projectId) {
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteProject(null);
      fetchProjects();
    }
  }

  const tabCounts = STATUS_TABS.reduce((acc, tab) => {
    if (tab === 'all') acc[tab] = projects.length;
    else if (tab === 'paid') acc[tab] = projects.filter((p) => ['handyman_paid', 'customer_paid'].includes(p.status)).length;
    else acc[tab] = projects.filter((p) => p.status === tab).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading projects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="min-h-[44px] px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 md:mx-0 md:px-0 touch-pan-x">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors shrink-0 ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            {tabCounts[tab] > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Service Type Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects, customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[44px] pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
          />
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white md:max-w-xs"
        >
          {SERVICE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Services' : type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Projects List */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map((project) => (
              <Link
                key={project._id}
                href={`/admin/projects/${project._id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50/70 hover:shadow-sm hover:border-l-4 hover:border-l-blue-500 border-l-4 border-l-transparent transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {project.projectNumber && (
                      <span className="text-xs font-mono text-gray-400 flex-shrink-0">{project.projectNumber}</span>
                    )}
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{project.title}</h3>
                    <StatusBadge status={project.status} isRescheduling={project.isRescheduling} />
                    {projectsWithDraftQuote.has(project._id) && project.status === 'inquiry' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title="Handyman submitted quote — review & send">
                        Draft quote on file
                      </span>
                    )}
                    {project.status === 'in_progress' && project.additionalCosts?.length > 0 && !project.additionalCostsSentToCustomerAt && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" title="Handyman submitted additional costs — review and send updated quote to customer">
                        Additional cost added
                      </span>
                    )}
                    {project.payments?.some((p) => p.type === 'handyman' || !p.type) && project.status !== 'handyman_paid' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">Handyman paid</span>
                    )}
                    {project.payments?.some((p) => p.type === 'customer') && project.status !== 'customer_paid' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">Customer paid</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{project.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {project.customerId?.name || 'No customer'}
                    </span>
                    {project.handymanId && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        {project.handymanId.name}
                      </span>
                    )}
                    {project.serviceType && (
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs capitalize">{project.serviceType}</span>
                    )}
                    {project.scheduledDate && (
                      <span>
                        {new Date(project.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteProject(project);
                  }}
                  className="order-2 self-end md:self-center min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"
                  title="Delete project"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-500">No projects found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or create a new project</p>
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchProjects();
          }}
        />
      )}

      {deleteProject && (
        <ConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${deleteProject.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmStyle="danger"
          onConfirm={() => handleDeleteProject(deleteProject._id)}
          onCancel={() => setDeleteProject(null)}
        />
      )}
    </div>
  );
}
