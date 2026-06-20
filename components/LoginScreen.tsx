"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";

export default function LoginScreen() {
  const { state, login } = useApp();
  const [selected, setSelected] = useState<string>(state.users[0]?.id ?? "");
  const selectedUser = state.users.find((user) => user.id === selected);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <div className="panel" style={{ width: "100%", maxWidth: 460, padding: 34 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="view-icon" style={{ margin: "0 auto 10px" }}>
            家
          </div>
          <h1 style={{ margin: 0, fontSize: 21 }}>Office Workspace</h1>
          <p className="muted-text" style={{ margin: "6px 0 0" }}>
            利用するユーザーを選択してください。
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {state.users.map((user) => {
            const active = selected === user.id;
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelected(user.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  border: `1px solid ${active ? "var(--green)" : "var(--line)"}`,
                  borderRadius: 10,
                  background: active ? "var(--soft)" : "var(--panel)",
                  textAlign: "left",
                }}
              >
                <span className="avatar">{user.name[0]}</span>
                <span style={{ flex: 1 }}>
                  <strong>{user.name}</strong>
                  <br />
                  <span className="muted-text">
                    {user.dept} / {user.role}
                  </span>
                </span>
                {active && <span style={{ color: "var(--green)", fontWeight: 800 }}>選択中</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => selected && login(selected)}
          disabled={!selectedUser}
          style={{
            width: "100%",
            minHeight: 44,
            border: 0,
            borderRadius: 10,
            background: selectedUser ? "var(--green)" : "var(--line)",
            color: selectedUser ? "#fff" : "var(--muted)",
            fontWeight: 800,
          }}
        >
          ログイン
        </button>
      </div>
    </div>
  );
}
