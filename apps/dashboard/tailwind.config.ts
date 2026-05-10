import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        amber: {
          50:  'var(--amber-50)',
          100: 'var(--amber-100)',
          200: 'var(--amber-200)',
          300: 'var(--amber-300)',
          400: 'var(--amber-400)',
          500: 'var(--amber-500)',
          600: 'var(--amber-600)',
          700: 'var(--amber-700)',
          800: 'var(--amber-800)',
          900: 'var(--amber-900)',
          950: 'var(--amber-950)',
        },
        melanin: {
          i:   'var(--melanin-i)',
          ii:  'var(--melanin-ii)',
          iii: 'var(--melanin-iii)',
          iv:  'var(--melanin-iv)',
          v:   'var(--melanin-v)',
          vi:  'var(--melanin-vi)',
        },
      },
    },
  },
  plugins: [],
}

export default config
