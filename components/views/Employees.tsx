"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import type { User } from "@/lib/types";
import { uid } from "@/lib/utils";

const ROLES = ["管理者", "部門管理者", "一般ユーザー"];

const emptyUser = (): User => ({ id: uid("u"), name: "", dept: "", role: "一般ユーザー", email: "", ext: "", employeeNo: "", title: "", phone: "", joinedDate: "", active: true });

export default function EmployeesView() {
  const { state, updateState, can, authMode, createLoginAccount } = useApp();
  const editable = can("admin");
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  // 編集中のユーザーが新規（まだstateに無い）かどうか
  const isNew = editing ? !state.users.some((x) => x.id === editing.id) : false;

  const depts = useMemo(() => [...new Set(state.users.map((u) => u.dept).filter(Boolean))], [state.users]);
  const visible = useMemo(() => state.users.filter((u) => {
    if (!showRetired && u.active === false) return false;
    if (deptFilter && u.dept !== deptFilter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${u.name} ${u.dept} ${u.title} ${u.role} ${u.email} ${u.ext} ${u.employeeNo}`.toLowerCase().includes(q);
  }), [state.users, query, deptFilter, showRetired]);

  const activeCount = state.users.filter((u) => u.active !== false).length;

  function openNew() { setEditing(emptyUser()); setPassword(""); setOpen(true); }
  function openEdit(u: User) { setEditing({ ...u }); setPassword(""); setOpen(true); }
  function patch(p: Partial<User>) { setEditing((prev) => prev ? { ...prev, ...p } : prev); }
  async function save() {
    if (!editing || !editing.name.trim()) return;
    const u = editing;
    // 新規 & Supabaseモード & メール+パスワードあり → ログインアカウントも同時作成
    if (isNew && authMode === "supabase" && u.email.trim() && password) {
      if (password.length < 6) { alert("パスワードは6文字以上にしてください。"); return; }
      setSaving(true);
      const { error } = await createLoginAccount(u.email.trim(), password);
      setSaving(false);
      if (error) {
        alert("ログインアカウントの作成に失敗しました：\n" + error + "\n\n（同じメールが既に登録済み、または Supabase の設定をご確認ください）");
        return;
      }
    }
    updateState((prev) => ({ ...prev, users: prev.users.some((x) => x.id === u.id) ? prev.users.map((x) => x.id === u.id ? u : x) : [...prev.users, u] }));
    setPassword("");
    setOpen(false);
  }
  function remove(id: string) {
    if (!confirm("この社員を削除しますか？（関連データの表示に影響する場合があります）")) return;
    updateState((prev) => ({ ...prev, users: prev.users.filter((x) => x.id !== id) }));
  }
  function toggleActive(u: User) {
    updateState((prev) => ({ ...prev, users: prev.users.map((x) => x.id === u.id ? { ...x, active: x.active === false ? true : false } : x) }));
  }

  const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 5 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="panel" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="氏名・部署・社員番号で検索" style={{ minWidth: 220, flex: 1 }} />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}><option value="">全部署</option>{depts.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />退職者も表示</label>
        {editable && <button className="ghost-button" onClick={openNew} style={{ background: "var(--green)", color: "white" }}>社員を追加</button>}
      </section>

      <motion.section className="panel" key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="panel-title">社員一覧 <span className="muted-text">在籍 {activeCount}名 / 表示 {visible.length}名</span></div>
        {visible.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center" }}>該当する社員はいません。</div>}
        {visible.map((u) => (
          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "12px 4px", borderBottom: "1px solid var(--line)", opacity: u.active === false ? 0.55 : 1 }}>
            <span className="avatar">{u.name[0] ?? "?"}</span>
            <div style={{ minWidth: 0 }}>
              <strong>{u.name}</strong>{u.title && <span className="muted-text"> / {u.title}</span>}{u.active === false && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--soft)", color: "var(--muted)" }}>退職</span>}
              <div className="muted-text" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.dept || "部署未設定"} / {u.role}{u.employeeNo ? ` / No.${u.employeeNo}` : ""} / 内線 {u.ext || "-"}{u.email ? ` / ${u.email}` : ""}</div>
            </div>
            {editable && <div style={{ display: "flex", gap: 6 }}>
              <button className="ghost-button" onClick={() => openEdit(u)}>編集</button>
              <button className="ghost-button" onClick={() => toggleActive(u)}>{u.active === false ? "復帰" : "退職"}</button>
              <button className="ghost-button" onClick={() => remove(u.id)} style={{ color: "#a33" }}>削除</button>
            </div>}
          </div>
        ))}
      </motion.section>

      <Modal open={open} onClose={() => setOpen(false)} title="社員情報" width={620}>
        {editing && <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>氏名<input style={inputStyle} value={editing.name} onChange={(e) => patch({ name: e.target.value })} /></label>
            <label>社員番号<input style={inputStyle} value={editing.employeeNo ?? ""} onChange={(e) => patch({ employeeNo: e.target.value })} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>部署<input style={inputStyle} value={editing.dept} onChange={(e) => patch({ dept: e.target.value })} /></label>
            <label>役職<input style={inputStyle} value={editing.title ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder="部長・主任 など" /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>権限ロール<select style={inputStyle} value={editing.role} onChange={(e) => patch({ role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label>入社日<input type="date" style={inputStyle} value={editing.joinedDate ?? ""} onChange={(e) => patch({ joinedDate: e.target.value })} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label>メール<input style={inputStyle} value={editing.email} onChange={(e) => patch({ email: e.target.value })} /></label>
            <label>内線<input style={inputStyle} value={editing.ext} onChange={(e) => patch({ ext: e.target.value })} /></label>
            <label>携帯・連絡先<input style={inputStyle} value={editing.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} /></label>
          </div>
          <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={editing.active !== false} onChange={(e) => patch({ active: e.target.checked })} />在籍中</label>

          {isNew && authMode === "supabase" && (
            <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, background: "var(--soft)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>ログインアカウントも作成する（任意）</div>
              <p className="muted-text" style={{ margin: "0 0 8px", fontSize: 11.5, lineHeight: 1.7 }}>
                上の<strong>メール</strong>と、下の<strong>初期パスワード</strong>を入れて保存すると、この社員が<strong>メール＋パスワードでログイン</strong>できるようになります。<br />
                空欄なら社員データだけ登録します（ログインは後で作成可）。
              </p>
              <label>初期パスワード（6文字以上）
                <input style={inputStyle} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="例）本人に伝えるパスワード" autoComplete="new-password" />
              </label>
              {!editing.email.trim() && password && <div style={{ color: "#a33", fontSize: 11.5, marginTop: 4 }}>メールを入力してください（ログインIDになります）。</div>}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="ghost-button" onClick={save} disabled={!editing.name.trim() || saving} style={{ background: "var(--green)", color: "white" }}>{saving ? "作成中…" : "保存する"}</button></div>
        </div>}
      </Modal>
    </div>
  );
}
