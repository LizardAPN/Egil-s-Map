# Архитектура монорепо Imprint

## Верхний уровень

```
apps/
  mobile/     — клиент Expo (Router v4), карта, профили, discovery, live
  web/        — Next.js 15 App Router (лендинг, API routes по мере необходимости)

packages/
  api/        — функции доступа к Supabase (explicit select, limits, доменная логика)
  types/      — общие типы домена (пины, главы, видимость и т.д.)
  ui/         — переиспользуемые UI-элементы для RN/Web по мере роста

supabase/
  migrations/ — DDL + RLS
  seed.sql    — тестовые данные (опционально)
```

Сборка и задачи координируются **Turborepo**; менеджер пакетов — **pnpm workspaces**.

## Потоки данных

- **Клиенты** (mobile / web) ходят в **Supabase** с anon-ключом; чувствительные операции, требующие service role, остаются на сервере (Edge/API), если добавлены.
- **Realtime** используется для live-присутствия (ephemeral-сигналы, не архивировать как полную историю треков).
- **Геозапросы** в SQL должны опираться на PostGIS (`ST_DWithin` / `ST_Distance`), а не на «сырые» сравнения float без индекса и geography/geometry.

## Границы ответственности

| Слой | Роль |
|------|------|
| `apps/mobile/app/*` | Маршруты, композиция экранов, вызовы хуков/клиента |
| `packages/api` | Инкапсуляция запросов, единообразные ошибки и лимиты |
| `supabase/migrations` | Источник правды по схеме и RLS |

## Соглашения

- Координаты в коде: `{ latitude, longitude }`.
- Время в API/моделях: ISO 8601 UTC.
- Без `any` в TypeScript (strict).
- Список продуктовых деталей и промптов для фич — в `project-guide.md`.
