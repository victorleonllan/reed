/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-raised': 'var(--color-paper-raised)',
        'paper-sunk': 'var(--color-paper-sunk)',
        ink: 'var(--color-ink)',
        'ink-muted': 'var(--color-ink-muted)',
        line: 'var(--color-line)',
        'line-strong': 'var(--color-line-strong)',
        reed: 'var(--color-reed)',
        'reed-strong': 'var(--color-reed-strong)',
        'on-reed': 'var(--color-on-reed)',
        'reed-soft': 'var(--color-reed-soft)',
        clay: 'var(--color-clay)',
        'clay-strong': 'var(--color-clay-strong)',
        'on-clay': 'var(--color-on-clay)',
        ambar: 'var(--color-ambar)',
        'on-ambar': 'var(--color-on-ambar)',
        'ambar-ink': 'var(--color-ambar-ink)',
        highlight: 'var(--color-highlight)',
        focus: 'var(--color-focus)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        serif: ['Literata', 'Georgia', 'serif'],
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
      // Type scale. Pair display/title/heading/body with font-serif (Literata: titles and
      // reading) and small/caption with font-sans (Atkinson Hyperlegible: the UI).
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '600' }],
        title: ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        heading: ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['1.0625rem', { lineHeight: '1.65' }],
        small: ['0.875rem', { lineHeight: '1.25rem' }],
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '20px',
        'pill': '999px',
      },
      transitionDuration: {
        'states': '200ms',
        'panels': '320ms',
      }
    },
  },
  plugins: [],
}
