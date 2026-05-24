import { getTokenAndBrandId, getIntegrations, getWidgetConfig } from '@/lib/api'
import { IntegrationsClient } from './IntegrationsClient'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>
}) {
  const [auth, integrations, widgetConfig, sp] = await Promise.all([
    getTokenAndBrandId(),
    getIntegrations(),
    getWidgetConfig(),
    searchParams,
  ])

  if (!auth) {
    return (
      <div className="rounded-2xl border border-sand-2 bg-white p-8 text-center">
        <p className="text-sm text-ink-3">Unable to load integrations.</p>
      </div>
    )
  }

  return (
    <IntegrationsClient
      brandId={auth.brandId}
      token={auth.token}
      apiKey={widgetConfig?.apiKey ?? null}
      integrations={integrations}
      justConnected={sp.connected === 'true'}
    />
  )
}
