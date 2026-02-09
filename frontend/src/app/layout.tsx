import type { Metadata } from "next";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Egil's Map",
  description: "An open-source digital legacy platform where life journeys are visualized as a map of light.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Pinyon+Script&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-950 text-gray-100 font-special-elite">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
