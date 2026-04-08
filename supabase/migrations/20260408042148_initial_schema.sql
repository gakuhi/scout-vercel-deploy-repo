-- =============================================================
-- Scout Service: Initial Schema Migration
-- Based on: docs/development/03-00-schema.md
-- =============================================================

-- =============================================================
-- 1. Enum Types
-- =============================================================

CREATE TYPE user_role AS ENUM (
  'student',
  'company_owner',
  'company_member'
);

CREATE TYPE product_source AS ENUM (
  'smart_es',
  'company_ai',
  'interview_ai',
  'syukatsu'
);

CREATE TYPE scout_status AS ENUM (
  'sent',
  'accepted',
  'declined',
  'expired'
);

CREATE TYPE academic_type AS ENUM (
  'liberal_arts',
  'science',
  'arts',
  'medical',
  'sports',
  'other'
);

CREATE TYPE chat_sender_role AS ENUM (
  'student',
  'company_member'
);

CREATE TYPE notification_type AS ENUM (
  'scout_received',
  'scout_accepted',
  'scout_declined',
  'chat_new_message',
  'event_reminder',
  'system_announcement'
);

CREATE TYPE event_organizer_type AS ENUM (
  'company',
  'platform'
);

CREATE TYPE event_format AS ENUM (
  'online',
  'offline',
  'hybrid'
);

CREATE TYPE event_registration_status AS ENUM (
  'applied',
  'confirmed',
  'cancelled',
  'attended'
);

-- =============================================================
-- 2. Schemas
-- =============================================================

CREATE SCHEMA IF NOT EXISTS internal;

-- =============================================================
-- 3. Tables (dependency order)
-- =============================================================

-- ----- 1. students -----
CREATE TABLE students (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id),
  email           TEXT        NOT NULL UNIQUE,
  last_name       TEXT,
  first_name      TEXT,
  last_name_kana  TEXT,
  first_name_kana TEXT,
  phone           TEXT,
  birthdate       DATE,
  gender          TEXT,
  university      TEXT,
  faculty         TEXT,
  department      TEXT,
  academic_type   academic_type,
  graduation_year INT,
  prefecture      TEXT,
  postal_code     TEXT,
  city            TEXT,
  street          TEXT,
  profile_image_url TEXT,
  bio             TEXT,
  is_profile_public BOOLEAN   DEFAULT false,
  data_consent_granted_at TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ----- 2. companies -----
CREATE TABLE companies (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL,
  industry             TEXT,
  employee_count_range TEXT,
  website_url          TEXT,
  logo_url             TEXT,
  description          TEXT,
  prefecture           TEXT,
  postal_code          TEXT,
  city                 TEXT,
  street               TEXT,
  phone                TEXT,
  is_public            BOOLEAN     DEFAULT false,
  is_verified          BOOLEAN     DEFAULT false,
  verified_at          TIMESTAMPTZ,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ----- 3. company_members -----
CREATE TABLE company_members (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id),
  company_id  UUID        NOT NULL REFERENCES companies(id),
  email       TEXT        NOT NULL,
  last_name   TEXT,
  first_name  TEXT,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ----- 4. student_product_links -----
CREATE TABLE student_product_links (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID           NOT NULL REFERENCES students(id),
  product          product_source NOT NULL,
  external_user_id TEXT           NOT NULL,
  linked_at        TIMESTAMPTZ    DEFAULT now(),
  UNIQUE (student_id, product)
);

-- ----- 5. synced_es_entries -----
CREATE TABLE synced_es_entries (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL REFERENCES students(id),
  external_es_id      TEXT,
  company_name        TEXT,
  industry            TEXT,
  question_content    TEXT,
  answer              TEXT,
  selection_type      TEXT,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

-- ----- 6. synced_researches -----
CREATE TABLE synced_researches (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID        NOT NULL REFERENCES students(id),
  external_research_id TEXT,
  title                TEXT,
  content              TEXT,
  url                  TEXT,
  original_created_at  TIMESTAMPTZ,
  synced_at            TIMESTAMPTZ DEFAULT now()
);

-- ----- 7. synced_interview_sessions -----
CREATE TABLE synced_interview_sessions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID        NOT NULL REFERENCES students(id),
  external_session_id   TEXT,
  session_type          TEXT,
  summary               TEXT,
  skill_scores          JSONB,
  original_created_at   TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT now()
);

-- ----- 8. synced_activities -----
CREATE TABLE synced_activities (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL REFERENCES students(id),
  external_record_id  TEXT,
  event_name          TEXT,
  event_url           TEXT,
  applied_at          TIMESTAMPTZ,
  notes               TEXT,
  original_created_at TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

-- ----- 9. student_integrated_profiles -----
CREATE TABLE student_integrated_profiles (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             UUID        NOT NULL UNIQUE REFERENCES students(id),
  summary                TEXT,
  strengths              JSONB,
  interests              JSONB,
  skills                 JSONB,
  preferred_work_locations JSONB,
  activity_level         TEXT,
  generated_at           TIMESTAMPTZ DEFAULT now(),
  model_version          TEXT
);

-- ----- 14. job_postings (scouts depends on this) -----
CREATE TABLE job_postings (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID        NOT NULL REFERENCES companies(id),
  created_by             UUID        NOT NULL REFERENCES company_members(id),
  title                  TEXT        NOT NULL,
  description            TEXT,
  job_category           TEXT,
  work_location          TEXT,
  employment_type        TEXT,
  salary_range           TEXT,
  requirements           TEXT,
  benefits               TEXT,
  target_graduation_year INT,
  is_published           BOOLEAN     DEFAULT false,
  published_at           TIMESTAMPTZ,
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- ----- 10. scouts -----
CREATE TABLE scouts (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES companies(id),
  sender_id       UUID         NOT NULL REFERENCES company_members(id),
  student_id      UUID         NOT NULL REFERENCES students(id),
  job_posting_id  UUID         NOT NULL REFERENCES job_postings(id),
  subject         TEXT         NOT NULL,
  message         TEXT         NOT NULL,
  status          scout_status DEFAULT 'sent',
  sent_at         TIMESTAMPTZ  DEFAULT now(),
  read_at         TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ
);

-- ----- 11. saved_searches -----
CREATE TABLE saved_searches (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_member_id UUID        NOT NULL REFERENCES company_members(id),
  name              TEXT        NOT NULL,
  filters           JSONB       NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ----- 12. company_plans -----
CREATE TABLE company_plans (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID        NOT NULL UNIQUE REFERENCES companies(id),
  plan_type               TEXT        DEFAULT 'free',
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  scout_quota             INT         DEFAULT 0,
  scouts_sent_this_month  INT         DEFAULT 0,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ----- 13. audit_logs (internal schema) -----
CREATE TABLE internal.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  actor_role  TEXT,
  action      TEXT        NOT NULL,
  target_type TEXT,
  target_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ----- 15. chat_messages -----
CREATE TABLE chat_messages (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id    UUID             NOT NULL REFERENCES scouts(id),
  sender_id   UUID             NOT NULL,
  sender_role chat_sender_role NOT NULL,
  content     TEXT             NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ      DEFAULT now()
);

-- ----- 16. notifications -----
CREATE TABLE notifications (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID              NOT NULL,
  type           notification_type NOT NULL,
  title          TEXT              NOT NULL,
  body           TEXT,
  reference_type TEXT,
  reference_id   UUID,
  is_read        BOOLEAN           DEFAULT false,
  read_at        TIMESTAMPTZ,
  line_sent_at   TIMESTAMPTZ,
  email_sent_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ       DEFAULT now()
);

-- ----- 17. student_notification_settings -----
CREATE TABLE student_notification_settings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL UNIQUE REFERENCES students(id),
  scout_received      BOOLEAN     DEFAULT true,
  chat_message        BOOLEAN     DEFAULT true,
  event_reminder      BOOLEAN     DEFAULT true,
  system_announcement BOOLEAN     DEFAULT true,
  line_enabled        BOOLEAN     DEFAULT true,
  in_app_enabled      BOOLEAN     DEFAULT true,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ----- 18. company_notification_settings -----
CREATE TABLE company_notification_settings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_member_id   UUID        NOT NULL UNIQUE REFERENCES company_members(id),
  scout_accepted      BOOLEAN     DEFAULT true,
  scout_declined      BOOLEAN     DEFAULT true,
  chat_message        BOOLEAN     DEFAULT true,
  system_announcement BOOLEAN     DEFAULT true,
  email_enabled       BOOLEAN     DEFAULT true,
  in_app_enabled      BOOLEAN     DEFAULT true,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ----- 19. events -----
CREATE TABLE events (
  id                     UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID                 REFERENCES companies(id),
  created_by             UUID                 REFERENCES company_members(id),
  organizer_type         event_organizer_type NOT NULL,
  title                  TEXT                 NOT NULL,
  description            TEXT,
  event_type             TEXT,
  format                 event_format         NOT NULL DEFAULT 'offline',
  location               TEXT,
  online_url             TEXT,
  starts_at              TIMESTAMPTZ          NOT NULL,
  ends_at                TIMESTAMPTZ,
  capacity               INT,
  application_deadline   TIMESTAMPTZ,
  target_graduation_year INT,
  is_published           BOOLEAN              DEFAULT false,
  published_at           TIMESTAMPTZ,
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ          DEFAULT now(),
  updated_at             TIMESTAMPTZ          DEFAULT now()
);

-- ----- 20. event_registrations -----
CREATE TABLE event_registrations (
  id           UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID                      NOT NULL REFERENCES events(id),
  student_id   UUID                      NOT NULL REFERENCES students(id),
  status       event_registration_status DEFAULT 'applied',
  applied_at   TIMESTAMPTZ               DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ               DEFAULT now(),
  UNIQUE (event_id, student_id)
);

-- ----- 21. anonymous_visits -----
CREATE TABLE anonymous_visits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT        NOT NULL UNIQUE,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  utm_term      TEXT,
  utm_content   TEXT,
  referrer      TEXT,
  landing_page  TEXT,
  user_agent    TEXT,
  ip_address    TEXT,
  user_id       UUID,
  linked_at     TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- 4. Indexes
-- =============================================================

-- students
CREATE INDEX idx_students_is_profile_public ON students (is_profile_public) WHERE is_profile_public = true;
CREATE INDEX idx_students_graduation_year ON students (graduation_year);
CREATE INDEX idx_students_university ON students (university);
CREATE INDEX idx_students_prefecture ON students (prefecture);
CREATE INDEX idx_students_academic_type ON students (academic_type);

-- synced_es_entries
CREATE INDEX idx_synced_es_entries_student_id ON synced_es_entries (student_id);
CREATE INDEX idx_synced_es_entries_industry ON synced_es_entries (industry);

-- synced_researches
CREATE INDEX idx_synced_researches_student_id ON synced_researches (student_id);

-- synced_interview_sessions
CREATE INDEX idx_synced_interview_sessions_student_id ON synced_interview_sessions (student_id);

-- synced_activities
CREATE INDEX idx_synced_activities_student_id ON synced_activities (student_id);

-- scouts
CREATE INDEX idx_scouts_student_id_status ON scouts (student_id, status);
CREATE INDEX idx_scouts_company_id_sent_at ON scouts (company_id, sent_at DESC);
CREATE INDEX idx_scouts_job_posting_id ON scouts (job_posting_id);

-- student_product_links
CREATE INDEX idx_student_product_links_external ON student_product_links (external_user_id, product);

-- companies
CREATE INDEX idx_companies_is_verified ON companies (is_verified) WHERE is_verified = true;

-- job_postings
CREATE INDEX idx_job_postings_company_id ON job_postings (company_id);
CREATE INDEX idx_job_postings_is_published ON job_postings (is_published) WHERE is_published = true;
CREATE INDEX idx_job_postings_target_graduation_year ON job_postings (target_graduation_year);

-- chat_messages
CREATE INDEX idx_chat_messages_scout_id_created_at ON chat_messages (scout_id, created_at ASC);
CREATE INDEX idx_chat_messages_unread ON chat_messages (scout_id, read_at) WHERE read_at IS NULL;

-- notifications
CREATE INDEX idx_notifications_user_id_created_at ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = false;

-- events
CREATE INDEX idx_events_company_id ON events (company_id);
CREATE INDEX idx_events_is_published ON events (is_published) WHERE is_published = true;
CREATE INDEX idx_events_starts_at ON events (starts_at);
CREATE INDEX idx_events_target_graduation_year ON events (target_graduation_year);
CREATE INDEX idx_events_organizer_type ON events (organizer_type);

-- event_registrations
CREATE INDEX idx_event_registrations_student_id ON event_registrations (student_id);

-- anonymous_visits
CREATE INDEX idx_anonymous_visits_expires ON anonymous_visits (expires_at) WHERE user_id IS NULL;
CREATE INDEX idx_anonymous_visits_user_id ON anonymous_visits (user_id) WHERE user_id IS NOT NULL;

-- audit_logs (internal schema)
CREATE INDEX idx_audit_logs_actor_id ON internal.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_target ON internal.audit_logs (target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON internal.audit_logs (created_at DESC);

-- =============================================================
-- 5. updated_at trigger function
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON company_members FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON saved_searches FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON company_plans FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON student_notification_settings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON company_notification_settings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON job_postings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
