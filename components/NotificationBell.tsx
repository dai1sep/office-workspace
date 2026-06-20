"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/context";
import { TODAY } from "@/lib/store";
import { ViewId } from "@/lib/types";

interface Notice {
  id: string;
  title: string;
  body: string;
  time: string;
  view: ViewId;
}

export default function NotificationBell() {
  const { state, currentUser, setView } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notices: Notice[] = [
    ...state.workflows
      .filter((w) => w.status === "申請中" || w.status === "承認待ち")
      .slice(0, 3)
      .map((w) => ({ id: `w-${w.id}`, title: "承認確認", body: w.title, time: w.date, view: "workflow" as ViewId })),
    ...state.bulletins
      .filter((b) => !b.read)
      .slice(0, 3)
      .map((b) => ({ id: `b-${b.id}`, title: "掲示板", body: b.title, time: b.date, view: "bulletin" as ViewId })),
    ...state.todos
      .filter((t) => t.due <= TODAY && t.assignee === (currentUser ?? ""))
      .slice(0, 3)
      .map((t) => ({ id: `t-${t.id}`, title: "ToDo期限", body: t.title, time: t.due, view: "todo" as ViewId })),
  ].slice(0, 8);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="ghost-button" onClick={() => setOpen((value) => !value)} aria-label="通知">
        <span>知</span>
        {notices.length > 0 && <span className="status red">{notices.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="floating-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ width: 320 }}>
            <div className="panel-title" style={{ margin: "4px 6px 8px" }}>
              通知
            </div>
            {notices.length === 0 ? (
              <div className="muted-text" style={{ padding: 10 }}>
                新しい通知はありません。
              </div>
            ) : (
              notices.map((notice) => (
                <button
                  key={notice.id}
                  onClick={() => {
                    setView(notice.view);
                    setOpen(false);
                  }}
                >
                  <strong>{notice.title}</strong>
                  <br />
                  <span className="muted-text">
                    {notice.body} / {notice.time}
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
