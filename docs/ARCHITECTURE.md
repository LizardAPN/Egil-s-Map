# Imprint — ARCHITECTURE.md

> Техническая архитектура v2 (web-first). Дополняет `PRODUCT.md` и `DESIGN.md`.
> Схема БД проверена на живом PostgreSQL 16 + PostGIS, включая RLS-тесты (05.07.2026).

---

## 1. Обзор

```
Браузер ── Next.js 15 (App Router, React 19)
   │            │  Server Components / Route Handlers (SSR публичных страниц, OG)
   │            ▼
   └─────► Supabase (локально в dev: `supabase start`)
             ├─ PostgreSQL 16 + PostGIS  ← RLS = единственный периметр безопасности
             ├─ Auth (email + Google)
             └─ Storage (bucket `media`, приватный)
Mapbox GL JS v3 ── кастомный стиль `imprint-night` (см. DESIGN.md §5)
```

Принцип: **никакого собственного бэкенда в v1**. Вся авторизация доступа — RLS в Postgres; клиент и серверные компоненты ходят в Supabase напрямую через `packages/api`. Next.js Route Handlers используются только там, где нужен сервер: OG-изображения, вебхуки (позже).

## 2. Монорепо

```
imprint/
├── apps/web/                  # Next.js 15
│   ├── app/
│   │   ├── (marketing)/       # лендинг, sign-in (без карты)
│   │   ├── (app)/             # авторизованная зона: ПЕРСИСТЕНТНАЯ КАРТА в layout
│   │   │   ├── map/           # главный экран Map+Timeline
│   │   │   ├── chapters/      # список глав («полка»)
│   │   │   ├── feed/          # лента подписок (соцслой)
│   │   │   └── settings/
│   │   ├── u/[username]/      # публичный профиль (SSR)
│   │   │   └── c/[slug]/      # публичная глава: story-вид (SSR + OG)
│   │   ├── p/[id]/            # публичный пин (SSR + OG)
│   │   ├── onboarding/
│   │   ├── auth/callback/
│   │   └── api/og/            # генерация OG-превью (ImageResponse)
│   ├── components/            # map/, timeline/, pin/, chapter/, trail/
│   ├── stores/                # zustand
│   └── lib/
├── packages/
│   ├── types/                 # доменные типы (источник: генерация из БД + ручные)
│   ├── api/                   # supabase-клиенты + типизированные запросы + мапперы
│   └── ui/                    # дизайн-система (токены DESIGN.md → tailwind preset)
├── supabase/
│   ├── migrations/0001_init.sql   # ✔ написана и проверена
│   ├── seed.sql                   # демо-юзер, 2 главы, ~15 пинов (для dev)
│   └── config.toml
├── docs/                      # PRODUCT.md, DESIGN.md, ARCHITECTURE.md
└── .cursor/rules/
```

## 3. Модель данных (миграция `0001_init.sql`)

| Таблица | Суть | Ключевые поля |
|---|---|---|
| `users` | профиль поверх `auth.users`, создаётся триггером | `username` (unique, case-insensitive) |
| `user_preferences` | настройки | `default_pin_visibility`, `settings jsonb` |
| `chapters` | главы | `slug` (unique per user, для URL), `color`, `visibility`, даты периода |
| `memory_pins` | воспоминания | `location geography(point)`, `pinned_at` (дата события ≠ created_at), `visibility` |
| `pin_media` | медиа пина (отдельная таблица, не массив) | `position`, `media_type`, `storage_path`, `width/height`, `blurhash` |
| `trails` | путь главы | `mode: auto/custom`, `segments jsonb` (from_pin, to_pin, style, waypoints) |
| `map_annotations` | подписи/стрелки/зоны на карте главы | `kind`, `geom`, `style jsonb` |
| `follows` | подписки | друзья = взаимная подписка |
| `reactions` | реакции на пины | PK (user_id, pin_id) |

**Видимость** (единый enum-check везде): `private` (default) → `friends` (взаимные подписки) → `unlisted` (доступ по ссылке, не попадает в discovery/ленту) → `public`.

### Приватность координат (протестировано)
- Точная геометрия хранится только в `memory_pins.location`.
- Клиент читает чужие пины **только через view `pins_visible`** (`security_invoker=on`): владельцу и public/unlisted — точные координаты; friends-пинам чужих пользователей — `ST_SnapToGrid(0.02°)` (~2 км) + флаг `location_exact=false` (UI рисует зону, а не точку).
- RLS-политики на всех 9 таблицах; хелперы `is_mutual_follow`, `can_view` — `security definer`.
- Дочерние сущности (`pin_media`, `trails`, `map_annotations`, `reactions`) наследуют видимость родителя через exists-подзапросы.
- Триггер запрещает привязать пин к чужой главе.

## 4. Слой API (`packages/api`)

- Два клиента: `createBrowserClient()` (`@supabase/ssr`) и `createServerClient()` (cookies) — как в старом репо.
- Все запросы — типизированные функции: `pins.listInBounds(bbox, filters)`, `pins.create(input)`, `chapters.getBySlug(username, slug)`, `trails.upsert(...)`, `social.follow(...)` и т.д. Компоненты **никогда** не пишут `.from('...')` напрямую.
- Типы БД генерируются: `supabase gen types typescript --local` → `packages/types/src/database.ts`; поверх — доменные типы и мапперы (snake_case → camelCase, `geography` → `{ lng, lat }`).
- Чтение пинов: только `pins_visible`; при `location_exact=false` UI обязан рисовать размытую зону.
- Геозапросы: bbox через PostGIS (`ST_Intersects` с envelope) — RPC `pins_in_bounds` добавим, если PostgREST-фильтров не хватит.

## 5. Архитектура фронтенда

### Персистентная карта — главное решение
Инстанс Mapbox создаётся один раз в layout группы `(app)` и **не перемонтируется** при навигации между `/map`, `/chapters/...`. Роуты меняют состояние карты (камера, слои, выбранная глава), а не саму карту. Это даёт бесшовные полёты камеры между разделами — ядро UX.

### Состояние
- **URL — источник правды навигации**: `?pin=`, `?chapter=`, `?t=` (позиция таймлайна). Любое состояние, которым можно поделиться ссылкой, живёт в searchParams.
- **Zustand** — эфемерное UI-состояние: `mapStore` (камера, hovered), `timelineStore` (диапазон, play-режим), `editorStore` (черновик пина/trail).
- **TanStack Query v5** — весь серверный стейт; ключи: `['pins', bbox, filters]`, `['chapter', username, slug]`; оптимистичные мутации для создания пина и реакций.

### Timeline ⟷ Map синхронизация
Один координатор (hook `useTimelineSync`): скролл таймлайна → debounced `flyTo`; движение слайдера → фильтр пинов по `pinned_at` + камера следует за «текущим» пином; play-режим — покадровая прокрутка времени (rAF). Данные таймлайна и карты — один и тот же query-кэш.

### Рендер карты
Пины и trail — **нативные слои Mapbox** (GeoJSON source + circle/line layers), не DOM-маркеры: тысячи пинов без деградации. Кластеризация — встроенная (`cluster: true`). DOM — только для активной карточки пина. Прорисовка trail — анимация `line-gradient`/dasharray.

## 6. Медиа

1. Клиент: выбор файлов → `exifr` вытаскивает GPS+дату (для импорта) → ресайз до 2560px + конвертация в WebP (canvas/`browser-image-compression`) → расчёт blurhash.
2. Upload напрямую в Supabase Storage: bucket `media`, путь `{user_id}/{pin_id}/{uuid}.webp`. Storage-политики: запись только в свой префикс; чтение через signed URLs (TTL 1 час), которые выдаёт `packages/api` после RLS-проверки видимости пина.
3. Видео v1: до 100 МБ, без транскодинга (ограничение форматом mp4/h264). Cloudinary — отложено до реальной боли.

## 7. Auth

Supabase Auth: email+password и Google OAuth. Флоу как в старом репо: `/auth/callback` route handler + `middleware.ts` (защита `(app)`-группы, редирект в онбординг при `is_onboarded=false`). Профиль создаётся серверным триггером `handle_new_user` (username = локальная часть email + 4 символа id, меняется в онбординге).

## 8. Dev-workflow

- `supabase start` (Docker) — локальные Postgres/Auth/Storage/Studio; `supabase db reset` прогоняет миграции + `seed.sql`.
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (локальные), `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Облачный Supabase-проект и деплой (Vercel) — после работающего локального MVP; миграции те же (`supabase db push`).
- Качество: TS strict (`any` запрещён), ESLint + Prettier, Vitest для `packages/api` (мапперы, хелперы), Playwright — позже.

## 9. Порядок реализации (эпики)

| # | Эпик | Содержание |
|---|---|---|
| 0 | Скелет | Монорепо, tailwind-токены из DESIGN.md, supabase local + миграция + seed |
| 1 | Auth + оболочка | Sign-in/up, middleware, layout (app) с пустой картой `imprint-night` |
| 2 | Пины | CRUD, слои карты, карточка пина, медиа-аплоад |
| 3 | Timeline | Панель, синхронизация с картой, слайдер времени + play |
| 4 | Главы | CRUD, полка, привязка пинов, авто-trail + анимация прорисовки |
| 5 | Trail-редактор | Custom-режим, waypoints, стили сегментов, аннотации |
| 6 | Story-вид + публичные страницы | SSR, OG-превью, шаринг unlisted-ссылкой |
| 7 | Соцслой | Подписки, реакции, лента, профиль |
| 8 | Импорт + онбординг | EXIF-импорт фото, GPX, онбординг-флоу, On this day |
