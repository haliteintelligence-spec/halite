import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        burgundy: {
          DEFAULT: '#450F2A',
          light:   '#6B1E3F',
          dim:     '#2D0A1C',
          muted:   '#8B4A65',
        },
        ivory: {
          DEFAULT: '#FAF6F0',
          2:       '#F2EBE0',
          3:       '#E8DDD0',
        },
        ink: {
          DEFAULT: '#1A0A12',
          2:       '#4A2A38',
          3:       '#8B6575',
        },
        gold: '#C17A47',
      },
    },
  },
  plugins: [],
}

export default config
