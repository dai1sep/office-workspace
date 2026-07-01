"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/lib/context";
import { ViewId } from "@/lib/types";

const COMMANDS: { id: ViewId; icon: string; label: string; sub: string }[] = [
  { id: "dashboard", icon: "家", label: "ホーム", sub: "今日の状況を確認" },
  { id: "search", icon: "検", label: "横断検索", sub: "業務データを横断検索" },
  { id: "schedule", icon: "予", label: "スケジュール管理", sub: "予定を確認・登録" },
  { id: "todo", icon: "済", label: "ToDo管理", sub: "タスクを確認" },
  { id: "bulletin", icon: "掲", label: "社内掲示板", sub: "お知らせを確認" },
  { id: "workflow", icon: "承", label: "ワークフロー", sub: "申請と承認" },
  { id: "mail", icon: "封", label: "メール管理", sub: "受信メールを確認" },
  { id: "files", icon: "書", label: "ファイル管理", sub: "資料を探す" },
  { id: "spaces", icon: "空", label: "スペース", sub: "業務スペースを開く" },
  { id: "address", icon: "名", label: "アドレス帳", sub: "連絡先を探す" },
  { id: "messages", icon: "話", label: "メッセージ機能", sub: "会話を確認" },
  { id: "facilities", icon: "室", label: "設備予約", sub: "会議室・備品予約" },
  { id: "timecard", icon: "勤", label: "タイムカード", sub: "打刻を確認" },
  { id: "knowledge", icon: "知", label: "ナレッジ", sub: "文書とFAQ" },
  { id: "canvas", icon: "板", label: "ホワイトボード", sub: "付箋とアイデア整理" },
  { id: "admin", icon: "管", label: "組織・権限管理", sub: "ユーザーと権限" },
  { id: "folder", icon: "個", label: "個人フォルダ", sub: "個人メモ" },
];

export default function CommandPalette() {
  const { setView } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const filtered = query ? COMMANDS.filter((c) => `${c.label} ${c.sub}`.includes(query)) : COMMANDS.slice(0, 10);
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  function run(id: ViewId) {
    setView(id);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && filtered[selectedIdx]) run(filtered[selectedIdx].id);
  }

  if (!open) return null;

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "14vh", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
      <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} onClick={(e) => e.stopPropagation()} className="panel" style={{ width: 560, maxWidth: "92vw", padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderBottom: "1px solid var(--line)" }}>
          <span>検</span>
          <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }} onKeyDown={onKeyDown} placeholder="画面名や機能を検索" style={{ flex: 1, border: 0, boxShadow: "none", background: "transparent" }} />
        </div>
        <div style={{ padding: 8, maxHeight: 420, overflow: "auto" }}>
          {filtered.map((command, index) => (
            <button key={command.id} onClick={() => run(command.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: 10, border: 0, borderRadius: 8, background: selectedIdx === index ? "var(--soft)" : "transparent", textAlign: "left" }}>
              <span className="view-icon" style={{ width: 28, height: 28 }}>
                {command.icon}
              </span>
              <span>
                <strong>{command.label}</strong>
                <br />
                <span className="muted-text">{command.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
