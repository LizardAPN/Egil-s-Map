import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ["Cinzel", "serif"],
        "special-elite": ["Special Elite", "monospace"],
        "pinyon-script": ["Pinyon Script", "cursive"],
      },
      colors: {
        beacon: {
          amber: "#f59e0b",
          glow: "#fbbf24",
          dark: "#1f2937",
        },
      },
    },
  },
  plugins: [],
};
export default config;
