# Внешние сервисы

## Supabase

1. Создайте проект в [Supabase](https://supabase.com) или используйте локальный стек (`supabase start`).
2. В Dashboard: **Settings → API** — `URL`, `anon public`, при необходимости `service_role` (только сервер, не в mobile bundle и не в `NEXT_PUBLIC_*`).
3. Примените миграции из `supabase/migrations/` через CLI или CI.
4. Проверьте **Storage buckets** — имена должны совпадать с переменными в `apps/mobile/.env.example` (`memory-media`, `chapter-covers`; avatars по умолчанию тоже могут использовать публичный bucket).

## Mapbox

1. Аккаунт и токен: https://account.mapbox.com/access-tokens/
2. **Публичный токен** (`pk...`) — в `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` и `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
3. Для **нативных** сборок RN часто нужен отдельный **downloads** token — следуйте документации `@rnmapbox/maps` для текущей версии.

## EAS (Expo Application Services)

Файл `eas.json` в корне задаёт пресеты сборок. Учётные данные и секреты храните в EAS / CI, не коммитьте в репозиторий.

## Прочее

- URL приложения для web: `NEXT_PUBLIC_APP_URL` (редиректы, абсолютные ссылки).
- Для mobile OAuth redirect используйте `imprint://auth/callback`.
- Любые новые секреты добавляйте через `.env.example` с пустым значением и комментарием назначения.
