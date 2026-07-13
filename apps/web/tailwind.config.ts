import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-to-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'slide-out-to-right': 'slide-out-to-right 0.3s ease-in',
      },
    },
  },
  plugins: [],
};

export default config;
