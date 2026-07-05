# API-слой (клиент Supabase)

Код обращений к базе сосредоточен в пакете **`packages/api`**. Типы домена — в **`packages/types`**.

## Основные модули (имена файлов могут расширяться)

| Файл | Назначение |
|------|------------|
| `pins.ts` | CRUD и выборки пинов воспоминаний |
| `chapters.ts` | Главы (life chapters) и связка с пинами |
| `discover.ts` | Публичное discovery по области / радиусу |
| `echoes.ts` | Логика «echoes» (уведомления о близости к пинам друзей) |
| `mobile.ts` | Вспомогательные утилиты/эндпоинты под mobile-клиент |
| `users.ts` | Профиль, onboarding state, settings, account mutations |
| `reactions.ts` | Лайки пинов |
| `presence.ts` | Запись `live_presence` и realtime-adjacent helpers |

## Принципы при изменениях

- Вызовы Supabase `.select(...)` только с **явным списком колонок**, не `*`.
- Всегда указывать **`limit`** и при необходимости курсоры/ключи для пагинации.
- Геозапросы — через PostGIS (`ST_DWithin` и т.д.), согласованно с индексами в миграциях.
- Ошибки на границе UI формулировать по-человечески (см. правила копирайта в `.cursorrules`).

Сгенерированные типы БД (`database.types.ts`) при появлении подключать к клиенту для типобезопасности.

## Важные экспортируемые функции

- `users.ts`: `getCurrentUserAccount`, `setOnboardingState`, `updateProfile`, `updateUserSettings`, `changeEmail`, `changePassword`, `deleteAccount`, `getFollowers`, `getFollowing`, `useFollowers`, `useFollowing`
- `reactions.ts`: `addReaction`, `removeReaction`, `getPinReactionCount`, `getPinReactionState`
- `presence.ts`: `broadcastPresence`, `stopBroadcasting`, `subscribeToPresence`
- `echoes.ts`: `findNearbyFriendEchoPins`, `getEchoPinById`, `wasEchoRecentlyTriggered`, `logEchoTriggered`
