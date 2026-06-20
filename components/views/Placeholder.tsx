"use client";

import { ViewId } from "@/lib/types";

const LABELS: Record<ViewId, string> = {
  dashboard: "ホーム",
  mail: "メール管理",
  schedule: "スケジュール管理",
  folder: "個人フォルダ",
  bulletin: "社内掲示板",
  workflow: "ワークフロー",
  todo: "ToDo管理",
  messages: "メッセージ機能",
  address: "アドレス帳",
  files: "ファイル管理",
  facilities: "設備予約",
  timecard: "タイムカード",
  admin: "組織・権限管理",
  spaces: "スペース",
  knowledge: "ナレッジ",
  canvas: "ホワイトボード",
  search: "検索",
};

export default function Placeholder({ view }: { view: ViewId }) {
  return (
    <div className="panel" style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
      <div className="view-icon" style={{ margin: "0 auto 12px" }}>□</div>
      <strong style={{ fontSize: 16, color: "var(--text)" }}>{LABELS[view]}</strong>
      <p style={{ margin: "8px 0 0", fontSize: 13 }}>この画面は次の工程で詳細機能を追加できます。</p>
    </div>
  );
}
