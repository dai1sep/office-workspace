"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import type { Timecard } from "@/lib/types";
import { uid } from "@/lib/utils";

const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

function toMinutes(time?: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function calcWork(tc: Timecard): number {
  if (!tc.clockIn || !tc.clockOut) return 0;
  const work = toMinutes(tc.clockOut) - toMinutes(tc.clockIn);
  const brk =
    tc.breakStart && tc.breakEnd
      ? toMinutes(tc.breakEnd) - toMinutes(tc.breakStart)
      : 0;
  return Math.max(0, work - brk);
}

function calcOvertime(workMin: number): number {
  return Math.max(0, workMin - 8 * 60);
}

function dayColor(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  if (day === 0) return "var(--red)";
  if (day === 6) return "var(--blue)";
  return "var(--text)";
}

export default function TimecardView() {
  const { state, updateState } = useApp();
  const today = new Date().toISOString().slice(0, 10);
  const now = () => new Date().toTimeString().slice(0, 5);

  const mine = state.timecards.find(
    (t) => t.userId === state.currentUser && t.date === today
  );

  const [viewYear, setViewYear] = useState(
    () => new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    () => new Date().getMonth() + 1
  );
  const [editTarget, setEditTarget] = useState<Timecard | null>(null);
  const [editForm, setEditForm] = useState({
    clockIn: "",
    clockOut: "",
    breakStart: "",
    breakEnd: "",
    note: "",
  });

  function punch(type: "clockIn" | "clockOut" | "breakStart" | "breakEnd") {
    const t = now();
    updateState((prev) => {
      const existing = prev.timecards.find(
        (tc) => tc.userId === prev.currentUser && tc.date === today
      );
      if (!existing) {
        const fresh: Timecard = {
          id: uid("tc"),
          userId: prev.currentUser,
          date: today,
          clockIn: type === "clockIn" ? t : undefined,
          clockOut: type === "clockOut" ? t : undefined,
          breakStart: type === "breakStart" ? t : undefined,
          breakEnd: type === "breakEnd" ? t : undefined,
        };
        return { ...prev, timecards: [fresh, ...prev.timecards] };
      }
      return {
        ...prev,
        timecards: prev.timecards.map((tc) =>
          tc.id === existing.id ? { ...tc, [type]: t } : tc
        ),
      };
    });
  }

  const monthCards = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth).padStart(2, "0")}`;
    return state.timecards
      .filter((t) => t.userId === state.currentUser && t.date.startsWith(prefix))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.timecards, state.currentUser, viewYear, viewMonth]);

  const monthSummary = useMemo(() => {
    const days = monthCards.filter((t) => t.clockIn).length;
    const totalWork = monthCards.reduce((acc, t) => acc + calcWork(t), 0);
    const totalOT = monthCards.reduce(
      (acc, t) => acc + calcOvertime(calcWork(t)),
      0
    );
    return { days, totalWork, totalOT };
  }, [monthCards]);

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function toThisMonth() {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth() + 1);
  }

  function openEdit(tc: Timecard) {
    setEditTarget(tc);
    setEditForm({
      clockIn: tc.clockIn ?? "",
      clockOut: tc.clockOut ?? "",
      breakStart: tc.breakStart ?? "",
      breakEnd: tc.breakEnd ?? "",
      note: tc.note ?? "",
    });
  }

  function saveEdit() {
    if (!editTarget) return;
    updateState((prev) => ({
      ...prev,
      timecards: prev.timecards.map((tc) =>
        tc.id === editTarget.id
          ? {
              ...tc,
              clockIn: editForm.clockIn || undefined,
              clockOut: editForm.clockOut || undefined,
              breakStart: editForm.breakStart || undefined,
              breakEnd: editForm.breakEnd || undefined,
              note: editForm.note || undefined,
            }
          : tc
      ),
    }));
    setEditTarget(null);
  }

  const todayWork = mine ? calcWork(mine) : 0;
  const todayOT = calcOvertime(todayWork);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900, margin: "0 auto" }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <h2 className="panel-title" style={{ marginBottom: 20 }}>
          タイムカード
        </h2>

        <div
          className="panel"
          style={{ marginBottom: 24, padding: "20px 24px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 6,
                }}
              >
                {today} ({DAYS_JA[new Date(today).getDay()]}) 本日の打刻
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  flexWrap: "wrap",
                  fontSize: 14,
                }}
              >
                <span>
                  出勤:{" "}
                  <strong style={{ color: "var(--green)" }}>
                    {mine?.clockIn ?? "--:--"}
                  </strong>
                </span>
                <span>
                  退勤:{" "}
                  <strong style={{ color: "var(--red)" }}>
                    {mine?.clockOut ?? "--:--"}
                  </strong>
                </span>
                <span>
                  休憩:{" "}
                  <strong style={{ color: "var(--orange)" }}>
                    {mine?.breakStart ?? "--:--"}
                    {" 〜 "}
                    {mine?.breakEnd ?? "--:--"}
                  </strong>
                </span>
                {todayWork > 0 && (
                  <span>
                    実働:{" "}
                    <strong style={{ color: "var(--blue)" }}>
                      {fromMinutes(todayWork)}
                    </strong>
                    {todayOT > 0 && (
                      <span className="muted-text" style={{ marginLeft: 8 }}>
                        残業 +{fromMinutes(todayOT)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => punch("clockIn")}
                disabled={!!mine?.clockIn}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: mine?.clockIn ? "var(--soft)" : "var(--green)",
                  color: mine?.clockIn ? "var(--muted)" : "#fff",
                  fontWeight: 600,
                  cursor: mine?.clockIn ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                出勤
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => punch("breakStart")}
                disabled={!mine?.clockIn || !!mine?.breakStart}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    !mine?.clockIn || mine?.breakStart
                      ? "var(--soft)"
                      : "var(--orange)",
                  color:
                    !mine?.clockIn || mine?.breakStart
                      ? "var(--muted)"
                      : "#fff",
                  fontWeight: 600,
                  cursor:
                    !mine?.clockIn || mine?.breakStart ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                休憩開始
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => punch("breakEnd")}
                disabled={!mine?.breakStart || !!mine?.breakEnd}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    !mine?.breakStart || mine?.breakEnd
                      ? "var(--soft)"
                      : "var(--orange)",
                  color:
                    !mine?.breakStart || mine?.breakEnd
                      ? "var(--muted)"
                      : "#fff",
                  fontWeight: 600,
                  cursor:
                    !mine?.breakStart || mine?.breakEnd ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                休憩終了
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => punch("clockOut")}
                disabled={!mine?.clockIn || !!mine?.clockOut}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    !mine?.clockIn || mine?.clockOut
                      ? "var(--soft)"
                      : "var(--red)",
                  color:
                    !mine?.clockIn || mine?.clockOut ? "var(--muted)" : "#fff",
                  fontWeight: 600,
                  cursor:
                    !mine?.clockIn || mine?.clockOut ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                退勤
              </motion.button>
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <button className="ghost-button" onClick={prevMonth}>
              ← 前月
            </button>
            <strong style={{ minWidth: 100, textAlign: "center", fontSize: 15 }}>
              {viewYear}年{viewMonth}月
            </strong>
            <button className="ghost-button" onClick={nextMonth}>
              次月 →
            </button>
            <button className="ghost-button" onClick={toThisMonth}>
              今月
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 20, fontSize: 13, flexWrap: "wrap" }}>
              <span>
                出勤日数:{" "}
                <strong style={{ color: "var(--blue)" }}>
                  {monthSummary.days}日
                </strong>
              </span>
              <span>
                総実働:{" "}
                <strong style={{ color: "var(--green)" }}>
                  {fromMinutes(monthSummary.totalWork)}
                </strong>
              </span>
              <span>
                総残業:{" "}
                <strong style={{ color: monthSummary.totalOT > 0 ? "var(--red)" : "var(--muted)" }}>
                  {fromMinutes(monthSummary.totalOT)}
                </strong>
              </span>
            </div>
          </div>

          {monthCards.length === 0 ? (
            <p className="muted-text" style={{ padding: "20px 0", textAlign: "center" }}>
              この月の打刻データはありません
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["日付", "出勤", "退勤", "休憩", "実働", "残業"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 10px",
                        textAlign: "left",
                        color: "var(--muted)",
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthCards.map((tc) => {
                  const d = new Date(tc.date);
                  const workMin = calcWork(tc);
                  const otMin = calcOvertime(workMin);
                  const isToday = tc.date === today;
                  return (
                    <motion.tr
                      key={tc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ background: "var(--soft)" }}
                      onClick={() => openEdit(tc)}
                      style={{
                        borderBottom: "1px solid var(--line)",
                        cursor: "pointer",
                        background: isToday
                          ? "color-mix(in srgb, var(--blue) 6%, transparent)"
                          : undefined,
                      }}
                    >
                      <td style={{ padding: "8px 10px", color: dayColor(tc.date), fontWeight: isToday ? 700 : 400 }}>
                        {tc.date.slice(5).replace("-", "/")} ({DAYS_JA[d.getDay()]})
                        {isToday && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              background: "var(--blue)",
                              color: "#fff",
                              borderRadius: 4,
                              padding: "1px 5px",
                            }}
                          >
                            今日
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--green)" }}>
                        {tc.clockIn ?? <span className="muted-text">--:--</span>}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--red)" }}>
                        {tc.clockOut ?? <span className="muted-text">--:--</span>}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--orange)", fontSize: 13 }}>
                        {tc.breakStart && tc.breakEnd
                          ? `${tc.breakStart}〜${tc.breakEnd}`
                          : tc.breakStart
                          ? `${tc.breakStart}〜`
                          : <span className="muted-text">-</span>}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--blue)" }}>
                        {workMin > 0 ? fromMinutes(workMin) : <span className="muted-text">-</span>}
                      </td>
                      <td style={{ padding: "8px 10px", color: otMin > 0 ? "var(--red)" : "var(--muted)" }}>
                        {otMin > 0 ? `+${fromMinutes(otMin)}` : "-"}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="打刻修正"
        width={420}
      >
        {editTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
              {editTarget.date} ({DAYS_JA[new Date(editTarget.date).getDay()]})
            </div>

            {(
              [
                { key: "clockIn", label: "出勤時刻" },
                { key: "clockOut", label: "退勤時刻" },
                { key: "breakStart", label: "休憩開始" },
                { key: "breakEnd", label: "休憩終了" },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>{label}</span>
                <input
                  type="time"
                  value={editForm[key]}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  style={{
                    padding: "6px 10px",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: 14,
                  }}
                />
              </label>
            ))}

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>備考</span>
              <input
                type="text"
                value={editForm.note}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="理由・メモ"
                style={{
                  padding: "6px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: 14,
                }}
              />
            </label>

            {editForm.clockIn && editForm.clockOut && (
              <div style={{ fontSize: 13, color: "var(--muted)", padding: "6px 10px", background: "var(--soft)", borderRadius: 6 }}>
                実働:{" "}
                <strong style={{ color: "var(--blue)" }}>
                  {fromMinutes(
                    calcWork({
                      ...editTarget,
                      clockIn: editForm.clockIn || undefined,
                      clockOut: editForm.clockOut || undefined,
                      breakStart: editForm.breakStart || undefined,
                      breakEnd: editForm.breakEnd || undefined,
                    })
                  )}
                </strong>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="ghost-button" onClick={() => setEditTarget(null)}>
                キャンセル
              </button>
              <button
                onClick={saveEdit}
                style={{
                  padding: "7px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--blue)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
