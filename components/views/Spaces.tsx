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
import type { WorkSpace } from "@/lib/types";

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
    return state.schedules
      .filter((s) => s.members.some((m) => space.memberIds.includes(m)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
      .slice(0, 4);
  }, [state.schedules, space.memberIds]);

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

export default function SpacesView() {
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
