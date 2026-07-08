/**
 * 差分検知して変更があったテーブルだけ Supabase に書き込む
 * fire-and-forget（エラーは console.error のみ）
 */

import { AppState } from "./types";
import { isSupabaseReady } from "./supabase";
import {
  upsertTodo, deleteTodo,
  upsertSchedule, deleteSchedule,
  upsertBulletin,
  upsertWorkflow,
  upsertWorkflowTemplate, deleteWorkflowTemplate,
  upsertMail, deleteMail,
  upsertFile, deleteFile,
  upsertTimecard,
  upsertReservation, deleteReservation,
  upsertSubcontractor, deleteSubcontractor,
  upsertOrgChart, deleteOrgChart,
  upsertSystemLedger, deleteSystemLedger,
  upsertUser, deleteUser,
  upsertFieldResource, deleteFieldResource,
  upsertResourceAllocation, deleteResourceAllocation,
  upsertResourceInspection, deleteResourceInspection,
  upsertProcessTask, deleteProcessTask,
  upsertProgressMap, deleteProgressMap,
} from "./db";

function ids(arr: { id: string }[]) {
  return new Set(arr.map((x) => x.id));
}

export function syncToSupabase(prev: AppState, next: AppState) {
  if (!isSupabaseReady()) return;

  // --- ToDo ---
  const prevTodoIds = ids(prev.todos);
  const nextTodoIds = ids(next.todos);
  next.todos.forEach((t) => {
    const old = prev.todos.find((x) => x.id === t.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(t)) upsertTodo(t).catch(console.error);
  });
  prevTodoIds.forEach((id) => { if (!nextTodoIds.has(id)) deleteTodo(id).catch(console.error); });

  // --- Schedule ---
  const prevSchIds = ids(prev.schedules);
  const nextSchIds = ids(next.schedules);
  next.schedules.forEach((s) => {
    const old = prev.schedules.find((x) => x.id === s.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(s)) upsertSchedule(s).catch(console.error);
  });
  prevSchIds.forEach((id) => { if (!nextSchIds.has(id)) deleteSchedule(id).catch(console.error); });

  // --- Bulletin ---
  next.bulletins.forEach((b) => {
    const old = prev.bulletins.find((x) => x.id === b.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(b)) upsertBulletin(b).catch(console.error);
  });

  // --- Workflow ---
  next.workflows.forEach((w) => {
    const old = prev.workflows.find((x) => x.id === w.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(w)) upsertWorkflow(w).catch(console.error);
  });

  // --- WorkflowTemplate ---
  const prevTplIds = ids(prev.workflowTemplates);
  const nextTplIds = ids(next.workflowTemplates);
  next.workflowTemplates.forEach((t) => {
    const old = prev.workflowTemplates.find((x) => x.id === t.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(t)) upsertWorkflowTemplate(t).catch(console.error);
  });
  prevTplIds.forEach((id) => { if (!nextTplIds.has(id)) deleteWorkflowTemplate(id).catch(console.error); });

  // --- Mail ---
  const prevMailIds = ids(prev.mails);
  const nextMailIds = ids(next.mails);
  next.mails.forEach((m) => {
    const old = prev.mails.find((x) => x.id === m.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(m)) upsertMail(m).catch(console.error);
  });
  prevMailIds.forEach((id) => { if (!nextMailIds.has(id)) deleteMail(id).catch(console.error); });

  // --- File ---
  const prevFileIds = ids(prev.files);
  const nextFileIds = ids(next.files);
  next.files.forEach((f) => {
    const old = prev.files.find((x) => x.id === f.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(f)) upsertFile(f).catch(console.error);
  });
  prevFileIds.forEach((id) => { if (!nextFileIds.has(id)) deleteFile(id).catch(console.error); });

  // --- Timecard ---
  next.timecards.forEach((t) => {
    const old = prev.timecards.find((x) => x.id === t.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(t)) upsertTimecard(t).catch(console.error);
  });

  // --- Reservation ---
  const prevResIds = ids(prev.reservations);
  const nextResIds = ids(next.reservations);
  next.reservations.forEach((r) => {
    const old = prev.reservations.find((x) => x.id === r.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(r)) upsertReservation(r).catch(console.error);
  });
  prevResIds.forEach((id) => { if (!nextResIds.has(id)) deleteReservation(id).catch(console.error); });

  // --- Subcontractor ---
  const prevScIds = ids(prev.subcontractors);
  const nextScIds = ids(next.subcontractors);
  next.subcontractors.forEach((sc) => {
    const old = prev.subcontractors.find((x) => x.id === sc.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(sc)) upsertSubcontractor(sc).catch(console.error);
  });
  prevScIds.forEach((id) => { if (!nextScIds.has(id)) deleteSubcontractor(id).catch(console.error); });

  // --- SubcontractorOrgChart ---
  const prevOcIds = ids(prev.orgCharts);
  const nextOcIds = ids(next.orgCharts);
  next.orgCharts.forEach((c) => {
    const old = prev.orgCharts.find((x) => x.id === c.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(c)) upsertOrgChart(c).catch(console.error);
  });
  prevOcIds.forEach((id) => { if (!nextOcIds.has(id)) deleteOrgChart(id).catch(console.error); });

  // --- ConstructionSystemLedger ---
  const prevSlIds = ids(prev.systemLedgers);
  const nextSlIds = ids(next.systemLedgers);
  next.systemLedgers.forEach((l) => {
    const old = prev.systemLedgers.find((x) => x.id === l.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(l)) upsertSystemLedger(l).catch(console.error);
  });
  prevSlIds.forEach((id) => { if (!nextSlIds.has(id)) deleteSystemLedger(id).catch(console.error); });

  // --- User（社員） ---
  const prevUserIds = ids(prev.users);
  const nextUserIds = ids(next.users);
  next.users.forEach((u) => {
    const old = prev.users.find((x) => x.id === u.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(u)) upsertUser(u).catch(console.error);
  });
  prevUserIds.forEach((id) => { if (!nextUserIds.has(id)) deleteUser(id).catch(console.error); });

  // --- FieldResource ---
  const prevFrIds = ids(prev.fieldResources ?? []);
  const nextFrIds = ids(next.fieldResources ?? []);
  (next.fieldResources ?? []).forEach((fr) => {
    const old = (prev.fieldResources ?? []).find((x) => x.id === fr.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(fr)) upsertFieldResource(fr).catch(console.error);
  });
  prevFrIds.forEach((id) => { if (!nextFrIds.has(id)) deleteFieldResource(id).catch(console.error); });

  // --- ResourceAllocation ---
  const prevRaIds = ids(prev.resourceAllocations ?? []);
  const nextRaIds = ids(next.resourceAllocations ?? []);
  (next.resourceAllocations ?? []).forEach((a) => {
    const old = (prev.resourceAllocations ?? []).find((x) => x.id === a.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(a)) upsertResourceAllocation(a).catch(console.error);
  });
  prevRaIds.forEach((id) => { if (!nextRaIds.has(id)) deleteResourceAllocation(id).catch(console.error); });

  // --- ResourceInspection ---
  const prevRiIds = ids(prev.resourceInspections ?? []);
  const nextRiIds = ids(next.resourceInspections ?? []);
  (next.resourceInspections ?? []).forEach((i) => {
    const old = (prev.resourceInspections ?? []).find((x) => x.id === i.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(i)) upsertResourceInspection(i).catch(console.error);
  });
  prevRiIds.forEach((id) => { if (!nextRiIds.has(id)) deleteResourceInspection(id).catch(console.error); });

  // --- ProcessTask（工程） ---
  const prevPtIds = ids(prev.processTasks ?? []);
  const nextPtIds = ids(next.processTasks ?? []);
  (next.processTasks ?? []).forEach((t) => {
    const old = (prev.processTasks ?? []).find((x) => x.id === t.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(t)) upsertProcessTask(t).catch(console.error);
  });
  prevPtIds.forEach((id) => { if (!nextPtIds.has(id)) deleteProcessTask(id).catch(console.error); });

  // --- ProgressMap（進捗マップ） ---
  const prevPmIds = ids(prev.progressMaps ?? []);
  const nextPmIds = ids(next.progressMaps ?? []);
  (next.progressMaps ?? []).forEach((m) => {
    const old = (prev.progressMaps ?? []).find((x) => x.id === m.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(m)) upsertProgressMap(m).catch(console.error);
  });
  prevPmIds.forEach((id) => { if (!nextPmIds.has(id)) deleteProgressMap(id).catch(console.error); });
}
