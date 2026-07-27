-- Office Workspace — Supabase スキーマ
-- Supabase の SQL Editor に貼り付けて実行してください

-- ユーザー
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  dept        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT '一般ユーザー',
  email       TEXT NOT NULL DEFAULT '',
  ext         TEXT NOT NULL DEFAULT '',
  employee_no TEXT,
  title       TEXT,
  phone       TEXT,
  joined_date TEXT,
  active      BOOLEAN NOT NULL DEFAULT true
);
-- 既存環境向け（社員管理の追加項目）
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_no TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS title       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_date TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active      BOOLEAN NOT NULL DEFAULT true;

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
  workspace_id  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- 既存環境向け（工事スペース連動）
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS workspace_id TEXT;
-- 書き込み系のファイル添付（dataURLをJSONBで保持）
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';

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
  attachments     JSONB NOT NULL DEFAULT '[]',
  draft           BOOLEAN NOT NULL DEFAULT false,
  survey          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- 既存環境向け（後から追加された列）
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';

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

-- RLS（Row Level Security）はこのファイル末尾の DO ブロックで
-- 全テーブルにまとめて適用する（ここでは個別設定しない）。

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

-- 工程管理（工事現場ごとの工程／作業）
CREATE TABLE IF NOT EXISTS process_tasks (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT,
  start        TEXT NOT NULL,
  "end"        TEXT NOT NULL,
  progress     INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT '未着手',
  assignee_ids JSONB NOT NULL DEFAULT '[]',
  depends_on   JSONB NOT NULL DEFAULT '[]',
  milestone    BOOLEAN NOT NULL DEFAULT false,
  color        TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 進捗管理（インパクトマップ）: 1マップ=1行、nodes を JSONB で保持
CREATE TABLE IF NOT EXISTS progress_maps (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  nodes      JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 案件パイプライン（顧客・案件）
CREATE TABLE IF NOT EXISTS customers (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  kind    TEXT NOT NULL DEFAULT '民間',
  contact TEXT,
  phone   TEXT,
  email   TEXT,
  notes   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS deals (
  id           TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL,
  title        TEXT NOT NULL,
  stage        TEXT NOT NULL DEFAULT '引合',
  lost         BOOLEAN NOT NULL DEFAULT false,
  lost_reason  TEXT,
  owner_id     TEXT,
  amount       BIGINT,
  sector       TEXT NOT NULL DEFAULT '民間',
  workspace_id TEXT,
  estimate_ref TEXT,
  exec_date    TEXT,
  term_start   TEXT,
  term_end     TEXT,
  created_at   TEXT NOT NULL DEFAULT '',
  notes        TEXT
);
-- ── 本格導入で追加のテーブル ───────────────────────────────────
-- ファイル公開設定（フォルダ単位・部署/ロール軸）
CREATE TABLE IF NOT EXISTS file_folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  scope       TEXT NOT NULL DEFAULT 'all',
  allow_depts JSONB NOT NULL DEFAULT '[]',
  allow_roles JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 工事スペース（現場）
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#3f6b5b',
  member_ids  JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  location    TEXT,
  created_at  TEXT NOT NULL DEFAULT ''
);

-- 工事日報
CREATE TABLE IF NOT EXISTS daily_reports (
  id                  TEXT PRIMARY KEY,
  workspace_id        TEXT NOT NULL,
  meeting_date        TEXT NOT NULL DEFAULT '',
  implement_date      TEXT NOT NULL DEFAULT '',
  weather             TEXT NOT NULL DEFAULT '',
  planned_work        TEXT NOT NULL DEFAULT '',
  actual_work         TEXT NOT NULL DEFAULT '',
  safety_items        JSONB NOT NULL DEFAULT '[]',
  attendees           JSONB NOT NULL DEFAULT '[]',
  subcontractors      JSONB NOT NULL DEFAULT '[]',
  equipment           JSONB NOT NULL DEFAULT '[]',
  materials           JSONB NOT NULL DEFAULT '[]',
  progress_rate       INTEGER NOT NULL DEFAULT 0,
  planned_days        INTEGER NOT NULL DEFAULT 0,
  remaining_days      INTEGER NOT NULL DEFAULT 0,
  notes               TEXT NOT NULL DEFAULT '',
  approvals           JSONB NOT NULL DEFAULT '{}',
  approver_names      JSONB NOT NULL DEFAULT '{}',
  signed_workers      JSONB NOT NULL DEFAULT '[]',
  progress_items      JSONB NOT NULL DEFAULT '[]',
  disaster_free_hours INTEGER,
  created_by          TEXT NOT NULL DEFAULT '',
  created_at          TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'draft'
);

-- ナレッジ記事
CREATE TABLE IF NOT EXISTS knowledge (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL DEFAULT '',
  author     TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT '',
  tags       JSONB NOT NULL DEFAULT '[]',
  date       TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  pinned     BOOLEAN NOT NULL DEFAULT false
);

-- 建設業許可
CREATE TABLE IF NOT EXISTS construction_licenses (
  id       TEXT PRIMARY KEY,
  type     TEXT NOT NULL DEFAULT '',
  num      TEXT NOT NULL DEFAULT '',
  kubun    TEXT NOT NULL DEFAULT '',
  acquired TEXT NOT NULL DEFAULT '',
  expires  TEXT NOT NULL DEFAULT '',
  days     INTEGER NOT NULL DEFAULT 0,
  person   TEXT NOT NULL DEFAULT '',
  dept     TEXT NOT NULL DEFAULT '',
  wf       TEXT NOT NULL DEFAULT '未起票',
  files    INTEGER NOT NULL DEFAULT 0,
  status   TEXT NOT NULL DEFAULT 'ok',
  notes    TEXT NOT NULL DEFAULT ''
);

-- 資格・技能講習
CREATE TABLE IF NOT EXISTS employee_certifications (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT '',
  category_label TEXT NOT NULL DEFAULT '',
  person         TEXT NOT NULL DEFAULT '',
  dept           TEXT NOT NULL DEFAULT '',
  acquired       TEXT NOT NULL DEFAULT '',
  expires        TEXT,
  days           INTEGER,
  renewal        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'ok',
  notify         BOOLEAN NOT NULL DEFAULT false
);

-- 自社（元請）プロフィール：シングルトン（id='default' の1行に JSONB で保持）
CREATE TABLE IF NOT EXISTS prime_profile (
  id      TEXT PRIMARY KEY DEFAULT 'default',
  profile JSONB NOT NULL DEFAULT '{}'
);

-- ══════════════════════════════════════════════════════════════
-- 本番RLS：ログイン済み(authenticated)のみ全操作を許可、匿名(anon)は不可。
-- public スキーマの全テーブルに一括適用（新テーブルにも自動で下記が効く）。
-- これにより「URLを知っているだけ」の外部アクセスを遮断する。
-- 何度でも安全に再実行できる（既存ポリシーを作り直す）。
-- ※ Supabase Auth を使わずローカル(localStorage)運用する場合はこのブロックを実行しないこと。
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_all_dev ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%I', t);
    EXECUTE format('CREATE POLICY auth_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
