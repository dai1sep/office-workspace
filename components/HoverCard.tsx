"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  children: ReactNode;
  content: ReactNode;
  delay?: number;
}

export default function HoverCard({ children, content, delay = 240 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, above: false });

  useEffect(() => setMounted(true), []);
  function show() {
    timer.current = setTimeout(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(340, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const above = window.innerHeight - rect.bottom < 210 && rect.top > 210;
      setPosition({ left, top: above ? rect.top - 8 : rect.bottom + 8, above });
      setOpen(true);
    }, delay);
  }
  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  }

  return (
    <div ref={ref} onMouseEnter={show} onMouseLeave={hide} style={{ display: "block", width: "100%" }}>
      {children}
      {mounted && createPortal(
        <AnimatePresence>
          {open && <motion.div
            initial={{ opacity: 0, y: position.above ? 7 : -7, scale: .98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position.above ? 4 : -4, scale: .985 }}
            transition={{ duration: .14, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ position: "fixed", left: position.left, top: position.top, transform: position.above ? "translateY(-100%)" : undefined, zIndex: 7900, width: 340, maxWidth: "calc(100vw - 24px)", pointerEvents: "none", padding: 14, border: "1px solid var(--line)", borderRadius: 8, background: "var(--panel)", color: "var(--text)", boxShadow: "0 18px 44px rgba(0,0,0,.18)" }}
          >{content}</motion.div>}
        </AnimatePresence>, document.body,
      )}
    </div>
  );
}
