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

Из корня репозитория (`/campus`, где лежит `docker-compose.yml`):

```bash
docker up --build -d
docker exec campus-project-vibecode-server-1 node src/db/seed.js   # демо-данные (однократно)
docker ps                                # оба сервиса должны быть healthy/running
```

API: `http://localhost:3001/api/v1` · Swagger UI: `http://localhost:3001/api-docs`

Внешний порт API задаётся переменной `API_PORT` в корневом `.env` (по умолчанию **3001**:
на машине разработчика порт 3000 постоянно занимает другой контейнер `zeer_api`).
Внутри контейнера API всё так же слушает 3000. Сменить порт: `API_PORT=3002 docker compose up -d`.
В Android тот же порт указывается в `campus.apiBaseUrl` — например `http://192.168.1.50:3001/`.

Контекст сборки — корень репозитория, Dockerfile — `server/Dockerfile` (пути внутри него начинаются
с `server/` и `docs/`). Если после обновления кода сборка странно кэшируется — `docker compose build --no-cache server`.

Логи и управление:

```bash
docker logs -f campus-project-vibecode-server-1         # логи API (миграции применяются при старте)
docker exec campus-project-vibecode-db-1 psql -U campus -d campus -c '\dt'
docker down                  # остановить (данные остаются в volume pgdata)
docker down -v               # остановить и удалить БД
```

### Диагностика Docker (частые ошибки)

| Сообщение | Причина и решение |
|---|---|
| `failed to fetch oauth token … lookup auth.docker.io: no such host` | Docker не может выйти в интернет (нет доступа к registry-1.docker.io — VPN, прокси, антивирус, блокировка). Нужен доступ к `registry-1.docker.io` и `auth.docker.io`; при прокси — Docker Desktop → Settings → Resources → Proxies. После первой успешной загрузки образов сеть нужна только для pull новых образов. |
| `COPY package.json … /src: not found` | Dockerfile старый — обновите его (`COPY server/package.json …`, `COPY server/src ./src`), затем `docker compose build --no-cache server`. |
| `The server does not support SSL connections` | В `DATABASE_URL` есть `sslmode=require`/`verify-full`. Обновите `docker-compose.yml` (БД без sslmode), `server/src/db/pool.js` (TLS выключен; включается только `DATABASE_SSL=true`), затем `docker compose up -d --build`. |
| `role "postgres" does not exist` | Создаётся только пользователь `campus` (POSTGRES_USER). Подключайтесь так: `docker compose exec db psql -U campus -d campus`. |
| `role "root" does not exist` | `psql` без `-U` берёт имя пользователя ОС; всегда указывайте `-U campus`. |
| `Bind for 0.0.0.0:3000 failed: port is already allocated` | Порт 3000 занят другим процессом или контейнером (на этой машине — `zeer_api`). Найти: `docker ps --filter publish=3000` и `netstat -ano \| findstr :3000` (Windows) / `ss -ltnp \| grep :3000`. Освободить (`docker stop <id>`, `taskkill /PID <pid> /F`) или поменять `API_PORT` в корневом `.env` (по умолчанию уже 3001). Порт из `.env` читается автоматически. |
| `socket access forbidden by permissions` / `port is already allocated` для 5432 | Windows (Hyper-V/WSL) резервирует диапазоны TCP-портов, либо 5432 занят локальным PostgreSQL. В compose порт БД наружу **не публикуется** — контейнер API обращается к ней по имени `db`. Для `psql` с хоста раскомментируйте блок `ports` у `db`, выбрав свободный порт (например `127.0.0.1:5433:5432`). |

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

Требуется JDK 17 и Android SDK (compileSdk 34); в Android Studio они уже есть, из консоли — задать
`JAVA_HOME` и `ANDROID_HOME` (или `sdk.dir` в `android/local.properties`).

```bash
cd android
./gradlew assembleDebug     # APK: app/build/outputs/apk/debug/app-debug.apk
```

Windows (PowerShell/cmd) — через `gradlew.bat`, префикс `.\` в PowerShell обязателен:

```powershell
cd android
.\gradlew.bat assembleDebug
```

В проекте есть обёртка Gradle (`gradlew`, `gradlew.bat`, `gradle\wrapper\`), отдельно ставить Gradle не нужно.

Готовый debug-APK уже собран и лежит в `app/build/outputs/apk/debug/app-debug.apk` (~6.4 МБ)
и собран с адресом API `http://10.0.2.2:3001/` — это адрес **эмулятора**, на реальном телефоне
он не работает. Для телефона соберите APK под IP своего компьютера (шаг 2 ниже).

### Запуск на телефоне — по шагам

**0. Предусловия**

- Сервер CAMPUS уже запущен на компьютере (Docker: `docker compose up -d` и seed — см. выше;
  или `npm start` в `server/`). Проверка с компьютера: `curl http://localhost:3001/health` → `{"status":"ok"}`.
- Телефон и компьютер в **одной Wi-Fi/локальной сети** (телефон через мобильный интернет до IP вида
  `192.168.x.x` не достучится).
- Либо подключён USB-кабель к компьютеру, где установлен Android SDK (команда `adb`).

**1. Узнать IP компьютера в локальной сети**

```bash
# Linux / macOS
ip -4 addr show | grep -oP 'inet \K[\d.]+' | grep -v 127.0.0.1   # или: hostname -I
# Windows (cmd)
ipconfig        # строка «IPv4-адрес», например 192.168.1.50
```

Пример: компьютер — `192.168.1.50`, значит адрес API для телефона — `http://192.168.1.50:3001/`
(в конце обязательно слеш `/`).

**2. Собрать APK с этим адресом (правка кода не нужна)**

```bash
cd android
./gradlew assembleDebug -PcampusApiBaseUrl=http://192.168.1.50:3001/
```

Либо один раз записать адрес в `android/local.properties` и дальше собирать обычным `./gradlew assembleDebug`:

```properties
sdk.dir=/путь/до/Android/Sdk
campus.apiBaseUrl=http://192.168.1.50:3001/
```

Приоритет: `-PcampusApiBaseUrl` → `campus.apiBaseUrl` в `local.properties` → `http://10.0.2.2:3001/` (эмулятор).
`local.properties` в git не коммитится — у каждого разработчика свой адрес.

**3. Установить APK на телефон**

Вариант A — по USB (быстрее, нужен `adb` из Android SDK):

1. На телефоне: **Настройки → О телефоне → 7 раз нажать «Номер сборки»** (включатся параметры разработчика).
2. **Настройки → Система → Для разработчиков → Отладка по USB** — включить.
3. Подключить телефон кабелем; на телефоне подтвердить «Разрешить отладку с этого компьютера».
4. Установить и запустить:

```bash
adb devices                                                    # телефон должен быть в списке как "device"
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n ru.campus.app/.ui.auth.LoginActivity     # открыть приложение
```

Вариант B — по Wi-Fi, без кабеля:

1. Android 11+: **Настройки → Для разработчиков → Отладка по Wi-Fi → Использовать код сопряжения**.
   На телефоне появятся `IP:порт` и код. На компьютере:

```bash
adb pair 192.168.1.77:37453        # IP:порт из «Сопряжения», затем ввести 6-значный код
adb connect 192.168.1.77:5555      # IP:порт из раздела «Отладка по Wi-Fi»
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

2. Android 10 и ниже: подключить телефон по USB один раз и выполнить
   `adb tcpip 5555`, затем `adb connect 192.168.1.77:5555` (IP телефона: Настройки → О телефоне → IP-адрес),
   после чего кабель можно отключить.

Вариант C — отправить APK на телефон (мессенджер, кабель, облако) и открыть его файловым менеджером.
Android попросит разрешить установку из этого источника — разрешить. Такой способ удобен, если нет `adb`.

**4. Проверить и войти**

1. Приложение открывается на экране входа. Логины из seed: `ivan@campus.ru` (вожатый, есть отряд),
   `senior@campus.ru`, `director@campus.ru`; пароль у всех — `Password1!`.
2. Если видна ошибка сети — по порядку: сервер запущен? IP в `BASE_URL` совпадает с выводом шага 1
   (после смены IP его нужно пересобрать)? телефон в той же сети? фаервол компьютера не блокирует порт 3001?
   Проверка с телефона в браузере: открыть `http://192.168.1.50:3001/health` — должен вернуться JSON.
3. Что показывает собранный адрес (диагностика): `strings app/build/outputs/apk/debug/app-debug.apk | grep 3001`
   или в Android Studio — `BuildConfig.BASE_URL`; на телефоне — `adb logcat | grep okhttp`.

Фаервол (если браузер телефона не открывает `/health`):

```bash
sudo ufw allow 3001/tcp          # Ubuntu
# Windows: разрешить Nginx/Node.js «частные сети» в окне запроса или:
netsh advfirewall firewall add rule name="CAMPUS API" dir=in action=allow protocol=TCP localport=3001
```

**5. Альтернатива — Android Studio**

Открыть папку `android/` (File → Open), дождаться Gradle Sync, в `local.properties` добавить
`campus.apiBaseUrl=http://192.168.1.50:3001/`, подключить телефон (шаг 3), выбрать его в списке
устройств и нажать **Run ▶** (`Shift+F10`). Логи — вкладка **Logcat**.

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

ENV-переменные (см. `.env.example`): `JWT_SECRET`, `BASE_DB_TYPE` (postgres), `DATABASE_URL`, `PORT`, `JWT_EXPIRES_IN`;
`DATABASE_SSL=true` — только для БД с TLS (managed-хостинг). По умолчанию TLS выключен.

## Тестирование

- `npm test` — 26 тестов: цикл заявки (register→approve→login), блокировка входа pending/rejected,
  ролевые 403, «чужой отряд», CRUD детей/тегов, soft-delete, автосоздание attendance, конфликты
  повторной отметки, фильтр событий Журнала, уведомления (read/read-all, сброс прочитанности при
  редактировании), профиль, смена пароля. Тестовая БД — `campus_test`.
- `./server/scripts/smoke.sh` — живой E2E-прогон всех разделов против поднятого сервера.
