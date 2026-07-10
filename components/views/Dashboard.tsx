"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useApp } from "@/lib/context";
import { TODAY } from "@/lib/store";
import { Schedule } from "@/lib/types";
import { isWorkflowPendingFor, userName, scheduleOccursOn, userSeesSchedule } from "@/lib/utils";

// ── Slack-style ping dot ─────────────────────────────────────────────────────
function PingDot({ color = "#e53e3e" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10, flexShrink: 0 }}>
      <motion.span
        animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.4, ease: "easeOut" }}
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }}
      />
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "block", position: "relative" }} />
    </span>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
const METRIC_COLORS: Record<string, { accent: string; bg: string; pingColor: string }> = {
  メール:   { accent: "#3b82f6", bg: "#eff6ff", pingColor: "#3b82f6" },
  予定:     { accent: "#10b981", bg: "#f0fdf4", pingColor: "#10b981" },
  承認:     { accent: "#f59e0b", bg: "#fffbeb", pingColor: "#f59e0b" },
  ToDo:     { accent: "#ef4444", bg: "#fef2f2", pingColor: "#ef4444" },
};

function MetricCard({ title, value, sub, label, onClick }: {
  title: string; value: number; sub: string; label: string; onClick: () => void;
}) {
  const c = METRIC_COLORS[label] ?? { accent: "#6b7280", bg: "var(--soft)", pingColor: "#6b7280" };
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3, boxShadow: `0 8px 24px ${c.accent}28` }}
      whileTap={{ scale: 0.98 }}
      style={{
        textAlign: "left", width: "100%", border: "none", cursor: "pointer",
        borderRadius: 12, padding: 0, overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,.08)",
        background: "var(--panel)",
      }}
    >
      <div style={{ height: 3, background: c.accent }} />
      <div style={{ padding: "14px 16px 16px", background: "var(--panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{title}</span>
          {value > 0 && <PingDot color={c.pingColor} />}
        </div>
        <strong style={{ display: "block", fontSize: 34, lineHeight: 1, color: value > 0 ? c.accent : "var(--text)" }}>
          {value}
        </strong>
        <span style={{ display: "block", color: "var(--muted)", fontSize: 11, marginTop: 5 }}>{sub}</span>
      </div>
    </motion.button>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ title, badge, accent = "#3b82f6", action }: {
  title: string; badge?: number; accent?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 16, borderRadius: 2, background: accent, display: "block" }} />
        <strong style={{ fontSize: 13 }}>{title}</strong>
        {badge != null && badge > 0 && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: accent, color: "#fff" }}
          >
            {badge}
          </motion.span>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Accent item row ───────────────────────────────────────────────────────────
function AccentRow({ accent = "#e5e7eb", onClick, children }: {
  accent?: string; onClick?: () => void; children: React.ReactNode;
}) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: 2, backgroundColor: "var(--soft)" }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 10px", borderRadius: 8, marginBottom: 6,
        background: "var(--panel)", border: "1px solid var(--line)",
        cursor: onClick ? "pointer" : "default",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Priority color ────────────────────────────────────────────────────────────
function priorityColor(p: string) {
  return p === "高" ? "#ef4444" : p === "中" ? "#f59e0b" : "#10b981";
}
function statusAccent(s: string) {
  if (s === "申請中") return "#3b82f6";
  if (s === "承認待ち" || s === "確認中") return "#f59e0b";
  if (s === "承認済") return "#10b981";
  if (s === "却下" || s === "差し戻し") return "#ef4444";
  return "#6b7280";
}

// ── Employee schedule card ────────────────────────────────────────────────────
function EmployeeSchedule({ item }: { item: Schedule & { memberNames: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <motion.div
        whileHover={{ y: -2, boxShadow: "0 6px 18px rgba(0,0,0,.1)" }}
        style={{
          padding: "10px 12px", borderRadius: 10, background: "var(--panel)",
          border: "1px solid var(--line)", borderTop: "3px solid #3b82f6",
          cursor: "pointer", minHeight: 68,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
          <strong style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</strong>
          <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{item.start}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.memberNames}</div>
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            style={{
              position: "absolute", zIndex: 20, left: 0, top: "calc(100% + 6px)",
              width: 260, padding: 14, borderRadius: 10,
              background: "var(--panel)", boxShadow: "0 8px 28px rgba(0,0,0,.15)",
              border: "1px solid var(--line)",
            }}
          >
            <strong style={{ fontSize: 13 }}>{item.title}</strong>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 5 }}>{item.start}–{item.end} / {item.location || "場所未定"}</div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{item.memberNames}</div>
            {item.detail && <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.6 }}>{item.detail}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Stagger list wrapper ──────────────────────────────────────────────────────
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const itemVariants = { hidden: { opacity: 0, y: 7 }, show: { opacity: 1, y: 0, transition: { duration: 0.18 } } };

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtDay(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;
}

// ── ウィジェット定義とレイアウト永続化 ─────────────────────────────────────────
type WidgetId = "metrics" | "employeeSchedules" | "weekly" | "bulletin" | "todo" | "workflow";

const WIDGET_META: Record<WidgetId, { label: string; span: number }> = {
  metrics:           { label: "サマリー指標", span: 12 },
  employeeSchedules: { label: "本日の社員スケジュール", span: 12 },
  weekly:            { label: "週間スケジュール", span: 12 },
  bulletin:          { label: "掲示板 新着", span: 4 },
  todo:              { label: "ToDo 期限", span: 4 },
  workflow:          { label: "ワークフロー", span: 4 },
};
const DEFAULT_ORDER: WidgetId[] = ["metrics", "employeeSchedules", "weekly", "bulletin", "todo", "workflow"];
const ALL_IDS = new Set(DEFAULT_ORDER);

type Layout = { order: WidgetId[]; hidden: WidgetId[] };

function normalizeLayout(saved: Partial<Layout> | null): Layout {
  const order: WidgetId[] = [];
  (saved?.order ?? []).forEach((id) => {
    if (ALL_IDS.has(id as WidgetId) && !order.includes(id as WidgetId)) order.push(id as WidgetId);
  });
  DEFAULT_ORDER.forEach((id) => { if (!order.includes(id)) order.push(id); });
  const hidden = (saved?.hidden ?? []).filter((id): id is WidgetId => ALL_IDS.has(id as WidgetId));
  return { order, hidden };
}

function layoutKey(userId: string) {
  return `ow-dashboard-${userId}`;
}
function loadLayout(userId: string): Layout {
  if (typeof window === "undefined") return { order: [...DEFAULT_ORDER], hidden: [] };
  try {
    const raw = localStorage.getItem(layoutKey(userId));
    return normalizeLayout(raw ? JSON.parse(raw) : null);
  } catch {
    return { order: [...DEFAULT_ORDER], hidden: [] };
  }
}

// ── Sortable ラッパー ─────────────────────────────────────────────────────────
function SortableWidget({ id, span, editing, onHide, children }: {
  id: WidgetId; span: number; editing: boolean; onHide: () => void; children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editing });
  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `span ${span}`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        position: "relative",
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      {editing && (
        <div style={{ position: "absolute", top: 6, right: 6, zIndex: 8, display: "flex", gap: 6 }}>
          <button
            {...attributes}
            {...listeners}
            aria-label="ドラッグで移動"
            style={{ cursor: "grab", touchAction: "none", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, border: "1px solid var(--green)", background: "var(--green)", color: "#fff" }}
          >
            ⠿ 移動
          </button>
          <button
            onClick={onHide}
            aria-label="このウィジェットを非表示"
            style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--muted)" }}
          >
            非表示
          </button>
        </div>
      )}
      <div style={{ pointerEvents: editing ? "none" : "auto", outline: editing ? "2px dashed var(--green)" : "none", outlineOffset: 2, borderRadius: 12 }}>
        {children}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state, setView } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const me = state.currentUser;

  const [layout, setLayout] = useState<Layout>(() => loadLayout(me));
  // ユーザー切替時はレンダー中に読み直す（Reactが推奨する派生state更新パターン）
  const [layoutUser, setLayoutUser] = useState(me);
  if (layoutUser !== me) {
    setLayoutUser(me);
    setLayout(loadLayout(me));
  }
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(layoutKey(me), JSON.stringify(layout)); } catch { /* ignore */ }
  }, [layout, me]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const unreadMails      = state.mails.filter((m) => !m.read);
  const unreadBulletins  = state.bulletins.filter((b) => !b.read && !b.draft);
  const pendingWorkflows = state.workflows.filter((w) => isWorkflowPendingFor(w, me));
  const todayTodos       = state.todos.filter((t) => t.due <= TODAY && t.status !== "完了");
  const todaySchedules   = state.schedules.filter((s) => scheduleOccursOn(s, TODAY)).sort((a, b) => a.start.localeCompare(b.start));
  const employeeSchedules = todaySchedules.filter((s) => s.members.length > 0).map((s) => ({ ...s, memberNames: s.members.map((id) => userName(state, id)).join("、") }));
  const visibleSchedules  = employeeSchedules.slice(0, 5);
  const hiddenSchedules   = employeeSchedules.slice(5);
  const weekDays          = Array.from({ length: 5 }, (_, i) => addDays(TODAY, i));

  const hiddenSet = new Set(layout.hidden);
  const visibleOrder = layout.order.filter((id) => !hiddenSet.has(id));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLayout((prev) => {
      const from = prev.order.indexOf(active.id as WidgetId);
      const to = prev.order.indexOf(over.id as WidgetId);
      if (from < 0 || to < 0) return prev;
      return { ...prev, order: arrayMove(prev.order, from, to) };
    });
  }
  function hideWidget(id: WidgetId) {
    setLayout((prev) => ({ ...prev, hidden: [...prev.hidden, id] }));
  }
  function showWidget(id: WidgetId) {
    setLayout((prev) => ({ ...prev, hidden: prev.hidden.filter((h) => h !== id) }));
  }
  function resetLayout() {
    setLayout({ order: [...DEFAULT_ORDER], hidden: [] });
  }

  function renderWidget(id: WidgetId): React.ReactNode {
    switch (id) {
      case "metrics":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
            {[
              { title: "未読メール", value: unreadMails.length, sub: "確認と返信待ち", label: "メール", view: "mail" as const },
              { title: "今日の予定", value: todaySchedules.length, sub: "会議・外出・作業", label: "予定", view: "schedule" as const },
              { title: "承認待ち",   value: pendingWorkflows.length, sub: "申請の確認中", label: "承認", view: "workflow" as const },
              { title: "期限ToDo",  value: todayTodos.length, sub: "本日までのタスク", label: "ToDo", view: "todo" as const },
            ].map((m) => (
              <MetricCard key={m.label} {...m} onClick={() => setView(m.view)} />
            ))}
          </div>
        );

      case "employeeSchedules":
        return (
          <section className="panel" style={{ borderRadius: 12 }}>
            <SectionHead title="本日の社員スケジュール" badge={employeeSchedules.length} accent="#3b82f6" />
            {employeeSchedules.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0", textAlign: "center" }}>本日の社員スケジュールはありません</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
                  {visibleSchedules.map((item) => <EmployeeSchedule key={item.id} item={item} />)}
                </div>
                {hiddenSchedules.length > 0 && (
                  <div style={{ position: "relative", marginTop: 8 }} onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
                    <button onClick={() => setMoreOpen((v) => !v)} style={{ border: 0, background: "transparent", color: "var(--blue)", fontSize: 12, fontWeight: 700, padding: 0, cursor: "pointer" }}>
                      さらに {hiddenSchedules.length}件 ▾
                    </button>
                    <AnimatePresence>
                      {moreOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                          style={{ position: "absolute", zIndex: 10, left: 0, top: "calc(100% + 6px)", width: "100%", padding: 12, borderRadius: 10, background: "var(--panel)", boxShadow: "0 8px 28px rgba(0,0,0,.12)", border: "1px solid var(--line)" }}
                        >
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
                            {hiddenSchedules.map((item) => <EmployeeSchedule key={item.id} item={item} />)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </section>
        );

      case "weekly":
        return (
          <section className="panel" style={{ borderRadius: 12 }}>
            <SectionHead title="週間スケジュール" accent="#10b981" action={<span style={{ fontSize: 11, color: "var(--muted)" }}>{TODAY} から5日間</span>} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
              {weekDays.map((day) => {
                const items    = state.schedules.filter((s) => scheduleOccursOn(s, day) && userSeesSchedule(s, me, state.workspaces));
                const dueTodos = state.todos.filter((t) => t.due === day && t.assignee === me && t.status !== "完了");
                const isToday  = day === TODAY;
                return (
                  <div key={day} style={{ padding: 10, borderRadius: 10, border: `1.5px solid ${isToday ? "#3b82f6" : "var(--line)"}`, background: isToday ? "#eff6ff" : "var(--panel)", minHeight: 110 }}>
                    <strong style={{ fontSize: 11, display: "block", marginBottom: 7, color: isToday ? "#1d4ed8" : "var(--text)" }}>{fmtDay(day)}</strong>
                    {items.length === 0 && dueTodos.length === 0
                      ? <span style={{ fontSize: 11, color: "var(--muted)" }}>予定なし</span>
                      : <>
                          {items.map((s) => (
                            <div key={s.id} style={{ marginBottom: 4, padding: "4px 7px", borderRadius: 6, background: "var(--panel)", border: "1px solid var(--line)", fontSize: 11, borderLeft: "3px solid #3b82f6" }}>
                              <span style={{ color: "var(--muted)", marginRight: 4 }}>{s.start}</span>{s.title}
                            </div>
                          ))}
                          {dueTodos.map((t) => (
                            <div key={t.id} onClick={() => setView("todo")} style={{ marginBottom: 4, padding: "4px 7px", borderRadius: 6, background: "#fff8e1", border: "1px dashed #f59e0b", fontSize: 11, cursor: "pointer", borderLeft: "3px solid #f59e0b" }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#b45309", marginRight: 3 }}>期限</span>{t.title}
                            </div>
                          ))}
                        </>
                    }
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "bulletin":
        return (
          <section className="panel" style={{ borderRadius: 12 }}>
            <SectionHead
              title="掲示板 新着"
              badge={unreadBulletins.length}
              accent="#ef4444"
              action={<button onClick={() => setView("bulletin")} style={{ border: 0, background: "transparent", color: "var(--blue)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>すべて見る</button>}
            />
            {unreadBulletins.length === 0
              ? <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0", textAlign: "center" }}>新着はありません</div>
              : <motion.div variants={listVariants} initial="hidden" animate="show">
                  {unreadBulletins.slice(0, 5).map((b) => (
                    <motion.div key={b.id} variants={itemVariants}>
                      <AccentRow accent={b.important ? "#ef4444" : "#3b82f6"} onClick={() => setView("bulletin")}>
                        <PingDot color={b.important ? "#ef4444" : "#3b82f6"} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{b.author} · {b.category}</div>
                        </div>
                        {b.important && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#fef2f2", color: "#b91c1c", fontWeight: 700, flexShrink: 0 }}>重要</span>}
                      </AccentRow>
                    </motion.div>
                  ))}
                </motion.div>
            }
          </section>
        );

      case "todo":
        return (
          <section className="panel" style={{ borderRadius: 12 }}>
            <SectionHead
              title="ToDo 期限"
              badge={todayTodos.length}
              accent="#f59e0b"
              action={<button onClick={() => setView("todo")} style={{ border: 0, background: "transparent", color: "var(--blue)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>すべて見る</button>}
            />
            {todayTodos.length === 0
              ? <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0", textAlign: "center" }}>期限タスクなし</div>
              : <motion.div variants={listVariants} initial="hidden" animate="show">
                  {todayTodos.slice(0, 5).map((t) => (
                    <motion.div key={t.id} variants={itemVariants}>
                      <AccentRow accent={priorityColor(t.priority)} onClick={() => setView("todo")}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{userName(state, t.assignee)} · {t.due}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${priorityColor(t.priority)}18`, color: priorityColor(t.priority), fontWeight: 700, flexShrink: 0 }}>{t.priority}</span>
                      </AccentRow>
                    </motion.div>
                  ))}
                </motion.div>
            }
          </section>
        );

      case "workflow":
        return (
          <section className="panel" style={{ borderRadius: 12 }}>
            <SectionHead
              title="ワークフロー"
              badge={pendingWorkflows.length}
              accent="#8b5cf6"
              action={<button onClick={() => setView("workflow")} style={{ border: 0, background: "transparent", color: "var(--blue)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>すべて見る</button>}
            />
            {pendingWorkflows.length === 0
              ? <div style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0", textAlign: "center" }}>処理待ちなし</div>
              : <motion.div variants={listVariants} initial="hidden" animate="show">
                  {pendingWorkflows.slice(0, 5).map((w) => (
                    <motion.div key={w.id} variants={itemVariants}>
                      <AccentRow accent={statusAccent(w.status)} onClick={() => setView("workflow")}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{userName(state, w.applicant)} · {w.type}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${statusAccent(w.status)}18`, color: statusAccent(w.status), fontWeight: 700, flexShrink: 0 }}>{w.status}</span>
                      </AccentRow>
                    </motion.div>
                  ))}
                </motion.div>
            }
          </section>
        );
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* カスタマイズ ツールバー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span className="muted-text">
          {editing ? "「移動」でドラッグ並び替え、「非表示」で隠せます。設定は自動保存されます。" : "ホーム画面は自由に並び替え・表示切替できます。"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {editing && (
            <button className="ghost-button" onClick={resetLayout}>初期配置に戻す</button>
          )}
          <button
            className="ghost-button"
            onClick={() => setEditing((v) => !v)}
            style={editing ? { background: "var(--green)", color: "#fff", borderColor: "transparent" } : undefined}
          >
            {editing ? "完了" : "カスタマイズ"}
          </button>
        </div>
      </div>

      {/* 非表示ウィジェットのトレイ（編集中のみ） */}
      {editing && layout.hidden.length > 0 && (
        <div className="panel" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 14px" }}>
          <span className="muted-text">非表示中：</span>
          {layout.hidden.map((id) => (
            <button
              key={id}
              onClick={() => showWidget(id)}
              style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 999, border: "1px dashed var(--green)", background: "rgba(63,107,91,0.08)", color: "var(--green)", cursor: "pointer" }}
            >
              ＋ {WIDGET_META[id].label}
            </button>
          ))}
        </div>
      )}

      {/* ウィジェットグリッド */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleOrder} strategy={rectSortingStrategy}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 14 }}>
            {visibleOrder.map((id) => (
              <SortableWidget key={id} id={id} span={WIDGET_META[id].span} editing={editing} onHide={() => hideWidget(id)}>
                {renderWidget(id)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
