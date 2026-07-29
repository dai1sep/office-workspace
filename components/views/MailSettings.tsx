"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import { getAccessToken } from "@/lib/supabase";

// メール(SMTP)設定画面。管理者のみ。パスワードはサーバーに保存され、画面には戻さない（設定済み表示のみ）。
export default function MailSettings() {
  const { can, authMode } = useApp();
  const isAdmin = can("admin");
  const [form, setForm] = useState({ host: "", port: 587, secure: false, username: "", from_addr: "", password: "" });
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isAdmin || authMode !== "supabase") { setLoading(false); return; }
    (async () => {
      const token = await getAccessToken();
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch("/api/settings/smtp", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) {
          setForm((f) => ({ ...f, host: data.host ?? "", port: data.port ?? 587, secure: !!data.secure, username: data.username ?? "", from_addr: data.from_addr ?? "" }));
          setHasPassword(!!data.hasPassword);
        }
      } catch { /* noop */ }
      setLoading(false);
    })();
  }, [isAdmin, authMode]);

  if (!isAdmin) return null;

  async function save() {
    setMsg(null);
    if (authMode !== "supabase") { setMsg({ ok: false, text: "本番（メールログイン）環境でのみ設定できます。" }); return; }
    if (!form.host.trim() || !form.username.trim()) { setMsg({ ok: false, text: "SMTPホストとユーザー名は必須です。" }); return; }
    if (!hasPassword && !form.password) { setMsg({ ok: false, text: "初回はパスワードの入力が必要です。" }); return; }
    const token = await getAccessToken();
    if (!token) { setMsg({ ok: false, text: "ログイン状態を確認できませんでした。" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) { setMsg({ ok: false, text: data.error || "保存に失敗しました。" }); return; }
      setHasPassword(hasPassword || !!form.password);
      setForm((f) => ({ ...f, password: "" }));
      setMsg({ ok: true, text: "保存しました。メール管理の「新規メール」から送信できます。" });
    } catch (e) {
      setSaving(false);
      setMsg({ ok: false, text: "保存中にエラー: " + (e instanceof Error ? e.message : String(e)) });
    }
  }

  const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 5 };

  return (
    <section className="panel">
      <div className="panel-title">メール設定（SMTP）</div>
      <p className="muted-text" style={{ margin: "0 0 12px", fontSize: 12.5, lineHeight: 1.7 }}>
        送信メールサーバーの情報を設定します（管理者のみ）。パスワードは<strong>サーバー内に安全に保管</strong>され、画面には表示されません。<br />
        サイボウズ等の「メールサーバー設定」と同じ値を入れてください。
        {authMode !== "supabase" && <><br /><strong style={{ color: "var(--danger,#c0392b)" }}>※ 本番（メールログイン）環境でのみ利用できます。</strong></>}
      </p>

      {loading ? <div className="muted-text">読み込み中…</div> : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <label>SMTPホスト<input style={inputStyle} value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="mail.example.ne.jp" /></label>
            <label>ポート<input style={inputStyle} type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} /></label>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>暗号化(SSL)
              <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 9, fontSize: 13 }}>
                <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} />465番はON / 587番はOFF
              </label>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>ユーザー名（アカウント）<input style={inputStyle} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="info@dkk.co.jp" /></label>
            <label>差出人アドレス（From）<input style={inputStyle} value={form.from_addr} onChange={(e) => setForm({ ...form, from_addr: e.target.value })} placeholder="info@dkk.co.jp" /></label>
          </div>
          <label>パスワード{hasPassword && <span className="status green" style={{ marginLeft: 8, fontSize: 11 }}>設定済み</span>}
            <input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={hasPassword ? "変更する場合のみ入力" : "メールのパスワード"} autoComplete="new-password" />
          </label>
          {msg && <div style={{ fontSize: 12.5, color: msg.ok ? "var(--green,#2e7d32)" : "var(--danger,#c0392b)" }}>{msg.text}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="ghost-button" onClick={save} disabled={saving} style={{ background: "var(--green)", color: "#fff" }}>{saving ? "保存中…" : "保存する"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
