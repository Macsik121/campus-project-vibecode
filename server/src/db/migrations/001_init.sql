-- CAMPUS: начальная схема БД (по ERD из ТЗ + Swagger-приложению A)
-- Расхождения ERD и Swagger разрешены в пользу контракта API (см. README, реестр решений).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Роли и статусы
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('counselour', 'senior_counselour', 'director');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'active', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tag_type AS ENUM ('warning', 'alert', 'health', 'sports');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_kind AS ENUM ('info', 'important', 'map');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE map_object_type AS ENUM ('sports_playground', 'dining_room', 'housing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Пользователи (вожатые, старшие вожатые, директор)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone_number  VARCHAR(20),
  avatar_url    VARCHAR(255),
  guide_notes   TEXT,
  role          user_role NOT NULL DEFAULT 'counselour',
  status        user_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Заявки вожатых (создаются при регистрации, одобряет/отклоняет директор или старший вожатый)
CREATE TABLE IF NOT EXISTS counselor_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        application_status NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  reviewed_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_applications_status ON counselor_applications(status);

-- Смены (ограничение из ERD: shift_end - shift_start <= 21 день)
CREATE TABLE IF NOT EXISTS shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_no    INT NOT NULL,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end   TIMESTAMPTZ NOT NULL,
  CONSTRAINT shift_dates_valid CHECK (shift_end > shift_start),
  CONSTRAINT shift_max_21_days CHECK (shift_end - shift_start <= INTERVAL '21 days')
);

CREATE TABLE IF NOT EXISTS users_in_shifts (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, shift_id)
);

-- Отряды
CREATE TABLE IF NOT EXISTS squads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(150) NOT NULL,
  description TEXT,
  shift_id    UUID REFERENCES shifts(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- M2M: назначение вожатых на отряды (ERD: Users_in_squads)
CREATE TABLE IF NOT EXISTS users_in_squads (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  squad_id    UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, squad_id)
);
CREATE INDEX IF NOT EXISTS idx_uis_squad ON users_in_squads(squad_id);

-- Дети (отдельная сущность по Swagger; user_id — опциональная связь с учёткой ребёнка)
CREATE TABLE IF NOT EXISTS children (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        VARCHAR(150) NOT NULL,
  age              VARCHAR(3) NOT NULL,
  parent_full_name VARCHAR(150) NOT NULL,
  parent_phone     VARCHAR(20) NOT NULL,
  notes            TEXT DEFAULT '',
  squad_id         UUID REFERENCES squads(id) ON DELETE SET NULL,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_children_squad ON children(squad_id) WHERE deleted_at IS NULL;

-- Теги детей
CREATE TABLE IF NOT EXISTS child_tags (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  type     tag_type NOT NULL,
  info     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tags_child ON child_tags(child_id);

-- Уведомления
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  kind        notification_kind NOT NULL DEFAULT 'info',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sent_at DESC);

-- Прочитанность уведомлений per-user (ERD: Notifications_read_by_users)
CREATE TABLE IF NOT EXISTS notifications_read_by_users (
  notif_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notif_id, user_id)
);

-- Мероприятия (активности). Ограничения из ERD: time_from < time_to, длительность >= 10 минут
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(150) NOT NULL,
  description TEXT DEFAULT '',
  event_type  VARCHAR(50) DEFAULT 'general',
  time_from   TIMESTAMPTZ NOT NULL,
  time_to     TIMESTAMPTZ NOT NULL,
  squad_id    UUID REFERENCES squads(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_time_valid CHECK (time_from < time_to),
  CONSTRAINT event_min_duration CHECK (time_to - time_from >= INTERVAL '10 minutes')
);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(time_from, time_to);

-- Посещаемость. Строки создаются автоматически при создании события (is_present = false)
CREATE TABLE IF NOT EXISTS event_attendance (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  child_id  UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  is_present BOOLEAN NOT NULL DEFAULT false,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ,
  UNIQUE (event_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON event_attendance(event_id);

-- Логи действий (ERD: ActionLog; method/path/meta — расширение для выборок)
CREATE TABLE IF NOT EXISTS action_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caused_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event      TEXT NOT NULL,
  method     VARCHAR(10),
  path       TEXT,
  meta       JSONB
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON action_logs(created_at DESC);

-- Чат (общая комната, MVP)
CREATE TABLE IF NOT EXISTS messages (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message   TEXT NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_sent ON messages(sent_at DESC);

-- Прочитанность сообщений. NB: в ERD FK ошибочно указан на User — здесь исправлено на messages
CREATE TABLE IF NOT EXISTS message_read_by_users (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- Карта: статические объекты и динамические координаты пользователей (заготовка для раздела «Карта»)
CREATE TABLE IF NOT EXISTS map_objects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat         NUMERIC(10, 7) NOT NULL,
  long        NUMERIC(10, 7) NOT NULL,
  title       VARCHAR(150) NOT NULL,
  description TEXT,
  type        map_object_type NOT NULL
);

CREATE TABLE IF NOT EXISTS map_users (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lat        NUMERIC(10, 7) NOT NULL,
  long       NUMERIC(10, 7) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
