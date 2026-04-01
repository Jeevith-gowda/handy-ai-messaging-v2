export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Handy It Out</h1>
        <p className="mt-2 text-sm text-gray-600">Choose where you want to go.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/admin/ai-messaging" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Open AI Messaging
          </a>
          <a href="/login" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Admin Login
          </a>
          <a href="/customer/login" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Customer Login
          </a>
        </div>
      </div>
    </main>
  );
}
