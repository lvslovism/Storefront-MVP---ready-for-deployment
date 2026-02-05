/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 可透過 CSS 變數覆寫
        primary: 'var(--color-primary, #000000)',
        secondary: 'var(--color-secondary, #f5f5f5)',
        accent: 'var(--color-accent, #dc2626)',
      },
      fontFamily: {
        sans: ['var(--font-family)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--border-radius, 0.5rem)',
      },
    },
  },
  plugins: [],
};
