import { describe, expect, it } from "vitest";

import { slugifyChapterTitle, slugWithSuffix } from "./slugify";

describe("slugifyChapterTitle", () => {
  it("transliterates Cyrillic", () => {
    expect(slugifyChapterTitle("Тест")).toBe("test");
    expect(slugifyChapterTitle("Мой 2026")).toBe("moy-2026");
  });

  it("handles spaces and symbols", () => {
    expect(slugifyChapterTitle("Hello World!")).toBe("hello-world");
    expect(slugifyChapterTitle("  foo__bar  ")).toBe("foo-bar");
  });

  it("clamps length to 40 characters", () => {
    const longTitle = "a".repeat(50);
    expect(slugifyChapterTitle(longTitle)).toHaveLength(40);
    expect(slugifyChapterTitle(longTitle)).toBe("a".repeat(40));
  });

  it("pads short slugs to at least 3 characters", () => {
    expect(slugifyChapterTitle("ab")).toBe("chapter");
    expect(slugifyChapterTitle("!@#")).toBe("chapter");
  });
});

describe("slugWithSuffix", () => {
  it("appends suffix without exceeding 40 characters", () => {
    expect(slugWithSuffix("test", 2)).toBe("test-2");
    expect(slugWithSuffix("a".repeat(40), 2)).toBe(`${"a".repeat(38)}-2`);
    expect(slugWithSuffix("a".repeat(40), 2)).toHaveLength(40);
  });
});
