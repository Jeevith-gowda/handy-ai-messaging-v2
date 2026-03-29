const cardClass = 'bg-white rounded-2xl shadow-sm p-5 mb-4 border border-gray-100';

export default function HandymanCalendar() {
  return (
    <div className="space-y-6 max-w-xl mx-auto md:max-w-none pb-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-500 mt-1 text-base">Calendar tools will land here in a future update.</p>
      </div>
      <div className={cardClass}>
        <p className="text-base text-gray-500">
          For now, use <span className="font-semibold text-gray-900">Projects</span> in the bottom navigation to see scheduled dates on each job, or open the{' '}
          <span className="font-semibold text-gray-900">Home</span> tab for your next job.
        </p>
      </div>
    </div>
  );
}
