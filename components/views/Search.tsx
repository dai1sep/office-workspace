"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/lib/context";
import type { ViewId } from "@/lib/types";
import { userName } from "@/lib/utils";

type Category = { key: string; label: string; icon: string; view: ViewId };

// 横断検索の対象カテゴリ。表示順もこの配列順。
const CATEGORIES: Category[] = [
  { key: "schedule", label: "予定", icon: "予", view: "schedule" },
  { key: "bulletin", label: "掲示板", icon: "掲", view: "bulletin" },
  { key: "workflow", label: "ワークフロー", icon: "承", view: "workflow" },
  { key: "todo", label: "ToDo", icon: "済", view: "todo" },
  { key: "mail", label: "メール", icon: "封", view: "mail" },
  { key: "message", label: "メッセージ", icon: "話", view: "messages" },
  { key: "file", label: "ファイル", icon: "書", view: "files" },
  { key: "knowledge", label: "ナレッジ", icon: "知", view: "knowledge" },
  { key: "person", label: "連絡先", icon: "名", view: "address" },
  { key: "facility", label: "設備", icon: "室", view: "facilities" },
  { key: "license", label: "資格・許可", icon: "証", view: "licenses" },
];

type Result = { id: string; key: string; view: ViewId; title: string; sub: string; snippet: string };

// 一致箇所を中心に前後を切り出した抜粋を返す。
function makeSnippet(text: string, q: string, len = 96): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const i = clean.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return clean.length > len ? `${clean.slice(0, len)}…` : clean;
  const start = Math.max(0, i - 32);
  const end = Math.min(clean.length, start + len);
  return `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`;
}

// 一致部分をマークして強調表示する（正規表現を使わず先頭一致のみ）。
function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: "var(--soft)", color: "inherit", padding: "0 2px", borderRadius: 3 }}>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function SearchView() {
  const { state, setView } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];
    const hit = (text: string) => text.toLowerCase().includes(q);

    state.schedules.forEach((s) => {
      const text = `${s.title} ${s.detail} ${s.location}`;
      if (hit(text)) out.push({ id: s.id, key: "schedule", view: "schedule", title: s.title, sub: `${s.date} ${s.start} / ${s.location}`, snippet: makeSnippet(`${s.detail} ${s.location}`, q) });
    });
    state.bulletins.filter((b) => !b.draft).forEach((b) => {
      const text = `${b.title} ${b.body} ${b.category} ${b.author}`;
      if (hit(text)) out.push({ id: b.id, key: "bulletin", view: "bulletin", title: b.title, sub: `${b.category} / ${b.author} / ${b.date}`, snippet: makeSnippet(b.body, q) });
    });
    state.workflows.filter((w) => !w.draft).forEach((w) => {
      const text = `${w.number ?? ""} ${w.title} ${w.detail} ${w.type} ${userName(state, w.applicant)}`;
      if (hit(text)) out.push({ id: w.id, key: "workflow", view: "workflow", title: w.title, sub: `${w.number ?? ""} / ${w.type} / ${w.status}`, snippet: makeSnippet(w.detail, q) });
    });
    state.todos.forEach((t) => {
      const text = `${t.title} ${t.detail} ${t.project}`;
      if (hit(text)) out.push({ id: t.id, key: "todo", view: "todo", title: t.title, sub: `${t.project} / ${t.status} / 期限 ${t.due}`, snippet: makeSnippet(t.detail, q) });
    });
    state.mails.forEach((m) => {
      const text = `${m.subject} ${m.body} ${m.labels.join(" ")}`;
      if (hit(text)) out.push({ id: m.id, key: "mail", view: "mail", title: m.subject, sub: `${m.from} / ${m.date}`, snippet: makeSnippet(m.body, q) });
    });
    state.messages.forEach((m) => {
      const text = `${m.subject} ${m.body} ${userName(state, m.from)}`;
      if (hit(text)) out.push({ id: m.id, key: "message", view: "messages", title: m.subject, sub: `${userName(state, m.from)} / ${m.date}`, snippet: makeSnippet(m.body, q) });
    });
    state.files.forEach((f) => {
      const text = `${f.name} ${f.folder} ${userName(state, f.owner)}`;
      if (hit(text)) out.push({ id: f.id, key: "file", view: "files", title: f.name, sub: `${f.folder} / ${userName(state, f.owner)} / v${f.version}`, snippet: "" });
    });
    state.knowledge.forEach((k) => {
      const text = `${k.title} ${k.body} ${k.tags.join(" ")} ${k.category}`;
      if (hit(text)) out.push({ id: k.id, key: "knowledge", view: "knowledge", title: k.title, sub: `${k.category} / ${userName(state, k.author)}`, snippet: makeSnippet(k.body, q) });
    });
    state.users.forEach((u) => {
      const text = `${u.name} ${u.dept} ${u.role} ${u.email} ${u.ext}`;
      if (hit(text)) out.push({ id: u.id, key: "person", view: "address", title: u.name, sub: `${u.dept} / ${u.role} / 内線 ${u.ext}`, snippet: u.email });
    });
    state.facilities.forEach((f) => {
      const text = `${f.name} ${f.equipment.join(" ")}`;
      if (hit(text)) out.push({ id: f.id, key: "facility", view: "facilities", title: f.name, sub: `定員 ${f.capacity}名`, snippet: f.equipment.join("、") });
    });
    state.constructionLicenses.forEach((l) => {
      const text = `${l.type} ${l.num} ${l.person} ${l.dept} ${l.notes}`;
      if (hit(text)) out.push({ id: l.id, key: "license", view: "licenses", title: l.type, sub: `${l.num} / ${l.person} / 有効期限 ${l.expires}`, snippet: makeSnippet(l.notes, q) });
    });

    return out;
  }, [state, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    results.forEach((r) => { map[r.key] = (map[r.key] ?? 0) + 1; });
    return map;
  }, [results]);

  const activeCategories = CATEGORIES.filter((c) => (counts[c.key] ?? 0) > 0);
  const filtered = category === "all" ? results : results.filter((r) => r.key === category);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="panel" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setCategory("all"); }} placeholder="メール・掲示板・申請・予定・ToDo・ファイル・ナレッジ・連絡先を横断検索" style={{ flex: 1, minWidth: 240 }} />
        {query && <span className="muted-text">{results.length}件</span>}
      </section>

      {query && results.length > 0 && (
        <section className="panel" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="ghost-button" onClick={() => setCategory("all")} style={{ background: category === "all" ? "var(--soft)" : "var(--panel)" }}>すべて {results.length}</button>
          {activeCategories.map((c) => (
            <button key={c.key} className="ghost-button" onClick={() => setCategory(c.key)} style={{ background: category === c.key ? "var(--soft)" : "var(--panel)" }}>{c.label} {counts[c.key]}</button>
          ))}
        </section>
      )}

      {!query && (
        <section className="panel"><div className="muted-text" style={{ padding: 28, textAlign: "center", lineHeight: 1.7 }}>キーワードを入力すると、メール・掲示板・ワークフロー・予定・ToDo・ファイル・ナレッジ・連絡先・設備・資格を横断して検索します。</div></section>
      )}

      {query && results.length === 0 && (
        <section className="panel"><div className="muted-text" style={{ padding: 28, textAlign: "center" }}>「{query}」に一致する項目は見つかりませんでした。</div></section>
      )}

      {query && CATEGORIES.filter((c) => filtered.some((r) => r.key === c.key)).map((c) => {
        const rows = filtered.filter((r) => r.key === c.key);
        return (
          <motion.section key={c.key} className="panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <div className="panel-title">{c.label} <span className="muted-text">{rows.length}件</span></div>
            {rows.map((r) => (
              <motion.button key={`${r.key}-${r.id}`} whileHover={{ backgroundColor: "var(--soft)" }} onClick={() => setView(r.view)} style={{ width: "100%", border: 0, borderBottom: "1px solid var(--line)", background: "transparent", color: "var(--text)", padding: "12px 4px", textAlign: "left", display: "flex", gap: 12, alignItems: "center" }}>
                <span className="view-icon" style={{ width: 30, height: 30, flexShrink: 0 }}>{c.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong><Highlight text={r.title} q={query} /></strong>
                  <div className="muted-text">{r.sub}</div>
                  {r.snippet && <div className="muted-text" style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Highlight text={r.snippet} q={query} /></div>}
                </div>
                <span className="muted-text" style={{ flexShrink: 0 }}>{c.label}へ →</span>
              </motion.button>
            ))}
          </motion.section>
        );
      })}
    </div>
  );
}
