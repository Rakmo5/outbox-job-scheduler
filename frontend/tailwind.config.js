/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00A859',
          lightGreen: '#E6F4EA',
          borderGreen: '#10B981',
          bg: '#FAFAFA',
          orange: '#FF9500',
          orangeBg: '#FFF3E0',
        },
      },
    },
  },
  plugins: [],
};
