"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import { statusColor, uid, userName } from "@/lib/utils";

function Badge({ label }: { label: string }) {
  return <span className={`status ${statusColor(label)}`}>{label}</span>;
}

function Empty({ text = "表示するデータがありません。" }: { text?: string }) {
  return <div className="panel" style={{ color: "var(--muted)", fontSize: 13 }}>{text}</div>;
}

function Layout({ title, lead, actions, children }: { title: string; lead?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="view-layout" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section className="panel view-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong>{title}</strong>
          <div className="muted-text" style={{ marginTop: 3 }}>{lead ?? "登録、確認、検索を同じ画面内で扱えます。"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
      </section>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <motion.div whileHover={{ y: -1, backgroundColor: "var(--soft)" }} className="row-card" style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8, marginBottom: 8, background: "var(--panel)" }}>
      {children}
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 13 }}>{label}<div style={{ marginTop: 5 }}>{children}</div></label>;
}

function SimpleModal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal open={open} onClose={onClose} title={title} width={560}>{children}</Modal>;
}

export function FolderView() {
  const [memos, setMemos] = useState([
    { id: "memo1", title: "今日の確認事項", body: "会議前に確認する内容をまとめる", tag: "メモ" },
    { id: "memo2", title: "下書き", body: "掲示板や申請前の文章を一時保存", tag: "下書き" },
    { id: "memo3", title: "未整理資料", body: "あとで分類する個人用の資料置き場", tag: "資料" },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", tag: "メモ" });

  function addMemo() {
    if (!form.title.trim()) return;
    setMemos((prev) => [{ id: uid("memo"), ...form }, ...prev]);
    setForm({ title: "", body: "", tag: "メモ" });
    setOpen(false);
  }

  return (
    <Layout title="個人フォルダ" lead="自分用のメモ、下書き、未整理資料を保存します。" actions={<button className="ghost-button" onClick={() => setOpen(true)}>メモ追加</button>}>
      <section className="panel">
        <div className="panel-title">個人用メモ</div>
        {memos.map((memo) => <Row key={memo.id}><div style={{ flex: 1 }}><strong>{memo.title}</strong><br /><span className="muted-text">{memo.body}</span></div><Badge label={memo.tag} /></Row>)}
      </section>
      <SimpleModal open={open} onClose={() => setOpen(false)} title="メモ追加">
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="タイトル"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="分類"><input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="内容"><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} style={{ width: "100%" }} /></Field>
          <div style={{ display: "flex", gap: 8 }}><button className="ghost-button" onClick={addMemo}>保存</button><button className="ghost-button" onClick={() => setOpen(false)}>キャンセル</button></div>
        </div>
      </SimpleModal>
    </Layout>
  );
}

export function BulletinView() {
  const { state, updateState } = useApp();
  const [open, setOpen] = useState(false);
  const categories = useMemo(() => ["すべて", ...Array.from(new Set(state.bulletins.map((b) => b.category).filter(Boolean)))], [state.bulletins]);
  const [category, setCategory] = useState("すべて");
  const [form, setForm] = useState({ title: "", body: "", category: "全社連絡", scope: "全社", important: false });
  const filtered = category === "すべて" ? state.bulletins : state.bulletins.filter((b) => b.category === category);

  function addBulletin() {
    if (!form.title.trim()) return;
    updateState((prev) => ({
      ...prev,
      bulletins: [{
        id: uid("b"), scope: form.scope, category: form.category, title: form.title,
        author: userName(prev, prev.currentUser), comments: 0, date: new Date().toISOString().slice(0, 10),
        publishAt: new Date().toISOString().slice(0, 10), finishAt: "", body: form.body,
        pinned: false, important: form.important, read: false, allowComments: true,
        allowReactions: true, reactionLabel: "確認しました", reactions: [], commentsList: [],
      }, ...prev.bulletins],
    }));
    setOpen(false);
    setForm({ title: "", body: "", category: "全社連絡", scope: "全社", important: false });
  }

  return (
    <Layout title="社内掲示板" lead="全社・部門・案件ごとのお知らせをカテゴリ別に共有します。" actions={<button className="ghost-button" onClick={() => setOpen(true)}>新規スレッド</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", gap: 14 }}>
        <section className="panel">
          <div className="panel-title">カテゴリ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {categories.map((item) => {
              const count = item === "すべて" ? state.bulletins.length : state.bulletins.filter((b) => b.category === item).length;
              return <button key={item} className="ghost-button" onClick={() => setCategory(item)} style={{ justifyContent: "space-between", borderRadius: 8, background: category === item ? "var(--soft)" : "var(--panel)" }}><span>{item}</span><span className="muted-text">{count}</span></button>;
            })}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">掲示一覧 <span className="muted-text">{category}</span></div>
          {filtered.map((b) => <Row key={b.id}><div style={{ flex: 1 }}><strong>{b.title}</strong><br /><span className="muted-text">{b.scope} / {b.category} / {b.author}</span></div><Badge label={b.important ? "重要" : b.read ? "確認済" : "未読"} /></Row>)}
        </section>
      </div>
      <SimpleModal open={open} onClose={() => setOpen(false)} title="新規スレッド">
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="タイトル"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%" }} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="範囲"><input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} style={{ width: "100%" }} /></Field>
            <Field label="カテゴリ"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: "100%" }}>{categories.filter((item) => item !== "すべて").map((item) => <option key={item}>{item}</option>)}</select></Field>
          </div>
          <Field label="本文"><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} style={{ width: "100%" }} /></Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.important} onChange={(e) => setForm({ ...form, important: e.target.checked })} />重要にする</label>
          <div style={{ display: "flex", gap: 8 }}><button className="ghost-button" onClick={addBulletin}>投稿</button><button className="ghost-button" onClick={() => setOpen(false)}>キャンセル</button></div>
        </div>
      </SimpleModal>
    </Layout>
  );
}

export function MailView() {
  const { state, updateState } = useApp();
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState("受信");
  const [form, setForm] = useState({ subject: "", from: "", body: "", label: "" });
  const folders = ["受信", "送信", "下書き", "保留"];
  const mails = state.mails.filter((m) => folder === "受信" ? true : m.folder === folder);

  function addMail() {
    if (!form.subject.trim()) return;
    updateState((prev) => ({ ...prev, mails: [{ id: uid("mail"), subject: form.subject, from: form.from || userName(prev, prev.currentUser), to: [prev.currentUser], date: new Date().toISOString().slice(0, 10), body: form.body, folder: "受信", read: false, labels: form.label ? [form.label] : [] }, ...prev.mails] }));
    setOpen(false);
    setForm({ subject: "", from: "", body: "", label: "" });
  }

  return (
    <Layout title="メール管理" lead="受信、送信、下書き、保留を案件ラベルとあわせて管理します。" actions={<button className="ghost-button" onClick={() => setOpen(true)}>メール登録</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0, 1fr)", gap: 14 }}>
        <section className="panel"><div className="panel-title">フォルダ</div>{folders.map((f) => <button key={f} className="ghost-button" onClick={() => setFolder(f)} style={{ width: "100%", justifyContent: "space-between", marginBottom: 6, background: folder === f ? "var(--soft)" : "var(--panel)" }}>{f}<span className="muted-text">{f === "受信" ? state.mails.length : state.mails.filter((m) => m.folder === f).length}</span></button>)}</section>
        <section className="panel"><div className="panel-title">メール一覧</div>{mails.map((m) => <Row key={m.id}><div style={{ flex: 1 }}><strong>{m.subject}</strong><br /><span className="muted-text">{m.from} / {m.date} / {m.labels.join(", ") || "ラベルなし"}</span></div><Badge label={m.read ? "確認済" : "未読"} /></Row>)}</section>
      </div>
      <SimpleModal open={open} onClose={() => setOpen(false)} title="メール登録">
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="件名"><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="差出人"><input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="ラベル"><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="本文"><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} style={{ width: "100%" }} /></Field>
          <div style={{ display: "flex", gap: 8 }}><button className="ghost-button" onClick={addMail}>登録</button><button className="ghost-button" onClick={() => setOpen(false)}>キャンセル</button></div>
        </div>
      </SimpleModal>
    </Layout>
  );
}

export function WorkflowView() {
  const { state, updateState } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "稟議", title: "", amount: "", detail: "" });
  const statuses = ["すべて", "申請中", "確認中", "承認待ち", "承認済", "差し戻し"];
  const [status, setStatus] = useState("すべて");
  const workflows = status === "すべて" ? state.workflows : state.workflows.filter((w) => w.status === status);

  function addWorkflow() {
    if (!form.title.trim()) return;
    updateState((prev) => ({ ...prev, workflows: [{ id: uid("w"), type: form.type, title: form.title, applicant: prev.currentUser, dept: prev.users.find((u) => u.id === prev.currentUser)?.dept ?? "", date: new Date().toISOString().slice(0, 10), status: "申請中", amount: form.amount ? Number(form.amount) : undefined, detail: form.detail, approvers: prev.users.filter((u) => u.role === "管理者").map((u) => u.id).slice(0, 1), approved: [], rejected: false }, ...prev.workflows] }));
    setOpen(false);
    setForm({ type: "稟議", title: "", amount: "", detail: "" });
  }

  return (
    <Layout title="ワークフロー" lead="申請、承認、差し戻し、履歴を状態別に管理します。" actions={<button className="ghost-button" onClick={() => setOpen(true)}>申請作成</button>}>
      <section className="panel"><div className="panel-title">状態</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{statuses.map((s) => <button key={s} className="ghost-button" onClick={() => setStatus(s)} style={{ background: status === s ? "var(--soft)" : "var(--panel)" }}>{s}</button>)}</div></section>
      <section className="panel"><div className="panel-title">申請一覧</div>{workflows.map((w) => <Row key={w.id}><div style={{ flex: 1 }}><strong>{w.title}</strong><br /><span className="muted-text">{w.type} / {userName(state, w.applicant)} / {w.dept}</span></div>{w.amount && <span className="muted-text">¥{w.amount.toLocaleString()}</span>}<Badge label={w.status} /></Row>)}</section>
      <SimpleModal open={open} onClose={() => setOpen(false)} title="申請作成">
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="申請種別"><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="件名"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="金額"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="内容"><textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={4} style={{ width: "100%" }} /></Field>
          <div style={{ display: "flex", gap: 8 }}><button className="ghost-button" onClick={addWorkflow}>申請</button><button className="ghost-button" onClick={() => setOpen(false)}>キャンセル</button></div>
        </div>
      </SimpleModal>
    </Layout>
  );
}

export function TodoView() {
  const { state, updateState } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", due: new Date().toISOString().slice(0, 10), priority: "中", detail: "" });
  const lanes = ["今日", "今週", "予定"];

  function addTodo() {
    if (!form.title.trim()) return;
    updateState((prev) => ({ ...prev, todos: [{ id: uid("t"), title: form.title, assignee: prev.currentUser, due: form.due, priority: form.priority, status: "今日", project: "個人", detail: form.detail }, ...prev.todos] }));
    setOpen(false);
    setForm({ title: "", due: new Date().toISOString().slice(0, 10), priority: "中", detail: "" });
  }

  return (
    <Layout title="ToDo管理" lead="担当者、期限、優先度、進捗を管理します。" actions={<button className="ghost-button" onClick={() => setOpen(true)}>タスク追加</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>{lanes.map((lane) => <section className="panel" key={lane}><div className="panel-title">{lane}</div>{state.todos.filter((t) => t.status === lane).map((t) => <motion.div key={t.id} whileHover={{ y: -2 }} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--soft)", marginBottom: 8 }}><strong>{t.title}</strong><div className="muted-text">{userName(state, t.assignee)} / {t.due}</div><div style={{ marginTop: 8 }}><Badge label={t.priority} /></div></motion.div>)}</section>)}</div>
      <SimpleModal open={open} onClose={() => setOpen(false)} title="タスク追加">
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="タスク名"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="期限"><input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} style={{ width: "100%" }} /></Field>
          <Field label="優先度"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: "100%" }}><option>高</option><option>中</option><option>低</option></select></Field>
          <Field label="詳細"><textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={3} style={{ width: "100%" }} /></Field>
          <div style={{ display: "flex", gap: 8 }}><button className="ghost-button" onClick={addTodo}>追加</button><button className="ghost-button" onClick={() => setOpen(false)}>キャンセル</button></div>
        </div>
      </SimpleModal>
    </Layout>
  );
}

export function MessagesView() {
  const { state, updateState } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ to: state.users[1]?.id ?? "", subject: "", body: "" });

  function addMessage() {
    if (!form.subject.trim()) return;
    updateState((prev) => ({ ...prev, messages: [{ id: uid("msg"), from: prev.currentUser, to: [form.to], subject: form.subject, body: form.body, date: new Date().toISOString().slice(0, 10), read: false }, ...prev.messages] }));
    setOpen(false);
    setForm({ to: state.users[1]?.id ?? "", subject: "", body: "" });
  }

  return (
    <Layout title="メッセージ機能" lead="個別・グループの会話を業務情報とつなげます。" actions={<button className="ghost-button" onClick={() => setOpen(true)}>新規メッセージ</button>}>
      <section className="panel"><div className="panel-title">メッセージ</div>{state.messages.length === 0 ? <Empty text="メッセージはまだありません。" /> : state.messages.map((m) => <Row key={m.id}><div style={{ flex: 1 }}><strong>{m.subject}</strong><br /><span className="muted-text">{userName(state, m.from)} / {m.date}</span></div><Badge label={m.read ? "確認済" : "未読"} /></Row>)}</section>
      <SimpleModal open={open} onClose={() => setOpen(false)} title="新規メッセージ"><div style={{ display: "grid", gap: 12 }}><Field label="宛先"><select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} style={{ width: "100%" }}>{state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field><Field label="件名"><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ width: "100%" }} /></Field><Field label="本文"><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} style={{ width: "100%" }} /></Field><div style={{ display: "flex", gap: 8 }}><button className="ghost-button" onClick={addMessage}>送信</button><button className="ghost-button" onClick={() => setOpen(false)}>キャンセル</button></div></div></SimpleModal>
    </Layout>
  );
}

export function AddressView() {
  const { state } = useApp();
  const entries = state.addresses.length ? state.addresses : state.users.map((u) => ({ ...u, mobile: "", id: u.id }));
  return <Layout title="アドレス帳" lead="社員と取引先の連絡先を確認します。" actions={<input placeholder="名前・部署で検索" />}><section className="panel"><div className="panel-title">連絡先</div>{entries.map((a) => <Row key={a.id}><span className="avatar">{a.name[0]}</span><div style={{ flex: 1 }}><strong>{a.name}</strong><br /><span className="muted-text">{a.dept} / {a.role} / 内線 {a.ext}</span></div><span className="muted-text">{a.email}</span></Row>)}</section></Layout>;
}

export function FilesView() {
  const { state } = useApp();
  return <Layout title="ファイル管理" lead="共有ファイル、版、フォルダを管理します。" actions={<button className="ghost-button">ファイル登録</button>}><section className="panel"><div className="panel-title">共有ファイル</div>{state.files.map((f) => <Row key={f.id}><div style={{ flex: 1 }}><strong>{f.name}</strong><br /><span className="muted-text">{f.folder} / {userName(state, f.owner)} / v{f.version}</span></div><span className="muted-text">{f.size}</span></Row>)}</section></Layout>;
}

export function FacilitiesView() {
  const { state } = useApp();
  return <Layout title="設備予約" lead="会議室、備品、車両の予約を確認します。" actions={<button className="ghost-button">予約追加</button>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>{state.facilities.map((f) => <section className="panel" key={f.id}><strong>{f.name}</strong><div className="muted-text" style={{ marginTop: 4 }}>定員 {f.capacity}名</div><div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>{f.equipment.map((e) => <Badge key={e} label={e} />)}</div><div style={{ marginTop: 12 }}>{state.reservations.filter((r) => r.facilityId === f.id).slice(0, 3).map((r) => <div className="muted-text" key={r.id}>{r.date} {r.start} {r.title}</div>)}</div></section>)}</div></Layout>;
}

export function TimecardView() {
  const { state, updateState } = useApp();
  const today = new Date().toISOString().slice(0, 10);
  const mine = state.timecards.find((t) => t.userId === state.currentUser && t.date === today);
  function punch(type: "in" | "out") {
    const now = new Date().toTimeString().slice(0, 5);
    updateState((prev) => {
      const existing = prev.timecards.find((t) => t.userId === prev.currentUser && t.date === today);
      if (!existing) return { ...prev, timecards: [{ id: uid("tc"), userId: prev.currentUser, date: today, clockIn: type === "in" ? now : undefined, clockOut: type === "out" ? now : undefined }, ...prev.timecards] };
      return { ...prev, timecards: prev.timecards.map((t) => t.id === existing.id ? { ...t, clockIn: type === "in" ? now : t.clockIn, clockOut: type === "out" ? now : t.clockOut } : t) };
    });
  }
  return <Layout title="タイムカード" lead="出退勤、休憩、残業見込みを確認します。" actions={<><button className="ghost-button" onClick={() => punch("in")}>出勤</button><button className="ghost-button" onClick={() => punch("out")}>退勤</button></>}><section className="panel"><div className="panel-title">本日の打刻</div><Row><div style={{ flex: 1 }}><strong>{userName(state, state.currentUser)}</strong><br /><span className="muted-text">{today}</span></div><span className="muted-text">出勤 {mine?.clockIn ?? "-"} / 退勤 {mine?.clockOut ?? "-"}</span></Row></section></Layout>;
}

export function AdminView() {
  const { state } = useApp();
  return <Layout title="組織・権限管理" lead="部署、役職、ロール、閲覧制御を確認します。" actions={<button className="ghost-button">ユーザー追加</button>}><section className="panel"><div className="panel-title">ユーザーと権限</div>{state.users.map((u) => <Row key={u.id}><span className="avatar">{u.name[0]}</span><div style={{ flex: 1 }}><strong>{u.name}</strong><br /><span className="muted-text">{u.dept} / {u.email}</span></div><Badge label={u.role} /></Row>)}</section></Layout>;
}

export function SpacesView() {
  return <Layout title="スペース" lead="案件・部門・チーム単位の作業場所です。" actions={<button className="ghost-button">スペース作成</button>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>{["営業案件", "採用サイト", "社内ポータル"].map((name) => <section className="panel" key={name}><strong>{name}</strong><p className="muted-text">掲示、予定、ファイル、ToDoをひとつの作業場所にまとめます。</p></section>)}</div></Layout>;
}

export function KnowledgeView() {
  return <Layout title="ナレッジ" lead="会議メモ、FAQ、文書を検索・整理します。" actions={<button className="ghost-button">記事作成</button>}><section className="panel"><div className="panel-title">よく使う文書</div>{["申請ルール", "会議メモテンプレート", "社内FAQ"].map((name) => <Row key={name}><div style={{ flex: 1 }}><strong>{name}</strong><br /><span className="muted-text">更新日 2026/06/19</span></div><Badge label="確認済" /></Row>)}</section></Layout>;
}

export function SearchView() {
  return <Layout title="検索" lead="業務データを横断検索します。" actions={<input placeholder="キーワード検索" />}><Empty text="検索キーワードを入力すると、メール・掲示板・ファイル・予定を横断して確認できます。" /></Layout>;
}
