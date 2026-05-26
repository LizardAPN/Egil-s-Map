# Сборка и запуск под Android

В репозитории присутствует каталог **`apps/mobile/android`** (prebuild / нативный проект Expo).

## Подготовка

1. Установите **Android Studio**, SDK и эмулятор или подключите устройство с отладкой по USB.
2. Заполните `apps/mobile/.env` (Supabase, Mapbox и др.) по `apps/mobile/.env.example`.
3. Для Mapbox настроьте загрузку SDK согласно документации `@rnmapbox/maps` (downloads token при необходимости).

## Команды

Из корня монорепо (пример):

```bash
pnpm install
pnpm --filter mobile run android
```

Точное имя скрипта смотрите в `apps/mobile/package.json` (`android`, `run:android` и т.п.).

## Частые проблемы

- **Gradle / Java:** версии Gradle и JDK должны соответствовать требованиям React Native для вашей версии Expo.
- **Keystore:** `debug.keystore` в репозитории — только для локальной отладки; релизные ключи храните вне Git.

При расхождениях с актуальной документации Expo приоритет у официальных гайдов Expo SDK 52.
