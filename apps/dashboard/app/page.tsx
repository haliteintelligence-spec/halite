export default function Root() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">Halite Intelligence</h1>
        <p className="text-sm text-neutral-500 mt-2">
          Access your brand dashboard at{' '}
          <span className="font-mono text-neutral-700">your-brand.haliteintelligence.com</span>
        </p>
        <p className="text-xs text-neutral-400 mt-4">
          Local dev: navigate to{' '}
          <a href="/demo" className="underline text-neutral-600">/demo</a> to preview the brand dashboard
        </p>
      </div>
    </div>
  )
}
