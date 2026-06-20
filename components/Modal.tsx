"use client";

import { ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
}

export default function Modal({ open, onClose, title, children, width = 480 }: Props) {
  const drawer = title?.includes("詳細") ?? false;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 8000,
            display: "flex",
            alignItems: drawer ? "stretch" : "center",
            justifyContent: drawer ? "flex-end" : "center",
            padding: drawer ? 0 : 18,
            background: "rgba(0,0,0,0.38)",
            backdropFilter: "blur(5px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={drawer ? { x: "100%" } : { opacity: 0, scale: 0.96, y: 18 }}
            animate={drawer ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={drawer ? { x: "100%" } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={drawer ? { type: "spring", stiffness: 380, damping: 38, mass: 0.8 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              width,
              maxWidth: drawer ? "min(94vw, 760px)" : "min(94vw, 760px)",
              height: drawer ? "100vh" : undefined,
              maxHeight: drawer ? "100vh" : "88vh",
              overflowY: "auto",
              padding: 24,
              border: "1px solid var(--line)",
              borderRadius: drawer ? 0 : 12,
              background: "var(--panel)",
              boxShadow: "var(--shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <strong style={{ fontSize: 16 }}>{title}</strong>
                <button className="icon-button" onClick={onClose} aria-label="閉じる">×</button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
