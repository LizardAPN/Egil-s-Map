import type { Metadata } from "next";

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
    <html lang="ru">
      <body className="min-h-screen bg-[#0A0F1E] text-[#F0F3FC]">
        {children}
      </body>
    </html>
  );
}
