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
        medieval: {
          "deep-obsidian": "#0a0a0c",
          "old-gold": "#d4af37",
          "blood-wine": "#8b0000",
          "aged-paper": "#e2d1b0",
          "parchment-bg": "#1a1a1e",
          "parchment-border": "#3a3a3e",
          "dark-gold": "#b8860b",
        },
      },
    },
  },
  plugins: [],
};
export default config;
