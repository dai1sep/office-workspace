/**
 * DB 抽象レイヤー
 * supabase が利用可能な場合は Supabase へ読み書きし、
 * 未設定の場合は呼び出し元が localStorage にフォールバックする。
 */

import { supabase } from "./supabase";
import type {
  User, Schedule, Bulletin, WorkflowRequest, WorkflowTemplate, Todo,
  MailThread, FileEntry, Facility, FacilityReservation,
  Timecard, AuditLog, AddressEntry, AppState,
  Subcontractor, SubcontractorOrgChart, ConstructionSystemLedger,
  FieldResource, ResourceAllocation, ResourceInspection,
} from "./types";

// ────────────────────────────────────────
// ヘルパー
// ────────────────────────────────────────

function assertSupabase() {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

// DBのスネークケース → TypeScriptのキャメルケース変換

function toUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string, name: r.name as string, dept: (r.dept as string) ?? "", role: (r.role as string) ?? "一般ユーザー",
    email: (r.email as string) ?? "", ext: (r.ext as string) ?? "",
    employeeNo: r.employee_no as string | undefined, title: r.title as string | undefined,
    phone: r.phone as string | undefined, joinedDate: r.joined_date as string | undefined,
    active: r.active === undefined ? true : (r.active as boolean),
  };
}

function userRow(u: User): Record<string, unknown> {
  return {
    id: u.id, name: u.name, dept: u.dept, role: u.role, email: u.email, ext: u.ext,
    employee_no: u.employeeNo ?? null, title: u.title ?? null, phone: u.phone ?? null,
    joined_date: u.joinedDate ?? null, active: u.active === false ? false : true,
  };
}

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

function toWorkflowTemplate(r: Record<string, unknown>): WorkflowTemplate {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as string,
    description: r.description as string | undefined,
    detailHint: r.detail_hint as string | undefined,
    fields: (r.fields as string[]) ?? [],
    defaultRoute: (r.default_route as WorkflowTemplate["defaultRoute"]) ?? [],
  };
}

function toOrgChart(r: Record<string, unknown>): SubcontractorOrgChart {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    createdDate: r.created_date as string,
    entries: (r.entries as SubcontractorOrgChart["entries"]) ?? [],
    createdBy: r.created_by as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string | undefined,
  };
}

function toSystemLedger(r: Record<string, unknown>): ConstructionSystemLedger {
  return {
    id: r.id as string, workspaceId: r.workspace_id as string, subcontractorId: r.subcontractor_id as string | undefined,
    createdDate: r.created_date as string,
    primeCompanyName: r.prime_company_name as string, primeAddress: r.prime_address as string, primePhone: r.prime_phone as string | undefined,
    primeRepresentative: r.prime_representative as string, primeLicenseCategory: r.prime_license_category as string,
    primeLicenseNumber: r.prime_license_number as string, primeLicenseIssuedDate: r.prime_license_issued_date as string,
    primeWorkTitle: r.prime_work_title as string, primeOrdererNameAddress: r.prime_orderer_name_address as string,
    primePeriodStart: r.prime_period_start as string, primePeriodEnd: r.prime_period_end as string, primeContractDate: r.prime_contract_date as string,
    primeInsurance: r.prime_insurance as ConstructionSystemLedger["primeInsurance"],
    primeSiteAgent: r.prime_site_agent as string, primeChiefEngineerName: r.prime_chief_engineer_name as string,
    primeChiefEngineerFullTime: r.prime_chief_engineer_full_time as ConstructionSystemLedger["primeChiefEngineerFullTime"],
    primeChiefEngineerQualification: r.prime_chief_engineer_qualification as string,
    primeSpecialistEngineerName: r.prime_specialist_engineer_name as string | undefined,
    primeSafetyOfficerName: r.prime_safety_officer_name as string,
    primeSafetyPromoterName: r.prime_safety_promoter_name as string | undefined,
    primeLaborManagerName: r.prime_labor_manager_name as string | undefined,
    subCompanyName: r.sub_company_name as string, subAddress: r.sub_address as string, subRepresentative: r.sub_representative as string,
    subLicenseCategory: r.sub_license_category as string, subLicenseNumber: r.sub_license_number as string, subLicenseIssuedDate: r.sub_license_issued_date as string,
    subWorkTitle: r.sub_work_title as string, subPeriodStart: r.sub_period_start as string, subPeriodEnd: r.sub_period_end as string, subContractDate: r.sub_contract_date as string,
    subInsurance: r.sub_insurance as ConstructionSystemLedger["subInsurance"],
    subSiteAgent: r.sub_site_agent as string, subChiefEngineerName: r.sub_chief_engineer_name as string, subSafetyOfficerName: r.sub_safety_officer_name as string,
    createdBy: r.created_by as string, createdAt: r.created_at as string, updatedAt: r.updated_at as string | undefined,
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

function toFieldResource(r: Record<string, unknown>): FieldResource {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as FieldResource["type"],
    status: r.status as FieldResource["status"],
    maker: r.maker as string | undefined,
    notes: r.notes as string | undefined,
  };
}

function toResourceAllocation(r: Record<string, unknown>): ResourceAllocation {
  return {
    id: r.id as string,
    resourceId: r.resource_id as string,
    workspaceId: r.workspace_id as string,
    date: r.date as string,
    note: r.note as string | undefined,
  };
}

function toResourceInspection(r: Record<string, unknown>): ResourceInspection {
  return {
    id: r.id as string,
    resourceId: r.resource_id as string,
    date: r.date as string,
    inspector: r.inspector as string,
    result: r.result as ResourceInspection["result"],
    note: r.note as string | undefined,
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
    { data: workflowTemplates },
    { data: todos },
    { data: mails },
    { data: files },
    { data: facilities },
    { data: reservations },
    { data: timecards },
    { data: auditLogs },
    { data: addresses },
    { data: subcontractors },
    { data: orgCharts },
    { data: systemLedgers },
    { data: fieldResources },
    { data: resourceAllocations },
    { data: resourceInspections },
  ] = await Promise.all([
    db.from("users").select("*").order("name"),
    db.from("schedules").select("*").order("date"),
    db.from("bulletins").select("*").order("date", { ascending: false }),
    db.from("workflows").select("*").order("date", { ascending: false }),
    db.from("workflow_templates").select("*").order("name"),
    db.from("todos").select("*").order("due"),
    db.from("mails").select("*").order("date", { ascending: false }),
    db.from("files").select("*").order("date", { ascending: false }),
    db.from("facilities").select("*"),
    db.from("reservations").select("*").order("date"),
    db.from("timecards").select("*").order("date", { ascending: false }),
    db.from("audit_logs").select("*").order("date", { ascending: false }),
    db.from("addresses").select("*").order("name"),
    db.from("subcontractors").select("*").order("company_name"),
    db.from("org_charts").select("*").order("created_date", { ascending: false }),
    db.from("system_ledgers").select("*").order("created_date", { ascending: false }),
    db.from("field_resources").select("*").order("name"),
    db.from("resource_allocations").select("*").order("date", { ascending: false }),
    db.from("resource_inspections").select("*").order("date", { ascending: false }),
  ]);

  return {
    users:        (users ?? []).map((r) => toUser(r as Record<string, unknown>)),
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
      relatedFiles: r.related_files ?? [], history: r.history ?? [], templateId: r.template_id ?? undefined,
    })) as WorkflowRequest[],
    workflowTemplates: (workflowTemplates ?? []).map((r) => toWorkflowTemplate(r as Record<string, unknown>)),
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
    subcontractors: (subcontractors ?? []).map((r) => ({
      id: r.id, companyName: r.company_name, representative: r.representative, address: r.address, phone: r.phone,
      licenseCategory: r.license_category, licenseNumber: r.license_number, licenseIssuedDate: r.license_issued_date,
      jobType: r.job_type, safetyOfficer: r.safety_officer, chiefEngineer: r.chief_engineer,
      specialistEngineer: r.specialist_engineer, registeredSkilledWorker: r.registered_skilled_worker,
    })) as Subcontractor[],
    orgCharts:    (orgCharts ?? []).map((r) => toOrgChart(r as Record<string, unknown>)),
    systemLedgers: (systemLedgers ?? []).map((r) => toSystemLedger(r as Record<string, unknown>)),
    fieldResources: (fieldResources ?? []).map((r) => toFieldResource(r as Record<string, unknown>)),
    resourceAllocations: (resourceAllocations ?? []).map((r) => toResourceAllocation(r as Record<string, unknown>)),
    resourceInspections: (resourceInspections ?? []).map((r) => toResourceInspection(r as Record<string, unknown>)),
  };
}

// ────────────────────────────────────────
// 個別CRUD
// ────────────────────────────────────────

// --- User（社員） ---
export async function upsertUser(u: User) {
  const db = assertSupabase();
  await db.from("users").upsert(userRow(u));
}
export async function deleteUser(id: string) {
  const db = assertSupabase();
  await db.from("users").delete().eq("id", id);
}

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
    related_files: w.relatedFiles ?? [], history: w.history ?? [], template_id: w.templateId ?? null,
  });
}

// --- WorkflowTemplate ---
export async function upsertWorkflowTemplate(t: WorkflowTemplate) {
  const db = assertSupabase();
  await db.from("workflow_templates").upsert({
    id: t.id, name: t.name, type: t.type, description: t.description ?? null,
    detail_hint: t.detailHint ?? null, fields: t.fields, default_route: t.defaultRoute,
  });
}
export async function deleteWorkflowTemplate(id: string) {
  const db = assertSupabase();
  await db.from("workflow_templates").delete().eq("id", id);
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

// --- Subcontractor ---
export async function upsertSubcontractor(sc: Subcontractor) {
  const db = assertSupabase();
  await db.from("subcontractors").upsert({
    id: sc.id, company_name: sc.companyName, representative: sc.representative, address: sc.address ?? null, phone: sc.phone ?? null,
    license_category: sc.licenseCategory ?? null, license_number: sc.licenseNumber ?? null, license_issued_date: sc.licenseIssuedDate ?? null,
    job_type: sc.jobType, safety_officer: sc.safetyOfficer ?? null, chief_engineer: sc.chiefEngineer ?? null,
    specialist_engineer: sc.specialistEngineer ?? null, registered_skilled_worker: sc.registeredSkilledWorker ?? null,
  });
}
export async function deleteSubcontractor(id: string) {
  const db = assertSupabase();
  await db.from("subcontractors").delete().eq("id", id);
}

// --- SubcontractorOrgChart ---
export async function upsertOrgChart(c: SubcontractorOrgChart) {
  const db = assertSupabase();
  await db.from("org_charts").upsert({
    id: c.id, workspace_id: c.workspaceId, created_date: c.createdDate, entries: c.entries,
    created_by: c.createdBy, created_at: c.createdAt, updated_at: c.updatedAt ?? null,
  });
}
export async function deleteOrgChart(id: string) {
  const db = assertSupabase();
  await db.from("org_charts").delete().eq("id", id);
}

// --- ConstructionSystemLedger ---
export async function upsertSystemLedger(l: ConstructionSystemLedger) {
  const db = assertSupabase();
  await db.from("system_ledgers").upsert({
    id: l.id, workspace_id: l.workspaceId, subcontractor_id: l.subcontractorId ?? null, created_date: l.createdDate,
    prime_company_name: l.primeCompanyName, prime_address: l.primeAddress, prime_phone: l.primePhone ?? null,
    prime_representative: l.primeRepresentative, prime_license_category: l.primeLicenseCategory,
    prime_license_number: l.primeLicenseNumber, prime_license_issued_date: l.primeLicenseIssuedDate,
    prime_work_title: l.primeWorkTitle, prime_orderer_name_address: l.primeOrdererNameAddress,
    prime_period_start: l.primePeriodStart, prime_period_end: l.primePeriodEnd, prime_contract_date: l.primeContractDate,
    prime_insurance: l.primeInsurance, prime_site_agent: l.primeSiteAgent, prime_chief_engineer_name: l.primeChiefEngineerName,
    prime_chief_engineer_full_time: l.primeChiefEngineerFullTime, prime_chief_engineer_qualification: l.primeChiefEngineerQualification,
    prime_specialist_engineer_name: l.primeSpecialistEngineerName ?? null, prime_safety_officer_name: l.primeSafetyOfficerName,
    prime_safety_promoter_name: l.primeSafetyPromoterName ?? null, prime_labor_manager_name: l.primeLaborManagerName ?? null,
    sub_company_name: l.subCompanyName, sub_address: l.subAddress, sub_representative: l.subRepresentative,
    sub_license_category: l.subLicenseCategory, sub_license_number: l.subLicenseNumber, sub_license_issued_date: l.subLicenseIssuedDate,
    sub_work_title: l.subWorkTitle, sub_period_start: l.subPeriodStart, sub_period_end: l.subPeriodEnd, sub_contract_date: l.subContractDate,
    sub_insurance: l.subInsurance, sub_site_agent: l.subSiteAgent, sub_chief_engineer_name: l.subChiefEngineerName, sub_safety_officer_name: l.subSafetyOfficerName,
    created_by: l.createdBy, created_at: l.createdAt, updated_at: l.updatedAt ?? null,
  });
}
export async function deleteSystemLedger(id: string) {
  const db = assertSupabase();
  await db.from("system_ledgers").delete().eq("id", id);
}

// --- FieldResource ---
export async function upsertFieldResource(fr: FieldResource) {
  const db = assertSupabase();
  await db.from("field_resources").upsert({
    id: fr.id, name: fr.name, type: fr.type, status: fr.status,
    maker: fr.maker ?? null, notes: fr.notes ?? null,
  });
}
export async function deleteFieldResource(id: string) {
  const db = assertSupabase();
  await db.from("field_resources").delete().eq("id", id);
}

// --- ResourceAllocation ---
export async function upsertResourceAllocation(a: ResourceAllocation) {
  const db = assertSupabase();
  await db.from("resource_allocations").upsert({
    id: a.id, resource_id: a.resourceId, workspace_id: a.workspaceId, date: a.date, note: a.note ?? null,
  });
}
export async function deleteResourceAllocation(id: string) {
  const db = assertSupabase();
  await db.from("resource_allocations").delete().eq("id", id);
}

// --- ResourceInspection ---
export async function upsertResourceInspection(i: ResourceInspection) {
  const db = assertSupabase();
  await db.from("resource_inspections").upsert({
    id: i.id, resource_id: i.resourceId, date: i.date, inspector: i.inspector, result: i.result, note: i.note ?? null,
  });
}
export async function deleteResourceInspection(id: string) {
  const db = assertSupabase();
  await db.from("resource_inspections").delete().eq("id", id);
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
    db.from("users").insert(state.users.map(userRow)),
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
    db.from("workflow_templates").insert(state.workflowTemplates.map((t) => ({
      id: t.id, name: t.name, type: t.type, description: t.description ?? null,
      detail_hint: t.detailHint ?? null, fields: t.fields, default_route: t.defaultRoute,
    }))),
    db.from("mails").insert(state.mails.map((m) => ({
      id: m.id, subject: m.subject, from_addr: m.from,
      to_addrs: m.to, date: m.date, body: m.body,
      folder: m.folder, read: m.read, labels: m.labels,
    }))),
    db.from("subcontractors").insert(state.subcontractors.map((sc) => ({
      id: sc.id, company_name: sc.companyName, representative: sc.representative, address: sc.address ?? null, phone: sc.phone ?? null,
      license_category: sc.licenseCategory ?? null, license_number: sc.licenseNumber ?? null, license_issued_date: sc.licenseIssuedDate ?? null,
      job_type: sc.jobType, safety_officer: sc.safetyOfficer ?? null, chief_engineer: sc.chiefEngineer ?? null,
      specialist_engineer: sc.specialistEngineer ?? null, registered_skilled_worker: sc.registeredSkilledWorker ?? null,
    }))),
    db.from("org_charts").insert(state.orgCharts.map((c) => ({
      id: c.id, workspace_id: c.workspaceId, created_date: c.createdDate, entries: c.entries, created_by: c.createdBy, created_at: c.createdAt,
    }))),
    db.from("field_resources").insert(state.fieldResources.map((fr) => ({
      id: fr.id, name: fr.name, type: fr.type, status: fr.status, maker: fr.maker ?? null, notes: fr.notes ?? null,
    }))),
    db.from("resource_allocations").insert(state.resourceAllocations.map((a) => ({
      id: a.id, resource_id: a.resourceId, workspace_id: a.workspaceId, date: a.date, note: a.note ?? null,
    }))),
    db.from("resource_inspections").insert(state.resourceInspections.map((i) => ({
      id: i.id, resource_id: i.resourceId, date: i.date, inspector: i.inspector, result: i.result, note: i.note ?? null,
    }))),
  ]);
}
