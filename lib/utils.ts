import { AppState, WorkflowRequest, WorkflowRouteStep } from "./types";

export function userName(state: AppState, id: string): string {
  return state.users.find((u) => u.id === id)?.name ?? "未設定";
}

const WORKFLOW_CLOSED = ["承認済", "却下", "差し戻し"];

// 経路が未設定の旧データは approvers/approved から経路を再構成する。
export function workflowRoute(item: WorkflowRequest): WorkflowRouteStep[] {
  if (item.route?.length) return item.route;
  return item.approvers.map((userId, index) => ({
    id: `legacy-${item.id}-${index}`,
    kind: index === item.approvers.length - 1 ? "決裁" : "承認",
    role: index === item.approvers.length - 1 ? "決裁者" : "承認者",
    userIds: [userId],
    completedBy: item.approved.includes(userId) ? userId : undefined,
    result: item.approved.includes(userId) ? "承認" : undefined,
  }));
}

// 現在の処理ステップが指定ユーザーの処理待ちかどうか。
export function isWorkflowPendingFor(item: WorkflowRequest, userId: string): boolean {
  if (item.draft) return false;
  if (WORKFLOW_CLOSED.includes(item.status)) return false;
  const route = workflowRoute(item);
  const step = route[item.currentStep ?? item.approved.length];
  if (!step?.userIds.includes(userId)) return false;
  // 全員承認モードで既に自分が承認済みなら、他の処理者待ちのため処理待ちではない。
  if (step.approvalMode === "all" && (step.approvedBy ?? []).includes(userId)) return false;
  return true;
}

export function pendingWorkflowCount(state: AppState, userId: string): number {
  return state.workflows.filter((item) => isWorkflowPendingFor(item, userId)).length;
}

export function initials(name: string): string {
  return (name || "?").slice(0, 1);
}

export function statusColor(value: string): string {
  if (/完了|承認済|進行中|空き|通常|確認済/.test(value)) return "green";
  if (/予定|会議|申請中|確認中|レビュー|設定|法務/.test(value)) return "blue";
  if (/承認待ち|外出|今週|差し戻し|設備|返信待ち/.test(value)) return "orange";
  if (/今日|高|期限|重要|未読/.test(value)) return "red";
  return "";
}

export function uid(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export function formatDateJa(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
