# Склад

Первый этап демонстрационного складского SaaS для малого бизнеса Казахстана.

## Запуск

```bash
npm install
npm run dev
npm run dev:api
```

Веб-приложение работает на `http://localhost:5173`, API — на `http://localhost:8787`.
Главная, товары и остатки используют демонстрационные данные. API подключён к D1 и отдаёт `GET /api/health` и `GET /api/organizations/demo`; складские операции на этом этапе не реализованы.

Для локальной D1 выполните `npm run db:migrate:local`. Worker также раздаёт production-сборку SPA из `apps/web/dist`; пути `/api/*` обрабатывает Hono. Рабочая D1 настроена в `apps/api/wrangler.jsonc`. Для развёртывания выполните `npm run deploy`; перед первым запуском примените миграции и начальные данные командами `npx wrangler d1 migrations apply warehouse-demo --remote` и `npx wrangler d1 execute warehouse-demo --remote --file=seed.sql` из `apps/api`. Хранилище R2 понадобится на следующих этапах; пока оно не подключено.

Проверки: `npm run typecheck`, `npm run lint`, `npm run build`.
