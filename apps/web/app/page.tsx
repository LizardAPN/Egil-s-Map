import { PKG as apiPkg } from "@imprint/api";
import { PKG as typesPkg } from "@imprint/types";

export default function HomePage() {
  const pkgs = `types=${typesPkg} api=${apiPkg} ui=ready`;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center"
      data-imprint-pkgs={pkgs}
    >
      <h1 className="text-4xl font-medium tracking-tight">Imprint</h1>
      <p className="mt-3 text-sm text-ink-muted">v2 · в разработке</p>
    </main>
  );
}
