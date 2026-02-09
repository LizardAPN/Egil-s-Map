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
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
