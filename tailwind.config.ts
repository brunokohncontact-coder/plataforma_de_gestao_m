import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f1ff",
          100: "#ebe5ff",
          500: "#7c5cff",
          600: "#6943ff",
          700: "#5a32e0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
