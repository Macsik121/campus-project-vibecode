# CAMPUS — Comprehensive Administration and Management Platform for Unified Supervision

Автоматизированная система управления педагогическими отрядами детского лагеря.
Веб-API + нативное Android-приложение для вожатых, старших вожатых и директора лагеря.

## Состав репозитория

```
/campus
├── server/            # Backend: Node.js + Express + PostgreSQL (REST API + Socket.io)
├── android/           # Клиент: нативное Android-приложение (Java + XML, Retrofit, socket.io-client)
├── docs/              # swagger.yaml, api-requests.http, UML-диаграммы (use-cases, ERD)
├── docker-compose.yml # Развёртывание: PostgreSQL + API одной командой
└── README.md
```

## Быстрый старт (Docker)

```bash
docker compose up --build -d
docker compose exec server node src/db/seed.js   # демо-данные (однократно)
```

API: `http://localhost:3000/api/v1` · Swagger UI: `http://localhost:3000/api-docs`

## Быстрый старт (без Docker)

```bash
# 1. PostgreSQL: создать БД campus и пользователя campus/campus
# 2. Сервер
cd server
cp .env.example .env          # при необходимости поправить DATABASE_URL и JWT_SECRET
npm install
npm run migrate && npm run seed
npm start                     # http://localhost:3000
# 3. Проверка end-to-end
./scripts/smoke.sh
# 4. Тесты и линт
npm test                      # 26 тестов (jest + supertest, отдельная БД campus_test)
npm run lint
```

## Учётные записи seed (пароль у всех: `Password1!`)

| Email | Роль | Назначение |
|---|---|---|
| `director@campus.ru` | Директор | статистика, заявки, всё |
| `senior@campus.ru` | Старший вожатый | логи, заявки, любой отряд |
| `ivan@campus.ru` | Вожатый | назначен на отряд «Капельки» |
| `olga@campus.ru` | Вожатый | без назначения (демо 404 NO_SQUAD) |

## Роли и права (иерархия из use-case диаграммы: Admin extends Child)

- **Вожатый** — свой отряд (дети, заметки, журнал, посещаемость), уведомления, чат, профиль.
- **Старший вожатый** — всё, что вожатый, плюс: любой отряд, создание отрядов/детей/событий/уведомлений, назначение вожатых, заявки, логи.
- **Директор** — всё, что старший, плюс раздел «Статистика».

Валидация токена на сервере (ТЗ «Безопасность»): 1) `jwt.verify` секретом; 2) пользователь активен (заявка одобрена); 3) вожатый числится на активной смене (`users_in_shifts`); директор освобождён от проверки смены.

## API

Спецификация: `docs/swagger.yaml` (все endpoint'ы из ТЗ-Приложения A + расширения: заявки, логи, статистика, чат, смена пароля). Раздаётся Swagger UI на `/api-docs`.
Сценарии проверки: `docs/api-requests.http` (REST Client) и `server/scripts/smoke.sh` (bash).
WebSocket (socket.io): JWT на handshake (`auth.token`); события `notification:new`, `chat:message`.

## Android-приложение

Нативное, Java + XML (по ТЗ). Стек: Retrofit2/OkHttp (Bearer из SharedPreferences), Gson, socket.io-client, Material Components, ViewBinding.

```bash
cd android
./gradlew assembleDebug     # APK: app/build/outputs/apk/debug/app-debug.apk
```

Готовый debug-APK уже собран и лежит в `app/build/outputs/apk/debug/app-debug.apk` (~6.5 МБ) —
можно сразу ставить на эмулятор/устройство (`adb install`).

Либо открыть папку `android/` в Android Studio и Run. Адрес API — `BASE_URL` в `app/build.gradle`
(по умолчанию `http://10.0.2.2:3000/` — хост-машина из эмулятора; для реального устройства укажите IP компьютера).

Разделы (bottomNavigationView, по ролям): Отряд, Журнал, Уведомления, Карта (заглушка MVP), Чат, Профиль;
senior+ — Логи и Заявки; director — Статистика. Токен хранится в SharedPreferences; «Выход» очищает его
и возвращает на форму входа. Заморозка UI на время запросов — через FreezeHelper (ТЗ).

## Реестр решений по противоречиям ТЗ

В ТЗ встречаются расхождения между текстом, ERD и Swagger-приложением A. Принятые решения:

1. **Дети как User (ERD) vs отдельная сущность Child (Swagger)** → отдельная таблица `children`
   (+ опциональный `user_id` для связи с учёткой). API оперирует Child — контракт Swagger неизменен.
2. **Роли ERD (Child/Admin) vs Swagger (counselour/senior_counselour/director)** → в БД и API роли Swagger;
   наследование прав из use-case диаграммы выражено иерархией middleware.
3. **GET /users/squad для неназначенного вожатого** → `404 {error:{code:"NO_SQUAD"}}`;
   клиент показывает текст «Вы не привязаны к отряду» (оба поведения покрыты тестом).
4. **Удаление ребёнка** → soft-delete (`deleted_at`) + отвязка от отряда: запись с пометкой остаётся
   (ТЗ: «в системе будет только пометка»). Код ответа 204 по Swagger сохранён.
5. **POST /notifications «создаётся автоматически», но endpoint ручной** → оба варианта:
   автоматические уведомления на события системы (новое мероприятие, назначение вожатого, одобрение заявки)
   через сервисный слой + socket; ручное создание для senior+ по Swagger.
6. **«Уведомления не обновляются/не удаляются» (ТЗ) vs PUT/DELETE в Swagger** → реализовано по Swagger;
   при редактировании уведомление снова становится непрочитанным для всех (поведение из описания endpoint'а).
7. **«Удалить профиль(D)» в use-case vs «нет (D)» в ТЗ** → удаление профиля выполняется через
   soft-delete человека в разделе Отряд (право оставлено вожатому по ТЗ); вход удалённого → 403 с пояснением.
8. **Карта** → в MVP клиентская заглушка; таблицы `map_objects`/`map_users` заложены в схему.
9. **Посещаемость** → при создании события строки `event_attendance` создаются автоматически для всех
   детей отряда (`is_present=false`, заметка ERD); POST переключает флаг; GET возвращает массив
   присутствующих childIds (формат из Swagger).
10. **Дефект ERD: FK `message_read_by_users.message_id → User`** → исправлен на ссылку на `messages`.
11. **«Неверный логин/пароль» в поведении формы регистрации** → трактовано как копипаст из формы входа;
    для регистрации поведение: проверки формы → «почта занята» → «заявка подана».
12. **Пароль ≥6 символов + ≥1 спецсимвол** → единая валидация на клиенте и сервере (спецсимвол = не буква/цифра).
13. **`event_type` отсутствует в Swagger-модели Event, но нужен для статистики** → необязательное
    дополнительное поле (контракт не ломается), значения сидятся (lineup/football/quest/…).

Ограничения из ERD реализованы CHECK-констрейнтами: смена ≤ 21 дня; событие `time_from < time_to`,
длительность ≥ 10 минут (валидируется и на сервере — понятная 400-ошибка до ошибки БД).

## Архитектура backend

Слои: `routes → controllers → services → repositories` (Repository pattern по ТЗ: 1 функция = 1 обращение к БД).
Без ORM — `pg` напрямую. Миграции — нумерованные SQL-файлы (`src/db/migrations`), применяются при старте.
Middleware-матрица по ТЗ: публичные login/register — только Logger; Read — только auth;
Create/Update/Delete — auth + Logger (+ roleGuard). Логи действий пишутся в `action_logs` на каждую
изменяющую операцию (список случаев из ТЗ «Логи действий»).

ENV-переменные (см. `.env.example`): `JWT_SECRET`, `BASE_DB_TYPE` (postgres), `DATABASE_URL`, `PORT`, `JWT_EXPIRES_IN`.

## Тестирование

- `npm test` — 26 тестов: цикл заявки (register→approve→login), блокировка входа pending/rejected,
  ролевые 403, «чужой отряд», CRUD детей/тегов, soft-delete, автосоздание attendance, конфликты
  повторной отметки, фильтр событий Журнала, уведомления (read/read-all, сброс прочитанности при
  редактировании), профиль, смена пароля. Тестовая БД — `campus_test`.
- `./server/scripts/smoke.sh` — живой E2E-прогон всех разделов против поднятого сервера.
