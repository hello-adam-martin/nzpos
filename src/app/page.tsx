export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-8">
      <h1 className="font-display text-4xl font-bold text-navy">NZPOS</h1>
      <p className="text-text-muted">Foundation ready</p>
      <button className="bg-amber text-white px-4 py-2 rounded-md hover:bg-amber-hover transition-colors">
        Get Started
      </button>
    </main>
  );
}
