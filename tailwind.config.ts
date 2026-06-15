import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6d28d9",
          dark: "#5b21b6",
          light: "#8b5cf6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
