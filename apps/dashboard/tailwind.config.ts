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
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: 'var(--ink)',
          2:       'var(--ink-2)',
          3:       'var(--ink-3)',
          4:       'var(--ink-4)',
        },
        porcelain: {
          DEFAULT: 'var(--porcelain)',
          2:       'var(--porcelain-2)',
        },
        surface: 'var(--surface)',
        sand: {
          1: 'var(--sand-1)',
          2: 'var(--sand-2)',
          3: 'var(--sand-3)',
        },
        clay: {
          DEFAULT: 'var(--clay)',
          light:   'var(--clay-light)',
          dim:     'var(--clay-dim)',
          dark:    'var(--clay-dark)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          light:   'var(--gold-light)',
        },
        sage: {
          DEFAULT: 'var(--sage)',
          light:   'var(--sage-light)',
        },
        blush: {
          DEFAULT: 'var(--blush)',
          light:   'var(--blush-light)',
        },
        border:   'var(--border)',
        melanin: {
          i:   'var(--melanin-i)',
          ii:  'var(--melanin-ii)',
          iii: 'var(--melanin-iii)',
          iv:  'var(--melanin-iv)',
          v:   'var(--melanin-v)',
          vi:  'var(--melanin-vi)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--border)',
      },
      spacing: {
        '4.5': '1.125rem',
        '18':  '4.5rem',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}

export default config
