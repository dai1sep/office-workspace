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
  | "search";

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
  todos: Todo[];
  messages: Message[];
  addresses: AddressEntry[];
  files: FileEntry[];
  facilities: Facility[];
  reservations: FacilityReservation[];
  timecards: Timecard[];
  mails: MailThread[];
  auditLogs: AuditLog[];
  uiPrefs: UiPrefs;
  bulletinSubscriptions?: string[];
}
