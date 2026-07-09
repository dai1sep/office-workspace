"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import { uid, userName } from "@/lib/utils";
import { TODAY } from "@/lib/store";
import type { WorkSpace, Schedule } from "@/lib/types";
import { BoardTab, LedgerTab, ScheduleTab, InspectionTab } from "@/components/views/FieldResources";

const COLORS = ["#3f6b5b", "#356c8a", "#a9622a", "#b64f4f", "#5a4a8a", "#3a7a8a", "#7a5a3a", "#4a6a3a"];
const EMPTY_FORM = { name: "", location: "", description: "", color: COLORS[0] };

function WorkerCircle({
  userId,
  fromSpaceId,
  color,
  size = 50,
}: {
  userId: string;
  fromSpaceId: string | null;
  color?: string;
  size?: number;
}) {
  const { state } = useApp();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${userId}::${fromSpaceId ?? "pool"}`,
    data: { userId, fromSpaceId },
  });
  const name = userName(state, userId);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging ? 0.25 : 1,
        cursor: "grab",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        userSelect: "none",
        flexShrink: 0,
        touchAction: "none",
        WebkitUserSelect: "none",
      }}
    >
      <motion.div
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: fromSpaceId ? (color ?? "var(--green)") : "var(--soft)",
          border: fromSpaceId ? "none" : "2px dashed var(--line)",
          color: fromSpaceId ? "#fff" : "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.36),
          fontWeight: 700,
          boxShadow: fromSpaceId ? "0 3px 10px rgba(0,0,0,0.18)" : "none",
          transition: "background 0.15s",
        }}
      >
        {name[0] ?? "?"}
      </motion.div>
      <span style={{ fontSize: 11, color: "var(--text)", textAlign: "center", maxWidth: size + 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
    </div>
  );
}

function PoolArea({ unassignedIds }: { unassignedIds: string[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });
  const { state, updateState } = useApp();

  return (
    <div
      ref={setNodeRef}
      className="panel"
      style={{
        border: isOver ? "2px dashed var(--green)" : "1px solid var(--line)",
        background: isOver ? "rgba(63,107,91,0.05)" : "var(--panel)",
        transition: "border 0.15s, background 0.15s",
      }}
    >
      <div className="panel-title" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <span>未配属 <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>{unassignedIds.length}名</span></span>
        {isOver && <span style={{ fontSize: 11, color: "var(--green)" }}>ここでドロップ解除</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, minHeight: 64, alignItems: "flex-start" }}>
        {unassignedIds.length === 0
          ? <span style={{ color: "var(--muted)", fontSize: 12, alignSelf: "center" }}>全員が工事に配属済みです</span>
          : unassignedIds.map((id) => (
            <WorkerCircle key={id} userId={id} fromSpaceId={null} />
          ))}
      </div>
    </div>
  );
}

function SpaceCard({
  space,
  onEdit,
  onDelete,
}: {
  space: WorkSpace;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { state } = useApp();
  const { setNodeRef, isOver } = useDroppable({ id: `space::${space.id}` });

  const linkedSchedules = useMemo(() => {
    // この現場に直接紐づく予定を優先し、足りなければ配属メンバー由来の予定で補完
    const direct = state.schedules.filter((s) => s.workspaceId === space.id);
    const byMember = state.schedules.filter((s) => !s.workspaceId && s.members.some((m) => space.memberIds.includes(m)));
    return [...direct, ...byMember]
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
      .slice(0, 4);
  }, [state.schedules, space.id, space.memberIds]);

  return (
    <motion.div
      ref={setNodeRef}
      layout
      style={{
        background: "var(--panel)",
        border: isOver ? `2px solid ${space.color}` : "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: isOver ? `0 0 0 5px ${space.color}22` : "var(--shadow-soft)",
        transition: "border 0.15s, box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ background: space.color, color: "#fff", padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 15, display: "block" }}>{space.name}</strong>
          {space.location && <span style={{ fontSize: 11, opacity: 0.85 }}>{space.location}</span>}
          {space.description && <span style={{ fontSize: 11, opacity: 0.7, display: "block" }}>{space.description}</span>}
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0, marginLeft: 8 }}>
          <button onClick={onEdit} style={{ border: "1px solid rgba(255,255,255,0.45)", borderRadius: 6, background: "transparent", color: "#fff", padding: "3px 9px", fontSize: 11, cursor: "pointer" }}>編集</button>
          <button onClick={onDelete} style={{ border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, background: "transparent", color: "rgba(255,255,255,0.75)", padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      <div style={{ padding: "16px", minHeight: 100, flex: 1, display: "flex", flexWrap: "wrap", gap: 14, alignContent: "flex-start", background: isOver ? `${space.color}08` : "transparent", transition: "background 0.15s" }}>
        {space.memberIds.length === 0 ? (
          <div style={{ width: "100%", textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "18px 0", borderRadius: 10, border: "2px dashed var(--line)" }}>
            ここに配属者をドロップ
          </div>
        ) : (
          space.memberIds.map((id) => (
            <WorkerCircle key={id} userId={id} fromSpaceId={space.id} color={space.color} />
          ))
        )}
      </div>

      {linkedSchedules.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line)", padding: "10px 16px 12px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>スケジュール連動</div>
          {linkedSchedules.map((s) => (
            <div key={s.id} style={{ display: "flex", gap: 8, fontSize: 11, padding: "3px 0", overflow: "hidden" }}>
              <span style={{ flexShrink: 0, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{s.date.slice(5)} {s.start}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{s.title}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function MemberBoard() {
  const { state, updateState } = useApp();
  const [activeDrag, setActiveDrag] = useState<{ userId: string; name: string; fromSpaceId: string | null } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const workspaces = state.workspaces ?? [];
  const assignedIds = useMemo(() => new Set(workspaces.flatMap((w) => w.memberIds)), [workspaces]);
  const unassignedIds = state.users.filter((u) => !assignedIds.has(u.id)).map((u) => u.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const { userId, fromSpaceId } = event.active.data.current as { userId: string; fromSpaceId: string | null };
    setActiveDrag({ userId, name: userName(state, userId), fromSpaceId });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const { userId, fromSpaceId } = active.data.current as { userId: string; fromSpaceId: string | null };
    const targetId = over.id as string;

    if (targetId === "pool") {
      if (!fromSpaceId) return;
      updateState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((w) =>
          w.id === fromSpaceId ? { ...w, memberIds: w.memberIds.filter((id) => id !== userId) } : w,
        ),
      }));
    } else if (targetId.startsWith("space::")) {
      const toId = targetId.slice(7);
      if (fromSpaceId === toId) return;
      updateState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((w) => {
          if (w.id === fromSpaceId) return { ...w, memberIds: w.memberIds.filter((id) => id !== userId) };
          if (w.id === toId && !w.memberIds.includes(userId)) return { ...w, memberIds: [...w.memberIds, userId] };
          return w;
        }),
      }));
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, color: COLORS[workspaces.length % COLORS.length] });
    setModalOpen(true);
  }

  function openEdit(space: WorkSpace) {
    setEditingId(space.id);
    setForm({ name: space.name, location: space.location ?? "", description: space.description ?? "", color: space.color });
    setModalOpen(true);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateState((prev) => ({
        ...prev,
        workspaces: prev.workspaces.map((w) =>
          w.id === editingId ? { ...w, name: form.name.trim(), location: form.location.trim(), description: form.description.trim(), color: form.color } : w,
        ),
      }));
    } else {
      const newWs: WorkSpace = {
        id: uid("ws"),
        name: form.name.trim(),
        color: form.color,
        memberIds: [],
        location: form.location.trim(),
        description: form.description.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
      };
      updateState((prev) => ({ ...prev, workspaces: [...(prev.workspaces ?? []), newWs] }));
    }
    setModalOpen(false);
  }

  function deleteSpace(id: string) {
    updateState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.filter((w) => w.id !== id),
    }));
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="muted-text">社員を工事カードにドラッグして配属を管理します</span>
          <button
            onClick={openCreate}
            style={{ padding: "6px 16px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            + 新規工事
          </button>
        </div>

        <PoolArea unassignedIds={unassignedIds} />

        {workspaces.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏗</div>
            <p style={{ margin: "0 0 14px", fontSize: 14 }}>工事スペースがまだありません</p>
            <button onClick={openCreate} style={{ padding: "9px 22px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              + 新規工事を追加
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
            {workspaces.map((space) => (
              <SpaceCard key={space.id} space={space} onEdit={() => openEdit(space)} onDelete={() => deleteSpace(space.id)} />
            ))}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 160, easing: "ease" }}>
        {activeDrag && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, pointerEvents: "none" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.28)", transform: "scale(1.08)" }}>
              {activeDrag.name[0] ?? "?"}
            </div>
            <span style={{ fontSize: 11, color: "var(--text)", background: "var(--panel)", padding: "2px 8px", borderRadius: 999, border: "1px solid var(--line)" }}>{activeDrag.name}</span>
          </div>
        )}
      </DragOverlay>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "工事スペースを編集" : "新規工事スペースを追加"} width={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label>工事名 <span style={{ color: "var(--red)" }}>*</span>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="例: 田辺邸新築工事" style={{ display: "block", width: "100%", marginTop: 5 }} />
          </label>
          <label>現場所在地
            <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="例: 大阪市住吉区" style={{ display: "block", width: "100%", marginTop: 5 }} />
          </label>
          <label>メモ
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="例: 木造2階建 延床120㎡" style={{ display: "block", width: "100%", marginTop: 5 }} />
          </label>
          <div>
            <span style={{ fontSize: 13 }}>カラー</span>
            <div style={{ display: "flex", gap: 9, marginTop: 8, flexWrap: "wrap" }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm((p) => ({ ...p, color: c }))} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: form.color === c ? "3px solid var(--text)" : "3px solid transparent", cursor: "pointer", outline: "none", transition: "border 0.12s" }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="ghost-button" onClick={() => setModalOpen(false)}>キャンセル</button>
            <button className="ghost-button" onClick={save} disabled={!form.name.trim()} style={{ background: form.name.trim() ? "var(--green)" : "var(--line)", color: form.name.trim() ? "#fff" : "var(--muted)", borderColor: "transparent" }}>保存</button>
          </div>
        </div>
      </Modal>
    </DndContext>
  );
}

/* ─────────────── 現場予定（工事スペース → 全体スケジュール連動） ─────────────── */
const SCHEDULE_TYPES: { value: Schedule["type"]; label: string }[] = [
  { value: "work", label: "作業・現場" },
  { value: "meeting", label: "会議・打合せ" },
  { value: "away", label: "外出・出張" },
  { value: "approval", label: "承認・確認" },
];

type SiteForm = {
  id: string | null;
  title: string;
  date: string;
  endDate: string;
  start: string;
  end: string;
  type: Schedule["type"];
  location: string;
  detail: string;
  members: string[];
};

function SiteScheduleTab() {
  const { state, updateState, currentUser } = useApp();
  const me = currentUser ?? state.currentUser;
  const workspaces = state.workspaces ?? [];
  const [wsId, setWsId] = useState<string>(workspaces[0]?.id ?? "");
  const [form, setForm] = useState<SiteForm | null>(null);

  const ws = workspaces.find((w) => w.id === wsId);
  const siteSchedules = useMemo(
    () =>
      state.schedules
        .filter((s) => s.workspaceId === wsId)
        .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)),
    [state.schedules, wsId],
  );

  function openNew() {
    if (!ws) return;
    setForm({
      id: null, title: "", date: TODAY, endDate: TODAY, start: "09:00", end: "17:00",
      type: "work", location: ws.location ?? "", detail: "", members: Array.from(new Set([...ws.memberIds, me])),
    });
  }
  function openEdit(s: Schedule) {
    setForm({
      id: s.id, title: s.title, date: s.date, endDate: s.endDate ?? s.date, start: s.start, end: s.end,
      type: s.type, location: s.location, detail: s.detail, members: [...s.members],
    });
  }
  function patch(p: Partial<SiteForm>) {
    setForm((f) => (f ? { ...f, ...p } : f));
  }
  function toggleMember(id: string) {
    setForm((f) => (f ? { ...f, members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id] } : f));
  }
  function save() {
    if (!form || !form.title.trim() || !wsId) return;
    const multiDay = form.endDate && form.endDate !== form.date;
    updateState((prev) => {
      const base: Schedule = {
        id: form.id ?? uid("s"),
        title: form.title.trim(),
        date: form.date,
        endDate: multiDay ? form.endDate : undefined,
        start: form.start,
        end: form.end,
        location: form.location.trim(),
        // 参加者が空だとスケジュール画面（人ベース）でどこにも出ないため、最低限 登録者本人を含める
        members: form.members.length ? form.members : [me],
        type: form.type,
        detail: form.detail.trim(),
        workspaceId: wsId,
        scheduleMode: multiDay ? "multiDay" : "single",
      };
      const exists = prev.schedules.some((s) => s.id === base.id);
      return {
        ...prev,
        schedules: exists ? prev.schedules.map((s) => (s.id === base.id ? { ...s, ...base } : s)) : [...prev.schedules, base],
      };
    });
    setForm(null);
  }
  function remove(id: string) {
    updateState((prev) => ({ ...prev, schedules: prev.schedules.filter((s) => s.id !== id) }));
    setForm(null);
  }

  const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 5 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 工事現場セレクタ */}
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1, minWidth: 240 }}>
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => setWsId(w.id)}
              style={{
                padding: "7px 14px", borderRadius: 999,
                border: `1px solid ${wsId === w.id ? w.color : "var(--line)"}`,
                background: wsId === w.id ? w.color : "transparent",
                color: wsId === w.id ? "#fff" : "var(--text)",
                fontWeight: wsId === w.id ? 600 : 400, fontSize: 13,
              }}
            >
              {w.name}
            </button>
          ))}
        </div>
        <button className="primary-button" onClick={openNew} disabled={!wsId}>＋ 現場予定を追加</button>
      </div>

      <div className="panel" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: ws?.color ?? "var(--muted)" }} />
        <span className="muted-text">ここで登録した予定は全体スケジュール・ホーム画面にも自動で反映されます</span>
      </div>

      {/* 現場予定リスト */}
      {siteSchedules.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          この工事現場の予定はまだありません。「現場予定を追加」から登録してください。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {siteSchedules.map((s) => (
            <button
              key={s.id}
              onClick={() => openEdit(s)}
              className="panel"
              style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "12px 14px", borderLeft: `4px solid ${ws?.color ?? "var(--green)"}` }}
            >
              <div style={{ minWidth: 96, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.date.slice(5)}{s.endDate ? `〜${s.endDate.slice(5)}` : ""}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.allDay ? "終日" : `${s.start}–${s.end}`}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {SCHEDULE_TYPES.find((t) => t.value === s.type)?.label}
                  {s.location ? ` ・ ${s.location}` : ""}
                  {s.members.length ? ` ・ ${s.members.map((id) => userName(state, id)).join("、")}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 追加・編集モーダル */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "現場予定を編集" : "現場予定を追加"} width={480}>
        {form && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label>件名 <span style={{ color: "var(--red)" }}>*</span>
              <input value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="例: 基礎コンクリート打設" style={inputStyle} autoFocus />
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ flex: 1 }}>開始日<input type="date" value={form.date} onChange={(e) => patch({ date: e.target.value })} style={inputStyle} /></label>
              <label style={{ flex: 1 }}>終了日<input type="date" value={form.endDate} min={form.date} onChange={(e) => patch({ endDate: e.target.value })} style={inputStyle} /></label>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ flex: 1 }}>開始時刻<input type="time" value={form.start} onChange={(e) => patch({ start: e.target.value })} style={inputStyle} /></label>
              <label style={{ flex: 1 }}>終了時刻<input type="time" value={form.end} onChange={(e) => patch({ end: e.target.value })} style={inputStyle} /></label>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ flex: 1 }}>種別
                <select value={form.type} onChange={(e) => patch({ type: e.target.value as Schedule["type"] })} style={inputStyle}>
                  {SCHEDULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label style={{ flex: 1 }}>場所<input value={form.location} onChange={(e) => patch({ location: e.target.value })} style={inputStyle} /></label>
            </div>
            <div>
              <span style={{ fontSize: 13 }}>参加者（配属メンバーを初期選択）</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {state.users.filter((u) => u.active !== false).map((u) => {
                  const on = form.members.includes(u.id);
                  const member = ws?.memberIds.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleMember(u.id)}
                      style={{ padding: "5px 10px", borderRadius: 999, fontSize: 12, border: `1px solid ${on ? "var(--green)" : "var(--line)"}`, background: on ? "rgba(63,107,91,0.12)" : "transparent", color: on ? "var(--green)" : "var(--text)", fontWeight: member ? 600 : 400 }}
                      title={member ? "この現場の配属メンバー" : undefined}>
                      {u.name}{member ? " ★" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
            <label>メモ<textarea value={form.detail} onChange={(e) => patch({ detail: e.target.value })} rows={2} style={inputStyle} /></label>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 2 }}>
              {form.id ? (
                <button className="danger-text" onClick={() => remove(form.id!)} style={{ border: 0, background: "transparent" }}>削除</button>
              ) : <span />}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="ghost-button" onClick={() => setForm(null)}>キャンセル</button>
                <button className="primary-button" onClick={save} disabled={!form.title.trim()}>保存</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─────────────── 統合ハブ（工事スペース＝親） ─────────────── */
type HubTab = "members" | "siteSchedule" | "resources" | "ledger" | "schedule" | "inspection";
const HUB_TABS: { id: HubTab; label: string }[] = [
  { id: "members", label: "メンバー配属" },
  { id: "siteSchedule", label: "現場予定" },
  { id: "resources", label: "リソース配置" },
  { id: "ledger", label: "リソース台帳" },
  { id: "schedule", label: "稼働予定" },
  { id: "inspection", label: "点検簿" },
];

export default function SpacesView() {
  const [tab, setTab] = useState<HubTab>("members");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
        {HUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "transparent",
              border: "none",
              padding: "9px 14px",
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? "var(--text)" : "var(--muted)",
              borderBottom: tab === t.id ? "2px solid var(--green)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "members" && <MemberBoard />}
      {tab === "siteSchedule" && <SiteScheduleTab />}
      {tab === "resources" && <BoardTab />}
      {tab === "ledger" && <LedgerTab />}
      {tab === "schedule" && <ScheduleTab />}
      {tab === "inspection" && <InspectionTab />}
    </div>
  );
}
