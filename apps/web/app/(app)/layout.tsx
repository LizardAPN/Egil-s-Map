import "mapbox-gl/dist/mapbox-gl.css";

import { AppProviders } from "../../components/app/app-providers";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppProviders>{children}</AppProviders>;
}
