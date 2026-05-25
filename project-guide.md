# Полный гайд по проекту: Geo-Social Platform

---

## 1. Название и позиционирование

### Варианты названий

| Название | Идея | Почему работает |
|----------|------|-----------------|
| **Imprint** | Оставить след | Воспоминания = отпечатки на карте мира |
| **Atlas** | Живой атлас жизни | Карта + жизненный нарратив, сильный образ |
| **Etch** | Выгравировать момент | Краткое, современное, глобальное |
| **Wandr** | Странники | Точное попадание в аудиторию |
| **Epoch** | Эпохи жизни | Подчёркивает систему глав |

**Рекомендация:** `Imprint` — работает на всех языках, легко произносится, сильная метафора («оставь след»), не занят в App Store.

### Tagline
> *"Your life, mapped."*  
> *"Every place has a story. Leave yours."*

---

## 2. Концепция и уникальные фичи

### Ключевые экраны (MVP)

**1. Memory Map** — личная карта воспоминаний
- Зум в любую точку мира → видишь свои пины
- Тап на пин → история с фото/видео/текстом
- Создание пина: геолокация автоматически, можно поставить вручную
- Приватность пина: только я / друзья / публичное

**2. Life Chapters** — главы жизни
- Коллекция пинов объединённых темой или периодом
- Примеры: «Год в Лиссабоне», «Мой стартап», «Велопоход через Альпы»
- Глава = обложка + описание + хронология пинов на карте
- Профиль строится из глав — не из постов

**3. Live Map** — где все сейчас
- Opt-in: пользователь сам включает видимость
- Режимы: «только друзья», «всё комьюнити», «невидимый»
- Тепловая карта активности — где комьюнити сильнее всего
- Пульс в реальном времени: кто появился в твоём городе

**4. Discovery Mode** — исследование
- Перемещаешься по карте → видишь публичные пины незнакомых
- Фильтры: недавние / всех времён / по теме / по языку
- «Hotspots» — места с наибольшей концентрацией историй

### Дополнительные уникальные фичи (дифференциаторы)

**Echoes** 🔔
Когда ты приходишь в место, где кто-то из твоих друзей оставил пин — тихое уведомление: *«Алекс был здесь 4 месяца назад. У него есть история об этом месте.»* Создаёт магию случайных совпадений.

**Trails** 🗺
Анимированные маршруты на карте: за неделю / месяц / год. Видишь свою жизнь как путь. Можно поделиться «маршрутом года».

**Time Machine** ⏳
Слайдер времени на Live Map: перемотай назад и посмотри, где было комьюнити год назад, во время того фестиваля, в день X.

**Sync Moments** ✨
Когда двое друзей оказываются в одном месте одновременно (и оба видимы) — платформа предлагает: *«Вы оба сейчас в Kreuzberg! Встретитесь?»*

**Chapter Covers** 🎨
Обложка главы автоматически генерируется из твоих пинов — как коллаж мест на карте с фотографиями. Визуально как книжная обложка жизни.

---

## 3. Дизайн-философия

### Принципы

- **Карта — главный герой.** Не лента, не истории — карта. Всё вращается вокруг неё.
- **Меньше контента — больше места.** Не бесконечный скролл, а пространство для погружения.
- **Тёмная тема по умолчанию** для карты (ночные карты красивее, подчёркивают огни городов).
- **Тактильность.** Долгий тап чтобы поставить пин. Свайп чтобы листать главу. Всё должно ощущаться физически.
- **Анимации карты** — плавные переходы между зонами, пульсирующие точки, линии маршрутов.

### Визуальный стиль

- **Тёмный фон карты** с контрастными пинами (цвет пина = тема главы)
- **Минималистичные карточки** поверх карты (как в Apple Maps)
- **Типографика:** крупная и смелая для названий глав, мелкая для деталей
- **Цветовая система пинов:** каждая глава получает цвет → пины на карте этого цвета
- **Blur-эффект** под нижними sheet-панелями (glassmorphism осторожно)

### Эталонные приложения для вдохновения

| Что взять | Откуда |
|-----------|--------|
| Анимации карты | Apple Maps, Google Maps |
| Bottom sheets | Airbnb, Uber |
| Тёмный UI карты | Strava, Dark Sky |
| Повествование | BeReal (аутентичность), Polarsteps |
| Живое присутствие | Zenly (R.I.P.), Snapchat Maps |
| Визуальный профиль | VSCO, Are.na |

---

## 4. Технический стек

### Рекомендованный стек (Mobile-first)

```
Monorepo (Turborepo + pnpm)
├── apps/
│   ├── mobile/          ← React Native + Expo (iOS + Android)
│   └── web/             ← Next.js 15 (веб-версия)
├── packages/
│   ├── ui/              ← Shared компоненты
│   ├── api/             ← Supabase client + hooks
│   ├── types/           ← TypeScript типы
│   └── maps/            ← Map utilities
```

| Категория | Технология | Почему |
|-----------|-----------|--------|
| Mobile | React Native + Expo SDK 52 | Один код → iOS + Android |
| Web | Next.js 15 (App Router) | SEO + performance |
| Styling mobile | NativeWind v4 (Tailwind) | Единый дизайн-язык |
| Maps | Mapbox GL / @rnmapbox/maps | Кастомные стили, offline, анимации |
| Backend | Supabase | PostgreSQL + PostGIS + Auth + Realtime + Storage |
| Realtime location | Supabase Realtime Broadcast | Ephemeral, не хранится |
| State | Zustand + TanStack Query v5 | Простота + кэширование |
| Navigation | Expo Router v4 | File-based, deep links |
| Media | Cloudinary | Трансформации, оптимизация |
| Auth | Supabase Auth | Google, Apple, Email |
| Language | TypeScript (strict) | Обязательно |

### Ключевые таблицы БД (PostgreSQL + PostGIS)

```sql
-- Воспоминание (пин)
CREATE TABLE memory_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  location GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS
  title TEXT NOT NULL,
  body TEXT,
  media_urls TEXT[],
  chapter_id UUID REFERENCES chapters(id),
  visibility TEXT DEFAULT 'private', -- 'private' | 'friends' | 'public'
  pinned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индекс для геозапросов
CREATE INDEX memory_pins_location_idx ON memory_pins USING GIST(location);

-- Глава жизни
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B8BD4',
  cover_url TEXT,
  started_at DATE,
  ended_at DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Живое присутствие (ephemeral, TTL 30 мин)
CREATE TABLE live_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  location GEOGRAPHY(POINT, 4326),
  visibility TEXT DEFAULT 'friends', -- 'friends' | 'community' | 'hidden'
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Файл `.cursorrules` — вставь в корень проекта

В репозитории правь реальный файл `.cursorrules` в корне. Ниже — то же содержимое в виде нормального Markdown (без «матрёшки» из code fence внутри code fence), чтобы превью и редактор не ломали разметку.

### Вступление (скопируй одним блоком в начало файла)

```text
You are an expert full-stack developer working on Imprint — a geo-social platform for active, adventure-driven people: programmers, travelers, dreamers, creators.
```

### Product Vision

Imprint is a social network where:

1. Users pin memories (stories + photos/video) to map locations
2. Memories are organized into Life Chapters (narrative arcs)
3. Friends' live locations are visible on a map (opt-in)
4. Public memories from strangers are discoverable by location

The MAP is the primary UI. Everything revolves around it.

### Tech Stack

- **Mobile**: React Native + Expo SDK 52, Expo Router v4
- **Web**: Next.js 15 (App Router)
- **Monorepo**: Turborepo + pnpm workspaces
- **Styling**: NativeWind v4 (mobile) / Tailwind CSS v4 (web)
- **Maps**: @rnmapbox/maps (mobile) / mapbox-gl (web)
- **Backend**: Supabase (PostgreSQL + PostGIS + Auth + Realtime + Storage)
- **State**: Zustand (global) + TanStack Query v5 (server state)
- **Language**: TypeScript strict mode — NO `any` types ever

### Code Standards

- Functional components + hooks only, never class components
- All map coordinates: { latitude: number; longitude: number }
- All timestamps: ISO 8601 UTC strings
- Geo queries ALWAYS use PostGIS ST_DWithin or ST_Distance
- Row Level Security (RLS) on every Supabase table
- Offline-first: optimistic updates with TanStack Query
- FlatList/FlashList over ScrollView for any list > 10 items
- Expo Image over React Native Image always
- expo-haptics for tactile feedback on map interactions

### Key Domain Types

```typescript
type Visibility = 'private' | 'friends' | 'public'

interface MemoryPin {
  id: string
  userId: string
  location: { latitude: number; longitude: number }
  title: string
  body?: string
  mediaUrls: string[]
  chapterId?: string
  visibility: Visibility
  pinnedAt: string
}

interface Chapter {
  id: string
  userId: string
  title: string
  description?: string
  color: string
  coverUrl?: string
  startedAt?: string
  endedAt?: string
  pins?: MemoryPin[]
}

interface LivePresence {
  userId: string
  location: { latitude: number; longitude: number }
  visibility: 'friends' | 'community' | 'hidden'
  updatedAt: string
}
```

### File Structure

```text
apps/mobile/app/
  (tabs)/
    map.tsx          ← Memory Map (главный экран)
    discover.tsx     ← Discovery Mode
    live.tsx         ← Live Map
    profile.tsx      ← Профиль + главы
  pin/[id].tsx       ← Детальная страница пина
  chapter/[id].tsx   ← Детальная страница главы
  create-pin.tsx     ← Создание воспоминания

packages/api/
  pins.ts            ← CRUD для пинов
  chapters.ts        ← CRUD для глав
  presence.ts        ← Live location
  discover.ts        ← Геозапросы для Discovery
```

### Map Interaction Patterns

- Long press on map → create memory pin at that location
- Tap pin cluster → zoom in + expand cluster
- Single pin tap → show bottom sheet with preview
- Swipe up on bottom sheet → full story view
- Camera animation: always use flyTo with 800ms duration

### Privacy Rules (CRITICAL)

- Live location: opt-in per session, never stored permanently
- Memory pins default to 'private'
- Never show exact location of 'friends' mode — use fuzzy offset ±500m
- Users can delete any of their data immediately

### Performance

- Cluster pins on map when zoom < 12
- Lazy load media in lists
- Paginate pin queries (20 per page)
- Cache map tiles offline for last 5 viewed areas

### When writing Supabase queries

- Always use `.select()` with explicit columns, never `*`
- Always add `.limit()`
- Geo queries example:

```sql
SELECT * FROM memory_pins
WHERE ST_DWithin(location, ST_Point($lon, $lat)::geography, $radiusMeters)
AND visibility = 'public'
ORDER BY pinned_at DESC
LIMIT 20
```

### Tone & UI copy

- Short, punchy English (primary language)
- No corporate speak. Users are adventurers.
- Error messages are human: "Couldn't save your memory. Try again?" not "Error 500"

> Чтобы собрать итоговый `.cursorrules`: объедини блоки сверху вниз так же, как в файле `.cursorrules` — заголовки `##` там соответствуют подзаголовкам `###` в этом разделе.

---

## 6. Промты для Codex (OpenAI) / Cursor Chat

Используй эти промты прямо в Cursor Chat (Cmd+L) или в Codex CLI. Каждый промт — это отдельная фича или задача.

---

### Промт 1: Настройка проекта с нуля

```
Create a new Turborepo monorepo for a geo-social mobile app called "Imprint" with the following structure:

apps/
  mobile/ — Expo SDK 52 app with Expo Router v4, NativeWind v4
  web/ — Next.js 15 with App Router, Tailwind CSS v4
packages/
  ui/ — shared React Native + web components
  api/ — Supabase client and query hooks
  types/ — shared TypeScript interfaces

Requirements:
- pnpm workspaces
- TypeScript strict mode in all packages
- ESLint + Prettier configured
- Shared tsconfig base

Generate:
1. Root package.json with workspaces
2. turbo.json with build/dev/lint pipelines  
3. apps/mobile/package.json with all required deps
4. packages/types/src/index.ts with MemoryPin, Chapter, LivePresence, User types
5. .cursorrules file (already provided — just reference it)
```

---

### Промт 2: Memory Map — главный экран

```
Build the Memory Map screen for Imprint (React Native + Expo Router + @rnmapbox/maps).

File: apps/mobile/app/(tabs)/map.tsx

Requirements:
- Full-screen Mapbox map, dark style ("mapbox://styles/mapbox/dark-v11")
- Fetch user's own memory pins from Supabase within current map bounds
- Render pins as custom markers (colored circle with chapter color)
- Cluster pins when zoom < 12 using Mapbox clustering
- Long press anywhere on map → navigate to create-pin.tsx with lat/lng params
- Tap single pin → show MemoryPinBottomSheet (sliding up from bottom)
- MemoryPinBottomSheet shows: title, date, thumbnail, chapter name, "Open full story" button
- Loading state: skeleton shimmer on bottom sheet
- Camera starts at user's last known location or IP-based city
- Use TanStack Query for fetching + caching pins
- Zustand store for selected pin state

TypeScript types from packages/types. Supabase client from packages/api.
Handle all edge cases: no location permission, no pins in area, offline mode.
```

---

### Промт 3: Создание воспоминания (пина)

```
Build the Create Memory Pin flow for Imprint (React Native, Expo Router).

File: apps/mobile/app/create-pin.tsx

The screen receives params: { latitude: number, longitude: number } from the map long-press.

UI (bottom-sheet style, slides up from bottom):
1. Small map thumbnail at top showing the pinned location (non-interactive, just a snapshot)
2. Text input: "Give this moment a name..." (max 80 chars)
3. Rich text area: "What happened here?" (max 500 chars)  
4. Media picker: up to 5 photos or 1 video (expo-image-picker)
5. Chapter selector: dropdown of user's existing chapters + "New chapter" option
6. Pinned date: defaults to now, user can change (DateTimePicker)
7. Visibility toggle: 3 options with icons — Private 🔒 / Friends 👥 / Public 🌍
8. "Save memory" button — haptic feedback on press

On submit:
- Upload media to Supabase Storage (parallel uploads, show progress)
- Insert into memory_pins table via packages/api/pins.ts
- Optimistic update: immediately show pin on map before server confirms
- On success: close sheet, camera flies back to the new pin
- On error: show inline error, keep form data

Validation: title required, at least 1 char. Show character count.
```

---

### Промт 4: Life Chapters — система глав

```
Build the Life Chapters feature for Imprint.

Files to create:
- apps/mobile/app/profile.tsx (chapters list)
- apps/mobile/app/chapter/[id].tsx (chapter detail)
- packages/api/chapters.ts (Supabase queries)

Profile screen:
- User avatar, name, bio at top
- "My chapters" section: horizontal scroll of chapter cards
- Each card: chapter color background, title, pin count, date range, cover photo
- Tapping a chapter → chapter/[id].tsx

Chapter detail screen:
- Full-screen map showing only pins from this chapter (with chapter color markers)
- Collapsible header: chapter title + description + date range
- Bottom sheet with chronological list of pins (scrollable)
- Each list item: thumbnail + title + date + location name (reverse geocode)
- "Add memory here" FAB button
- Chapter color theme applied to UI accents

Create Chapter flow (modal):
- Title input
- Description (optional)
- Color picker: 8 preset colors
- Date range (optional): "from" and "to"
- Cover photo (picks from existing pins or upload)

packages/api/chapters.ts should export:
- getUserChapters(userId) → Chapter[]
- getChapterWithPins(chapterId) → Chapter & { pins: MemoryPin[] }
- createChapter(data) → Chapter
- updateChapter(id, data) → Chapter
- deleteChapter(id) → void
```

---

### Промт 5: Live Map — карта присутствия

```
Build the Live Map feature for Imprint (React Native + Supabase Realtime).

File: apps/mobile/app/(tabs)/live.tsx

Privacy-first design — read carefully:

Location sharing modes (user sets in settings):
- 'hidden' — not visible to anyone (default)
- 'friends' — visible to mutual followers only  
- 'community' — visible to all Imprint users
- Fuzzy mode: add random ±300m offset before broadcasting

Broadcasting logic:
- Only broadcast when user opens the Live Map tab AND has opted in
- Stop broadcasting when app goes to background (AppState listener)
- Broadcast via Supabase Realtime channel 'presence' (ephemeral, not stored in DB)
- Broadcast every 30 seconds when active
- Include: { userId, latitude, longitude, username, avatarUrl }

Map UI:
- Dark Mapbox map ("mapbox://styles/mapbox/dark-v11")
- Friends shown as circular avatar markers (expo-image with circular clip)
- Community users shown as small glowing dots (color = community activity)
- Heatmap layer for community density (Mapbox heatmap layer)
- Tap avatar marker → show user mini-profile card (name, bio, distance away)
- "You are sharing your location" banner at top when broadcasting
- Toggle button to enable/disable sharing (with haptic)

Performance:
- Max 200 community markers rendered, cluster the rest
- Throttle position updates client-side
- Clean up Realtime subscription on unmount
```

---

### Промт 6: Discovery Mode — чужие воспоминания

При копировании в чат отправь промт блоком ниже и сразу за ним — отдельный блок SQL (так надёжнее, чем вложенные ```).

**Промт:**

```
Build Discovery Mode for Imprint — exploring public memory pins from strangers.

File: apps/mobile/app/(tabs)/discover.tsx

UI Flow:
- Full-screen dark Mapbox map
- As user pans/zooms → fetch public pins in current map bounds
- Public pins shown as glowing colored dots (different from user's own pins)
- "Hotspot" areas with many pins shown as a warm glow cluster
- Tap a cluster → zoom in
- Tap a single public pin → PinPreviewCard slides up:
  - Author avatar + username (tappable → profile)
  - Pin title + date + distance from you ("3.2km away")
  - First photo (if any)
  - Truncated body text (2 lines, "Read more")
  - Heart reaction button (anonymous, just a count)
  - "See on author's chapter" button (if chapter is public)

Filter bar (horizontal chips at top of screen):
- "Recent" / "All time" — time filter
- "With photos" — media filter  
- "Nearby" (auto-set radius to 5km)

Implement the Supabase query in packages/api/discover.ts — см. следующий блок SQL ниже как эталон.

Implement infinite scroll as user pans into new areas (append, don't replace).
```

**Эталонный SQL для `packages/api/discover.ts`:**

```sql
SELECT 
  mp.id, mp.title, mp.body, mp.media_urls, mp.pinned_at,
  ST_X(mp.location::geometry) as longitude,
  ST_Y(mp.location::geometry) as latitude,
  u.username, u.avatar_url,
  c.title as chapter_title, c.color as chapter_color
FROM memory_pins mp
JOIN users u ON mp.user_id = u.id
LEFT JOIN chapters c ON mp.chapter_id = c.id
WHERE mp.visibility = 'public'
  AND ST_DWithin(
    mp.location,
    ST_MakePoint($longitude, $latitude)::geography,
    $radiusMeters
  )
ORDER BY mp.pinned_at DESC
LIMIT 30
```

---

### Промт 7: Echoes — уведомления о местах

```
Build the "Echoes" feature for Imprint — contextual notifications when you arrive near a place a friend has a memory pin.

This is a background location + notification feature.

How it works:
1. User arrives at a location (geofence trigger)
2. System checks: do any of my friends have memory pins within 300m?
3. If yes: send local notification "Alex left a memory here 3 months ago →"
4. Tap notification → open that memory pin

Implementation:

packages/api/echoes.ts:
- Query: given user's location + their friend list → find nearby friends' pins
- Only return pins from last 5 years
- Max 1 echo notification per location per day (debounce)

apps/mobile/src/services/echoService.ts:
- Use expo-location background task (BACKGROUND_FETCH_TASK)
- Check every time significant location change detected
- Use expo-notifications to schedule/send local notification
- Store "seen echoes" in AsyncStorage to avoid repeat notifications
- Notification content: "{friend_name} left a memory here {time_ago} · {pin_title}"

Notification tap handler:
- Deep link to apps/mobile/app/pin/[id].tsx
- Show the friend's memory pin (if visibility allows)
- Center map on that location

Important: respect privacy
- Only show echoes from friends' 'friends' or 'public' pins
- Never reveal exact location data in notifications
- User can disable Echoes in settings
```

---

### Промт 8: Supabase RLS (Row Level Security)

```
Write all Supabase Row Level Security policies for Imprint's database.

Tables: users, memory_pins, chapters, live_presence, follows, reactions

Rules to implement:

memory_pins:
- SELECT: user can see their own (any visibility) + friends' (visibility='friends') + anyone's (visibility='public')
- INSERT: authenticated users only, user_id must equal auth.uid()
- UPDATE: only owner can update
- DELETE: only owner can delete

chapters:
- SELECT: owner always sees their own. Others see chapters where at least one pin is public or friends-visible
- INSERT/UPDATE/DELETE: owner only

live_presence:
- SELECT: friends can see 'friends' mode, everyone can see 'community' mode
- INSERT/UPDATE: only own row (upsert pattern)
- No DELETE policy needed — use TTL/cron cleanup

follows:
- SELECT: anyone can see follow relationships
- INSERT: authenticated, follower_id = auth.uid()
- DELETE: only follower can unfollow

reactions (pin hearts):
- SELECT: anyone
- INSERT: authenticated, one per user per pin (unique constraint)
- DELETE: own reactions only

Write as SQL migration file with proper Supabase policy syntax.
Also add the PostGIS indexes and foreign key constraints.
```

---

### Промт 9: Профиль пользователя

```
Build the User Profile screen for Imprint (React Native).

File: apps/mobile/app/profile/[username].tsx

This is both "my profile" and "viewing others' profile".

Layout (scroll view with sticky header):

HEADER (sticky):
- Full-bleed cover image (chapter collage, auto-generated)  
- Avatar (circular, 72px) overlapping cover at bottom-left
- Follow/Edit button at bottom-right
- Username, display name, bio
- Stats row: X memories · X chapters · X followers · X following

MY CHAPTERS section:
- Horizontal scroll, card for each chapter
- Card: color background, title, X pins, date range, cover photo
- "New chapter" card at end (for own profile)

PINNED MEMORIES section:
- 3-column grid of pin thumbnails (like Instagram grid)
- Tapping opens pin detail
- For own profile: show all. For others: show public only.

MAP SNAPSHOT section:
- Non-interactive mini-map showing user's pins spread across the world
- Visual representation of "how far they've traveled"
- Cluster dots by region

TRAIL section (for own profile):
- "Your trails this year" — small animated map showing movement paths

Differentiate clearly: own profile (edit mode) vs others' profile (view mode).
```

---

### Промт 10: Onboarding flow

```
Build the onboarding flow for Imprint (new user first launch).

5 screens, each full-screen with a central visual + text + CTA.

Screen 1 — Welcome:
- Animated globe/map visual (Lottie animation)
- "Your life, mapped."
- "Every moment. Every place. Your story."
- "Get started" button

Screen 2 — Memory Map:
- Show animated map with pins appearing
- "Pin your memories to places that matter"
- Short demo: a pin appears on a map of a city

Screen 3 — Life Chapters:
- Show chapter cards stacking
- "Organize your life into chapters"
- "Tokyo 2024. My startup journey. Alps summer."

Screen 4 — Live Map:
- Show avatar dots on a map
- "See where your people are"
- Privacy note: "Your location is always your choice. Opt-in, anytime."

Screen 5 — First memory:
- Ask user to create their first memory pin
- Camera permission request (friendly UI)
- Location permission request
- "Drop your first pin" → opens create-pin flow

Use expo-router for navigation between screens.
Store onboarding completion in expo-secure-store.
Respect reduce-motion accessibility setting (skip animations if enabled).
```

---

## 7. Мобильная стратегия (Mobile-first)

### Обязательные мобильные паттерны

```typescript
// Все bottom sheets — через @gorhom/bottom-sheet
import BottomSheet from '@gorhom/bottom-sheet'

// Карта — полный экран, UI поверх неё
<View style={{ flex: 1 }}>
  <MapboxGL.MapView style={StyleSheet.absoluteFill} />
  <BottomSheet> {/* UI контент */} </BottomSheet>
</View>

// Тактильная отдача на все важные действия
import * as Haptics from 'expo-haptics'
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

// Нативная анимация камеры
cameraRef.current?.flyTo([longitude, latitude], 1000) // 1s transition
```

### Разрешения которые нужно запросить

```typescript
// Геолокация (всегда запрашивать foreground сначала)
const { status } = await Location.requestForegroundPermissionsAsync()
// Background — только для Echoes фичи, объяснить зачем

// Камера и галерея — для создания пинов
await ImagePicker.requestCameraPermissionsAsync()
await ImagePicker.requestMediaLibraryPermissionsAsync()

// Уведомления — для Echoes
await Notifications.requestPermissionsAsync()
```

### Производительность карты

- Кластеризация пинов начиная с zoom level 12
- Lazy loading изображений в списках (expo-image)
- Виртуализация: FlashList вместо FlatList
- Ограничение количества маркеров на карте: max 500 одновременно
- Tile caching для офлайн-доступа к картам

---

## 8. Структура папок — итоговая

```
imprint/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   │   ├── (tabs)/
│   │   │   │   ├── map.tsx         ← Memory Map (таб 1)
│   │   │   │   ├── discover.tsx    ← Discovery (таб 2)
│   │   │   │   ├── live.tsx        ← Live Map (таб 3)
│   │   │   │   └── profile.tsx     ← Мой профиль (таб 4)
│   │   │   ├── pin/[id].tsx
│   │   │   ├── chapter/[id].tsx
│   │   │   ├── profile/[username].tsx
│   │   │   ├── create-pin.tsx
│   │   │   ├── onboarding/
│   │   │   └── _layout.tsx
│   │   └── src/
│   │       ├── components/
│   │       ├── services/
│   │       └── stores/             ← Zustand stores
│   └── web/
│       └── app/                    ← Next.js App Router
├── packages/
│   ├── types/src/index.ts
│   ├── api/
│   │   ├── pins.ts
│   │   ├── chapters.ts
│   │   ├── presence.ts
│   │   ├── discover.ts
│   │   └── echoes.ts
│   ├── ui/
│   └── maps/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── .cursorrules               ← из раздела 5
├── turbo.json
└── package.json
```

---

## 9. Порядок разработки (рекомендуемый)

### Фаза 1 — Основа (2-3 недели)
1. Настройка monorepo + Supabase
2. Auth (Google + Apple Sign In)
3. Карта (пустая, с геолокацией)
4. Создание пина (упрощённое)
5. Отображение своих пинов на карте

### Фаза 2 — Главы и профиль (2 недели)
6. Система глав
7. Профиль пользователя
8. Пин detail screen
9. Приватность пинов

### Фаза 3 — Социальный слой (2-3 недели)
10. Подписки (follow/unfollow)
11. Discovery Mode
12. Реакции

### Фаза 4 — Магия (2 недели)
13. Live Map
14. Echoes уведомления
15. Trails анимация
16. Onboarding

### Фаза 5 — Полировка
17. Производительность и оффлайн
18. Пуш-уведомления
19. App Store / Google Play submission

---

*Файл создан для проекта Imprint. Обновляй по мере роста проекта.*
