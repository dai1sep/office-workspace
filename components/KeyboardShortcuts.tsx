"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/context";

const SHORTCUTS = [
  { key: "Ctrl+K", desc: "コマンド検索を開く" },
  { key: "B", desc: "サイドバーを折りたたむ" },
  { key: "D", desc: "ダークモード切替" },
  { key: "G → H", desc: "ホームへ移動" },
  { key: "G → T", desc: "ToDoへ移動" },
  { key: "G → S", desc: "スケジュールへ移動" },
  { key: "G → M", desc: "メールへ移動" },
  { key: "?", desc: "このヘルプを表示" },
];

export default function KeyboardShortcuts() {
  const { setView, toggleTheme, toggleSidebar } = useApp();
  const [showHelp, setShowHelp] = useState(false);
  const [gMode, setGMode] = useState(false);

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "?") { setShowHelp((value) => !value); return; }
      if (key === "escape") { setShowHelp(false); setGMode(false); return; }
      if (key === "b") { toggleSidebar(); return; }
      if (key === "d") { toggleTheme(); return; }
      if (key === "g") {
        setGMode(true);
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => setGMode(false), 1500);
        return;
      }

      if (gMode) {
        setGMode(false);
        if (gTimer) clearTimeout(gTimer);
        if (key === "h") setView("dashboard");
        if (key === "t") setView("todo");
        if (key === "s") setView("schedule");
        if (key === "m") setView("mail");
        if (key === "b") setView("bulletin");
        if (key === "w") setView("workflow");
        if (key === "f") setView("files");
        if (key === "a") setView("address");
        if (key === "p") setView("spaces");
        if (key === "k") setView("knowledge");
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [gMode, setView, toggleTheme, toggleSidebar]);

  return (
    <>
      <AnimatePresence>
        {gMode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9800, padding: "8px 18px", borderRadius: 10, background: "var(--text)", color: "#fff", boxShadow: "var(--shadow)", fontSize: 13 }}
          >
            次のキーで移動: H=ホーム T=ToDo S=スケジュール M=メール
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9700, display: "grid", placeItems: "center", padding: 18, background: "rgba(0,0,0,0.36)" }}
          >
            <motion.div className="panel" initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} style={{ width: 430, maxWidth: "94vw" }}>
              <strong style={{ display: "block", marginBottom: 14 }}>キーボードショートカット</strong>
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                  <span className="muted-text">{desc}</span>
                  <kbd style={{ border: "1px solid var(--line)", borderRadius: 5, background: "var(--soft)", padding: "2px 8px", fontSize: 11 }}>{key}</kbd>
                </div>
              ))}
              <div className="muted-text" style={{ marginTop: 14, textAlign: "center" }}>ESCで閉じます。</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
