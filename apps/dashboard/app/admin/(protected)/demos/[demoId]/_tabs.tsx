'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function DemoDetailTabs({ demoId }: { demoId: string }) {
  const pathname = usePathname()
  const tabs = [
    { label: 'Overview', href: `/admin/demos/${demoId}` },
    { label: 'Activity', href: `/admin/demos/${demoId}/activity` },
  ]
  return (
    <div className="flex mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="relative px-4 py-2.5 text-[12px] font-medium transition-colors"
            style={{ color: active ? 'var(--ink)' : 'var(--ink-3)' }}
          >
            {tab.label}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--clay)' }} />
            )}
          </Link>
        )
      })}
    </div>
  )
}
