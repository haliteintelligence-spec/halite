// Sub-national region codes → largest city
// Covers US states, Canadian provinces, Australian states, UK constituents

export interface RegionEntry {
  code: string       // e.g. "NY", "ON", "VIC"
  name: string
  country: string
  countryCode: string
  largestCity: string
  lat: number
  lng: number
  currency: string
  timezone: string
}

export const REGIONS: RegionEntry[] = [
  // ── United States ──────────────────────────────────────────────────
  { code: 'AL', name: 'Alabama', country: 'United States', countryCode: 'US', largestCity: 'Birmingham', lat: 33.5186, lng: -86.8104, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'AK', name: 'Alaska', country: 'United States', countryCode: 'US', largestCity: 'Anchorage', lat: 61.2181, lng: -149.9003, currency: 'USD', timezone: 'America/Anchorage' },
  { code: 'AZ', name: 'Arizona', country: 'United States', countryCode: 'US', largestCity: 'Phoenix', lat: 33.4484, lng: -112.0740, currency: 'USD', timezone: 'America/Phoenix' },
  { code: 'AR', name: 'Arkansas', country: 'United States', countryCode: 'US', largestCity: 'Little Rock', lat: 34.7465, lng: -92.2896, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'CA', name: 'California', country: 'United States', countryCode: 'US', largestCity: 'Los Angeles', lat: 34.0522, lng: -118.2437, currency: 'USD', timezone: 'America/Los_Angeles' },
  { code: 'CO', name: 'Colorado', country: 'United States', countryCode: 'US', largestCity: 'Denver', lat: 39.7392, lng: -104.9903, currency: 'USD', timezone: 'America/Denver' },
  { code: 'CT', name: 'Connecticut', country: 'United States', countryCode: 'US', largestCity: 'Bridgeport', lat: 41.1865, lng: -73.1952, currency: 'USD', timezone: 'America/New_York' },
  { code: 'DE', name: 'Delaware', country: 'United States', countryCode: 'US', largestCity: 'Wilmington', lat: 39.7447, lng: -75.5484, currency: 'USD', timezone: 'America/New_York' },
  { code: 'FL', name: 'Florida', country: 'United States', countryCode: 'US', largestCity: 'Jacksonville', lat: 30.3322, lng: -81.6557, currency: 'USD', timezone: 'America/New_York' },
  { code: 'GA', name: 'Georgia', country: 'United States', countryCode: 'US', largestCity: 'Atlanta', lat: 33.7490, lng: -84.3880, currency: 'USD', timezone: 'America/New_York' },
  { code: 'HI', name: 'Hawaii', country: 'United States', countryCode: 'US', largestCity: 'Honolulu', lat: 21.3069, lng: -157.8583, currency: 'USD', timezone: 'Pacific/Honolulu' },
  { code: 'ID', name: 'Idaho', country: 'United States', countryCode: 'US', largestCity: 'Boise', lat: 43.6150, lng: -116.2023, currency: 'USD', timezone: 'America/Boise' },
  { code: 'IL', name: 'Illinois', country: 'United States', countryCode: 'US', largestCity: 'Chicago', lat: 41.8781, lng: -87.6298, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'IN', name: 'Indiana', country: 'United States', countryCode: 'US', largestCity: 'Indianapolis', lat: 39.7684, lng: -86.1581, currency: 'USD', timezone: 'America/Indiana/Indianapolis' },
  { code: 'IA', name: 'Iowa', country: 'United States', countryCode: 'US', largestCity: 'Des Moines', lat: 41.5868, lng: -93.6250, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'KS', name: 'Kansas', country: 'United States', countryCode: 'US', largestCity: 'Wichita', lat: 37.6872, lng: -97.3301, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'KY', name: 'Kentucky', country: 'United States', countryCode: 'US', largestCity: 'Louisville', lat: 38.2527, lng: -85.7585, currency: 'USD', timezone: 'America/Kentucky/Louisville' },
  { code: 'LA', name: 'Louisiana', country: 'United States', countryCode: 'US', largestCity: 'New Orleans', lat: 29.9511, lng: -90.0715, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'ME', name: 'Maine', country: 'United States', countryCode: 'US', largestCity: 'Portland', lat: 43.6591, lng: -70.2568, currency: 'USD', timezone: 'America/New_York' },
  { code: 'MD', name: 'Maryland', country: 'United States', countryCode: 'US', largestCity: 'Baltimore', lat: 39.2904, lng: -76.6122, currency: 'USD', timezone: 'America/New_York' },
  { code: 'MA', name: 'Massachusetts', country: 'United States', countryCode: 'US', largestCity: 'Boston', lat: 42.3601, lng: -71.0589, currency: 'USD', timezone: 'America/New_York' },
  { code: 'MI', name: 'Michigan', country: 'United States', countryCode: 'US', largestCity: 'Detroit', lat: 42.3314, lng: -83.0458, currency: 'USD', timezone: 'America/Detroit' },
  { code: 'MN', name: 'Minnesota', country: 'United States', countryCode: 'US', largestCity: 'Minneapolis', lat: 44.9778, lng: -93.2650, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'MS', name: 'Mississippi', country: 'United States', countryCode: 'US', largestCity: 'Jackson', lat: 32.2988, lng: -90.1848, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'MO', name: 'Missouri', country: 'United States', countryCode: 'US', largestCity: 'Kansas City', lat: 39.0997, lng: -94.5786, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'MT', name: 'Montana', country: 'United States', countryCode: 'US', largestCity: 'Billings', lat: 45.7833, lng: -108.5007, currency: 'USD', timezone: 'America/Denver' },
  { code: 'NE', name: 'Nebraska', country: 'United States', countryCode: 'US', largestCity: 'Omaha', lat: 41.2565, lng: -95.9345, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'NV', name: 'Nevada', country: 'United States', countryCode: 'US', largestCity: 'Las Vegas', lat: 36.1699, lng: -115.1398, currency: 'USD', timezone: 'America/Los_Angeles' },
  { code: 'NH', name: 'New Hampshire', country: 'United States', countryCode: 'US', largestCity: 'Manchester', lat: 42.9956, lng: -71.4548, currency: 'USD', timezone: 'America/New_York' },
  { code: 'NJ', name: 'New Jersey', country: 'United States', countryCode: 'US', largestCity: 'Newark', lat: 40.7357, lng: -74.1724, currency: 'USD', timezone: 'America/New_York' },
  { code: 'NM', name: 'New Mexico', country: 'United States', countryCode: 'US', largestCity: 'Albuquerque', lat: 35.0844, lng: -106.6504, currency: 'USD', timezone: 'America/Denver' },
  { code: 'NY', name: 'New York', country: 'United States', countryCode: 'US', largestCity: 'New York City', lat: 40.7128, lng: -74.0060, currency: 'USD', timezone: 'America/New_York' },
  { code: 'NC', name: 'North Carolina', country: 'United States', countryCode: 'US', largestCity: 'Charlotte', lat: 35.2271, lng: -80.8431, currency: 'USD', timezone: 'America/New_York' },
  { code: 'ND', name: 'North Dakota', country: 'United States', countryCode: 'US', largestCity: 'Fargo', lat: 46.8772, lng: -96.7898, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'OH', name: 'Ohio', country: 'United States', countryCode: 'US', largestCity: 'Columbus', lat: 39.9612, lng: -82.9988, currency: 'USD', timezone: 'America/New_York' },
  { code: 'OK', name: 'Oklahoma', country: 'United States', countryCode: 'US', largestCity: 'Oklahoma City', lat: 35.4676, lng: -97.5164, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'OR', name: 'Oregon', country: 'United States', countryCode: 'US', largestCity: 'Portland', lat: 45.5051, lng: -122.6750, currency: 'USD', timezone: 'America/Los_Angeles' },
  { code: 'PA', name: 'Pennsylvania', country: 'United States', countryCode: 'US', largestCity: 'Philadelphia', lat: 39.9526, lng: -75.1652, currency: 'USD', timezone: 'America/New_York' },
  { code: 'RI', name: 'Rhode Island', country: 'United States', countryCode: 'US', largestCity: 'Providence', lat: 41.8240, lng: -71.4128, currency: 'USD', timezone: 'America/New_York' },
  { code: 'SC', name: 'South Carolina', country: 'United States', countryCode: 'US', largestCity: 'Columbia', lat: 34.0007, lng: -81.0348, currency: 'USD', timezone: 'America/New_York' },
  { code: 'SD', name: 'South Dakota', country: 'United States', countryCode: 'US', largestCity: 'Sioux Falls', lat: 43.5446, lng: -96.7311, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'TN', name: 'Tennessee', country: 'United States', countryCode: 'US', largestCity: 'Memphis', lat: 35.1495, lng: -90.0490, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'TX', name: 'Texas', country: 'United States', countryCode: 'US', largestCity: 'Houston', lat: 29.7604, lng: -95.3698, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'UT', name: 'Utah', country: 'United States', countryCode: 'US', largestCity: 'Salt Lake City', lat: 40.7608, lng: -111.8910, currency: 'USD', timezone: 'America/Denver' },
  { code: 'VT', name: 'Vermont', country: 'United States', countryCode: 'US', largestCity: 'Burlington', lat: 44.4759, lng: -73.2121, currency: 'USD', timezone: 'America/New_York' },
  { code: 'VA', name: 'Virginia', country: 'United States', countryCode: 'US', largestCity: 'Virginia Beach', lat: 36.8529, lng: -75.9780, currency: 'USD', timezone: 'America/New_York' },
  { code: 'WA', name: 'Washington', country: 'United States', countryCode: 'US', largestCity: 'Seattle', lat: 47.6062, lng: -122.3321, currency: 'USD', timezone: 'America/Los_Angeles' },
  { code: 'WV', name: 'West Virginia', country: 'United States', countryCode: 'US', largestCity: 'Charleston', lat: 38.3498, lng: -81.6326, currency: 'USD', timezone: 'America/New_York' },
  { code: 'WI', name: 'Wisconsin', country: 'United States', countryCode: 'US', largestCity: 'Milwaukee', lat: 43.0389, lng: -87.9065, currency: 'USD', timezone: 'America/Chicago' },
  { code: 'WY', name: 'Wyoming', country: 'United States', countryCode: 'US', largestCity: 'Cheyenne', lat: 41.1400, lng: -104.8202, currency: 'USD', timezone: 'America/Denver' },
  { code: 'DC', name: 'Washington D.C.', country: 'United States', countryCode: 'US', largestCity: 'Washington D.C.', lat: 38.9072, lng: -77.0369, currency: 'USD', timezone: 'America/New_York' },

  // ── Canada ─────────────────────────────────────────────────────────
  { code: 'AB', name: 'Alberta', country: 'Canada', countryCode: 'CA', largestCity: 'Calgary', lat: 51.0447, lng: -114.0719, currency: 'CAD', timezone: 'America/Edmonton' },
  { code: 'BC', name: 'British Columbia', country: 'Canada', countryCode: 'CA', largestCity: 'Vancouver', lat: 49.2827, lng: -123.1207, currency: 'CAD', timezone: 'America/Vancouver' },
  { code: 'MB', name: 'Manitoba', country: 'Canada', countryCode: 'CA', largestCity: 'Winnipeg', lat: 49.8951, lng: -97.1384, currency: 'CAD', timezone: 'America/Winnipeg' },
  { code: 'NB', name: 'New Brunswick', country: 'Canada', countryCode: 'CA', largestCity: 'Moncton', lat: 46.0878, lng: -64.7782, currency: 'CAD', timezone: 'America/Moncton' },
  { code: 'NL', name: 'Newfoundland and Labrador', country: 'Canada', countryCode: 'CA', largestCity: "St. John's", lat: 47.5615, lng: -52.7126, currency: 'CAD', timezone: 'America/St_Johns' },
  { code: 'NS', name: 'Nova Scotia', country: 'Canada', countryCode: 'CA', largestCity: 'Halifax', lat: 44.6488, lng: -63.5752, currency: 'CAD', timezone: 'America/Halifax' },
  { code: 'NT', name: 'Northwest Territories', country: 'Canada', countryCode: 'CA', largestCity: 'Yellowknife', lat: 62.4540, lng: -114.3718, currency: 'CAD', timezone: 'America/Yellowknife' },
  { code: 'NU', name: 'Nunavut', country: 'Canada', countryCode: 'CA', largestCity: 'Iqaluit', lat: 63.7467, lng: -68.5170, currency: 'CAD', timezone: 'America/Iqaluit' },
  { code: 'ON', name: 'Ontario', country: 'Canada', countryCode: 'CA', largestCity: 'Toronto', lat: 43.6532, lng: -79.3832, currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'PE', name: 'Prince Edward Island', country: 'Canada', countryCode: 'CA', largestCity: 'Charlottetown', lat: 46.2382, lng: -63.1311, currency: 'CAD', timezone: 'America/Halifax' },
  { code: 'QC', name: 'Quebec', country: 'Canada', countryCode: 'CA', largestCity: 'Montreal', lat: 45.5017, lng: -73.5673, currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'SK', name: 'Saskatchewan', country: 'Canada', countryCode: 'CA', largestCity: 'Saskatoon', lat: 52.1332, lng: -106.6700, currency: 'CAD', timezone: 'America/Regina' },
  { code: 'YT', name: 'Yukon', country: 'Canada', countryCode: 'CA', largestCity: 'Whitehorse', lat: 60.7212, lng: -135.0568, currency: 'CAD', timezone: 'America/Whitehorse' },

  // ── Australia ──────────────────────────────────────────────────────
  { code: 'NSW', name: 'New South Wales', country: 'Australia', countryCode: 'AU', largestCity: 'Sydney', lat: -33.8688, lng: 151.2093, currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'VIC', name: 'Victoria', country: 'Australia', countryCode: 'AU', largestCity: 'Melbourne', lat: -37.8136, lng: 144.9631, currency: 'AUD', timezone: 'Australia/Melbourne' },
  { code: 'QLD', name: 'Queensland', country: 'Australia', countryCode: 'AU', largestCity: 'Brisbane', lat: -27.4705, lng: 153.0260, currency: 'AUD', timezone: 'Australia/Brisbane' },
  { code: 'WA', name: 'Western Australia', country: 'Australia', countryCode: 'AU', largestCity: 'Perth', lat: -31.9505, lng: 115.8605, currency: 'AUD', timezone: 'Australia/Perth' },
  { code: 'SA', name: 'South Australia', country: 'Australia', countryCode: 'AU', largestCity: 'Adelaide', lat: -34.9285, lng: 138.6007, currency: 'AUD', timezone: 'Australia/Adelaide' },
  { code: 'TAS', name: 'Tasmania', country: 'Australia', countryCode: 'AU', largestCity: 'Hobart', lat: -42.8821, lng: 147.3272, currency: 'AUD', timezone: 'Australia/Hobart' },
  { code: 'ACT', name: 'Australian Capital Territory', country: 'Australia', countryCode: 'AU', largestCity: 'Canberra', lat: -35.2809, lng: 149.1300, currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'NT', name: 'Northern Territory', country: 'Australia', countryCode: 'AU', largestCity: 'Darwin', lat: -12.4634, lng: 130.8456, currency: 'AUD', timezone: 'Australia/Darwin' },

  // ── United Kingdom ─────────────────────────────────────────────────
  { code: 'ENG', name: 'England', country: 'United Kingdom', countryCode: 'GB', largestCity: 'London', lat: 51.5074, lng: -0.1278, currency: 'GBP', timezone: 'Europe/London' },
  { code: 'SCT', name: 'Scotland', country: 'United Kingdom', countryCode: 'GB', largestCity: 'Glasgow', lat: 55.8642, lng: -4.2518, currency: 'GBP', timezone: 'Europe/London' },
  { code: 'WLS', name: 'Wales', country: 'United Kingdom', countryCode: 'GB', largestCity: 'Cardiff', lat: 51.4816, lng: -3.1791, currency: 'GBP', timezone: 'Europe/London' },
  { code: 'NIR', name: 'Northern Ireland', country: 'United Kingdom', countryCode: 'GB', largestCity: 'Belfast', lat: 54.5973, lng: -5.9301, currency: 'GBP', timezone: 'Europe/London' },
]

export const BY_REGION_CODE = new Map(REGIONS.map((r) => [r.code, r]))
