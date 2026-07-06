import "mapbox-gl/dist/mapbox-gl.css";
import "../map-overrides.css";

import { AppProviders } from "../../components/app/app-providers";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppProviders>{children}</AppProviders>;
}
