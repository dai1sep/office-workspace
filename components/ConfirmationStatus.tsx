"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  confirmed: string[]; // 確認済みの氏名
  pending: string[]; // 未確認の氏名
  label?: string; // 見出し（例: 確認しました）
}

function NameList({ names, tone }: { names: string[]; tone: "green" | "orange" }) {
  const color = tone === "green" ? "var(--green)" : "var(--orange)";
  return (
    <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
      {names.length === 0 && <span className="muted-text" style={{ fontSize: 12 }}>該当者はいません</span>}
      {names.map((name) => (
        <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap" }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{name[0]}</span>
          {name}
        </span>
      ))}
    </div>
  );
}

function Badge({ open, setOpen, which, count, names, tone, text }: {
  open: "confirmed" | "pending" | null;
  setOpen: (fn: (o: "confirmed" | "pending" | null) => "confirmed" | "pending" | null) => void;
  which: "confirmed" | "pending"; count: number; names: string[]; tone: "green" | "orange"; text: string;
}) {
  const color = tone === "green" ? "var(--green)" : "var(--orange)";
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(() => which)}
      onMouseLeave={() => setOpen((o) => (o === which ? null : o))}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => (o === which ? null : which))}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, border: `1px solid ${color}`, background: tone === "green" ? "var(--soft)" : "transparent", color, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
        {text} {count}人
      </button>
      <AnimatePresence>
        {open === which && count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            style={{ position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, minWidth: 160, maxWidth: 260, padding: 10, borderRadius: 10, background: "var(--panel)", border: "1px solid var(--line)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
          >
            <NameList names={names} tone={tone} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 確認状況を「人数バッジ＋進捗バー」で表示し、氏名一覧はホバー/タップのポップオーバーで見せる。
export default function ConfirmationStatus({ confirmed, pending, label }: Props) {
  const [open, setOpen] = useState<"confirmed" | "pending" | null>(null);
  const total = confirmed.length + pending.length;
  const rate = total ? Math.round((confirmed.length / total) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: 8, padding: "12px 14px", background: "var(--soft)", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span className="muted-text" style={{ fontSize: 11 }}>{label ?? "確認状況"}</span>
        <span className="muted-text" style={{ fontSize: 11 }}>{confirmed.length} / {total} 名（{rate}%）</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.35 }} style={{ height: "100%", background: "var(--green)" }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge open={open} setOpen={setOpen} which="confirmed" count={confirmed.length} names={confirmed} tone="green" text="確認" />
        <Badge open={open} setOpen={setOpen} which="pending" count={pending.length} names={pending} tone="orange" text="未確認" />
      </div>
    </div>
  );
}
