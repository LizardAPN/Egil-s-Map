# Web implementation prompt (full parity with mobile)

Copy everything inside the fenced block below into a new Agent session.

---

```
Ты — senior full-stack разработчик в монорепо Imprint (geo-social platform).
Задача: довести `apps/web` (Next.js 15 App Router) до функционального паритета с `apps/mobile` (Expo).
Сейчас web — только лендинг (`/`), заглушка `/map` и `/api/status`. Нужно реализовать ВСЕ продуктовые функции mobile на вебе.

## Контекст репозитория

Прочитай перед началом:
- `.cursorrules`, `.cursor/rules/imprint-core.mdc`, `.cursor/rules/imprint-privacy.mdc`, `.cursor/rules/map-interactions.mdc`
- `docs/ARCHITECTURE.md`, `docs/DEV_SETUP.md`, `docs/SERVICES_SETUP.md`
- `project-guide.md` (дизайн-философия, доменные типы)
- Mobile reference (источник правды по UX/flow):
  - `apps/mobile/app/` — все маршруты
  - `apps/mobile/src/services/auth.ts`, `onboarding.ts`, `echoService.ts`
  - `apps/mobile/src/providers/app-providers.tsx`
  - `apps/mobile/app/(tabs)/map.tsx`, `discover.tsx`, `live.tsx`, `profile.tsx`
  - `apps/mobile/app/sign-in.tsx`, `auth/callback.tsx`, `onboarding/*`
  - `apps/mobile/app/create-pin.tsx`, `pin/[id].tsx`, `chapter/[id].tsx`
  - `apps/mobile/app/edit-profile.tsx`, `settings.tsx`, `profile/[username].tsx`, `profile/[username]/[list].tsx`
- API layer: `packages/api/src/` — `index.ts`, `mobile.ts`, `pins.ts`, `chapters.ts`, `discover.ts`, `presence.ts`, `echoes.ts`, `users.ts`, `reactions.ts`
- Types: `packages/types/src/index.ts`
- Web baseline: `apps/web/app/` (page, map placeholder, layout, globals.css, api/status)

## Стек (обязательно)

- Next.js 15 App Router, React 19, TypeScript strict — **никакого `any`**
- Tailwind CSS v4 (уже в web) — сохранить тёмную эстетику лендинга (`apps/web/app/globals.css`)
- **mapbox-gl** на web (как в project-guide; mobile использует `@rnmapbox/maps`)
- Supabase Auth + PostGIS через `@imprint/api` — **не дублировать SQL в компонентах**
- TanStack Query v5 + Zustand где уместно (как mobile)
- `@supabase/ssr` для cookie-based сессий в Next.js (middleware + server/client helpers)
- Переиспользовать `packages/types`; расширять `packages/api`, а не копировать запросы в `apps/web`

## Архитектурные требования

### 1. Рефакторинг `packages/api` для web + mobile

Сейчас `packages/api/src/mobile.ts` тянет React Native (`AsyncStorage`, url-polyfill) — web не может его импортировать.

Сделай:
- `packages/api/src/supabase/` — общие env (`NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`), парсеры row → domain types
- `packages/api/src/browser.ts` — `createSupabaseBrowserClient()` с cookie storage для Next (`@supabase/ssr`)
- `packages/api/src/mobile.ts` — тонкая обёртка над browser client + AsyncStorage (как сейчас, без дублирования query logic)
- Вынеси из `mobile.ts` в shared модули: `useMemoryPinsInBounds`, `useMemoryPinDetail`, bounds helpers, mappers — чтобы web импортировал из `@imprint/api/pins` или `@imprint/api/browser`
- Реализуй `useRecentPublicPins()` в `index.ts` (сейчас stub `queryFn: async () => []`) через `discover.ts`
- Экспорты в `packages/api/package.json` — добавь `./browser` при необходимости

### 2. Структура `apps/web`

```
apps/web/
  app/
    (marketing)/page.tsx          — сохранить лендинг; CTA → /map или /sign-in по сессии
    (app)/                          — authenticated shell
      layout.tsx                    — tab nav: Map | Discover | Live | Profile
      map/page.tsx
      discover/page.tsx
      live/page.tsx
      profile/page.tsx
    sign-in/page.tsx
    auth/callback/route.ts          — OAuth code exchange (PKCE)
    onboarding/
      page.tsx + шаги (parity с mobile onboarding/*)
    pin/[id]/page.tsx
    chapter/[id]/page.tsx
    create-pin/page.tsx
    edit-profile/page.tsx
    settings/page.tsx
    profile/[username]/page.tsx
    profile/[username]/[list]/page.tsx   — followers | following
  components/
    map/          — MapboxMap, PinLayer, ClusterLayer, MapBottomSheet
    auth/         — SignInForm, OAuthButtons
    profile/      — ChapterCard, PinList, FollowButton
    ui/           — Button, Sheet, Spinner (web-native, не RN)
  lib/
    auth.ts       — thin wrappers → @imprint/api
    map.ts        — flyTo 800ms, cluster zoom < 12
  middleware.ts   — protect (app) routes; redirect unauthenticated → /sign-in
  providers.tsx   — QueryClientProvider + Supabase listener + optional Zustand
```

Используй route groups `(marketing)` / `(app)` чтобы не ломать SEO лендинга.

### 3. Auth (parity mobile)

- Email sign-in / sign-up (`signInWithPassword`, `signUp`) — логика как `apps/mobile/src/services/auth.ts`
- OAuth Google + Apple → redirect `${NEXT_PUBLIC_APP_URL}/auth/callback`
- Callback: `exchangeCodeForSession(code)` → проверка `users.is_onboarded` → `/onboarding` или `/(app)/map`
- Sign out: очистка сессии + `stopBroadcasting()` из presence + остановка echo polling если есть
- Middleware: публичные `/`, `/sign-in`, `/auth/callback`, `/api/*`; остальное — session required
- Human errors: "Couldn't sign you in. Try again?" — не "Error 500"
- Добавь redirect URL в Supabase Dashboard: `http://localhost:3000/auth/callback` (и prod из `NEXT_PUBLIC_APP_URL`)

### 4. Onboarding (5 экранов)

Порти flow из `apps/mobile/app/onboarding/`:
- memory-map, live-map, life-chapters, first-memory, index/_layout
- По завершении: `setOnboardingState(true)` через `@imprint/api/users`
- Без завершённого onboarding — редирект с любого `(app)/*` на `/onboarding`

### 5. Memory Map (`/(app)/map`)

Поведение как `apps/mobile/app/(tabs)/map.tsx`:
- Mapbox dark style `mapbox://styles/mapbox/dark-v11`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Загрузка пинов по viewport bounds через `useMemoryPinsInBounds`
- Кластеризация при zoom < 12; tap cluster → zoom in
- Tap pin → bottom sheet preview; CTA "Open" → `/pin/[id]`
- Long press (или right-click / кнопка "Drop pin") → `/create-pin?lat=&lng=`
- `flyTo` 800ms при выборе pin / геолокации
- Geolocation API для "my location" (с graceful fallback как mobile IP city)
- Offline banner при `navigator.onLine === false` (аналог netinfo)
- Цвет пина = цвет chapter

### 6. Discovery (`/(app)/discover`)

- Карта + `fetchPublicDiscoverPins` из `@imprint/api/discover`
- PostGIS через существующие API (ST_DWithin) — не писать raw SQL в компонентах
- Фильтры: recent / all-time (если есть в mobile — повтори)
- Только `visibility = 'public'` pins
- Pagination limit 20

### 7. Live Map (`/(app)/live`)

- Opt-in toggle per session (не сохранять историю треков)
- `broadcastPresence` + `subscribeToPresence` из `@imprint/api/presence`
- Режимы visibility: friends | community | hidden
- **Privacy CRITICAL**: для `friends` — fuzzy offset ±500m на отображении (никогда exact coords чужих)
- Realtime через Supabase Realtime Broadcast
- UI: список/маркеры присутствия + статус "You're visible" / "Hidden"

### 8. Echoes (web-adapted)

Порти логику из `apps/mobile/src/services/echoService.ts` + `@imprint/api/echoes`:
- При входе в геозону друга — toast/banner: "Alex was here…" (без push на web — in-app notification)
- Debounce через `echo_logs` / `wasEchoRecentlyTriggered` / `logEchoTriggered`
- Не спамить: respect debounce keys

### 9. Profile & social

Маршруты parity mobile:
- `/(app)/profile` — текущий user: chapters, stats, links to edit/settings
- `/profile/[username]` — публичный профиль
- `/profile/[username]/followers` | `following` — lists via `useFollowers` / `useFollowing`
- Follow/unfollow: `useFollowUser` / `useUnfollowUser`
- Chapter detail `/chapter/[id]` — `useChapterDetail`, pins on mini-map or list
- Pin detail `/pin/[id]` — `useMemoryPinDetail`, media gallery, reactions, share

### 10. Create / edit flows

- `/create-pin` — title, body, media upload → Supabase Storage bucket `memory-media` (как mobile env)
- Default visibility: **private**
- Optional chapter picker
- Optimistic updates: `buildOptimisticMemoryPin`, query cache helpers из `pins.ts`
- `/edit-profile` — username availability check, avatar bucket
- `/settings` — email/password change, delete account, sign out

### 11. Reactions & share

- `usePinReactionState`, `useAddReaction`, `useRemoveReaction` на pin detail
- Web Share API (`navigator.share`) с fallback copy link

### 12. Env & deps

Обнови `apps/web/package.json`:
- `mapbox-gl`, `@types/mapbox-gl`
- `@supabase/ssr`
- `@tanstack/react-query`
- `zustand` (если нужен map store)

`.env.local` уже описан в `apps/web/.env.example` — используй:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — только server routes если понадобится; **никогда** в client bundle

### 13. Дизайн

- Карта — главный UI; тёмная тема по умолчанию
- Glass/blur bottom sheets поверх карты (CSS, не RN)
- Акцент `#38bdf8` (как mobile tab bar)
- Copy: короткий punchy English ("Couldn't save your memory. Try again?")
- Лендинг `/` оставь, но CTA "Explore Imprint" ведёт в app если залогинен

### 14. Качество и проверки

По завершении каждой фазы:
```bash
pnpm --filter @imprint/web typecheck
pnpm --filter @imprint/web lint
pnpm --filter @imprint/web build
```

Не ломай mobile: после рефактора `packages/api`:
```bash
pnpm --filter mobile typecheck
```

### 15. Порядок реализации (строго по фазам, коммить логическими кусками)

**Фаза A — Foundation**
- `@supabase/ssr`, middleware, providers, browser supabase client
- sign-in + auth/callback + session guard

**Фаза B — API shared layer**
- Рефактор `packages/api` (browser + shared queries)
- Подключить TanStack Query на web

**Фаза C — Core map**
- Mapbox map page + pins in bounds + bottom sheet + pin detail

**Фаза D — Create & chapters**
- create-pin, chapter detail, profile chapters

**Фаза E — Discovery & Live**
- discover map, live presence + privacy fuzz

**Фаза F — Social & settings**
- profiles, follow lists, edit-profile, settings, reactions, share

**Фаза G — Onboarding & Echoes**
- onboarding wizard, echo toasts

**Фаза H — Polish**
- loading/error/empty states, 404 page, accessibility (keyboard map controls), responsive layout

### 16. Acceptance criteria (всё должно быть true)

- [ ] Незалогиненный user на `/map` → redirect `/sign-in`
- [ ] Email + OAuth login работают локально с `supabase start` или cloud project
- [ ] Onboarding блокирует app до `is_onboarded`
- [ ] Memory map показывает свои пины, кластеры, открывает pin detail
- [ ] Long press / create flow создаёт pin (default private)
- [ ] Discovery показывает public pins в радиусе
- [ ] Live map: opt-in broadcast, realtime markers, friends coords fuzzed ±500m
- [ ] Profile: chapters, follow/unfollow, followers/following lists
- [ ] Pin detail: reactions, share
- [ ] Settings: change email/password, delete account, sign out
- [ ] Echoes: debounced in-app notification near friend pins
- [ ] `pnpm build` проходит для web и mobile typecheck не сломан
- [ ] Нет `any`; explicit `.select()` + `.limit()` в Supabase; RLS не обходится

### 17. Ограничения

- НЕ переписывай mobile UI в web через react-native-web
- НЕ коммить секреты
- НЕ меняй Supabase migrations без необходимости
- Минимальный diff: переиспользуй существующие API functions
- Если web-специфичный код >30 строк дублирует mobile — выноси в `packages/api` или `packages/ui` (web-safe components only)

Начни с Фазы A: прочитай указанные файлы, составь краткий план файлов, затем реализуй до конца всех фаз без остановки на заглушках.
```

---

## Optional additions

Append to the prompt when needed:

- `Используй модель composer-2.5` — if a specific model is required.
- `Не трогай лендинг, только (app) routes` — for a smaller diff.
- `Apple Sign-In на web не нужен` — if web OAuth is Google-only.

## Phased sessions

For large runs, split by phase in a new Agent chat:

> Continue from Phase D. Phases A–C are merged. Follow `docs/WEB_IMPLEMENTATION_PROMPT.md`.

## Related docs

- [DEV_SETUP.md](./DEV_SETUP.md) — local run and env
- [SERVICES_SETUP.md](./SERVICES_SETUP.md) — Supabase, Mapbox
- [ARCHITECTURE.md](./ARCHITECTURE.md) — monorepo layout
