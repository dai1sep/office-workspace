"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import { TODAY } from "@/lib/store";
import type { AppState, FacilityReservation } from "@/lib/types";
import { uid, userName } from "@/lib/utils";

const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

function timeToRatio(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h * 60 + m - HOUR_START * 60) / (TOTAL_HOURS * 60);
}

function addDays(iso: string, amount: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${"日月火水木金土"[date.getDay()]}）`;
}

interface Popover {
  reservationId: string;
  x: number;
  y: number;
}

export default function FacilitiesView() {
  const { state, updateState, currentUser } = useApp();
  const me = currentUser ?? state.currentUser;
  const [date, setDate] = useState(TODAY);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    facilityId: "",
    title: "",
    date: TODAY,
    start: "09:00",
    end: "10:00",
    members: [] as string[],
  });
  const gridRef = useRef<HTMLDivElement>(null);

  const dayReservations = state.reservations.filter((r) => r.date === date);

  function openAddModal(presetFacilityId?: string, presetStart?: string) {
    setForm({
      facilityId: presetFacilityId ?? (state.facilities[0]?.id ?? ""),
      title: "",
      date,
      start: presetStart ?? "09:00",
      end: presetStart ? addHour(presetStart) : "10:00",
      members: [me],
    });
    setFormError("");
    setModalOpen(true);
  }

  function addHour(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const next = h + 1;
    return `${String(Math.min(next, HOUR_END)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function toggleMember(userId: string) {
    setForm((prev) => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter((id) => id !== userId)
        : [...prev.members, userId],
    }));
  }

  function hasConflict(draft: typeof form): boolean {
    return state.reservations.some((r) => {
      if (r.facilityId !== draft.facilityId) return false;
      if (r.date !== draft.date) return false;
      return r.start < draft.end && r.end > draft.start;
    });
  }

  function getConflictTitle(draft: typeof form): string {
    const found = state.reservations.find(
      (r) =>
        r.facilityId === draft.facilityId &&
        r.date === draft.date &&
        r.start < draft.end &&
        r.end > draft.start,
    );
    return found?.title ?? "";
  }

  function submit() {
    if (!form.facilityId || !form.title.trim()) {
      setFormError("設備とタイトルは必須です。");
      return;
    }
    if (form.start >= form.end) {
      setFormError("終了時刻は開始時刻より後にしてください。");
      return;
    }
    if (hasConflict(form)) {
      setFormError(`この時間帯はすでに「${getConflictTitle(form)}」で予約されています。`);
      return;
    }
    const reservation: FacilityReservation = {
      id: uid("r"),
      facilityId: form.facilityId,
      title: form.title.trim(),
      date: form.date,
      start: form.start,
      end: form.end,
      organizer: me,
      members: form.members,
    };
    updateState((prev: AppState) => ({ ...prev, reservations: [...prev.reservations, reservation] }));
    setModalOpen(false);
  }

  function cancelReservation(reservationId: string) {
    updateState((prev: AppState) => ({
      ...prev,
      reservations: prev.reservations.filter((r) => r.id !== reservationId),
    }));
    setPopover(null);
  }

  function handleBarClick(e: React.MouseEvent, reservationId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ reservationId, x: rect.left, y: rect.bottom + 6 });
  }

  function handleCellClick(facilityId: string, e: React.MouseEvent) {
    if (popover) { setPopover(null); return; }
    const cell = e.currentTarget as HTMLElement;
    const rect = cell.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const ratio = relX / rect.width;
    const totalMinutes = Math.round((TOTAL_HOURS * 60 * ratio) / 30) * 30;
    const h = Math.floor(totalMinutes / 60) + HOUR_START;
    const m = totalMinutes % 60;
    const start = `${String(Math.min(h, HOUR_END - 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    openAddModal(facilityId, start);
  }

  const activeReservation = popover ? state.reservations.find((r) => r.id === popover.reservationId) : null;
  const activeFacility = activeReservation ? state.facilities.find((f) => f.id === activeReservation.facilityId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} onClick={() => setPopover(null)}>
      <section className="panel" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15 }}>設備予約</strong>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <button className="ghost-button" onClick={() => setDate((d) => addDays(d, -1))}>←</button>
          <button className="ghost-button" onClick={() => setDate(TODAY)}>今日</button>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 200, textAlign: "center" }}>{fmtDate(date)}</span>
          <button className="ghost-button" onClick={() => setDate((d) => addDays(d, 1))}>→</button>
        </div>
        <button
          className="ghost-button"
          onClick={() => openAddModal()}
          style={{ background: "var(--green)", borderColor: "var(--green)", color: "white" }}
        >
          予約を追加
        </button>
      </section>

      <section className="panel" style={{ overflowX: "auto", padding: 0 }} ref={gridRef}>
        <div style={{ minWidth: 700 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", borderBottom: "1px solid var(--line)" }}>
            <div style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12, color: "var(--muted)" }}>設備</div>
            <div style={{ position: "relative", height: 32 }}>
              {HOURS.map((h) => (
                <span
                  key={h}
                  style={{
                    position: "absolute",
                    left: `${((h - HOUR_START) / TOTAL_HOURS) * 100}%`,
                    transform: "translateX(-50%)",
                    fontSize: 11,
                    color: "var(--muted)",
                    top: 8,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  {h}:00
                </span>
              ))}
            </div>
          </div>

          {state.facilities.map((facility, index) => {
            const facReservations = dayReservations.filter((r) => r.facilityId === facility.id);
            return (
              <motion.div
                key={facility.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.16 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr",
                  borderBottom: "1px solid var(--line)",
                  minHeight: 52,
                }}
              >
                <div style={{ padding: "10px 12px", borderRight: "1px solid var(--line)" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{facility.name}</div>
                  {facility.capacity > 0 && (
                    <div className="muted-text" style={{ fontSize: 11 }}>定員 {facility.capacity}名</div>
                  )}
                  {facility.equipment.length > 0 && (
                    <div className="muted-text" style={{ fontSize: 10 }}>{facility.equipment.join(" / ")}</div>
                  )}
                </div>
                <div
                  style={{ position: "relative", cursor: "crosshair", background: "var(--soft)" }}
                  onClick={(e) => handleCellClick(facility.id, e)}
                >
                  {HOURS.slice(0, -1).map((h) => (
                    <div
                      key={h}
                      style={{
                        position: "absolute",
                        left: `${((h - HOUR_START) / TOTAL_HOURS) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: "var(--line)",
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                  {facReservations.map((r) => {
                    const left = Math.max(0, Math.min(1, timeToRatio(r.start)));
                    const right = Math.max(0, Math.min(1, timeToRatio(r.end)));
                    const width = Math.max(0, right - left);
                    const isOwn = r.organizer === me;
                    return (
                      <motion.button
                        key={r.id}
                        onClick={(e) => handleBarClick(e, r.id)}
                        whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(0,0,0,.18)" }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          position: "absolute",
                          left: `calc(${left * 100}% + 2px)`,
                          width: `calc(${width * 100}% - 4px)`,
                          top: 6,
                          bottom: 6,
                          background: isOwn ? "var(--blue)" : "#6a9fd8",
                          opacity: 0.9,
                          borderRadius: 5,
                          border: "none",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 6px",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                          zIndex: 2,
                          textAlign: "left",
                        }}
                        title={`${r.title} / ${r.start}–${r.end} / ${userName(state, r.organizer)}`}
                      >
                        {r.title}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {popover && activeReservation && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            style={{
              position: "fixed",
              left: Math.min(popover.x, typeof window !== "undefined" ? window.innerWidth - 280 : 800),
              top: popover.y,
              zIndex: 9000,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: "14px 16px",
              width: 260,
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <strong style={{ display: "block", marginBottom: 4 }}>{activeReservation.title}</strong>
            <div className="muted-text" style={{ marginBottom: 2 }}>
              {activeFacility?.name} / {activeReservation.start}–{activeReservation.end}
            </div>
            <div className="muted-text" style={{ marginBottom: 6 }}>
              主催: {userName(state, activeReservation.organizer)}
            </div>
            {activeReservation.members.length > 0 && (
              <div className="muted-text" style={{ marginBottom: 10, fontSize: 11 }}>
                参加: {activeReservation.members.map((id) => userName(state, id)).join("、")}
              </div>
            )}
            {activeReservation.organizer === me && (
              <button
                className="ghost-button"
                onClick={() => cancelReservation(activeReservation.id)}
                style={{ color: "var(--red)", borderColor: "var(--red)", width: "100%" }}
              >
                予約をキャンセル
              </button>
            )}
            <button
              className="ghost-button"
              onClick={() => setPopover(null)}
              style={{ width: "100%", marginTop: 6 }}
            >
              閉じる
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="予約を追加" width={520}>
        <div style={{ display: "grid", gap: 14 }}>
          <label>
            設備
            <select
              value={form.facilityId}
              onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
              style={{ display: "block", width: "100%", marginTop: 5 }}
            >
              {state.facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}（定員{f.capacity}名）</option>
              ))}
            </select>
          </label>
          <label>
            タイトル
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="会議・打合せ名など"
              style={{ display: "block", width: "100%", marginTop: 5 }}
            />
          </label>
          <label>
            日付
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={{ display: "block", width: "100%", marginTop: 5 }}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              開始
              <input
                type="time"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 5 }}
              />
            </label>
            <label>
              終了
              <input
                type="time"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: 5 }}
              />
            </label>
          </div>
          <div>
            <div style={{ marginBottom: 5, fontSize: 13 }}>主催者</div>
            <div style={{ padding: "6px 10px", background: "var(--soft)", borderRadius: 6, fontSize: 13 }}>
              {userName(state, me)}（自分）
            </div>
          </div>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
            <legend>参加者</legend>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {state.users.map((user) => (
                <label key={user.id} style={{ display: "flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.members.includes(user.id)}
                    onChange={() => toggleMember(user.id)}
                  />
                  {user.name}
                  <span className="muted-text">{user.dept}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {formError && (
            <div style={{ padding: "9px 12px", borderRadius: 7, background: "#fff0f0", color: "var(--red)", fontSize: 13 }}>
              {formError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="ghost-button" onClick={() => setModalOpen(false)}>キャンセル</button>
            <button
              className="ghost-button"
              onClick={submit}
              style={{ background: "var(--green)", borderColor: "var(--green)", color: "white" }}
            >
              予約する
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
