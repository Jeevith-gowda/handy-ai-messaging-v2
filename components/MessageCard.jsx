import StatusBadge from './StatusBadge';

export default function MessageCard({ message }) {
  const customer = message.customerId;
  const project = message.projectId;
  const initials = customer?.name
    ? customer.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?';

  const timeAgo = getTimeAgo(message.createdAt);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{customer?.name || 'Unknown'}</span>
              <StatusBadge status={message.status} />
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
          </div>

          {customer?.phone && (
            <p className="text-xs text-gray-500 mb-2">{customer.phone}</p>
          )}

          {message.originalText && (
            <div className="bg-gray-50 rounded-lg p-3 mb-2">
              <p className="text-sm text-gray-700">{message.originalText}</p>
            </div>
          )}

          {message.aiDraft && (
            <div className="border-l-3 border-blue-400 bg-blue-50/50 rounded-r-lg p-3 mb-2">
              <p className="text-xs font-medium text-blue-600 mb-1">AI Draft</p>
              <p className="text-sm text-gray-700">{message.aiDraft}</p>
            </div>
          )}

          {message.sentText && !message.aiDraft && (
            <div className="bg-green-50 rounded-lg p-3 mb-2">
              <p className="text-xs font-medium text-green-600 mb-1">Sent</p>
              <p className="text-sm text-gray-700">{message.sentText}</p>
            </div>
          )}

          {project && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>{project.title}</span>
            </div>
          )}

          {message.confidence != null && message.confidence > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    message.confidence >= 80 ? 'bg-green-500' :
                    message.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${message.confidence}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{message.confidence}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
