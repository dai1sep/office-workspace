"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  label: string;
  icon?: string;
  action: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface Props {
  items: MenuItem[];
  children: ReactNode;
}

export default function ContextMenu({ items, children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function onContext(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPos({ x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    function close() { setPos(null); }
    if (pos) {
      window.addEventListener("click", close);
      window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    }
    return () => window.removeEventListener("click", close);
  }, [pos]);

  // ビューポートからはみ出さないよう調整
  const menuWidth = 200;
  const menuHeight = items.length * 36 + 16;
  const adjustedX = pos ? Math.min(pos.x, window.innerWidth - menuWidth - 8) : 0;
  const adjustedY = pos ? Math.min(pos.y, window.innerHeight - menuHeight - 8) : 0;

  return (
    <div ref={ref} onContextMenu={onContext} style={{ display: "contents" }}>
      {children}
      <AnimatePresence>
        {pos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.1 }}
            style={{
              position: "fixed",
              left: adjustedX,
              top: adjustedY,
              zIndex: 9500,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              boxShadow: "var(--shadow)",
              width: menuWidth,
              padding: "6px 0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, i) =>
              item.divider ? (
                <div key={i} style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
              ) : (
                <button
                  key={i}
                  onClick={() => { item.action(); setPos(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "7px 14px",
                    background: "none", border: "none", textAlign: "left",
                    cursor: "pointer", fontSize: 13,
                    color: item.danger ? "var(--red)" : "var(--text)",
                    transition: "background 0.08s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--soft)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  {item.icon && <span style={{ fontSize: 14, width: 18, textAlign: "center", color: item.danger ? "var(--red)" : "var(--muted)" }}>{item.icon}</span>}
                  {item.label}
                </button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
