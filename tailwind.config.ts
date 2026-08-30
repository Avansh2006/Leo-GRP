import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#131315',
        surface: {
          DEFAULT: '#131315',
          dim: '#131315',
          bright: '#39393b',
          variant: '#353437',
          'container-lowest': '#0e0e10',
          'container-low': '#1c1b1d',
          container: '#201f22',
          'container-high': '#2a2a2c',
          'container-highest': '#353437',
        },
        'on-surface': {
          DEFAULT: '#e5e1e4',
          variant: '#c2c6d6',
        },
        'outline-variant': '#424754',
        outline: {
          DEFAULT: '#8c909f',
          variant: '#424754',
        },
        primary: {
          DEFAULT: '#adc6ff',
          container: '#4d8eff',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        'on-primary': {
          DEFAULT: '#002e6a',
          container: '#00285d',
        },
        secondary: {
          DEFAULT: '#4edea3',
          container: '#00a572',
        },
        'on-secondary': {
          DEFAULT: '#003824',
          container: '#00311f',
        },
        tertiary: {
          DEFAULT: '#ffb786',
          container: '#df7412',
        },
        'on-tertiary': {
          DEFAULT: '#502400',
          container: '#461f00',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
