# Risky You

Короткие игры по мотивам классических экспериментов психологии.
Фронтенд — Vite + TypeScript без фреймворка, бэкенд — FastAPI + PostgreSQL,
всё поднимается одним `docker compose` за Caddy с автоматическим HTTPS.

## Структура

```
docker-compose.yml     Caddy + FastAPI + Postgres
deploy/Caddyfile       /api/* → FastAPI, остальное → статика фронтенда
backend/
  app/main.py          приложение, создание таблиц при старте
  app/models.py        users, anon_sessions, results
  app/routers/         POST /api/results, GET /api/norms/{test_id}
frontend/
  src/tests.ts         каталог тестов (плитки на главной)
  src/games/balloon.ts первая игра — BART
  src/pages/           главная, профиль, страница теста с результатом
  src/storage.ts       anon_id и результаты в localStorage
  src/api.ts           запросы к бэкенду (ошибки сети не ломают игру)
```

## Локальная разработка

Бэкенд без переменных окружения работает на SQLite:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Документация API: http://localhost:8000/api/docs

Фронтенд в другом терминале (запросы к `/api` проксируются на :8000):

```bash
cd frontend
npm install
npm run dev
```

Сайт: http://localhost:5173

## Запуск в Docker

```bash
cp .env.example .env      # задай POSTGRES_PASSWORD
docker compose up -d --build
```

С `DOMAIN=localhost` Caddy выпустит локальный сертификат: открывай https://localhost.

## Деплой на сервер

1. Купи домен и направь A-запись на IP сервера.
2. Установи Docker, склонируй репозиторий.
3. В `.env` укажи `DOMAIN=твой-домен.ru` и надёжный `POSTGRES_PASSWORD`.
4. `docker compose up -d --build`. Caddy сам получит сертификат Let's Encrypt,
   порты 80 и 443 должны быть открыты.

Обновление: `git pull && docker compose up -d --build`.

## Как добавить новый тест

1. Создай `frontend/src/games/<id>.ts`, экспортируй объект типа `Game`
   (`mount` рисует игру и вызывает `onFinish`, `summarize` описывает результат).
2. В `frontend/src/tests.ts` добавь тесту `load: () => import("./games/<id>").then(m => m.<id>)`.
3. Убедись, что `<id>` есть в `KNOWN_TESTS` в `backend/app/config.py`.

Процентиль считается по первой попытке каждого участника и показывается,
когда таких попыток набирается `MIN_NORM_SAMPLE` (по умолчанию 20).

## Дальше

- Alembic вместо `create_all`, как только схема начнёт меняться.
- Регистрация: никнейм + magic link на почту и вход через Google; при входе
  проставлять `user_id` в `anon_sessions`, чтобы анонимные результаты переехали в аккаунт.
- Ограничение частоты запросов на `/api/results`.
- Карточка результата для сторис.
