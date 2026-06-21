"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const NOTE_COLORS = ["#fbf1a4", "#bfe6d1", "#c8ddeb", "#f2c9d5", "#f3cfab"];

interface StickyNote {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

const SEED_NOTES: StickyNote[] = [
  { id: "bn1", text: "予定から会議メモを作成\n議事録、ToDo、ファイルへつなげる", color: "#fbf1a4", x: 54, y: 76 },
  { id: "bn2", text: "掲示板で全体共有\n承認済みの決定事項を流す", color: "#c8ddeb", x: 340, y: 92 },
  { id: "bn3", text: "承認待ちはホームへ集約\n期限が近い申請を見落とさない", color: "#f2c9d5", x: 200, y: 286 },
  { id: "bn4", text: "スペースを業務の中心に\n案件、掲示、ファイル、予定を紐付ける", color: "#bfe6d1", x: 530, y: 300 },
];

export default function CanvasView() {
  const [notes, setNotes] = useState<StickyNote[]>(SEED_NOTES);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [scale, setScale] = useState(1);

  function onPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    setDragging({ id, ox: e.clientX, oy: e.clientY });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = (e.clientX - dragging.ox) / scale;
    const dy = (e.clientY - dragging.oy) / scale;
    setNotes((prev) => prev.map((note) => note.id === dragging.id ? { ...note, x: note.x + dx, y: note.y + dy } : note));
    setDragging({ ...dragging, ox: e.clientX, oy: e.clientY });
  }

  function addNote() {
    const color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    setNotes((prev) => [...prev, {
      id: `bn${Date.now()}`,
      text: "新しいメモ",
      color,
      x: 120 + Math.random() * 260,
      y: 120 + Math.random() * 200,
    }]);
  }

  function updateText(id: string, text: string) {
    setNotes((prev) => prev.map((note) => note.id === id ? { ...note, text } : note));
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }

  return (
    <div className="canvas-view" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="panel canvas-toolbar" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button className="ghost-button" onClick={addNote} style={{ background: "var(--green)", color: "#fff", borderColor: "var(--green)" }}>付箋を追加</button>
        <button className="ghost-button" onClick={() => setScale((value) => Math.max(0.75, value - 0.1))}>縮小</button>
        <button className="ghost-button" onClick={() => setScale(1)}>100%</button>
        <button className="ghost-button" onClick={() => setScale((value) => Math.min(1.4, value + 0.1))}>拡大</button>
        <span className="muted-text">付箋はドラッグで移動、本文はクリックして編集できます。</span>
      </section>

      <div
        className="canvas-board"
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragging(null)}
        onPointerCancel={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
        style={{
          position: "relative",
          height: 600,
          overflow: "hidden",
          border: "1px solid var(--line)",
          borderRadius: 10,
          background: "var(--soft)",
          cursor: dragging ? "grabbing" : "default",
          touchAction: "none",
        }}
      >
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }}>
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--line)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="canvas-stage" style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              layout
              whileHover={{ y: -3, boxShadow: "var(--shadow)" }}
              style={{
                position: "absolute",
                left: note.x,
                top: note.y,
                width: 210,
                minHeight: 120,
                padding: 10,
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 9,
                background: note.color,
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                cursor: dragging?.id === note.id ? "grabbing" : "grab",
                userSelect: "none",
              }}
              onPointerDown={(e) => onPointerDown(e, note.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(0,0,0,0.48)" }}>MEMO</span>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => removeNote(note.id)}
                  style={{ border: 0, background: "transparent", color: "rgba(0,0,0,0.48)", fontSize: 18, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              <textarea
                value={note.text}
                onChange={(e) => updateText(note.id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  minHeight: 78,
                  border: 0,
                  padding: 0,
                  resize: "none",
                  background: "transparent",
                  color: "#24231f",
                  fontSize: 13,
                  lineHeight: 1.55,
                  boxShadow: "none",
                  cursor: "text",
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
