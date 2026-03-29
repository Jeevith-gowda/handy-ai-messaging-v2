'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const STATUS_LABELS = {
  inquiry: 'Inquiry',
  quoted_by_handyman: 'Quote with admin',
  pending_customer_approval: 'Awaiting your approval',
  active: 'Active',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  handyman_paid: 'Paid',
  customer_paid: 'Paid',
};

const STATUS_COLORS = {
  inquiry: 'bg-amber-100 text-amber-900',
  quoted_by_handyman: 'bg-sky-100 text-sky-900',
  pending_customer_approval: 'bg-blue-100 text-blue-900',
  active: 'bg-emerald-100 text-emerald-900',
  scheduled: 'bg-teal-100 text-teal-900',
  in_progress: 'bg-green-100 text-green-900',
  completed: 'bg-gray-100 text-gray-900',
  handyman_paid: 'bg-teal-100 text-teal-900',
  customer_paid: 'bg-teal-100 text-teal-900',
};

const cardClass = 'bg-white rounded-2xl shadow-sm p-5 mb-4 border border-gray-100';

function hasPendingReviseOrAdditional(project) {
  return (
    project.pendingCustomerAcceptance === true ||
    project.additionalCostPending === true ||
    project.revisedQuotePending === true
  );
}

function sortProjects(a, b) {
  const done = (p) => ['completed', 'handyman_paid', 'customer_paid'].includes(p.status);
  const da = done(a) ? 1 : 0;
  const db = done(b) ? 1 : 0;
  if (da !== db) return da - db;
  const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return tb - ta;
}

/**
 * Customer-facing vertical project cards (used on dashboard and anywhere else).
 */
export default function CustomerProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to fetch projects:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const sortedProjects = useMemo(() => [...projects].sort(sortProjects), [projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      <h2 className="text-lg font-bold text-gray-900 px-0.5">Your projects</h2>

      {sortedProjects.length === 0 ? (
        <div className={cardClass}>
          <p className="text-gray-900 font-semibold text-center text-lg">No projects yet</p>
          <p className="text-gray-500 text-center mt-2 text-base">
            Our team will add projects as they&apos;re created.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {sortedProjects.map((project) => (
            <Link
              key={project._id}
              href={`/customer/projects/${project._id}`}
              className={`${cardClass} block transition-shadow active:scale-[0.99] hover:shadow-md last:mb-0`}
            >
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  {project.projectNumber && (
                    <span className="text-xs font-mono text-gray-500 block mb-1">{project.projectNumber}</span>
                  )}
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">{project.title}</h3>
                  <p className="text-gray-500 mt-2 text-base line-clamp-2 leading-relaxed">
                    {project.description || 'No description'}
                  </p>
                  {project.handymanId && (
                    <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                      {project.handymanId.name}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                      project.isRescheduling &&
                      (project.status === 'active' || project.status === 'scheduled')
                        ? 'bg-amber-100 text-amber-900'
                        : STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {project.isRescheduling &&
                    (project.status === 'active' || project.status === 'scheduled')
                      ? 'Rescheduling'
                      : STATUS_LABELS[project.status] || project.status}
                  </span>
                  {project.status === 'in_progress' && hasPendingReviseOrAdditional(project) && (
                    <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-amber-100 to-orange-100 text-amber-950 border border-amber-300 shadow-sm">
                      Revised Quote Sent
                    </span>
                  )}
                  {!(project.status === 'in_progress' && hasPendingReviseOrAdditional(project)) &&
                    hasPendingReviseOrAdditional(project) && (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-900">
                        Action needed
                      </span>
                    )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
