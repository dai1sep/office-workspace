-- Office Workspace — Supabase スキーマ
-- Supabase の SQL Editor に貼り付けて実行してください

-- ユーザー
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  dept        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT '一般ユーザー',
  email       TEXT NOT NULL DEFAULT '',
  ext         TEXT NOT NULL DEFAULT ''
);

-- スケジュール
CREATE TABLE IF NOT EXISTS schedules (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  date          TEXT NOT NULL,
  start_time    TEXT NOT NULL DEFAULT '',
  end_time      TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL DEFAULT '',
  members       JSONB NOT NULL DEFAULT '[]',
  type          TEXT NOT NULL DEFAULT 'work',
  detail        TEXT NOT NULL DEFAULT '',
  schedule_mode TEXT,
  end_date      TEXT,
  repeat_cycle  TEXT,
  repeat_until  TEXT,
  all_day       BOOLEAN NOT NULL DEFAULT false,
  visibility    TEXT NOT NULL DEFAULT 'public',
  facilities    JSONB NOT NULL DEFAULT '[]',
  related_files JSONB NOT NULL DEFAULT '[]',
  allow_reactions BOOLEAN NOT NULL DEFAULT false,
  reaction_label TEXT NOT NULL DEFAULT '確認しました',
  reactions     JSONB NOT NULL DEFAULT '[]',
  survey        JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 掲示板
CREATE TABLE IF NOT EXISTS bulletins (
  id              TEXT PRIMARY KEY,
  scope           TEXT NOT NULL DEFAULT '全社',
  category        TEXT NOT NULL DEFAULT '全社連絡',
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  date            TEXT NOT NULL,
  publish_at      TEXT NOT NULL DEFAULT '',
  finish_at       TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  pinned          BOOLEAN NOT NULL DEFAULT false,
  important       BOOLEAN NOT NULL DEFAULT false,
  read            BOOLEAN NOT NULL DEFAULT false,
  allow_comments  BOOLEAN NOT NULL DEFAULT true,
  allow_reactions BOOLEAN NOT NULL DEFAULT true,
  reaction_label  TEXT NOT NULL DEFAULT '👍',
  reactions       JSONB NOT NULL DEFAULT '[]',
  comments_list   JSONB NOT NULL DEFAULT '[]',
  comments        INT NOT NULL DEFAULT 0,
  updated_at      TEXT,
  publish_time    TEXT,
  finish_time     TEXT,
  related_files   JSONB NOT NULL DEFAULT '[]',
  subscribers     JSONB NOT NULL DEFAULT '[]',
  draft           BOOLEAN NOT NULL DEFAULT false,
  survey          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ワークフロー申請
CREATE TABLE IF NOT EXISTS workflows (
  id        TEXT PRIMARY KEY,
  type      TEXT NOT NULL DEFAULT 'その他',
  title     TEXT NOT NULL,
  applicant TEXT NOT NULL,
  dept      TEXT NOT NULL DEFAULT '',
  date      TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT '申請中',
  amount    NUMERIC,
  detail    TEXT NOT NULL DEFAULT '',
  approvers JSONB NOT NULL DEFAULT '[]',
  approved  JSONB NOT NULL DEFAULT '[]',
  rejected  BOOLEAN NOT NULL DEFAULT false,
  number    TEXT,
  updated_at TEXT,
  draft     BOOLEAN NOT NULL DEFAULT false,
  current_step INT NOT NULL DEFAULT 0,
  route     JSONB NOT NULL DEFAULT '[]',
  form_data JSONB NOT NULL DEFAULT '{}',
  related_files JSONB NOT NULL DEFAULT '[]',
  history   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ワークフロー申請様式（テンプレート）
CREATE TABLE IF NOT EXISTS workflow_templates (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'その他',
  description   TEXT,
  detail_hint   TEXT,
  fields        JSONB NOT NULL DEFAULT '[]',
  default_route JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 既存環境向けの追加列。新規環境では上記CREATE TABLEに含まれる。
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS facilities JSONB NOT NULL DEFAULT '[]';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS related_files JSONB NOT NULL DEFAULT '[]';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS allow_reactions BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS reaction_label TEXT NOT NULL DEFAULT '確認しました';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '[]';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS survey JSONB;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS publish_time TEXT;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS finish_time TEXT;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS related_files JSONB NOT NULL DEFAULT '[]';
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS subscribers JSONB NOT NULL DEFAULT '[]';
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS draft BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS survey JSONB;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS draft BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS current_step INT NOT NULL DEFAULT 0;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS route JSONB NOT NULL DEFAULT '[]';
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS form_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS related_files JSONB NOT NULL DEFAULT '[]';
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]';

-- ToDo
CREATE TABLE IF NOT EXISTS todos (
  id       TEXT PRIMARY KEY,
  title    TEXT NOT NULL,
  assignee TEXT NOT NULL,
  due      TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT '中',
  status   TEXT NOT NULL DEFAULT '予定',
  project  TEXT NOT NULL DEFAULT '',
  detail   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- メール
CREATE TABLE IF NOT EXISTS mails (
  id       TEXT PRIMARY KEY,
  subject  TEXT NOT NULL,
  from_addr TEXT NOT NULL,
  to_addrs JSONB NOT NULL DEFAULT '[]',
  date     TEXT NOT NULL,
  body     TEXT NOT NULL DEFAULT '',
  folder   TEXT NOT NULL DEFAULT 'inbox',
  read     BOOLEAN NOT NULL DEFAULT false,
  labels   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ファイル
CREATE TABLE IF NOT EXISTS files (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  folder  TEXT NOT NULL DEFAULT '',
  owner   TEXT NOT NULL,
  date    TEXT NOT NULL,
  size    TEXT NOT NULL DEFAULT '0KB',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 設備
CREATE TABLE IF NOT EXISTS facilities (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  capacity  INT NOT NULL DEFAULT 0,
  equipment JSONB NOT NULL DEFAULT '[]'
);

-- 設備予約
CREATE TABLE IF NOT EXISTS reservations (
  id          TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  organizer   TEXT NOT NULL,
  members     JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- タイムカード
CREATE TABLE IF NOT EXISTS timecards (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  date        TEXT NOT NULL,
  clock_in    TEXT,
  clock_out   TEXT,
  break_start TEXT,
  break_end   TEXT,
  note        TEXT,
  UNIQUE(user_id, date)
);

-- 監査ログ
CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 安全書類：下請業者マスタ
CREATE TABLE IF NOT EXISTS subcontractors (
  id                      TEXT PRIMARY KEY,
  company_name            TEXT NOT NULL,
  representative          TEXT NOT NULL DEFAULT '',
  address                 TEXT,
  phone                   TEXT,
  license_category        TEXT,
  license_number          TEXT,
  license_issued_date     TEXT,
  job_type                TEXT NOT NULL DEFAULT '',
  safety_officer          TEXT,
  chief_engineer          TEXT,
  specialist_engineer     TEXT,
  registered_skilled_worker TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 安全書類：下請負業者編成表（全建統一様式第１号－乙）
CREATE TABLE IF NOT EXISTS org_charts (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  created_date  TEXT NOT NULL,
  entries       JSONB NOT NULL DEFAULT '[]',
  created_by    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT
);

-- 安全書類：施工体制台帳
CREATE TABLE IF NOT EXISTS system_ledgers (
  id                                    TEXT PRIMARY KEY,
  workspace_id                          TEXT NOT NULL,
  subcontractor_id                      TEXT,
  created_date                          TEXT NOT NULL,
  prime_company_name                    TEXT NOT NULL DEFAULT '',
  prime_address                         TEXT NOT NULL DEFAULT '',
  prime_phone                           TEXT,
  prime_representative                  TEXT NOT NULL DEFAULT '',
  prime_license_category                TEXT NOT NULL DEFAULT '',
  prime_license_number                  TEXT NOT NULL DEFAULT '',
  prime_license_issued_date             TEXT NOT NULL DEFAULT '',
  prime_work_title                      TEXT NOT NULL DEFAULT '',
  prime_orderer_name_address            TEXT NOT NULL DEFAULT '',
  prime_period_start                    TEXT NOT NULL DEFAULT '',
  prime_period_end                      TEXT NOT NULL DEFAULT '',
  prime_contract_date                   TEXT NOT NULL DEFAULT '',
  prime_insurance                       JSONB NOT NULL DEFAULT '{}',
  prime_site_agent                      TEXT NOT NULL DEFAULT '',
  prime_chief_engineer_name             TEXT NOT NULL DEFAULT '',
  prime_chief_engineer_full_time        TEXT NOT NULL DEFAULT '専任',
  prime_chief_engineer_qualification    TEXT NOT NULL DEFAULT '',
  prime_specialist_engineer_name        TEXT,
  prime_safety_officer_name             TEXT NOT NULL DEFAULT '',
  prime_safety_promoter_name            TEXT,
  prime_labor_manager_name              TEXT,
  sub_company_name                      TEXT NOT NULL DEFAULT '',
  sub_address                           TEXT NOT NULL DEFAULT '',
  sub_representative                    TEXT NOT NULL DEFAULT '',
  sub_license_category                  TEXT NOT NULL DEFAULT '',
  sub_license_number                    TEXT NOT NULL DEFAULT '',
  sub_license_issued_date               TEXT NOT NULL DEFAULT '',
  sub_work_title                        TEXT NOT NULL DEFAULT '',
  sub_period_start                      TEXT NOT NULL DEFAULT '',
  sub_period_end                        TEXT NOT NULL DEFAULT '',
  sub_contract_date                     TEXT NOT NULL DEFAULT '',
  sub_insurance                         JSONB NOT NULL DEFAULT '{}',
  sub_site_agent                        TEXT NOT NULL DEFAULT '',
  sub_chief_engineer_name               TEXT NOT NULL DEFAULT '',
  sub_safety_officer_name               TEXT NOT NULL DEFAULT '',
  created_by                            TEXT NOT NULL,
  created_at                            TEXT NOT NULL,
  updated_at                            TEXT
);

-- アドレス帳（社員以外の外部連絡先）
CREATE TABLE IF NOT EXISTS addresses (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  dept   TEXT NOT NULL DEFAULT '',
  role   TEXT NOT NULL DEFAULT '',
  email  TEXT NOT NULL DEFAULT '',
  ext    TEXT NOT NULL DEFAULT '',
  mobile TEXT
);

-- Row Level Security（全テーブルに有効化）
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows     ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mails         ENABLE ROW LEVEL SECURITY;
ALTER TABLE files         ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE timecards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_charts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_ledgers ENABLE ROW LEVEL SECURITY;

-- 開発中は全員読み書き可（認証実装後に絞る）
CREATE POLICY "allow_all_dev" ON users         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON schedules     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON bulletins     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON workflows     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON todos         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON mails         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON files         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON facilities    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON reservations  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON timecards     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON audit_logs    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON addresses     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON workflow_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON subcontractors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON org_charts     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON system_ledgers FOR ALL USING (true) WITH CHECK (true);

-- ── 現場リソース管理（Arune相当） ─────────────────────────────
-- リソース（重機・機材・車両・人員）
CREATE TABLE IF NOT EXISTS field_resources (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  type    TEXT NOT NULL DEFAULT '機材',
  status  TEXT NOT NULL DEFAULT '稼働可',
  maker   TEXT,
  notes   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 現場への配置（日付ごと）
CREATE TABLE IF NOT EXISTS resource_allocations (
  id           TEXT PRIMARY KEY,
  resource_id  TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  date         TEXT NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 点検簿
CREATE TABLE IF NOT EXISTS resource_inspections (
  id          TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  date        TEXT NOT NULL,
  inspector   TEXT NOT NULL DEFAULT '',
  result      TEXT NOT NULL DEFAULT '良',
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE field_resources       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_inspections  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_dev" ON field_resources      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON resource_allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_dev" ON resource_inspections FOR ALL USING (true) WITH CHECK (true);
