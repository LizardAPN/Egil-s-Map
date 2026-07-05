import type { Metadata } from "next";

import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imprint — твоя жизнь на карте",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={fontVariables}>
      <body className="min-h-screen bg-night-900 font-sans text-ink-primary antialiased">
        {children}
      </body>
    </html>
  );
}
