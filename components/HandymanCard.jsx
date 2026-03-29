const AVAILABILITY_STYLES = {
  available: 'bg-green-100 text-green-700',
  busy: 'bg-amber-100 text-amber-700',
  off: 'bg-gray-100 text-gray-500',
};

export default function HandymanCard({ handyman }) {
  const initials = handyman.name
    ? handyman.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?';

  const availClass = AVAILABILITY_STYLES[handyman.availability] || AVAILABILITY_STYLES.off;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{handyman.name}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${availClass}`}>
              {handyman.availability}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {handyman.skills?.map((skill) => (
              <span
                key={skill}
                className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 capitalize"
              >
                {skill}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span>${handyman.hourlyRate}/hr</span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {handyman.rating}
              </span>
            </div>
            <span className="font-medium text-gray-700">
              {handyman.activeProjects || 0} active {handyman.activeProjects === 1 ? 'project' : 'projects'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
