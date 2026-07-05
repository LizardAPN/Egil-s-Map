# Локальная разработка

## Требования

- **Node.js** (LTS, совместимый с Expo SDK 52 и Next.js 15).
- **pnpm** 9.x (версия указана в корневом `package.json` → `packageManager`).
- **Supabase CLI** (в devDependencies монорепо есть пакет `supabase`; можно вызывать через `pnpm exec supabase`).
- Для mobile: Xcode (macOS / iOS) и/или Android Studio; для карты нужен токен Mapbox.

## Установка

Из корня репозитория:

```bash
pnpm install
```

## Переменные окружения

1. Web: скопируйте `apps/web/.env.example` в `apps/web/.env.local` и заполните ключи Supabase и Mapbox.
2. Mobile: скопируйте `apps/mobile/.env.example` в `apps/mobile/.env`.

Значения URL и anon key можно взять из Supabase Dashboard (Production / Preview) или из вывода `supabase start` для локального стека.

## Auth и callback

- Email sign-in/sign-up экран: `apps/mobile/app/sign-in.tsx`
- OAuth callback scheme: `imprint://auth/callback`
- Для Google/Apple нужно добавить этот redirect в Supabase Auth allow list

## Запуск приложений

### Все задачи через Turbo

```bash
pnpm dev
```

Поднимает `dev`-скрипты пакетов, включённые в пайплайн Turbo (уточняйте `turbo.json` и локальные `package.json` в `apps/*`).

### Только web

```bash
pnpm --filter web dev
```

или из `apps/web` по инструкции в локальном `package.json`.

### Только mobile (Expo)

```bash
pnpm --filter mobile start
```

Дальше Expo Dev Tools / симулятор / устройство. Для сборки под Android см. `docs/android-dev-build.md`.

## Локальный Supabase

Из корня (при наличии `supabase/config.toml`):

```bash
pnpm exec supabase start
```

После старта обновите `EXPO_PUBLIC_*` и `NEXT_PUBLIC_*` URL/ключи в `.env` согласно выводу CLI.

Миграции лежат в `supabase/migrations/`; сид `supabase/seed.sql` — по необходимости.

## Проверки перед PR

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Частые проблемы

- **Native binding / CSS в Next:** при странных ошибках нативных модулей переустановите зависимости (`rm -rf node_modules && pnpm install`) в соответствии с политикой lockfile в проекте.
- **Mapbox на mobile:** для нативных сборок может понадобиться отдельный downloads token — см. документацию Mapbox и `docs/SERVICES_SETUP.md`.
