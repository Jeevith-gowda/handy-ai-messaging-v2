import StatusBadge from './StatusBadge';

export default function ProjectCard({ project }) {
  const customer = project.customerId;
  const handyman = project.handymanId;

  const scheduledDate = project.scheduledDate
    ? new Date(project.scheduledDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <a
      href={`/admin/projects/${project._id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">{project.title}</h3>
        <StatusBadge status={project.status} isRescheduling={project.isRescheduling} />
      </div>

      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{customer?.name || 'No customer'}</span>
        </div>

        {handyman && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>{handyman.name}</span>
          </div>
        )}

        {scheduledDate && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{scheduledDate}</span>
          </div>
        )}
      </div>

      {project.quoteAmount && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">Quote</span>
          <span className="text-sm font-semibold text-gray-900">${project.quoteAmount.toLocaleString()}</span>
        </div>
      )}
    </a>
  );
}
