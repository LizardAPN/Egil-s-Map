import Link from "next/link";
import { EchoProvider } from "../../components/echo/EchoProvider";

const tabs = [
  { href: "/map", label: "Map" },
  { href: "/discover", label: "Discover" },
  { href: "/live", label: "Live" },
  { href: "/profile", label: "Profile" }
] as const;

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <EchoProvider>
        <div className="app-shell-content">{children}</div>
      </EchoProvider>
      <nav className="app-tab-bar" aria-label="Main">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className="app-tab-link">
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
