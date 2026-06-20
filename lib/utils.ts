import { AppState } from "./types";

export function userName(state: AppState, id: string): string {
  return state.users.find((u) => u.id === id)?.name ?? "未設定";
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
