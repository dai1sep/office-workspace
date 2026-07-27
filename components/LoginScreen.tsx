"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";

export default function LoginScreen() {
  const { state, login, authMode, signInWithEmail, authUnlinked, logout } = useApp();

  // 認証は成功したが社員データにメールが一致しない場合の案内
  if (authUnlinked) {
    return (
      <Shell subtitle="アカウントが社員データに紐付いていません">
        <p className="muted-text" style={{ fontSize: 13, lineHeight: 1.8, margin: "0 0 18px" }}>
          ログインには成功しましたが、このメールアドレスが社員データに登録されていません。<br />
          管理者に連絡し、<strong>社員管理</strong>であなたのメールアドレスを登録してもらってください。
        </p>
        <button type="button" onClick={logout} style={primaryBtn(true)}>別のアカウントでログイン</button>
      </Shell>
    );
  }

  if (authMode === "supabase") return <EmailLogin signIn={signInWithEmail} />;

  // ── ローカルモード（Supabase未設定）: ユーザー選択 ──
  return <PickerLogin users={state.users} onLogin={login} />;
}

function EmailLogin({ signIn }: { signIn: (e: string, p: string) => Promise<{ error: string | null }> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(translateAuthError(error));
  }

  return (
    <Shell subtitle="メールアドレスとパスワードでログインしてください。">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 13 }}>
          メールアドレス
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username"
            style={inputStyle} placeholder="you@company.co.jp"
          />
        </label>
        <label style={{ fontSize: 13 }}>
          パスワード
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            style={inputStyle} placeholder="••••••••"
          />
        </label>
        {error && <div style={{ color: "var(--red, #c0392b)", fontSize: 12.5 }}>{error}</div>}
        <button type="submit" disabled={busy || !email || !password} style={primaryBtn(!busy && !!email && !!password)}>
          {busy ? "確認中…" : "ログイン"}
        </button>
      </form>
    </Shell>
  );
}

function PickerLogin({ users, onLogin }: { users: { id: string; name: string; dept: string; role: string }[]; onLogin: (id: string) => void }) {
  const [selected, setSelected] = useState<string>(users[0]?.id ?? "");
  const selectedUser = users.find((u) => u.id === selected);
  return (
    <Shell subtitle="利用するユーザーを選択してください。">
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
        {users.map((user) => {
          const active = selected === user.id;
          return (
            <button
              key={user.id} type="button" onClick={() => setSelected(user.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                border: `1px solid ${active ? "var(--green)" : "var(--line)"}`, borderRadius: 10,
                background: active ? "var(--soft)" : "var(--panel)", textAlign: "left",
              }}
            >
              <span className="avatar">{user.name[0]}</span>
              <span style={{ flex: 1 }}><strong>{user.name}</strong><br /><span className="muted-text">{user.dept} / {user.role}</span></span>
              {active && <span style={{ color: "var(--green)", fontWeight: 800 }}>選択中</span>}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => selected && onLogin(selected)} disabled={!selectedUser} style={primaryBtn(!!selectedUser)}>
        ログイン
      </button>
    </Shell>
  );
}

function Shell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div className="login-screen" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="panel login-panel" style={{ width: "100%", maxWidth: 460, padding: 34 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="view-icon" style={{ margin: "0 auto 10px" }}>家</div>
          <h1 style={{ margin: 0, fontSize: 21 }}>Office Workspace</h1>
          <p className="muted-text" style={{ margin: "6px 0 0" }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: 5, minHeight: 42, padding: "0 12px",
  border: "1px solid var(--line)", borderRadius: 10, background: "var(--panel)", color: "var(--text)", fontSize: 14,
};

function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    width: "100%", minHeight: 44, border: 0, borderRadius: 10, marginTop: 6,
    background: enabled ? "var(--green)" : "var(--line)", color: enabled ? "#fff" : "var(--muted)", fontWeight: 800,
    cursor: enabled ? "pointer" : "default",
  };
}

function translateAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "メールアドレスまたはパスワードが違います。";
  if (/email not confirmed/i.test(msg)) return "メールが未確認です。管理者に確認済みユーザーの作成を依頼してください。";
  return msg;
}
