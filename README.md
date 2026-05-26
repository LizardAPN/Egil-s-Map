# Imprint

> *Твоя жизнь на карте.*

Imprint — геосоциальная платформа: воспоминания на карте, **Life Chapters**, opt-in live-локации и публичное discovery по местам. **Карта — основной интерфейс.**

**Репозиторий:** https://github.com/LizardAPN/Egil-s-Map

## Что внутри репозитория

| Часть | Описание |
|--------|-----------|
| `apps/mobile` | Expo SDK 52, Expo Router v4, NativeWind v4, `@rnmapbox/maps` |
| `apps/web` | Next.js 15 (App Router), лендинг и вспомогательные маршруты |
| `packages/api` | Обёртки Supabase (пины, главы, discovery, echoes и др.) |
| `packages/types` | Общие TypeScript-типы |
| `packages/ui` | Общие UI-прimitives |
| `supabase/` | Миграции, RLS, seed, локальный `config.toml` |

## Быстрый старт

1. Установите зависимости: `pnpm install` (см. `package.json` — зафиксирован `packageManager`).
2. Скопируйте переменные окружения из примеров:

   - `apps/web/.env.example` → `apps/web/.env.local`
   - `apps/mobile/.env.example` → `apps/mobile/.env`

3. Запуск разработки по приложениям — в `docs/DEV_SETUP.md`.

Подробности по сервисам (Supabase, Mapbox): `docs/SERVICES_SETUP.md`. Архитектура монорепо: `docs/ARCHITECTURE.md`.

## Продуктовые правила (кратко)

- Live-локация: **только opt-in**, не хранить перманентно как «историю перемещений».
- Пины по умолчанию **private**.
- Видимость `friends`: **не показывать точные координаты** (допускается размытие/смещение согласно продуктовым правилам).
- На всех таблицах в экспортируемых схемах — **RLS**.

Детальный продуктовый и технический гайд: `project-guide.md`.

## Скрипты в корне

| Команда | Назначение |
|---------|------------|
| `pnpm dev` | Параллельный dev через Turbo |
| `pnpm build` | Сборка через Turbo |
| `pnpm lint` / `pnpm typecheck` | Проверки |

## Лицензия и вклад

Уточняйте лицензию у владельцев репозитория. Для изменений в базе и RLS используйте миграции в `supabase/migrations/`.
