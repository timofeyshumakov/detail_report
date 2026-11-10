# Vue Template (Vite + Vuetify + Pinia)

Базовый шаблон для новых проектов. Внутри есть переиспользуемые компоненты и утилиты, которые можно брать за основу.

## Быстрый старт

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

Dev-сервер по умолчанию: **https://localhost:5173**

Если в корне есть `cert.pem` и `private.key`, используются они. Иначе Vite поднимает временный self-signed сертификат (браузер может попросить подтвердить исключение).

## Сборка

```bash
npm run build
npm run preview
```

## Docker

```bash
docker build -t vue-app .
docker run --rm -p 8080:80 vue-app
```

## Настройка окружения

1. Скопируйте `.env.example` в `.env`.
2. HTTPS включён по умолчанию (`VITE_DEV_HTTPS=true`, хост `localhost`).
3. Для своих сертификатов положите в корень `cert.pem` и `private.key` или укажите пути в `.env`.
4. Чтобы отключить HTTPS: `VITE_DEV_HTTPS=false`.
5. Прокси и Bitrix (по необходимости):
   - `VITE_DEV_PROXY_TARGET=https://example.com/requests.json`
   - `VITE_B24_BASE_URL=https://your-company.bitrix24.ru`

## Что важно в шаблоне

- `src/components` — переиспользуемые UI-компоненты.
- `src/composables` — общие composable-функции.
- `src/functions` — API/утилитарная логика.

Сгенерированные файлы сборки (`dist`), локальные сертификаты и локальные `.env`-файлы не хранятся в git.
