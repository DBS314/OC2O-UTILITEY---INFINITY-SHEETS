/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        serif: ['"New York"', '"Iowan Old Style"', '"Apple Garamond"', 'Baskerville', 'Georgia', 'serif'],
        rounded: ['"SF Pro Rounded"', '"Arial Rounded MT Bold"', '-apple-system', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
