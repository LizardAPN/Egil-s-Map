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

## WSL2 (Windows + Android Studio)

SDK обычно лежит в `C:\Users\<User>\AppData\Local\Android\Sdk`. В WSL:

```bash
export ANDROID_HOME=/mnt/c/Users/<User>/AppData/Local/Android/Sdk
export ANDROID_SDK_ROOT="$ANDROID_HOME"
```

Expo вызывает `$ANDROID_HOME/platform-tools/adb` (без `.exe`). В Windows SDK есть только `adb.exe` — создайте симлинк:

```bash
ln -sf adb.exe "$ANDROID_HOME/platform-tools/adb"
```

**Gradle нужен Linux JDK** в WSL (Windows `java.exe` не читает проект из `/home/...`):

```bash
sudo apt install openjdk-17-jdk
```

Обёртка `adb` в `~/bin` и проверка `JAVA_HOME` — см. `~/.bashrc` в вашей машине.

## Частые проблемы

- **`spawn .../platform-tools/adb ENOENT`:** нет файла `adb` — см. симлинк выше.
- **Gradle / Java:** в WSL используйте `openjdk-17-jdk`, не JBR из Program Files.
- **Kotlin 1.9.24 vs Compose:** если падает `expo-modules-core:compileDebugKotlin` с требованием Kotlin 1.9.25 — в `gradle.properties` задано `android.kotlinVersion=1.9.25`, плагин подключается с этой версией в `android/build.gradle`.
- **Keystore:** `debug.keystore` в репозитории — только для локальной отладки; релизные ключи храните вне Git.

При расхождениях с актуальной документации Expo приоритет у официальных гайдов Expo SDK 52.
