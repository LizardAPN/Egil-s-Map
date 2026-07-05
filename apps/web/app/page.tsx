import { PKG as apiPkg } from "@imprint/api";
import { PKG as typesPkg } from "@imprint/types";
import { PKG as uiPkg } from "@imprint/ui";

export default function HomePage() {
  const pkgs = `types=${typesPkg} api=${apiPkg} ui=${uiPkg}`;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center"
      data-imprint-pkgs={pkgs}
    >
      <h1 className="text-4xl font-medium tracking-tight">Imprint</h1>
      <p className="mt-3 text-sm text-[#5A648A]">v2 · в разработке</p>
    </main>
  );
}
