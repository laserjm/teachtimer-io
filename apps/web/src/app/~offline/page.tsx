export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Offline</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">You are offline right now.</h1>
        <p className="mt-3 text-sm text-gray-700">
          TeachTimer keeps your core timer UI available after first load. Reconnect to fetch updates and new assets.
        </p>
      </section>
    </main>
  );
}
