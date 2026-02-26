# Feed (Chronicle) — Frontend Specification

## Overview

The **Chronicle** (Хроника) is a medieval-style bulletin board feed where users discover moments from other travelers' journeys. It uses a Pinterest-style masonry layout with a parchment/notice-board aesthetic.

---

## 1. Design Concept

### 1.1 Visual Metaphor

- **Bulletin board** — The page simulates a wooden notice board with pinned parchments
- **Parchment cards** — Each moment is a "sheet" pinned to the board with a thumbtack
- **Medieval typography** — Cinzel (headers), Pinyon Script (quotes), Special Elite (notes)

### 1.2 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Board background | `#1a1510` | Page background |
| Parchment light | `#f5e6d3` | Card gradient top |
| Parchment mid | `#e8d4b8` | Card gradient middle |
| Parchment dark | `#dfc9a8` | Card gradient bottom |
| Border | `#8b7355` | Card borders, accents |
| Gold accent | `#d4af37` | Links, highlights |
| Text on parchment | `#6b5344` | Meta text |

### 1.3 Typography

- **Headers**: `font-cinzel` (Cinzel)
- **Quotes**: `font-pinyon-script` (Pinyon Script)
- **Notes / meta**: `font-special-elite` (Special Elite)

---

## 2. Page Structure

### 2.1 Route

- **Path**: `/feed`
- **Component**: `frontend/src/app/feed/page.tsx`

### 2.2 Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header (sticky)                                         │
│  Egil's Map | Map | Chronicle | Strongholds | ...        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Chronicle of Wanderers                                  │
│  Moments from the journeys of fellow travelers...        │
│                                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │ Card │ │ Card │ │ Card │ │ Card │   Masonry grid     │
│  └──────┘ └──────┘ └──────┘ └──────┘   (1–4 columns)    │
│  ┌──────┐ ┌──────┐ ┌──────┐                              │
│  │ Card │ │ Card │ │ Card │                              │
│  └──────┘ └──────┘ └──────┘                              │
│                                                          │
│  [Sentinel for infinite scroll]                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Components

### 3.1 FeedCard (`FeedCard.tsx`)

**Props:**

```ts
type FeedItem = {
  id: number;
  content_type: "text" | "photo" | "video";
  content_url: string | null;
  text_content: string | null;
  inspiration_count: number;
  username: string;
  created_at: string; // ISO 8601
};

type FeedCardProps = {
  item: FeedItem;
  onCardClick?: (item: FeedItem) => void;
};
```

**Behavior:**

- Renders a parchment card with thumbtack decoration
- Content type variants:
  - **Quote** (text < 200 chars): Pinyon Script, italic
  - **Note** (text ≥ 200 chars): Special Elite, line-clamp-6
  - **Photo/Video**: Media block with sepia filter
- Footer: author link, relative date, inspiration count
- Click: opens `FeedFocusModal` if `onCardClick` provided, else navigates to `/pins/{id}`

**CSS classes:**

- `.feed-card` — Wrapper (masonry item)
- `.feed-card-parchment` — Parchment surface
- `.feed-card-pin` — Thumbtack pseudo-element
- `.feed-card-quote`, `.feed-card-note`, `.feed-card-media` — Content blocks
- `.feed-card-footer` — Author + meta

### 3.2 FeedFocusModal (inline in `feed/page.tsx`)

**Props:**

```ts
{ item: FeedItem; onClose: () => void }
```

**Behavior:**

- Full-screen overlay with parchment modal
- Shows full content (quote, note, or media)
- Author link, inspiration count
- "View & Inspire" button → `/pins/{id}`
- Close button (×) and backdrop click

---

## 4. API Integration

### 4.1 Endpoint

```
GET /pins/feed?offset=0&limit=24&locale=en
```

### 4.2 Response

```json
[
  {
    "id": 1,
    "content_type": "text",
    "content_url": null,
    "text_content": "A moment of clarity...",
    "inspiration_count": 5,
    "username": "traveler",
    "created_at": "2025-02-19T12:00:00Z"
  }
]
```

### 4.3 Pagination

- **Page size**: 24 items
- **Infinite scroll**: IntersectionObserver on `#feed-sentinel`
- **Load more** when sentinel enters viewport (with 200px rootMargin)
- **Guard**: Do not load when `loading === true`

---

## 5. Masonry Layout

### 5.1 Breakpoints

| Viewport | Columns |
|----------|---------|
| < 640px | 1 |
| 640px – 1023px | 2 |
| 1024px – 1279px | 3 |
| ≥ 1280px | 4 |

### 5.2 CSS

```css
.feed-masonry {
  column-count: 1 | 2 | 3 | 4;
  column-gap: 1.5rem;
}

.feed-card {
  break-inside: avoid;
  margin-bottom: 1.5rem;
  display: inline-block;
  width: 100%;
}
```

---

## 6. i18n Keys

| Key | EN | RU |
|-----|----|----|
| `nav.feed` | Chronicle | Хроника |
| `feed.title` | Chronicle of Wanderers | Хроника странников |
| `feed.subtitle` | Moments from the journeys... | Моменты из путей... |
| `feed.empty` | No moments yet... | Пока нет моментов... |
| `feed.loadingMore` | Loading more... | Загружаем ещё... |
| `feed.viewPin` | View & Inspire | Смотреть и вдохновить |

---

## 7. Navigation

The Feed link appears in:

- Map header (`MapView.tsx`)
- Profile header
- Profile `[username]` header
- Strongholds list header
- Stronghold detail header
- Home page (as "Chronicle" button)

---

## 8. Accessibility

- Cards are focusable and keyboard-navigable
- Author links use `onClick` stopPropagation to avoid opening modal when clicking profile
- Modal has `aria-label` on close button
- Semantic: `<main>`, `<header>`, `<article>`, `<footer>`

---

## 9. Performance

- **Lazy load**: Images/videos in cards load as they enter viewport (browser default)
- **Infinite scroll**: Only fetches next page when user scrolls near bottom
- **Animation**: Framer Motion for card entrance and modal transitions

---

## 10. File Reference

| File | Purpose |
|------|---------|
| `frontend/src/app/feed/page.tsx` | Feed page, infinite scroll, modal |
| `frontend/src/components/FeedCard.tsx` | Card component |
| `frontend/src/app/globals.css` | `.feed-*` styles |
| `frontend/src/locales/{en,ru}/common.json` | i18n |
| `backend/app/api/pins.py` | `GET /pins/feed` |
| `backend/app/schemas/pin.py` | `FeedItem` schema |
