# Supabase

## Таблицы

- `users`: профиль, связанный с `auth.users`
- `chapters`: метаданные глав пользователя
- `memory_pins`: воспоминания с геопривязкой
- `follows`: граф подписок
- `reactions`: лайки пинов по пользователям
- `live_presence`: последнее переданное местоположение при шаринге
- `echo_logs`: debounce-лог фоновых Echoes уведомлений

Дополнительные поля предпочтений пользователя в новых миграциях:

- `echoes_enabled`
- `notifications_enabled`
- `default_live_visibility`
- `default_pin_visibility`

## Политики RLS

### `users`

- аутентифицированные пользователи могут читать все строки
- пользователь может создавать, обновлять и удалять только свою строку

### `memory_pins`

- читать можно пины, разрешённые функцией `can_view_memory_pin`
- владелец может вставлять, обновлять и удалять только свои пины

### `chapters`

- владелец управляет своими главами
- другие читают главу, если в ней есть хотя бы один видимый пин

### `live_presence`

- владелец вставляет и обновляет только свою строку присутствия
- читатели видят строки режима `community` и взаимных друзей в режиме «друзья»
- владелец может удалить только свою строку присутствия

### `follows`

- все строки доступны на чтение
- аутентифицированный пользователь создаёт и удаляет только свои рёбра follow

### `reactions`

- все строки доступны на чтение
- аутентифицированный пользователь создаёт и удаляет только свои реакции

### `echo_logs`

- пользователь читает, создаёт и удаляет только свои debounce-записи

## Cron-задачи

- `cleanup-live-presence`: каждые 15 минут удаляет устаревшие строки `live_presence`
- `cleanup-echo-logs`: ежедневно чистит старые `echo_logs`

## Триггеры и функции

- `handle_new_user`
- `update_updated_at`
- `is_mutual_follow`
- `can_view_memory_pin`
- `delete_my_account`
- `cleanup_expired_live_presence`
- `cleanup_old_echo_logs`
- `on_auth_user_created`
- `update_users_updated_at`
- `update_chapters_updated_at`
- `update_memory_pins_updated_at`
- RPC `delete_my_account()` используется mobile settings для удаления аккаунта.

## Локальный сброс

```bash
pnpm exec supabase db reset
```

## Сид

Тестовые данные в `supabase/seed.sql`.

Обновлено: 2026-05-26
