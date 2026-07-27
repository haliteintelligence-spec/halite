// The widget builds most of its DOM via innerHTML template literals rather
// than the DOM API, for compactness — but that means any dynamic value
// interpolated into one of those templates (a product name, a quiz option
// label, AI-generated narrative text — all ultimately brand/catalog
// controlled, not hardcoded) must be escaped here first, or it renders as
// live HTML on whatever storefront this widget is embedded on.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
