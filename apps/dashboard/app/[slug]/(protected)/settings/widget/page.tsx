import { getWidgetConfig, getTokenAndBrandId } from '@/lib/api'
import { WidgetConfigClient } from './WidgetConfigClient'

export default async function WidgetPage() {
  const [config, auth] = await Promise.all([getWidgetConfig(), getTokenAndBrandId()])

  if (!config || !auth) {
    return (
      <div className="rounded-2xl border border-sand-2 bg-white p-8 text-center">
        <p className="text-sm text-ink-3">Unable to load widget configuration.</p>
      </div>
    )
  }

  return <WidgetConfigClient config={config} brandId={auth.brandId} token={auth.token} />
}
