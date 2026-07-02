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
}
