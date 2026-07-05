export const CHAPTER_COLORS = [
  { id: "ch-amber", label: "Янтарь", hex: "#EFB65A" },
  { id: "ch-teal", label: "Бирюза", hex: "#5DCAA5" },
  { id: "ch-coral", label: "Коралл", hex: "#F0997B" },
  { id: "ch-lime", label: "Лайм", hex: "#A8D080" },
  { id: "ch-sky", label: "Небо", hex: "#7FB3F0" },
  { id: "ch-lilac", label: "Сирень", hex: "#AFA9EC" },
  { id: "ch-rose", label: "Роза", hex: "#ED93B1" },
  { id: "ch-ice", label: "Лёд", hex: "#8FD8E8" },
] as const;

export const DEFAULT_CHAPTER_COLOR = CHAPTER_COLORS[0].hex;
