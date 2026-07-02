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
  | "impactmap";

export interface User {
  id: string;
  name: string;
  dept: string;
  role: string;
  email: string;
  ext: string;
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
  uiPrefs: UiPrefs;
  bulletinSubscriptions?: string[];
}
