# Prompt: Time Intervals for Chapters (Campfires)

## Project Context

Egil's Map is a map with chapters (beacon_tiers) represented as campfires on the map. The backend uses the `BeaconTier` model; the frontend uses `ChapterBar`, `MapCanvas`, and `CampfireMarkerIcon` / `CampfirePinIcon` components with support for `active` (burning) and `extinguished` states.

## Goal

Implement a time interval system for chapters:
- **Current (active) chapter** — one chapter, from a start date until the present (no end date). Displayed as a **burning campfire**.
- **Completed chapters** — multiple chapters with start and end dates. Displayed as **extinguished campfires**.
- **Adding chapters in the past** — ability to insert new chapters between existing ones (at any position on the timeline).

## Specification

### 1. Data Model (Backend)

**Changes to `BeaconTier` (beacon_tiers):**
- `started_at` — `DateTime(timezone=True)`, nullable. Chapter start date. For existing records, use `created_at` as fallback.
- `ended_at` — `DateTime(timezone=True)`, nullable. Chapter end date. **Null = current (active) chapter**; non-null = completed chapter.

**Rules:**
- A user can have only **one** chapter with `ended_at = null` (current).
- When adding a new chapter as "current" — the previous current chapter must automatically receive `ended_at = NOW()`.
- When adding a chapter in the past — recalculate `started_at`/`ended_at` for affected chapters (see section 5).

### 2. API

**Extend schemas:**
- `BeaconTierCreate`: add `started_at?: string` (ISO 8601), `ended_at?: string` (ISO 8601), `insert_before_id?: number` (optional — insert before the chapter with this id).
- `BeaconTierResponse`: add `started_at`, `ended_at`, `is_active` (boolean, computed: `ended_at === null`).

**Endpoints:**
- `GET /beacon` — return `started_at`, `ended_at`, `is_active` for each chapter. Sort by `order` (or by `started_at`).
- `POST /beacon` — when creating:
  - If `insert_before_id` is set — insert chapter before the specified one, recalculate `order` and dates.
  - If the new chapter is declared current (`ended_at` not set) — close the previous current chapter.
- `PUT /beacon/{id}` — update `started_at`, `ended_at` as needed.

**`GET /map/chapters`** (map_router): add `is_active` (or `ended_at`) to the response so the frontend can choose the campfire icon.

### 3. Frontend — Types and Data

**`Chapter` type:**
```ts
type Chapter = {
  id: number;
  title: string;
  order: number;
  started_at: string | null;   // ISO 8601
  ended_at: string | null;    // ISO 8601, null = current
  is_active: boolean;
};
```

### 4. Campfire Visualization

- **Burning campfire** (`active: true`) — for chapters with `is_active === true` (or `ended_at === null`).
- **Extinguished campfire** (`active: false`) — for chapters with `is_active === false`.

**Places to change:**
- `MapCanvas.tsx`: instead of `getCampfirePinDivIcon({ active: true, ... })` use `getCampfirePinDivIcon({ active: ch.is_active, ... })`.
- `ChapterBar.tsx`: optionally visually distinguish the current chapter (e.g., fire icon next to the title).
- Popup/tooltips: display date range (e.g., "Mar 2020 — present" for current, "Jan 2018 — Dec 2019" for completed).

### 5. Adding Chapters in the Past

**Scenario:** user wants to add a chapter between two existing ones.

**Implementation options:**

**A) Insert position:**
- When creating a chapter — option "Insert before chapter X" (dropdown or list selection).
- Server recalculates `order` for all chapters (shift) and, if needed, `started_at`/`ended_at`:
  - New chapter: `started_at = ended_at` of previous chapter, `ended_at = started_at` of next chapter.
  - Or user explicitly sets `started_at` and `ended_at` for the new chapter.

**B) Explicit dates when creating:**
- User sets `started_at` and `ended_at` (or only `started_at` for current chapter).
- Server validates non-overlapping intervals and recalculates dates of adjacent chapters on conflict.

**C) Order editing:**
- Chapter list with drag-and-drop. On order change — recalculate dates (if dates should follow one another without gaps).

**Recommendation:** combine A and B — ability to insert "before chapter X" and/or set dates manually.

### 6. Existing Data Migration

- For all existing chapters: `started_at = created_at`, `ended_at = null` for the last one by `order`, `ended_at = started_at` of the next chapter for the rest.
- Or: `started_at = created_at`, `ended_at = null` only for the chapter with max `order`, others — `ended_at = created_at` of the next in order.

### 7. Localization

- Add strings for: "Current chapter", "Completed chapter", "Start date", "End date", "Insert before".
- Format dates according to locale (ru/en).

### 8. Edge Cases

- Deleting current chapter — make the last completed chapter current (set its `ended_at = null`) or leave no current chapter.
- Creating first chapter — always current (`ended_at = null`).
- Empty dates — treat chapter as "undated" or require `started_at` for all.

---

## Implementation Checklist

- [x] Alembic migration: add `started_at`, `ended_at` to `beacon_tiers`
- [x] Script/logic for migrating existing chapter data (in migration)
- [x] Update `BeaconTierCreate`, `BeaconTierResponse`, `PinInBeacon` as needed
- [x] Update `list_my_tiers`, `create_tier`, `update_tier` with dates and `insert_before_id`
- [x] Update `GET /map/chapters` — add `is_active` (or `ended_at`)
- [x] Frontend: `Chapter` type with `started_at`, `ended_at`, `is_active`
- [x] Frontend: `MapCanvas` — use `active: ch.is_active` for icons
- [x] Frontend: `CreateChapterModal` — fields/controls for dates and insert position
- [x] Frontend: `ChapterBar` — optional highlight for current chapter
- [x] Popup/cards — display date range
- [x] Localization (ru/en)
- [ ] Tests for date recalculation when inserting in the past
