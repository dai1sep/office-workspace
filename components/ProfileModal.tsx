"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import Modal from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: Props) {
  const { state, currentUser, updateState } = useApp();
  const me = state.users.find((u) => u.id === currentUser);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: "", dept: "", email: "", ext: "" });

  useEffect(() => {
    if (!me || !open) return;
    setForm({ name: me.name, dept: me.dept, email: me.email, ext: me.ext });
  }, [me, open]);

  if (!me) return null;

  function save() {
    updateState((prev) => ({
      ...prev,
      users: prev.users.map((user) => user.id === currentUser ? { ...user, ...form } : user),
    }));
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  return (
    <Modal open={open} onClose={onClose} title="プロフィール編集" width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="avatar" style={{ width: 54, height: 54, fontSize: 20 }}>{form.name[0] || me.name[0]}</span>
          <div>
            <strong>{form.name || me.name}</strong>
            <div className="muted-text">{me.role}</div>
          </div>
        </div>

        {[
          { key: "name", label: "氏名", placeholder: "山田 太郎" },
          { key: "dept", label: "部署", placeholder: "営業部" },
          { key: "email", label: "メール", placeholder: "yamada@example.com", type: "email" },
          { key: "ext", label: "内線番号", placeholder: "1234" },
        ].map(({ key, label, placeholder, type = "text" }) => (
          <label key={key} style={{ display: "block", fontSize: 13 }}>
            {label}
            <input
              type={type}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{ display: "block", width: "100%", marginTop: 5 }}
            />
          </label>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button className="ghost-button" onClick={onClose}>キャンセル</button>
          <motion.button className="ghost-button" whileTap={{ scale: 0.98 }} onClick={save} style={{ background: saved ? "var(--green)" : "var(--accent)", color: "#fff", borderColor: "transparent" }}>
            {saved ? "保存しました" : "保存"}
          </motion.button>
        </div>
      </div>
    </Modal>
  );
}
