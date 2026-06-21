"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import HoverCard from "@/components/HoverCard";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import { TODAY } from "@/lib/store";
import type { AppState, Schedule } from "@/lib/types";
import { useIsMobile } from "@/lib/useIsMobile";
import { uid, userName } from "@/lib/utils";

type ViewMode = "groupDay" | "groupWeek" | "personalDay" | "personalWeek" | "personalMonth" | "personalYear";
type FormMode = "single" | "multiDay" | "period" | "repeat";

const VIEW_MODES: Array<[ViewMode, string]> = [
  ["groupDay", "グループ日"], ["groupWeek", "グループ週"], ["personalDay", "個人日"],
  ["personalWeek", "個人週"], ["personalMonth", "個人月"], ["personalYear", "個人年"],
];
const FORM_MODES: Array<[FormMode, string]> = [
  ["single", "通常予定"], ["multiDay", "翌日以降まで続く予定"],
  ["period", "期間予定"], ["repeat", "繰り返し予定"],
];

function dateOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function isoOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(iso: string, amount: number) {
  const date = dateOf(iso);
  date.setDate(date.getDate() + amount);
  return isoOf(date);
}
function startOfWeek(iso: string) {
  const date = dateOf(iso);
  date.setDate(date.getDate() - date.getDay() + 1);
  return isoOf(date);
}
function fmt(iso: string) {
  const date = dateOf(iso);
  return `${date.getMonth() + 1}/${date.getDate()}（${"日月火水木金土"[date.getDay()]}）`;
}
function occursOn(schedule: Schedule, iso: string) {
  if (schedule.scheduleMode === "repeat" && schedule.repeatCycle) {
    if (iso < schedule.date || (schedule.repeatUntil && iso > schedule.repeatUntil)) return false;
    const source = dateOf(schedule.date);
    const target = dateOf(iso);
    const days = Math.round((target.getTime() - source.getTime()) / 86400000);
    if (schedule.repeatCycle === "daily") return true;
    if (schedule.repeatCycle === "weekly") return days % 7 === 0;
    if (schedule.repeatCycle === "monthly") return source.getDate() === target.getDate();
    if (schedule.repeatCycle === "yearly") return source.getMonth() === target.getMonth() && source.getDate() === target.getDate();
  }
  if ((schedule.scheduleMode === "multiDay" || schedule.scheduleMode === "period") && schedule.endDate) {
    return schedule.date <= iso && iso <= schedule.endDate;
  }
  return schedule.date === iso;
}
function scheduleTime(schedule: Schedule) {
  return schedule.allDay ? "終日" : `${schedule.start}–${schedule.end}`;
}
function scheduleTone(type: Schedule["type"]) {
  return type === "meeting" ? "#e8f1ff" : type === "away" ? "#fff1df" : type === "approval" ? "#f4eaff" : "#e8f7ee";
}
function timeFromMinutes(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function ScheduleCard({ schedule, state, onOpen }: { schedule: Schedule; state: AppState; onOpen: () => void }) {
  const names = schedule.visibility === "private" ? "非公開" : schedule.members.map((id) => userName(state, id)).join("、");
  return (
    <HoverCard content={<div><strong style={{ display: "block", marginBottom: 6 }}>{schedule.title}</strong><div className="muted-text">{scheduleTime(schedule)} / {schedule.location || "場所未定"}</div><div className="muted-text" style={{ marginTop: 3 }}>{names}</div>{schedule.detail && <p style={{ margin: "9px 0 0", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{schedule.detail}</p>}</div>}>
      <motion.button
        layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={onOpen} whileHover={{ y: -2, scale: 1.01, boxShadow: "0 8px 18px rgba(0,0,0,.12)" }} whileTap={{ scale: .985 }} transition={{ duration: .13 }}
        style={{ width: "100%", textAlign: "left", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 8px", background: scheduleTone(schedule.type), color: "var(--text)", marginBottom: 5 }}
      >
        <span style={{ display: "block", fontSize: 10, color: "var(--muted)" }}>{scheduleTime(schedule)}</span>
        <strong style={{ display: "block", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{schedule.title}</strong>
        <span style={{ display: "block", fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names}</span>
      </motion.button>
    </HoverCard>
  );
}

export default function ScheduleView() {
  const { state, updateState, currentUser } = useApp();
  const isMobile = useIsMobile();
  const me = currentUser ?? state.currentUser;
  const [anchor, setAnchor] = useState(TODAY);
  const [mode, setMode] = useState<ViewMode>("groupWeek");
  const [department, setDepartment] = useState("すべて");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [fixedDates, setFixedDates] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustMembers, setAdjustMembers] = useState<string[]>([me]);
  const [adjustDate, setAdjustDate] = useState(TODAY);
  const [adjustDuration, setAdjustDuration] = useState(60);
  const [detail, setDetail] = useState<Schedule | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("single");
  const [form, setForm] = useState({
    title: "", date: TODAY, endDate: TODAY, start: "09:00", end: "10:00", allDay: false,
    location: "", type: "meeting" as Schedule["type"], detail: "", members: [me], facilities: [] as string[],
    visibility: "public" as "public" | "private", allowReactions: false, reactionLabel: "確認しました",
    repeatCycle: "weekly" as NonNullable<Schedule["repeatCycle"]>, repeatUntil: "", surveyQuestion: "", surveyOptions: "",
    relatedFiles: [] as string[],
  });

  const departments = useMemo(() => ["すべて", ...Array.from(new Set(state.users.map((user) => user.dept)))], [state.users]);
  const users = useMemo(() => state.users.filter((user) => department === "すべて" || user.dept === department), [state.users, department]);
  const visibleUsers = users.slice(page * 10, page * 10 + 10);
  const weekStart = startOfWeek(anchor);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const displayDates = mode === "groupDay" || mode === "personalDay" ? [anchor] : weekDates;
  const mobileNameWidth = Math.min(104, Math.max(64, visibleUsers.reduce((length, user) => Math.max(length, user.name.length), 2) * 16 + 24));
  const nameColumn = isMobile ? `${mobileNameWidth}px` : "180px";
  const scheduleTableWidth = isMobile ? mobileNameWidth + displayDates.length * 112 : mode === "groupWeek" ? 1040 : 520;
  const matchingSchedules = state.schedules.filter((schedule) => {
    const text = `${schedule.title} ${schedule.detail} ${schedule.location}`.toLowerCase();
    return !query || text.includes(query.toLowerCase());
  });
  const schedulesFor = (userId: string, iso: string) => matchingSchedules.filter((schedule) => schedule.members.includes(userId) && occursOn(schedule, iso)).sort((a, b) => a.start.localeCompare(b.start));
  const adjustmentSlots = useMemo(() => {
    const slots: Array<{ date: string; start: string; end: string }> = [];
    for (let day = 0; day < 14 && slots.length < 24; day += 1) {
      const date = addDays(adjustDate, day);
      for (let startMinutes = 9 * 60; startMinutes + adjustDuration <= 18 * 60; startMinutes += 30) {
        const start = timeFromMinutes(startMinutes);
        const end = timeFromMinutes(startMinutes + adjustDuration);
        const busy = state.schedules.some((schedule) => occursOn(schedule, date) && schedule.members.some((id) => adjustMembers.includes(id)) && schedule.start < end && schedule.end > start);
        if (!busy) slots.push({ date, start, end });
      }
    }
    return slots;
  }, [state.schedules, adjustDate, adjustDuration, adjustMembers]);

  function resetPaging(nextDepartment: string) {
    setDepartment(nextDepartment);
    setPage(0);
  }
  function move(amount: number) {
    setAnchor(addDays(anchor, amount));
  }
  function chooseAdjustedSlot(slot: { date: string; start: string; end: string }) {
    setForm((prev) => ({ ...prev, date: slot.date, endDate: slot.date, start: slot.start, end: slot.end, members: adjustMembers }));
    setAdjustOpen(false);
    setFormMode("single");
    setFormOpen(true);
  }
  function toggleList(key: "members" | "facilities" | "relatedFiles", id: string) {
    setForm((prev) => ({ ...prev, [key]: prev[key].includes(id) ? prev[key].filter((value) => value !== id) : [...prev[key], id] }));
  }
  function conflicts() {
    return state.schedules.filter((schedule) => {
      if (!occursOn(schedule, form.date)) return false;
      if (schedule.end <= form.start || schedule.start >= form.end) return false;
      return schedule.members.some((id) => form.members.includes(id)) || (schedule.facilities ?? []).some((id) => form.facilities.includes(id));
    });
  }
  function submit() {
    if (!form.title.trim() || form.members.length === 0) return;
    const schedule: Schedule = {
      id: uid("s"), title: form.title.trim(), date: form.date, endDate: formMode === "single" ? undefined : form.endDate,
      start: form.start, end: form.end, allDay: form.allDay, location: form.location.trim(), members: form.members,
      facilities: form.facilities, relatedFiles: form.relatedFiles, type: form.type, detail: form.detail.trim(), scheduleMode: formMode,
      repeatCycle: formMode === "repeat" ? form.repeatCycle : undefined, repeatUntil: formMode === "repeat" ? form.repeatUntil : undefined,
      visibility: form.visibility, allowReactions: form.allowReactions, reactionLabel: form.reactionLabel, reactions: [],
      survey: form.surveyQuestion.trim() ? { question: form.surveyQuestion.trim(), options: form.surveyOptions.split("\n").map((value) => value.trim()).filter(Boolean), votes: {} } : undefined,
    };
    updateState((prev) => ({
      ...prev,
      schedules: [...prev.schedules, schedule],
      reservations: [...prev.reservations, ...form.facilities.map((facilityId) => ({ id: uid("r"), facilityId, title: schedule.title, date: schedule.date, start: schedule.start, end: schedule.end, organizer: me, members: schedule.members }))],
    }));
    setFormOpen(false);
    setForm((prev) => ({ ...prev, title: "", detail: "", location: "", surveyQuestion: "", surveyOptions: "" }));
  }
  function removeSchedule() {
    if (!detail) return;
    updateState((prev) => ({ ...prev, schedules: prev.schedules.filter((schedule) => schedule.id !== detail.id), reservations: prev.reservations.filter((reservation) => reservation.title !== detail.title || reservation.date !== detail.date) }));
    setDetail(null);
  }
  function react() {
    if (!detail) return;
    updateState((prev) => ({ ...prev, schedules: prev.schedules.map((schedule) => schedule.id === detail.id ? { ...schedule, reactions: (schedule.reactions ?? []).includes(me) ? (schedule.reactions ?? []).filter((id) => id !== me) : [...(schedule.reactions ?? []), me] } : schedule) }));
    setDetail((prev) => prev ? { ...prev, reactions: (prev.reactions ?? []).includes(me) ? (prev.reactions ?? []).filter((id) => id !== me) : [...(prev.reactions ?? []), me] } : prev);
  }
  function exportCsv() {
    const rows = [["日付", "開始", "終了", "予定", "参加者", "場所"], ...matchingSchedules.map((schedule) => [schedule.date, schedule.start, schedule.end, schedule.title, schedule.members.map((id) => userName(state, id)).join("/"), schedule.location])];
    const blob = new Blob(["\ufeff" + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `schedule-${anchor}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const monthStart = new Date(dateOf(anchor).getFullYear(), dateOf(anchor).getMonth(), 1);
  const monthGridStart = new Date(monthStart); monthGridStart.setDate(monthGridStart.getDate() - monthGridStart.getDay());
  const monthDates = Array.from({ length: 42 }, (_, index) => { const d = new Date(monthGridStart); d.setDate(d.getDate() + index); return isoOf(d); });

  return (
    <div className="schedule-view" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="panel schedule-toolbar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="ghost-button" onClick={() => setFormOpen(true)} style={{ background: "var(--green)", borderColor: "var(--green)", color: "white" }}>予定を登録</button>
        <button className="ghost-button" onClick={() => setAdjustOpen(true)}>予定を調整</button>
        <select value={mode} onChange={(event) => setMode(event.target.value as ViewMode)}>{VIEW_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {mode.startsWith("group") && <select value={department} onChange={(event) => resetPaging(event.target.value)}>{departments.map((value) => <option key={value}>{value}</option>)}</select>}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="予定を検索" style={{ minWidth: 160 }} />
        <div className="schedule-nav" style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <button className="ghost-button" onClick={() => move(mode.endsWith("Day") ? -1 : -7)}>前へ</button>
          <button className="ghost-button" onClick={() => setAnchor(TODAY)}>今日</button>
          <strong style={{ fontSize: 13 }}>{fmt(anchor)}</strong>
          <button className="ghost-button" onClick={() => move(mode.endsWith("Day") ? 1 : 7)}>次へ</button>
        </div>
      </section>

      <section className="panel schedule-utility" style={{ padding: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="ghost-button" onClick={() => setFixedDates((value) => !value)}>{fixedDates ? "日付固定を解除" : "日付を固定"}</button>
        <button className="ghost-button" onClick={exportCsv}>CSV出力</button>
        <button className="ghost-button" onClick={() => window.print()}>印刷</button>
        <span className="muted-text" style={{ alignSelf: "center" }}>表示中 {matchingSchedules.length}件</span>
      </section>

      {mode.startsWith("group") && (
        <motion.section key={mode} className="panel schedule-grid-panel" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .2 }} style={{ overflowX: "auto", padding: 0 }}>
          <div style={{ minWidth: scheduleTableWidth }}>
            <div style={{ display: "grid", gridTemplateColumns: `${nameColumn} repeat(${displayDates.length}, minmax(112px, 1fr))`, position: fixedDates ? "sticky" : "static", top: 0, zIndex: 3, background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
              <strong style={{ padding: 12 }}>社員</strong>{displayDates.map((iso) => <strong key={iso} style={{ padding: 12, textAlign: "center", borderLeft: "1px solid var(--line)" }}>{fmt(iso)}</strong>)}
            </div>
            {visibleUsers.map((user, index) => <motion.div key={user.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * .025, .16) }} style={{ display: "grid", gridTemplateColumns: `${nameColumn} repeat(${displayDates.length}, minmax(112px, 1fr))`, borderBottom: "1px solid var(--line)" }}>
              <div className="schedule-employee" style={{ padding: 12 }}><strong>{user.name}</strong><div className="muted-text schedule-employee-dept">{user.dept}</div></div>
              {displayDates.map((iso) => <div key={iso} style={{ padding: 7, minHeight: 92, borderLeft: "1px solid var(--line)", background: iso === TODAY ? "var(--soft)" : "transparent" }}>{schedulesFor(user.id, iso).map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} state={state} onOpen={() => setDetail(schedule)} />)}</div>)}
            </motion.div>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: 12 }}>
            <button className="ghost-button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>前の10名</button>
            <span className="muted-text">{page * 10 + 1}–{Math.min(page * 10 + 10, users.length)} / {users.length}名</span>
            <button className="ghost-button" disabled={(page + 1) * 10 >= users.length} onClick={() => setPage((value) => value + 1)}>次の10名</button>
          </div>
        </motion.section>
      )}

      {(mode === "personalDay" || mode === "personalWeek") && <section className="panel"><div className="panel-title">{mode === "personalDay" ? "個人日表示" : "個人週表示"}</div><div style={{ display: "grid", gridTemplateColumns: `repeat(${displayDates.length}, minmax(150px, 1fr))`, gap: 8, overflowX: "auto" }}>{displayDates.map((iso) => <div key={iso} style={{ minWidth: 150, padding: 8, border: "1px solid var(--line)", borderRadius: 7 }}><strong style={{ display: "block", marginBottom: 8 }}>{fmt(iso)}</strong>{schedulesFor(me, iso).map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} state={state} onOpen={() => setDetail(schedule)} />)}</div>)}</div></section>}

      {mode === "personalMonth" && <section className="panel"><div className="panel-title">{monthStart.getFullYear()}年 {monthStart.getMonth() + 1}月</div><div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderTop: "1px solid var(--line)", borderLeft: "1px solid var(--line)" }}>{monthDates.map((iso) => <div key={iso} style={{ minHeight: 105, padding: 6, borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", opacity: dateOf(iso).getMonth() === monthStart.getMonth() ? 1 : .42 }}><strong style={{ fontSize: 11 }}>{dateOf(iso).getDate()}</strong>{schedulesFor(me, iso).slice(0, 3).map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} state={state} onOpen={() => setDetail(schedule)} />)}</div>)}</div></section>}

      {mode === "personalYear" && <section className="panel"><div className="panel-title">{dateOf(anchor).getFullYear()}年</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>{Array.from({ length: 12 }, (_, month) => { const prefix = `${dateOf(anchor).getFullYear()}-${String(month + 1).padStart(2, "0")}`; const items = matchingSchedules.filter((schedule) => schedule.members.includes(me) && schedule.date.startsWith(prefix)); return <button key={month} className="panel" style={{ textAlign: "left", padding: 14 }} onClick={() => { setAnchor(`${prefix}-01`); setMode("personalMonth"); }}><strong>{month + 1}月</strong><div className="muted-text" style={{ marginTop: 8 }}>{items.length}件の予定</div>{items.slice(0, 3).map((item) => <div key={item.id} style={{ fontSize: 11, marginTop: 5 }}>{item.date.slice(8)}日 {item.title}</div>)}</button>; })}</div></section>}

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="参加者の空き時間を確認" width={720}>
        <div style={{ display: "grid", gap: 14 }}>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>参加者</legend><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{state.users.map((user) => <label key={user.id} style={{ display: "flex", gap: 5 }}><input type="checkbox" checked={adjustMembers.includes(user.id)} onChange={() => setAdjustMembers((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id])} />{user.name}</label>)}</div></fieldset>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>検索開始日<input type="date" value={adjustDate} onChange={(event) => setAdjustDate(event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>必要時間<select value={adjustDuration} onChange={(event) => setAdjustDuration(Number(event.target.value))} style={{ display: "block", width: "100%", marginTop: 5 }}><option value={30}>30分</option><option value={60}>60分</option><option value={90}>90分</option><option value={120}>120分</option></select></label></div>
          <div><div className="panel-title">候補時間</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 7 }}>{adjustmentSlots.map((slot) => <button key={`${slot.date}-${slot.start}`} className="ghost-button" onClick={() => chooseAdjustedSlot(slot)} style={{ justifyContent: "flex-start" }}>{fmt(slot.date)} {slot.start}–{slot.end}</button>)}</div>{adjustmentSlots.length === 0 && <div className="muted-text">条件に合う空き時間がありません。</div>}</div>
        </div>
      </Modal>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="予定の登録" width={760}>
        <div className="schedule-form-tabs" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>{FORM_MODES.map(([value, label]) => <button key={value} className="ghost-button" onClick={() => setFormMode(value)} style={{ background: formMode === value ? "var(--soft)" : "var(--panel)" }}>{label}</button>)}</div>
        <div className="schedule-form" style={{ display: "grid", gap: 13 }}>
          <label>予定名<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <div className="schedule-date-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <label>開始日<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
            {formMode !== "single" && <label>終了日<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>}
            <label>開始<input type="time" disabled={form.allDay} value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
            <label>終了<input type="time" disabled={form.allDay} value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          </div>
          <label style={{ display: "flex", gap: 7 }}><input type="checkbox" checked={form.allDay} onChange={(event) => setForm({ ...form, allDay: event.target.checked })} />終日</label>
          {formMode === "repeat" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>繰り返し<select value={form.repeatCycle} onChange={(event) => setForm({ ...form, repeatCycle: event.target.value as typeof form.repeatCycle })} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="daily">毎日</option><option value="weekly">毎週</option><option value="monthly">毎月</option><option value="yearly">毎年</option></select></label><label>終了日<input type="date" value={form.repeatUntil} onChange={(event) => setForm({ ...form, repeatUntil: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label></div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>予定種別<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Schedule["type"] })} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="meeting">会議・打合せ</option><option value="away">外出・出張</option><option value="work">作業・現場</option><option value="approval">承認・確認</option></select></label><label>場所<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label></div>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>参加者</legend><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{state.users.map((user) => <label key={user.id} style={{ display: "flex", gap: 5 }}><input type="checkbox" checked={form.members.includes(user.id)} onChange={() => toggleList("members", user.id)} />{user.name} <span className="muted-text">{user.dept}</span></label>)}</div></fieldset>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>使用設備</legend><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{state.facilities.map((facility) => <label key={facility.id} style={{ display: "flex", gap: 5 }}><input type="checkbox" checked={form.facilities.includes(facility.id)} onChange={() => toggleList("facilities", facility.id)} />{facility.name}</label>)}</div></fieldset>
          {conflicts().length > 0 && <div style={{ padding: 10, borderRadius: 7, background: "#fff4dc", color: "#775600", fontSize: 12 }}>同じ時間帯に参加者または設備の予定が {conflicts().length}件あります。</div>}
          <label>詳細・メモ<textarea value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} rows={4} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>関連ファイル</legend>{state.files.map((file) => <label key={file.id} style={{ display: "flex", gap: 5, marginBottom: 5 }}><input type="checkbox" checked={form.relatedFiles.includes(file.id)} onChange={() => toggleList("relatedFiles", file.id)} />{file.name}</label>)}</fieldset>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>公開範囲<select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as typeof form.visibility })} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="public">公開</option><option value="private">参加者のみ</option></select></label><label style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 22 }}><input type="checkbox" checked={form.allowReactions} onChange={(event) => setForm({ ...form, allowReactions: event.target.checked })} />リアクションを許可</label></div>
          {form.allowReactions && <label>リアクション<select value={form.reactionLabel} onChange={(event) => setForm({ ...form, reactionLabel: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }}><option>確認しました</option><option>了解です</option><option>よろしくお願いします</option><option>いいね！</option></select></label>}
          <label>アンケート質問（任意）<input value={form.surveyQuestion} onChange={(event) => setForm({ ...form, surveyQuestion: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          {form.surveyQuestion && <label>選択肢（1行1件）<textarea value={form.surveyOptions} onChange={(event) => setForm({ ...form, surveyOptions: event.target.value })} rows={3} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button className="ghost-button" onClick={() => setFormOpen(false)}>キャンセル</button><button className="ghost-button" onClick={submit} style={{ background: "var(--green)", color: "white" }}>登録する</button></div>
        </div>
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="予定の詳細" width={560}>{detail && <div style={{ display: "grid", gap: 12 }}><div><span className="muted-text">{detail.date}{detail.endDate ? ` ～ ${detail.endDate}` : ""} / {scheduleTime(detail)}</span><h3 style={{ margin: "6px 0" }}>{detail.title}</h3><div>{detail.detail || "詳細はありません。"}</div></div><div className="muted-text">参加者: {detail.members.map((id) => userName(state, id)).join("、")}</div><div className="muted-text">場所: {detail.location || "未設定"}</div>{(detail.facilities ?? []).length > 0 && <div className="muted-text">設備: {(detail.facilities ?? []).map((id) => state.facilities.find((facility) => facility.id === id)?.name).filter(Boolean).join("、")}</div>}{detail.allowReactions && <button className="ghost-button" onClick={react}>{detail.reactionLabel ?? "確認しました"} {(detail.reactions ?? []).length}</button>}<div style={{ display: "flex", justifyContent: "flex-end" }}><button className="ghost-button" onClick={removeSchedule} style={{ color: "#a33" }}>予定を削除</button></div></div>}</Modal>
    </div>
  );
}
