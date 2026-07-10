export type ViewId =
  | "dashboard"
  | "mail"
  | "schedule"
  | "folder"
  | "bulletin"
  | "workflow"
  | "todo"
  | "messages"
  | "address"
  | "files"
  | "facilities"
  | "timecard"
  | "admin"
  | "spaces"
  | "knowledge"
  | "canvas"
  | "search"
  | "licenses"
  | "dailyreport"
  | "safetydocs"
  | "employees"
  | "process"
  | "pipeline";

export interface User {
  id: string;
  name: string;
  dept: string;
  role: string;
  email: string;
  ext: string;
  // 社員管理の拡張項目（任意）
  employeeNo?: string; // 社員番号
  title?: string; // 役職（例: 部長・主任）
  phone?: string; // 携帯・連絡先
  joinedDate?: string; // 入社日
  active?: boolean; // 在籍中（false=退職）
}

export interface Schedule {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  location: string;
  members: string[];
  type: "meeting" | "away" | "approval" | "work";
  detail: string;
  workspaceId?: string; // 紐づく工事現場（工事スペースから登録した現場予定）
  attachments?: Attachment[];
  scheduleMode?: "single" | "multiDay" | "period" | "repeat";
  endDate?: string;
  repeatCycle?: "daily" | "weekly" | "monthly" | "yearly" | "none";
  repeatUntil?: string;
  allDay?: boolean;
  visibility?: "public" | "private";
  facilities?: string[];
  relatedFiles?: string[];
  allowReactions?: boolean;
  reactionLabel?: string;
  reactions?: string[];
  survey?: {
    question: string;
    options: string[];
    votes: Record<string, string>;
  };
}

// 書き込み系（掲示板・スケジュール等）に直接添付するファイル（dataURLで保持）
export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME種別
  size: number; // バイト
  dataUrl: string; // base64 データURL
}

export interface BulletinComment {
  id: string;
  author: string;
  date: string;
  text: string;
  parentId?: string;
  relatedFiles?: string[];
}

export interface Bulletin {
  id: string;
  scope: string;
  category: string;
  title: string;
  author: string;
  comments: number;
  date: string;
  publishAt: string;
  finishAt: string;
  body: string;
  pinned: boolean;
  important: boolean;
  read: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  reactionLabel: string;
  reactions: string[];
  commentsList: BulletinComment[];
  updatedAt?: string;
  publishTime?: string;
  finishTime?: string;
  relatedFiles?: string[];
  attachments?: Attachment[];
  subscribers?: string[];
  draft?: boolean;
  survey?: {
    question: string;
    options: string[];
    votes: Record<string, string>;
  };
}

export interface WorkflowRouteStep {
  id: string;
  kind: "承認" | "決裁" | "確認" | "回覧";
  role: string;
  userIds: string[];
  // 複数処理者がいる場合の完了条件。"all"=全員承認で次へ、"any"/未設定=1名で次へ。
  approvalMode?: "all" | "any";
  // "all"モードでこれまでに承認した処理者。
  approvedBy?: string[];
  completedBy?: string;
  completedAt?: string;
  result?: "承認" | "却下" | "差し戻し";
  comment?: string;
}

export interface WorkflowHistory {
  id: string;
  date: string;
  userId: string;
  action: string;
  comment?: string;
}

// 再利用可能な申請様式。管理者が項目・既定経路を定義し、申請時に選択する。
export interface WorkflowTemplate {
  id: string;
  name: string;
  type: string;
  description?: string;
  detailHint?: string;
  // 表示する任意項目のキー（formDataのキーに対応）。
  fields: string[];
  defaultRoute: WorkflowRouteStep[];
}

export interface WorkflowRequest {
  id: string;
  type: string;
  title: string;
  applicant: string;
  dept: string;
  date: string;
  status: string;
  amount?: number;
  detail: string;
  approvers: string[];
  approved: string[];
  rejected: boolean;
  number?: string;
  updatedAt?: string;
  draft?: boolean;
  currentStep?: number;
  route?: WorkflowRouteStep[];
  formData?: Record<string, string>;
  relatedFiles?: string[];
  history?: WorkflowHistory[];
  templateId?: string;
}

export interface Todo {
  id: string;
  title: string;
  assignee: string;
  due: string;
  priority: string;
  status: string;
  project: string;
  detail: string;
}

export interface Message {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: string;
  read: boolean;
  thread?: string;
}

export interface AddressEntry {
  id: string;
  name: string;
  dept: string;
  role: string;
  email: string;
  ext: string;
  mobile?: string;
}

export interface FileEntry {
  id: string;
  name: string;
  folder: string;
  owner: string;
  date: string;
  size: string;
  version: number;
}

export interface Facility {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
}

export interface FacilityReservation {
  id: string;
  facilityId: string;
  title: string;
  date: string;
  start: string;
  end: string;
  organizer: string;
  members: string[];
}

export interface Timecard {
  id: string;
  userId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
  note?: string;
}

export interface MailThread {
  id: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  body: string;
  folder: string;
  read: boolean;
  labels: string[];
}

export interface AuditLog {
  id: string;
  date: string;
  user: string;
  action: string;
  target: string;
  detail: string;
}

export interface ConstructionLicense {
  id: string;
  type: string;
  num: string;
  kubun: "大臣・一般" | "大臣・特定" | "知事・一般" | "知事・特定";
  acquired: string;
  expires: string;
  days: number;
  person: string;
  dept: string;
  wf: "未起票" | "申請中" | "承認済" | "差戻し";
  files: number;
  status: "ok" | "warn" | "danger" | "expired";
  notes: string;
}

// ── 安全書類（下請業者管理帳票） ─────────────────────────────
// 下請業者マスタ。一度登録すれば下請負業者編成表・施工体制台帳などで使い回せる。
export interface Subcontractor {
  id: string;
  companyName: string;
  representative: string;
  address?: string;
  phone?: string;
  licenseCategory?: string; // 例: "大臣　特定" / "知事　一般"
  licenseNumber?: string; // 例: "第4100号"
  licenseIssuedDate?: string;
  jobType: string; // 工種・職種（例: 鋼管杭工事）
  safetyOfficer?: string; // 安全衛生責任者
  chiefEngineer?: string; // 主任技術者
  specialistEngineer?: string; // 専門技術者
  registeredSkilledWorker?: string; // 登録基幹技能者
}

// 下請負業者編成表（全建統一様式第１号－乙）の1明細。
// tier=1（一次＝作成下請負業者）は常にslot=1で1件のみ。tier=2〜4は各slot 1〜3で最大3件。
export interface OrgChartEntry {
  id: string;
  tier: 1 | 2 | 3 | 4;
  slot: 1 | 2 | 3;
  subcontractorId?: string;
  jobType: string;
  companyName: string;
  representative: string;
  licenseNumber: string;
  safetyOfficer: string;
  chiefEngineer: string;
  specialistEngineer?: string;
  workContent?: string; // 担当工事内容（二次以降）
  registeredSkilledWorker?: string; // 登録基幹技能者（一次のみ）
  hasSpecialWork?: boolean; // 特定専門工事の有無／該当
  periodStart?: string;
  periodEnd?: string;
}

export interface SubcontractorOrgChart {
  id: string;
  workspaceId: string;
  createdDate: string;
  entries: OrgChartEntry[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// 施工体制台帳。下請負人1社＝1件（自社の元請情報は共通で埋め込む）。
export interface ConstructionSystemLedgerInsurance {
  health: "加入" | "未加入" | "適用除外";
  pension: "加入" | "未加入" | "適用除外";
  employment: "加入" | "未加入" | "適用除外";
}

export interface ConstructionSystemLedger {
  id: string;
  workspaceId: string;
  subcontractorId?: string;
  createdDate: string;
  // 元請（自社）欄
  primeCompanyName: string;
  primeAddress: string;
  primePhone?: string;
  primeRepresentative: string;
  primeLicenseCategory: string;
  primeLicenseNumber: string;
  primeLicenseIssuedDate: string;
  primeWorkTitle: string;
  primeOrdererNameAddress: string;
  primePeriodStart: string;
  primePeriodEnd: string;
  primeContractDate: string;
  primeInsurance: ConstructionSystemLedgerInsurance;
  primeSiteAgent: string; // 現場代理人名
  primeChiefEngineerName: string; // 主任技術者名/監理技術者名
  primeChiefEngineerFullTime: "専任" | "非専任";
  primeChiefEngineerQualification: string;
  primeSpecialistEngineerName?: string;
  primeSafetyOfficerName: string; // 安全衛生責任者名
  primeSafetyPromoterName?: string; // 安全衛生推進者名
  primeLaborManagerName?: string; // 雇用管理責任者名
  // 下請負人欄
  subCompanyName: string;
  subAddress: string;
  subRepresentative: string;
  subLicenseCategory: string;
  subLicenseNumber: string;
  subLicenseIssuedDate: string;
  subWorkTitle: string;
  subPeriodStart: string;
  subPeriodEnd: string;
  subContractDate: string;
  subInsurance: ConstructionSystemLedgerInsurance;
  subSiteAgent: string;
  subChiefEngineerName: string;
  subSafetyOfficerName: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// 自社（元請）マスタ。施工体制台帳の元請欄を毎回使い回すための会社プロフィール。
export interface PrimeCompanyProfile {
  companyName: string;
  address: string;
  phone?: string;
  representative: string;
  licenseCategory: string;
  licenseNumber: string;
  licenseIssuedDate: string;
  insurance: ConstructionSystemLedgerInsurance;
  siteAgent: string;
  chiefEngineerName: string;
  chiefEngineerFullTime: "専任" | "非専任";
  chiefEngineerQualification: string;
  specialistEngineerName?: string;
  safetyOfficerName: string;
  safetyPromoterName?: string;
  laborManagerName?: string;
}

export interface EmployeeCertification {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  person: string;
  dept: string;
  acquired: string;
  expires: string | null;
  days: number | null;
  renewal: string;
  status: "ok" | "warn" | "danger" | "expired";
  notify: boolean;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  body: string;
  author: string;
  category: string;
  tags: string[];
  date: string;
  updatedAt: string;
  pinned: boolean;
}

export interface DailyReportSafetyItem {
  who: string;
  toWhom: string;
  status: string;
}

export interface DailyReportAttendee {
  name: string;
  jobType: string;
  present: boolean;
  startTime: string;
  endTime: string;
}

export interface DailyReportSubcontractor {
  company: string;
  jobType: string;
  workContent?: string;
  machineName?: string;
  machineCount?: number;
  machineCumCount?: number;
  workers: number;
  startTime: string;
  endTime: string;
}

export interface DailyReportEquipment {
  name: string;
  count: number;
  fuel: number;
}

export interface DailyReportProgress {
  caseType: string;
  unit: string;
  totalQty: number;
  todayQty: number;
  cumQty: number;
  remainQty: number;
  progress: number;
}

export interface DailyReportMaterial {
  name: string;
  type: string;
  receivedToday: number;
  receivedTotal: number;
  usedToday: number;
  usedTotal: number;
  remaining: number;
}

export interface DailyReport {
  id: string;
  workspaceId: string;
  meetingDate: string;
  implementDate: string;
  weather: string;
  plannedWork: string;
  actualWork: string;
  safetyItems: DailyReportSafetyItem[];
  attendees: DailyReportAttendee[];
  subcontractors: DailyReportSubcontractor[];
  equipment: DailyReportEquipment[];
  materials: DailyReportMaterial[];
  progressRate: number;
  plannedDays: number;
  remainingDays: number;
  notes: string;
  approvals: Record<string, string>;
  signedWorkers?: string[]; // 作業員の電子サイン（内容確認でチェック＝サイン確定した氏名）
  createdBy: string;
  createdAt: string;
  status: "draft" | "submitted" | "approved";
  progressItems?: DailyReportProgress[];
  disasterFreeHours?: number;
}

export interface WorkSpace {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
  description?: string;
  location?: string;
  createdAt: string;
}

// ── 現場リソース管理（Arune相当：重機・機材・車両・人員の配置と点検） ──
export type FieldResourceType = "重機" | "機材" | "車両" | "人員";
export type FieldResourceStatus = "稼働可" | "整備中" | "故障";

export interface FieldResource {
  id: string;
  name: string;
  type: FieldResourceType;
  status: FieldResourceStatus;
  maker?: string; // メーカー・型式など
  notes?: string;
}

// 現場（workspace）への配置。date（YYYY-MM-DD）ごとに1リソース1配置。
export interface ResourceAllocation {
  id: string;
  resourceId: string;
  workspaceId: string;
  date: string;
  note?: string;
}

export type InspectionResult = "良" | "要注意" | "要修理";

export interface ResourceInspection {
  id: string;
  resourceId: string;
  date: string;
  inspector: string;
  result: InspectionResult;
  note?: string;
}

// ── 案件パイプライン（顧客→案件→受注昇格→工事現場→工程 の背骨をカンバンで管理） ──
export type DealStage = "引合" | "見積作成" | "見積提出" | "受注" | "施工中" | "完成";
export type SectorKind = "民間" | "官公庁";

export interface Customer {
  id: string;
  name: string;
  kind: SectorKind;
  contact?: string; // 担当者名
  phone?: string;
  email?: string;
  notes?: string;
}

export interface Deal {
  id: string;
  customerId: string;
  title: string;        // 案件名
  stage: DealStage;
  lost?: boolean;       // 失注（別レーン）
  ownerId?: string;     // 社内担当
  amount?: number;      // 見積・契約金額（円）
  sector: SectorKind;   // 当面は民間のみ、官公庁は将来接続
  workspaceId?: string; // 受注で生成/紐付けた工事現場（WorkSpace.id）
  estimateRef?: string; // 将来の積算AI/入札結果DB連携用ID（今は任意）
  execDate?: string;    // 実行日（単日：着手指示・契約日など）
  termStart?: string;   // 工期 開始日
  termEnd?: string;     // 工期 終了日
  createdAt: string;
  notes?: string;
}

// ── 進捗管理（インパクトマップ：ゴール→アクター→インパクト→デリバラブルの達成度） ──
export type ProgressNodeType = "goal" | "actor" | "impact" | "deliverable";
export type ProgressStatus = "未着手" | "進行中" | "確認中" | "完了" | "停滞";

export interface ProgressNode {
  id: string;
  type: ProgressNodeType;
  label: string;
  parentId: string | null;
  x: number;
  y: number;
  status: ProgressStatus;
  progress: number; // 0-100（葉ノードで編集、枝ノードは子から自動集計）
  assigneeId?: string;
  due?: string; // 期限 YYYY-MM-DD
}

export interface ProgressMap {
  id: string;
  title: string;
  nodes: ProgressNode[];
}

// ── 工程管理（工事現場ごとの工程／作業をガントで管理） ──
export type ProcessTaskStatus = "未着手" | "進行中" | "完了" | "遅延";

export interface ProcessTask {
  id: string;
  workspaceId: string; // 対象の工事現場（WorkSpace.id）
  name: string; // 工種・作業名（例: 掘削工）
  category?: string; // 工区・分類（任意）
  start: string; // 開始日 YYYY-MM-DD
  end: string; // 終了予定日 YYYY-MM-DD
  progress: number; // 進捗率 0-100
  status: ProcessTaskStatus;
  assigneeIds?: string[]; // 担当者
  dependsOn?: string[]; // 先行工程（ProcessTask.id）
  milestone?: boolean; // マイルストーン（点）
  color?: string;
  note?: string;
}

export interface UiPrefs {
  theme: "default" | "focus" | "minimal";
  density: "standard" | "compact" | "spacious";
  motion: "standard" | "calm" | "none";
}

export interface AppState {
  currentUser: string;
  users: User[];
  schedules: Schedule[];
  bulletins: Bulletin[];
  workflows: WorkflowRequest[];
  workflowTemplates: WorkflowTemplate[];
  todos: Todo[];
  messages: Message[];
  addresses: AddressEntry[];
  files: FileEntry[];
  facilities: Facility[];
  reservations: FacilityReservation[];
  timecards: Timecard[];
  mails: MailThread[];
  auditLogs: AuditLog[];
  constructionLicenses: ConstructionLicense[];
  employeeCertifications: EmployeeCertification[];
  knowledge: KnowledgeArticle[];
  workspaces: WorkSpace[];
  dailyReports: DailyReport[];
  subcontractors: Subcontractor[];
  orgCharts: SubcontractorOrgChart[];
  systemLedgers: ConstructionSystemLedger[];
  fieldResources: FieldResource[];
  resourceAllocations: ResourceAllocation[];
  resourceInspections: ResourceInspection[];
  processTasks: ProcessTask[];
  progressMaps: ProgressMap[];
  customers: Customer[];
  deals: Deal[];
  primeProfile: PrimeCompanyProfile;
  uiPrefs: UiPrefs;
  bulletinSubscriptions?: string[];
}
