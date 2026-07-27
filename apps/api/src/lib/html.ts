// Escapes a value for safe interpolation into HTML — used wherever
// AI-generated or brand/user-supplied text gets built into an HTML email or
// other server-rendered HTML string, since none of that content is trusted.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
