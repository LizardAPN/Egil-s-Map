# Локальная разработка Imprint

Краткая инструкция для запуска монорепо с локальным Supabase.

## Требования

- **Node.js 22** — рекомендуется через [nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`
- **pnpm 9+** — `corepack enable && corepack prepare pnpm@9 --activate`
- **Docker Desktop** — для локального стека Supabase (Postgres, Auth, Studio)

## Первый запуск

```bash
# 1. Зависимости
pnpm install

# 2. Локальный Supabase (Docker должен быть запущен)
npx supabase start

# 3. Миграции + демо-данные
pnpm db:reset

# 4. Переменные окружения для веб-приложения
cp apps/web/.env.example apps/web/.env.local
```

Заполните `apps/web/.env.local` значениями из вывода:

```bash
npx supabase status
```

Скопируйте **API URL** → `NEXT_PUBLIC_SUPABASE_URL` и **anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.  
Токен Mapbox получите на [account.mapbox.com](https://account.mapbox.com/access-tokens/) и вставьте в `NEXT_PUBLIC_MAPBOX_TOKEN`.

```bash
# 5. Запуск dev-сервера
pnpm dev
```

Веб-приложение: [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Демо-аккаунт

После `pnpm db:reset` доступен тестовый пользователь:

| Поле | Значение |
|------|----------|
| Email | `demo@imprint.dev` |
| Пароль | `imprint-demo` |

В базе: 2 главы (Лиссабон, Голландия), 14 пинов.

## Ежедневные команды

| Команда | Назначение |
|---------|------------|
| `pnpm dev` | Запуск всех приложений (Turbo) |
| `pnpm db:reset` | Пересоздать БД: миграция + seed |
| `pnpm gen:types` | Сгенерировать TS-типы из локальной схемы |
| `pnpm typecheck` | Проверка типов по монорепо |
| `pnpm lint` | ESLint по монорепо |
| `npx supabase status` | URL, ключи, порты локального стека |
| `npx supabase stop` | Остановить контейнеры Supabase |

**Supabase Studio** (SQL-редактор, таблицы, Auth): [http://127.0.0.1:54323](http://127.0.0.1:54323)

## Troubleshooting

### Docker не запущен

Ошибка вида `Cannot connect to the Docker daemon`. Запустите Docker Desktop и повторите `npx supabase start`.

### Конфликт портов

Локальный Supabase использует порты **54321** (API), **54322** (Postgres), **54323** (Studio), **54324** (Inbucket). Если порт занят:

```bash
npx supabase stop
# освободите порт или измените в supabase/config.toml
npx supabase start
```

### `db reset` падает на seed

Убедитесь, что миграция `supabase/migrations/0001_init.sql` не изменялась вручную после применения. Полный сброс: `npx supabase stop && npx supabase start && pnpm db:reset`.

### Типы не совпадают со схемой

После изменения миграций: `pnpm db:reset && pnpm gen:types`.

### Не могу войти как demo

Проверьте, что seed применился: в Studio → SQL → `select username from public.users` должен вернуть `demo`. Иначе снова `pnpm db:reset`.
