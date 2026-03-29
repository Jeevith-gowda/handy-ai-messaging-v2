'use client';

const DIY_ARTICLES = [
  {
    id: 'drywall',
    title: 'Drywall Patching 101',
    description: 'Learn how to patch small holes and dents in drywall like a pro. Quick fixes for nail holes, doorknob dings, and more.',
    thumbnail: 'drywall',
  },
  {
    id: 'breaker',
    title: 'Resetting a Tripped Breaker',
    description: 'Step-by-step guide to safely reset a tripped circuit breaker and when to call an electrician instead.',
    thumbnail: 'electrical',
  },
  {
    id: 'blinds',
    title: 'How to Measure for Blinds',
    description: 'Get the perfect fit. Measure inside mount vs outside mount, and avoid common measuring mistakes.',
    thumbnail: 'blinds',
  },
  {
    id: 'faucet',
    title: 'Fixing a Dripping Faucet',
    description: 'Replace worn washers and cartridges to stop that annoying drip. Save water and your sanity.',
    thumbnail: 'plumbing',
  },
  {
    id: 'thermostat',
    title: 'Installing a Smart Thermostat',
    description: 'Upgrade to a programmable thermostat. Wiring basics and compatibility checks before you buy.',
    thumbnail: 'hvac',
  },
  {
    id: 'painting',
    title: 'Painting a Room: Pro Tips',
    description: 'Prep, cut-in, and roll like a professional. Tips for clean edges and even coverage.',
    thumbnail: 'painting',
  },
];

const THUMBNAIL_GRADIENTS = {
  drywall: 'from-amber-400 to-orange-600',
  electrical: 'from-yellow-400 to-amber-600',
  blinds: 'from-slate-400 to-slate-600',
  plumbing: 'from-blue-400 to-cyan-600',
  hvac: 'from-red-400 to-rose-600',
  painting: 'from-indigo-400 to-purple-600',
};

const cardClass = 'bg-white rounded-2xl shadow-sm p-5 mb-4 border border-gray-100';

export default function DIYHubPage() {
  return (
    <div className="space-y-8 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Handy It Out tutorials</h1>
        <p className="text-gray-500 mt-1 text-base">DIY guides and tips for common household fixes</p>
      </div>

      <div className={`${cardClass} overflow-hidden p-0`}>
        <div className="aspect-video bg-slate-900 relative flex items-center justify-center group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 min-w-[56px] min-h-[56px] rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all group-hover:scale-110">
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="mt-3 text-sm font-semibold text-white/90">Play</span>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">How to fix a leaky sink in 5 minutes</h2>
          <p className="text-gray-500 mt-1 text-base">Featured tutorial — quick fix for common faucet leaks</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Popular guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIY_ARTICLES.map((article) => (
            <article key={article.id} className={`${cardClass} overflow-hidden p-0`}>
              <div
                className={`aspect-[16/10] bg-gradient-to-br ${
                  THUMBNAIL_GRADIENTS[article.thumbnail] || 'from-slate-400 to-slate-600'
                } flex items-center justify-center`}
              >
                <svg className="w-12 h-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900">{article.title}</h3>
                <p className="text-gray-500 mt-2 text-base line-clamp-3">{article.description}</p>
                <button
                  type="button"
                  className="mt-4 w-full min-h-[48px] py-3 px-4 text-base font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  Read guide
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
