import type { BrandSummary, DemoSummary } from './admin-api'

// A demo is "past" once it's expired or manually deactivated — but a
// converted demo is a real Brand now, so its active/inactive state is
// tracked as an onboarded brand instead (see isOldBrand).
export function isOldDemo(demo: Pick<DemoSummary, 'converted' | 'status' | 'active'>): boolean {
  return !demo.converted && (demo.status === 'access_expired' || !demo.active)
}

export function isOldBrand(brand: Pick<BrandSummary, 'active'>): boolean {
  return !brand.active
}
