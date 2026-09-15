/**
 * Where a brand's storefront loads the widget bundle from.
 *
 * The API serves it (apps/api/src/routes/widget.ts) and
 * cdn.haliteintelligence.com is a second domain pointed at that same
 * service, so this is the only place the URL is written down on the
 * dashboard side.
 */
export const WIDGET_URL =
  process.env.NEXT_PUBLIC_WIDGET_URL ?? 'https://cdn.haliteintelligence.com/widget.js'
