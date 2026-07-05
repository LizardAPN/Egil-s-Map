import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";

export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap",
});

export const playfairDisplay = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-fraunces",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  variable: "--font-mono",
  display: "swap",
});

export const fontVariables = `${inter.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable}`;
