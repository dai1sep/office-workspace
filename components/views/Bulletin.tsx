"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import ConfirmationStatus from "@/components/ConfirmationStatus";
import { AttachmentInput, AttachmentList } from "@/components/Attachments";
import { useApp } from "@/lib/context";
import type { Bulletin, Attachment } from "@/lib/types";
import { uid, userName } from "@/lib/utils";

type ListMode = "latest" | "mine" | "drafts";

const EMPTY_FORM = {
  title: "", body: "", scope: "全社", category: "全社連絡", important: false,
  publishAt: new Date().toISOString().slice(0, 10), publishTime: "09:00", finishAt: "", finishTime: "18:00",
  allowComments: true, allowReactions: true, reactionLabel: "確認しました", surveyQuestion: "", surveyOptions: "",
  relatedFiles: [] as string[],
  attachments: [] as Attachment[],
};
function formFrom(item: Bulletin) {
  return {
    ...EMPTY_FORM, title: item.title, body: item.body, scope: item.scope, category: item.category,
    important: item.important, publishAt: item.publishAt, publishTime: item.publishTime ?? "09:00",
    finishAt: item.finishAt, finishTime: item.finishTime ?? "18:00", allowComments: item.allowComments,
    allowReactions: item.allowReactions, reactionLabel: item.reactionLabel, relatedFiles: item.relatedFiles ?? [],
    attachments: item.attachments ?? [],
    surveyQuestion: item.survey?.question ?? "", surveyOptions: item.survey?.options.join("\n") ?? "",
  };
}

function stateLabel(item: Bulletin) {
  const today = new Date().toISOString().slice(0, 10);
  if (item.draft) return "下書き";
  if (item.publishAt > today) return "公開予約";
  if (item.finishAt && item.finishAt < today) return "掲載終了";
  if (item.important) return "重要";
  return item.read ? "確認済" : "未読";
}

export default function BulletinView() {
  const { state, updateState, currentUser } = useApp();
  const me = currentUser ?? state.currentUser;
  const myName = userName(state, me);
  const [mode, setMode] = useState<ListMode>("latest");
  const [category, setCategory] = useState("すべて");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>();

  const categories = useMemo(() => ["すべて", ...Array.from(new Set(state.bulletins.map((item) => item.category).filter(Boolean)))], [state.bulletins]);
  const subscriptions = state.bulletinSubscriptions ?? [];
  const detail = state.bulletins.find((item) => item.id === detailId) ?? null;
  const list = state.bulletins
    .filter((item) => mode === "drafts" ? item.draft && item.author === myName : mode === "mine" ? !item.draft && item.author === myName : !item.draft)
    .filter((item) => category === "すべて" || item.category === category)
    .filter((item) => !query || `${item.title} ${item.body} ${item.author} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.updatedAt ?? b.date).localeCompare(a.updatedAt ?? a.date));

  function toggleFiles(id: string) {
    setForm((prev) => ({ ...prev, relatedFiles: prev.relatedFiles.includes(id) ? prev.relatedFiles.filter((value) => value !== id) : [...prev.relatedFiles, id] }));
  }
  function save(draft: boolean) {
    if (!form.title.trim()) return;
    const now = new Date().toISOString();
    const existing = editingId
      ? state.bulletins.find((item) => item.id === editingId)
      : mode === "drafts"
        ? state.bulletins.find((item) => item.draft && item.author === myName && item.title === form.title)
        : undefined;
    const item: Bulletin = {
      id: existing?.id ?? uid("b"), scope: form.scope, category: form.category, title: form.title.trim(), author: existing?.author ?? myName,
      comments: existing?.comments ?? 0, date: existing?.date ?? now.slice(0, 10), updatedAt: now, publishAt: form.publishAt, publishTime: form.publishTime,
      finishAt: form.finishAt, finishTime: form.finishTime, body: form.body, pinned: false, important: form.important,
      read: true, allowComments: form.allowComments, allowReactions: form.allowReactions, reactionLabel: form.reactionLabel,
      reactions: existing?.reactions ?? [], commentsList: existing?.commentsList ?? [], subscribers: existing?.subscribers ?? [me], relatedFiles: form.relatedFiles, attachments: form.attachments, draft,
      survey: form.surveyQuestion.trim() ? { question: form.surveyQuestion.trim(), options: form.surveyOptions.split("\n").map((value) => value.trim()).filter(Boolean), votes: existing?.survey?.votes ?? {} } : undefined,
    };
    updateState((prev) => ({ ...prev, bulletins: existing ? prev.bulletins.map((value) => value.id === existing.id ? item : value) : [item, ...prev.bulletins] }));
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(false);
    if (draft) setMode("drafts");
  }
  function edit(item: Bulletin) {
    setEditingId(item.id); setForm(formFrom(item)); setDetailId(null); setFormOpen(true);
  }
  function openDetail(id: string) {
    setDetailId(id);
    updateState((prev) => ({ ...prev, bulletins: prev.bulletins.map((item) => item.id === id ? { ...item, read: true } : item) }));
  }
  function react() {
    if (!detail) return;
    updateState((prev) => ({ ...prev, bulletins: prev.bulletins.map((item) => item.id === detail.id ? { ...item, reactions: item.reactions.includes(me) ? item.reactions.filter((id) => id !== me) : [...item.reactions, me] } : item) }));
  }
  function postComment() {
    if (!detail || !comment.trim()) return;
    updateState((prev) => ({ ...prev, bulletins: prev.bulletins.map((item) => item.id === detail.id ? {
      ...item, comments: item.comments + 1, updatedAt: new Date().toISOString(),
      commentsList: [...item.commentsList, { id: uid("bc"), author: myName, date: new Date().toISOString(), text: comment.trim(), parentId: replyTo }],
    } : item) }));
    setComment(""); setReplyTo(undefined);
  }
  function toggleSubscription(targetCategory: string) {
    updateState((prev) => ({ ...prev, bulletinSubscriptions: (prev.bulletinSubscriptions ?? []).includes(targetCategory) ? (prev.bulletinSubscriptions ?? []).filter((value) => value !== targetCategory) : [...(prev.bulletinSubscriptions ?? []), targetCategory] }));
  }
  function toggleThreadSubscription() {
    if (!detail) return;
    updateState((prev) => ({ ...prev, bulletins: prev.bulletins.map((item) => item.id === detail.id ? { ...item, subscribers: (item.subscribers ?? []).includes(me) ? (item.subscribers ?? []).filter((id) => id !== me) : [...(item.subscribers ?? []), me] } : item) }));
  }
  function reuse() {
    if (!detail) return;
    setEditingId(null); setForm({ ...formFrom(detail), publishAt: new Date().toISOString().slice(0, 10), finishAt: "" });
    setDetailId(null); setFormOpen(true);
  }
  function togglePinned() {
    if (!detail) return;
    updateState((prev) => ({ ...prev, bulletins: prev.bulletins.map((item) => item.id === detail.id ? { ...item, pinned: !item.pinned } : item) }));
  }
  function remove() {
    if (!detail) return;
    updateState((prev) => ({ ...prev, bulletins: prev.bulletins.filter((item) => item.id !== detail.id) }));
    setDetailId(null);
  }
  function exportThread() {
    if (!detail) return;
    const comments = detail.commentsList.map((item) => `${item.date} ${item.author}\n${item.text}`).join("\n\n");
    const blob = new Blob([`${detail.title}\n${detail.author} / ${detail.date}\n\n${detail.body}\n\n${comments}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${detail.title}.txt`; link.click(); URL.revokeObjectURL(url);
  }
  function vote(option: string) {
    if (!detail?.survey) return;
    updateState((prev) => ({ ...prev, bulletins: prev.bulletins.map((item) => item.id === detail.id && item.survey ? { ...item, survey: { ...item.survey, votes: { ...item.survey.votes, [me]: option } } } : item) }));
  }

  return (
    <div className="bulletin-view" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="panel bulletin-toolbar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="ghost-button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true); }} style={{ background: "var(--green)", color: "white", borderColor: "var(--green)" }}>掲示を書き込む</button>
        {[(["latest", "最新一覧"] as const), (["mine", "作成一覧"] as const), (["drafts", "下書き"] as const)].map(([value, label]) => <button key={value} className="ghost-button" onClick={() => setMode(value)} style={{ background: mode === value ? "var(--soft)" : "var(--panel)" }}>{label}</button>)}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="掲示を検索" style={{ marginLeft: "auto", minWidth: 190 }} />
      </section>

      <motion.div className="bulletin-layout" key={`${mode}-${category}`} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .2 }} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 230px) minmax(0, 1fr)", gap: 12 }}>
        <aside className="panel bulletin-categories">
          <div className="panel-title">カテゴリ</div>
          <div style={{ display: "grid", gap: 6 }}>{categories.map((value) => <div key={value} style={{ display: "grid", gridTemplateColumns: value === "すべて" ? "1fr" : "1fr auto", gap: 5 }}><button className="ghost-button" onClick={() => setCategory(value)} style={{ justifyContent: "space-between", background: category === value ? "var(--soft)" : "var(--panel)" }}><span>{value}</span><span className="muted-text">{value === "すべて" ? state.bulletins.length : state.bulletins.filter((item) => item.category === value).length}</span></button>{value !== "すべて" && <button className="ghost-button" onClick={() => toggleSubscription(value)} title="カテゴリ通知">{subscriptions.includes(value) ? "通知中" : "通知"}</button>}</div>)}</div>
        </aside>
        <section className="panel">
          <div className="panel-title">掲示一覧 <span className="muted-text">{list.length}件</span></div>
          {list.length === 0 && <div className="muted-text" style={{ padding: 20, textAlign: "center" }}>該当する掲示はありません。</div>}
          <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} initial="hidden" animate="show">
          {list.map((item) => <motion.button variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.16 } } }} whileHover={{ backgroundColor: "var(--soft)" }} key={item.id} onClick={() => item.draft ? (setForm(formFrom(item)), setFormOpen(true)) : openDetail(item.id)} style={{ width: "100%", border: 0, borderBottom: "1px solid var(--line)", background: "transparent", color: "var(--text)", padding: "13px 4px", textAlign: "left", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12 }}><div>{item.pinned && <span style={{ marginRight: 6 }}>固定</span>}<strong>{item.title}</strong><div className="muted-text" style={{ marginTop: 4 }}>{item.category} / {item.scope} / {item.author} / 更新 {item.updatedAt?.slice(0, 10) ?? item.date}</div></div><div style={{ textAlign: "right" }}><span style={{ fontSize: 11, padding: "3px 7px", borderRadius: 5, background: "var(--soft)" }}>{stateLabel(item)}</span><div className="muted-text" style={{ marginTop: 5 }}>コメント {item.comments} / 反応 {item.reactions.length}</div></div></motion.button>)}
          </motion.div>
        </section>
      </motion.div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="掲示の書き込み" width={760}>
        <div style={{ display: "grid", gap: 12 }}>
          <label>件名<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>カテゴリ<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} list="bulletin-categories" style={{ display: "block", width: "100%", marginTop: 5 }} /><datalist id="bulletin-categories">{categories.filter((value) => value !== "すべて").map((value) => <option key={value}>{value}</option>)}</datalist></label><label>公開範囲<input value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label></div>
          <label>本文<textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} rows={8} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}><label>掲載開始日<input type="date" value={form.publishAt} onChange={(event) => setForm({ ...form, publishAt: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>開始時刻<input type="time" value={form.publishTime} onChange={(event) => setForm({ ...form, publishTime: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>掲載終了日<input type="date" value={form.finishAt} onChange={(event) => setForm({ ...form, finishAt: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>終了時刻<input type="time" value={form.finishTime} onChange={(event) => setForm({ ...form, finishTime: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label></div>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>関連ファイル</legend>{state.files.map((file) => <label key={file.id} style={{ display: "flex", gap: 6, marginBottom: 5 }}><input type="checkbox" checked={form.relatedFiles.includes(file.id)} onChange={() => toggleFiles(file.id)} />{file.name}</label>)}</fieldset>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>ファイル添付</legend><AttachmentInput value={form.attachments} onChange={(attachments) => setForm({ ...form, attachments })} /></fieldset>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}><label><input type="checkbox" checked={form.important} onChange={(event) => setForm({ ...form, important: event.target.checked })} /> 重要</label><label><input type="checkbox" checked={form.allowComments} onChange={(event) => setForm({ ...form, allowComments: event.target.checked })} /> コメントを許可</label><label><input type="checkbox" checked={form.allowReactions} onChange={(event) => setForm({ ...form, allowReactions: event.target.checked })} /> リアクションを許可</label></div>
          {form.allowReactions && <label>リアクション文言<select value={form.reactionLabel} onChange={(event) => setForm({ ...form, reactionLabel: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }}><option>確認しました</option><option>了解です</option><option>よろしくお願いします</option><option>いいね！</option></select></label>}
          <label>アンケート（任意）<input value={form.surveyQuestion} onChange={(event) => setForm({ ...form, surveyQuestion: event.target.value })} placeholder="質問" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          {form.surveyQuestion && <label>選択肢（1行1件）<textarea value={form.surveyOptions} onChange={(event) => setForm({ ...form, surveyOptions: event.target.value })} rows={3} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button className="ghost-button" onClick={() => save(true)}>下書き保存</button><button className="ghost-button" onClick={() => setFormOpen(false)}>キャンセル</button><button className="ghost-button" onClick={() => save(false)} style={{ background: "var(--green)", color: "white" }}>書き込む</button></div>
        </div>
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetailId(null)} title="掲示の詳細" width={780}>{detail && <div style={{ display: "grid", gap: 14 }}>
        <div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 6 }}><span className="muted-text">{detail.category} / {detail.scope}</span>{detail.important && <strong style={{ color: "#b24a3a" }}>重要</strong>}</div><h2 style={{ margin: "0 0 6px", fontSize: 21 }}>{detail.title}</h2><div className="muted-text">{detail.author} / {detail.date} / 掲載 {detail.publishAt}{detail.finishAt ? ` ～ ${detail.finishAt}` : ""}</div></div>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, padding: "16px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>{detail.body}</div>
        {(detail.relatedFiles ?? []).length > 0 && <div><strong style={{ fontSize: 12 }}>関連ファイル</strong>{(detail.relatedFiles ?? []).map((id) => <div key={id} className="muted-text">{state.files.find((file) => file.id === id)?.name ?? id}</div>)}</div>}
        <AttachmentList items={detail.attachments} />
        {detail.survey && <div style={{ padding: 12, background: "var(--soft)", borderRadius: 8 }}><strong>{detail.survey.question}</strong><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>{detail.survey.options.map((option) => <button key={option} className="ghost-button" onClick={() => vote(option)}>{option} {Object.values(detail.survey?.votes ?? {}).filter((value) => value === option).length}</button>)}</div></div>}
        {detail.allowReactions && (
          <ConfirmationStatus
            label={detail.reactionLabel}
            confirmed={detail.reactions.map((id) => userName(state, id))}
            pending={state.users.filter((u) => !detail.reactions.includes(u.id)).map((u) => u.name)}
          />
        )}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{detail.allowReactions && <button className="ghost-button" onClick={react}>{detail.reactionLabel} {detail.reactions.length}</button>}<button className="ghost-button" onClick={toggleThreadSubscription}>{(detail.subscribers ?? []).includes(me) ? "更新通知を解除" : "更新通知を受け取る"}</button><button className="ghost-button" onClick={reuse}>再利用</button><button className="ghost-button" onClick={exportThread}>ファイル出力</button><button className="ghost-button" onClick={() => navigator.clipboard?.writeText(window.location.href)}>固定リンクをコピー</button>{detail.author === myName && <><button className="ghost-button" onClick={togglePinned}>{detail.pinned ? "固定を解除" : "先頭に固定"}</button><button className="ghost-button" onClick={() => edit(detail)}>編集</button><button className="ghost-button" onClick={remove} style={{ color: "#a33" }}>削除</button></>}</div>
        <div><div className="panel-title">コメント {detail.commentsList.length}</div>{detail.commentsList.map((item) => <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong>{item.author}</strong><span className="muted-text">{item.date.slice(0, 16).replace("T", " ")}</span></div>{item.parentId && <div className="muted-text">返信先: {detail.commentsList.find((parent) => parent.id === item.parentId)?.author ?? "コメント"}</div>}<div style={{ whiteSpace: "pre-wrap", marginTop: 5 }}>{item.text}</div><button onClick={() => setReplyTo(item.id)} style={{ border: 0, background: "transparent", color: "var(--blue)", padding: "5px 0" }}>返信する</button></div>)}{detail.allowComments && <div style={{ marginTop: 12 }}>{replyTo && <div className="muted-text">返信として投稿 <button onClick={() => setReplyTo(undefined)} style={{ border: 0, background: "transparent", color: "var(--blue)" }}>解除</button></div>}<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="コメントを入力" style={{ width: "100%", marginTop: 5 }} /><button className="ghost-button" onClick={postComment} style={{ marginTop: 7 }}>コメントを書き込む</button></div>}</div>
      </div>}</Modal>
    </div>
  );
}
