const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 40;
const FALLBACK_SLUG = "chapter";

function transliterateChar(char: string): string {
  const lower = char.toLowerCase();
  return CYRILLIC_TO_LATIN[lower] ?? lower;
}

function transliterate(text: string): string {
  let result = "";

  for (const char of text) {
    result += transliterateChar(char);
  }

  return result;
}

export function slugifyChapterTitle(title: string): string {
  let slug = transliterate(title.trim().toLowerCase())
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-$/, "");
  }

  if (slug.length < MIN_SLUG_LENGTH) {
    slug = FALLBACK_SLUG;
  }

  return slug;
}

export function slugWithSuffix(baseSlug: string, suffix: number): string {
  const suffixText = `-${String(suffix)}`;
  const maxBaseLength = Math.max(1, 40 - suffixText.length);
  return `${baseSlug.slice(0, maxBaseLength)}${suffixText}`;
}
