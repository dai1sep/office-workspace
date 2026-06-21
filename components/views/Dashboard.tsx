"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useApp } from "@/lib/context";
import { TODAY } from "@/lib/store";
import { Schedule } from "@/lib/types";
import { statusColor, userName } from "@/lib/utils";

function StatusBadge({ label }: { label: string }) {
  return <span className={`status ${statusColor(label)}`}>{label}</span>;
}

function MetricCard({
  title,
  value,
  sub,
  label,
  onClick,
}: {
  title: string;
  value: number;
  sub: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="panel"
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: "var(--shadow)" }}
      whileTap={{ scale: 0.99 }}
      style={{ textAlign: "left", border: "1px solid var(--line)" }}
    >
      <div className="panel-title" style={{ justifyContent: "space-between" }}>
        <span>{title}</span>
        <StatusBadge label={label} />
      </div>
      <strong style={{ display: "block", fontSize: 30, lineHeight: 1 }}>{value}</strong>
      <span style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 6 }}>{sub}</span>
    </motion.button>
  );
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function EmployeeSchedule({ item }: { item: Schedule & { memberNames: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="employee-schedule" style={{ position: "relative" }} onClick={() => setOpen((value) => !value)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <motion.div
        whileHover={{ y: -1 }}
        style={{
          minHeight: 72,
          padding: "10px 12px",
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--panel)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
          <strong style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: 11, whiteSpace: "nowrap" }}>{item.start}</span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.memberNames}
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="hover-pop employee-hover-pop"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            style={{ left: 0, top: "calc(100% + 8px)", width: 280, padding: 12 }}
          >
            <strong>{item.title}</strong>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
              {item.start} - {item.end} / {item.location || "場所未定"}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{item.memberNames}</div>
            {item.detail && <p style={{ margin: "8px 0 0", fontSize: 12 }}>{item.detail}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Dashboard() {
  const { state, setView } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  const unreadMails = state.mails.filter((m) => !m.read);
  const unreadBulletins = state.bulletins.filter((b) => !b.read);
  const pendingWorkflows = state.workflows.filter((w) => !["完了", "承認済"].includes(w.status));
  const todayTodos = state.todos.filter((t) => t.due <= TODAY && t.status !== "完了");
  const todaySchedules = state.schedules.filter((s) => s.date === TODAY).sort((a, b) => a.start.localeCompare(b.start));
  const employeeSchedules = todaySchedules
    .filter((s) => s.members.length > 0)
    .map((s) => ({ ...s, memberNames: s.members.map((id) => userName(state, id)).join("、") }));
  const visibleSchedules = employeeSchedules.slice(0, 5);
  const hiddenSchedules = employeeSchedules.slice(5);
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(TODAY, i));

  return (
    <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 14 }}>
      <div className="dashboard-metric" style={{ gridColumn: "span 3" }}>
        <MetricCard title="未読メール" value={unreadMails.length} sub="確認と返信待ち" label="メール" onClick={() => setView("mail")} />
      </div>
      <div className="dashboard-metric" style={{ gridColumn: "span 3" }}>
        <MetricCard title="今日の予定" value={todaySchedules.length} sub="会議・外出・作業" label="予定" onClick={() => setView("schedule")} />
      </div>
      <div className="dashboard-metric" style={{ gridColumn: "span 3" }}>
        <MetricCard title="承認待ち" value={pendingWorkflows.length} sub="申請の確認中" label="承認" onClick={() => setView("workflow")} />
      </div>
      <div className="dashboard-metric" style={{ gridColumn: "span 3" }}>
        <MetricCard title="期限ToDo" value={todayTodos.length} sub="本日までのタスク" label="ToDo" onClick={() => setView("todo")} />
      </div>

      <section className="panel dashboard-wide-panel" style={{ gridColumn: "span 12" }}>
        <div className="panel-title">予定が入っている社員</div>
        <div className="employee-schedule-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          {visibleSchedules.map((item) => (
            <EmployeeSchedule key={item.id} item={item} />
          ))}
        </div>
        {hiddenSchedules.length > 0 && (
          <div className="dashboard-more" style={{ position: "relative", marginTop: 10 }} onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
            <button onClick={() => setMoreOpen((value) => !value)} style={{ border: 0, background: "transparent", color: "var(--blue)", fontSize: 12, fontWeight: 700, padding: 0 }}>
              さらに{hiddenSchedules.length}件予定あり
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  className="hover-pop dashboard-more-pop"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  style={{ left: 0, top: "calc(100% + 8px)", width: "100%", padding: 12, pointerEvents: "auto" }}
                >
                  <div className="employee-schedule-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
                    {hiddenSchedules.map((item) => (
                      <EmployeeSchedule key={item.id} item={item} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="panel dashboard-wide-panel" style={{ gridColumn: "span 12" }}>
        <div className="panel-title">
          自分の週間スケジュール <span style={{ fontWeight: 500 }}>{TODAY} から5日間</span>
        </div>
        <div className="weekly-schedule-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          {weekDays.map((day) => {
            const items = state.schedules.filter((s) => s.date === day && s.members.includes(state.currentUser));
            return (
              <div key={day} style={{ minHeight: 118, padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--soft)" }}>
                <strong style={{ display: "block", fontSize: 12, marginBottom: 8 }}>{fmtDay(day)}</strong>
                {items.length === 0 ? (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>予定なし</span>
                ) : (
                  items.map((s) => (
                    <div
                      key={s.id}
                      style={{ marginBottom: 6, padding: "6px 8px", borderRadius: 7, background: "var(--panel)", border: "1px solid var(--line)", fontSize: 12 }}
                    >
                      <span style={{ color: "var(--muted)" }}>{s.start}</span> {s.title}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel dashboard-summary-panel" style={{ gridColumn: "span 4" }}>
        <div className="panel-title">お知らせ</div>
        {unreadBulletins.slice(0, 4).map((b) => (
          <div className="row-card" key={b.id}>
            <div style={{ flex: 1 }}>
              <strong>{b.title}</strong>
              <br />
              <span className="muted-text">{b.category}</span>
            </div>
            <StatusBadge label={b.important ? "重要" : "通常"} />
          </div>
        ))}
      </section>
      <section className="panel dashboard-summary-panel" style={{ gridColumn: "span 4" }}>
        <div className="panel-title">ToDo</div>
        {todayTodos.slice(0, 4).map((t) => (
          <div className="row-card" key={t.id}>
            <div style={{ flex: 1 }}>
              <strong>{t.title}</strong>
              <br />
              <span className="muted-text">
                {userName(state, t.assignee)} / {t.due}
              </span>
            </div>
            <StatusBadge label={t.priority} />
          </div>
        ))}
      </section>
      <section className="panel dashboard-summary-panel" style={{ gridColumn: "span 4" }}>
        <div className="panel-title">ワークフロー</div>
        {pendingWorkflows.slice(0, 4).map((w) => (
          <div className="row-card" key={w.id}>
            <div style={{ flex: 1 }}>
              <strong>{w.title}</strong>
              <br />
              <span className="muted-text">
                {userName(state, w.applicant)} / {w.dept}
              </span>
            </div>
            <StatusBadge label={w.status} />
          </div>
        ))}
      </section>
    </div>
  );
}
