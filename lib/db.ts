/**
 * DB 抽象レイヤー
 * supabase が利用可能な場合は Supabase へ読み書きし、
 * 未設定の場合は呼び出し元が localStorage にフォールバックする。
 */

import { supabase } from "./supabase";
import type {
  User, Schedule, Bulletin, WorkflowRequest, Todo,
  MailThread, FileEntry, Facility, FacilityReservation,
  Timecard, AuditLog, AddressEntry, AppState,
} from "./types";

// ────────────────────────────────────────
// ヘルパー
// ────────────────────────────────────────

function assertSupabase() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

// DBのスネークケース → TypeScriptのキャメルケース変換

function toSchedule(r: Record<string, unknown>): Schedule {
  return {
    id: r.id as string,
    title: r.title as string,
    date: r.date as string,
    start: r.start_time as string,
    end: r.end_time as string,
    location: (r.location as string) ?? "",
    members: (r.members as string[]) ?? [],
    type: r.type as Schedule["type"],
    detail: (r.detail as string) ?? "",
    scheduleMode: r.schedule_mode as Schedule["scheduleMode"],
    endDate: r.end_date as string | undefined,
    repeatCycle: r.repeat_cycle as Schedule["repeatCycle"],
    repeatUntil: r.repeat_until as string | undefined,
    allDay: (r.all_day as boolean) ?? false,
    visibility: (r.visibility as Schedule["visibility"]) ?? "public",
    facilities: (r.facilities as string[]) ?? [],
    relatedFiles: (r.related_files as string[]) ?? [],
    allowReactions: (r.allow_reactions as boolean) ?? false,
    reactionLabel: (r.reaction_label as string) ?? "確認しました",
    reactions: (r.reactions as string[]) ?? [],
    survey: r.survey as Schedule["survey"],
  };
}

function toMail(r: Record<string, unknown>): MailThread {
  return {
    id: r.id as string,
    subject: r.subject as string,
    from: r.from_addr as string,
    to: (r.to_addrs as string[]) ?? [],
    date: r.date as string,
    body: (r.body as string) ?? "",
    folder: (r.folder as string) ?? "inbox",
    read: (r.read as boolean) ?? false,
    labels: (r.labels as string[]) ?? [],
  };
}

function toReservation(r: Record<string, unknown>): FacilityReservation {
  return {
    id: r.id as string,
    facilityId: r.facility_id as string,
    title: r.title as string,
    date: r.date as string,
    start: r.start_time as string,
    end: r.end_time as string,
    organizer: r.organizer as string,
    members: (r.members as string[]) ?? [],
  };
}

function toTimecard(r: Record<string, unknown>): Timecard {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    date: r.date as string,
    clockIn: r.clock_in as string | undefined,
    clockOut: r.clock_out as string | undefined,
    breakStart: r.break_start as string | undefined,
    breakEnd: r.break_end as string | undefined,
    note: r.note as string | undefined,
  };
}

function toAuditLog(r: Record<string, unknown>): AuditLog {
  return {
    id: r.id as string,
    date: r.date as string,
    user: r.user_id as string,
    action: r.action as string,
    target: r.target as string,
    detail: (r.detail as string) ?? "",
  };
}

// ────────────────────────────────────────
// 全データ取得（初回ロード用）
// ────────────────────────────────────────

export async function fetchAllState(): Promise<Partial<AppState>> {
  const db = assertSupabase();

  const [
    { data: users },
    { data: schedules },
    { data: bulletins },
    { data: workflows },
    { data: todos },
    { data: mails },
    { data: files },
    { data: facilities },
    { data: reservations },
    { data: timecards },
    { data: auditLogs },
    { data: addresses },
  ] = await Promise.all([
    db.from("users").select("*").order("name"),
    db.from("schedules").select("*").order("date"),
    db.from("bulletins").select("*").order("date", { ascending: false }),
    db.from("workflows").select("*").order("date", { ascending: false }),
    db.from("todos").select("*").order("due"),
    db.from("mails").select("*").order("date", { ascending: false }),
    db.from("files").select("*").order("date", { ascending: false }),
    db.from("facilities").select("*"),
    db.from("reservations").select("*").order("date"),
    db.from("timecards").select("*").order("date", { ascending: false }),
    db.from("audit_logs").select("*").order("date", { ascending: false }),
    db.from("addresses").select("*").order("name"),
  ]);

  return {
    users:        (users ?? []) as User[],
    schedules:    (schedules ?? []).map((r) => toSchedule(r as Record<string, unknown>)),
    bulletins:    (bulletins ?? []).map((r) => ({
      id: r.id, scope: r.scope, category: r.category, title: r.title,
      author: r.author, comments: r.comments, date: r.date,
      publishAt: r.publish_at, finishAt: r.finish_at, body: r.body,
      pinned: r.pinned, important: r.important, read: r.read,
      allowComments: r.allow_comments, allowReactions: r.allow_reactions,
      reactionLabel: r.reaction_label, reactions: r.reactions ?? [],
      commentsList: r.comments_list ?? [],
      updatedAt: r.updated_at, publishTime: r.publish_time, finishTime: r.finish_time,
      relatedFiles: r.related_files ?? [], subscribers: r.subscribers ?? [],
      draft: r.draft ?? false, survey: r.survey,
    })) as Bulletin[],
    workflows:    (workflows ?? []).map((r) => ({
      id: r.id, type: r.type, title: r.title, applicant: r.applicant,
      dept: r.dept, date: r.date, status: r.status,
      amount: r.amount, detail: r.detail,
      approvers: r.approvers ?? [], approved: r.approved ?? [],
      rejected: r.rejected,
      number: r.number, updatedAt: r.updated_at, draft: r.draft ?? false,
      currentStep: r.current_step ?? 0, route: r.route ?? [], formData: r.form_data ?? {},
      relatedFiles: r.related_files ?? [], history: r.history ?? [],
    })) as WorkflowRequest[],
    todos:        (todos ?? []) as Todo[],
    mails:        (mails ?? []).map((r) => toMail(r as Record<string, unknown>)),
    files:        (files ?? []) as FileEntry[],
    facilities:   (facilities ?? []).map((r) => ({
      id: r.id, name: r.name, capacity: r.capacity, equipment: r.equipment ?? [],
    })) as Facility[],
    reservations: (reservations ?? []).map((r) => toReservation(r as Record<string, unknown>)),
    timecards:    (timecards ?? []).map((r) => toTimecard(r as Record<string, unknown>)),
    auditLogs:    (auditLogs ?? []).map((r) => toAuditLog(r as Record<string, unknown>)),
    addresses:    (addresses ?? []) as AddressEntry[],
  };
}

// ────────────────────────────────────────
// 個別CRUD
// ────────────────────────────────────────

// --- Todo ---
export async function upsertTodo(todo: Todo) {
  const db = assertSupabase();
  await db.from("todos").upsert({
    id: todo.id, title: todo.title, assignee: todo.assignee,
    due: todo.due, priority: todo.priority, status: todo.status,
    project: todo.project, detail: todo.detail,
  });
}
export async function deleteTodo(id: string) {
  const db = assertSupabase();
  await db.from("todos").delete().eq("id", id);
}

// --- Schedule ---
export async function upsertSchedule(s: Schedule) {
  const db = assertSupabase();
  await db.from("schedules").upsert({
    id: s.id, title: s.title, date: s.date,
    start_time: s.start, end_time: s.end,
    location: s.location, members: s.members,
    type: s.type, detail: s.detail,
    schedule_mode: s.scheduleMode, end_date: s.endDate,
    repeat_cycle: s.repeatCycle, repeat_until: s.repeatUntil,
    all_day: s.allDay ?? false, visibility: s.visibility ?? "public",
    facilities: s.facilities ?? [], related_files: s.relatedFiles ?? [],
    allow_reactions: s.allowReactions ?? false, reaction_label: s.reactionLabel ?? "確認しました",
    reactions: s.reactions ?? [], survey: s.survey ?? null,
  });
}
export async function deleteSchedule(id: string) {
  const db = assertSupabase();
  await db.from("schedules").delete().eq("id", id);
}

// --- Bulletin ---
export async function upsertBulletin(b: Bulletin) {
  const db = assertSupabase();
  await db.from("bulletins").upsert({
    id: b.id, scope: b.scope, category: b.category, title: b.title,
    author: b.author, comments: b.comments, date: b.date,
    publish_at: b.publishAt, finish_at: b.finishAt, body: b.body,
    pinned: b.pinned, important: b.important, read: b.read,
    allow_comments: b.allowComments, allow_reactions: b.allowReactions,
    reaction_label: b.reactionLabel, reactions: b.reactions,
    comments_list: b.commentsList,
    updated_at: b.updatedAt, publish_time: b.publishTime, finish_time: b.finishTime,
    related_files: b.relatedFiles ?? [], subscribers: b.subscribers ?? [],
    draft: b.draft ?? false, survey: b.survey ?? null,
  });
}

// --- Workflow ---
export async function upsertWorkflow(w: WorkflowRequest) {
  const db = assertSupabase();
  await db.from("workflows").upsert({
    id: w.id, type: w.type, title: w.title, applicant: w.applicant,
    dept: w.dept, date: w.date, status: w.status,
    amount: w.amount, detail: w.detail,
    approvers: w.approvers, approved: w.approved, rejected: w.rejected,
    number: w.number, updated_at: w.updatedAt, draft: w.draft ?? false,
    current_step: w.currentStep ?? 0, route: w.route ?? [], form_data: w.formData ?? {},
    related_files: w.relatedFiles ?? [], history: w.history ?? [],
  });
}

// --- Mail ---
export async function upsertMail(m: MailThread) {
  const db = assertSupabase();
  await db.from("mails").upsert({
    id: m.id, subject: m.subject, from_addr: m.from,
    to_addrs: m.to, date: m.date, body: m.body,
    folder: m.folder, read: m.read, labels: m.labels,
  });
}
export async function deleteMail(id: string) {
  const db = assertSupabase();
  await db.from("mails").delete().eq("id", id);
}

// --- File ---
export async function upsertFile(f: FileEntry) {
  const db = assertSupabase();
  await db.from("files").upsert({
    id: f.id, name: f.name, folder: f.folder, owner: f.owner,
    date: f.date, size: f.size, version: f.version,
  });
}
export async function deleteFile(id: string) {
  const db = assertSupabase();
  await db.from("files").delete().eq("id", id);
}

// --- Timecard ---
export async function upsertTimecard(t: Timecard) {
  const db = assertSupabase();
  await db.from("timecards").upsert({
    id: t.id, user_id: t.userId, date: t.date,
    clock_in: t.clockIn, clock_out: t.clockOut,
    break_start: t.breakStart, break_end: t.breakEnd, note: t.note,
  });
}

// --- Reservation ---
export async function upsertReservation(r: FacilityReservation) {
  const db = assertSupabase();
  await db.from("reservations").upsert({
    id: r.id, facility_id: r.facilityId, title: r.title,
    date: r.date, start_time: r.start, end_time: r.end,
    organizer: r.organizer, members: r.members,
  });
}
export async function deleteReservation(id: string) {
  const db = assertSupabase();
  await db.from("reservations").delete().eq("id", id);
}

// --- AuditLog ---
export async function insertAuditLog(log: AuditLog) {
  const db = assertSupabase();
  await db.from("audit_logs").insert({
    id: log.id, date: log.date, user_id: log.user,
    action: log.action, target: log.target, detail: log.detail,
  });
}

// --- Seed（初回のみ） ---
export async function seedIfEmpty(state: AppState) {
  const db = assertSupabase();
  const { count } = await db.from("users").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return; // すでにデータあり

  await Promise.all([
    db.from("users").insert(state.users),
    db.from("todos").insert(state.todos),
    db.from("facilities").insert(state.facilities.map((f) => ({
      id: f.id, name: f.name, capacity: f.capacity, equipment: f.equipment,
    }))),
    db.from("schedules").insert(state.schedules.map((s) => ({
      id: s.id, title: s.title, date: s.date,
      start_time: s.start, end_time: s.end,
      location: s.location, members: s.members,
      type: s.type, detail: s.detail,
    }))),
    db.from("bulletins").insert(state.bulletins.map((b) => ({
      id: b.id, scope: b.scope, category: b.category, title: b.title,
      author: b.author, comments: b.comments, date: b.date,
      publish_at: b.publishAt, finish_at: b.finishAt, body: b.body,
      pinned: b.pinned, important: b.important, read: b.read,
      allow_comments: b.allowComments, allow_reactions: b.allowReactions,
      reaction_label: b.reactionLabel, reactions: b.reactions,
      comments_list: b.commentsList,
    }))),
    db.from("workflows").insert(state.workflows.map((w) => ({
      id: w.id, type: w.type, title: w.title, applicant: w.applicant,
      dept: w.dept, date: w.date, status: w.status,
      amount: w.amount ?? null, detail: w.detail,
      approvers: w.approvers, approved: w.approved, rejected: w.rejected,
    }))),
    db.from("mails").insert(state.mails.map((m) => ({
      id: m.id, subject: m.subject, from_addr: m.from,
      to_addrs: m.to, date: m.date, body: m.body,
      folder: m.folder, read: m.read, labels: m.labels,
    }))),
  ]);
}
