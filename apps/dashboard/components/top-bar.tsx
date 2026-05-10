'use client'

import { useRouter } from 'next/navigation'

export function TopBar({ slug }: { slug: string }) {
  const router = useRouter()

  function handleLogout() {
    document.cookie = 'halite_token=; path=/; max-age=0'
    router.push(`/${slug}/login`)
  }

  return (
    <header
      className="h-14 bg-white flex items-center justify-end px-6 gap-4 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        onClick={handleLogout}
        className="text-xs transition-colors hover:opacity-70"
        style={{ color: 'var(--text-3)' }}
      >
        Sign out
      </button>
    </header>
  )
}
