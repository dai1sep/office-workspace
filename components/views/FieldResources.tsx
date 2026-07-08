"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
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
import { uid } from "@/lib/utils";
import { TODAY } from "@/lib/store";
import type {
  FieldResource,
  FieldResourceType,
  FieldResourceStatus,
  ResourceInspection,
  InspectionResult,
} from "@/lib/types";

const TYPES: FieldResourceType[] = ["重機", "機材", "車両", "人員"];
const STATUSES: FieldResourceStatus[] = ["稼働可", "整備中", "故障"];
const RESULTS: InspectionResult[] = ["良", "要注意", "要修理"];

const TYPE_COLOR: Record<FieldResourceType, string> = {
  重機: "#a9622a",
  機材: "#356c8a",
  車両: "#3f6b5b",
  人員: "#5a4a8a",
};
const STATUS_COLOR: Record<FieldResourceStatus, string> = {
  稼働可: "var(--green)",
  整備中: "var(--orange)",
  故障: "var(--red)",
};
const RESULT_COLOR: Record<InspectionResult, string> = {
  良: "var(--green)",
  要注意: "var(--orange)",
  要修理: "var(--red)",
};

/* ─────────────── 共有：リソースのチップ ─────────────── */
function ChipInner({ res, dragging }: { res: FieldResource; dragging?: boolean }) {
  const color = TYPE_COLOR[res.type];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 11px",
        borderRadius: 10,
        background: "var(--panel)",
        border: `1px solid var(--line)`,
        borderLeft: `4px solid ${color}`,
        boxShadow: dragging ? "0 8px 24px rgba(0,0,0,0.24)" : "var(--shadow-soft)",
        userSelect: "none",
        opacity: res.status === "故障" ? 0.6 : 1,
        minWidth: 150,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{res.type}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {res.name}
      </span>
      <span style={{ marginLeft: "auto", flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[res.status] }} title={res.status} />
    </div>
  );
}

function DraggableChip({ res, from }: { res: FieldResource; from: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${res.id}::${from}`,
    data: { resourceId: res.id, from },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ cursor: "grab", touchAction: "none", opacity: isDragging ? 0.3 : 1 }}
    >
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
        <ChipInner res={res} />
      </motion.div>
    </div>
  );
}

/* ─────────────── 配置ボード ─────────────── */
function PoolDrop({ resources }: { resources: FieldResource[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });
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
        <span>未配置プール <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>{resources.length}件</span></span>
        {isOver && <span style={{ fontSize: 11, color: "var(--green)" }}>ここでドロップして未配置に戻す</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, minHeight: 52, alignItems: "flex-start" }}>
        {resources.length === 0
          ? <span style={{ color: "var(--muted)", fontSize: 12, alignSelf: "center" }}>この日はすべて配置済みです</span>
          : resources.map((r) => <DraggableChip key={r.id} res={r} from="pool" />)}
      </div>
    </div>
  );
}

function SiteColumn({
  wsId, name, color, location, resources,
}: {
  wsId: string; name: string; color: string; location?: string; resources: FieldResource[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `ws::${wsId}` });
  return (
    <motion.div
      ref={setNodeRef}
      layout
      style={{
        background: "var(--panel)",
        border: isOver ? `2px solid ${color}` : "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: isOver ? `0 0 0 5px ${color}22` : "var(--shadow-soft)",
        transition: "border 0.15s, box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ background: color, color: "#fff", padding: "11px 14px" }}>
        <strong style={{ fontSize: 14, display: "block" }}>{name}</strong>
        {location && <span style={{ fontSize: 11, opacity: 0.85 }}>{location}</span>}
        <span style={{ fontSize: 11, opacity: 0.85, display: "block" }}>配置 {resources.length}件</span>
      </div>
      <div style={{ padding: 12, minHeight: 90, flex: 1, display: "flex", flexWrap: "wrap", gap: 10, alignContent: "flex-start", background: isOver ? `${color}08` : "transparent", transition: "background 0.15s" }}>
        {resources.length === 0 ? (
          <div style={{ width: "100%", textAlign: "center", color: "var(--muted)", fontSize: 12, padding: "16px 0", borderRadius: 10, border: "2px dashed var(--line)" }}>
            ここにドラッグして配置
          </div>
        ) : (
          resources.map((r) => <DraggableChip key={r.id} res={r} from={wsId} />)
        )}
      </div>
    </motion.div>
  );
}

export function BoardTab() {
  const { state, updateState } = useApp();
  const [date, setDate] = useState(TODAY);
  const [activeId, setActiveId] = useState<string | null>(null);

  const resources = state.fieldResources ?? [];
  const workspaces = state.workspaces ?? [];
  const allocations = useMemo(
    () => (state.resourceAllocations ?? []).filter((a) => a.date === date),
    [state.resourceAllocations, date],
  );
  const byId = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);
  const allocatedIds = useMemo(() => new Set(allocations.map((a) => a.resourceId)), [allocations]);
  const pool = resources.filter((r) => !allocatedIds.has(r.id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function siteResources(wsId: string): FieldResource[] {
    return allocations
      .filter((a) => a.workspaceId === wsId)
      .map((a) => byId.get(a.resourceId))
      .filter((r): r is FieldResource => Boolean(r));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const { resourceId, from } = active.data.current as { resourceId: string; from: string };
    const target = over.id as string;

    if (target === "pool") {
      if (from === "pool") return;
      updateState((prev) => ({
        ...prev,
        resourceAllocations: (prev.resourceAllocations ?? []).filter(
          (a) => !(a.resourceId === resourceId && a.date === date),
        ),
      }));
    } else if (target.startsWith("ws::")) {
      const wsId = target.slice(4);
      if (from === wsId) return;
      updateState((prev) => {
        const others = (prev.resourceAllocations ?? []).filter(
          (a) => !(a.resourceId === resourceId && a.date === date),
        );
        return {
          ...prev,
          resourceAllocations: [...others, { id: uid("ra"), resourceId, workspaceId: wsId, date }],
        };
      });
    }
  }

  const activeRes = activeId ? byId.get(activeId.split("::")[0]) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="muted-text">日付を選び、リソースを現場カードにドラッグして段取りします</span>
          <label style={{ marginLeft: "auto", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            対象日
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: "5px 8px" }} />
          </label>
        </div>

        <PoolDrop resources={pool} />

        {workspaces.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            現場（工事スペース）がありません。「工事スペース」から現場を追加してください。
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {workspaces.map((ws) => (
              <SiteColumn
                key={ws.id}
                wsId={ws.id}
                name={ws.name}
                color={ws.color}
                location={ws.location}
                resources={siteResources(ws.id)}
              />
            ))}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 160, easing: "ease" }}>
        {activeRes && <ChipInner res={activeRes} dragging />}
      </DragOverlay>
    </DndContext>
  );
}

/* ─────────────── リソース台帳 ─────────────── */
const EMPTY_RES = { name: "", type: "重機" as FieldResourceType, status: "稼働可" as FieldResourceStatus, maker: "", notes: "" };

export function LedgerTab() {
  const { state, updateState } = useApp();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_RES);
  const resources = state.fieldResources ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_RES);
    setOpen(true);
  }
  function openEdit(r: FieldResource) {
    setEditingId(r.id);
    setForm({ name: r.name, type: r.type, status: r.status, maker: r.maker ?? "", notes: r.notes ?? "" });
    setOpen(true);
  }
  function save() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateState((prev) => ({
        ...prev,
        fieldResources: (prev.fieldResources ?? []).map((r) =>
          r.id === editingId
            ? { ...r, name: form.name.trim(), type: form.type, status: form.status, maker: form.maker.trim() || undefined, notes: form.notes.trim() || undefined }
            : r,
        ),
      }));
    } else {
      const nr: FieldResource = {
        id: uid("fr"),
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        maker: form.maker.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      updateState((prev) => ({ ...prev, fieldResources: [nr, ...(prev.fieldResources ?? [])] }));
    }
    setOpen(false);
  }
  function remove(id: string) {
    if (!confirm("このリソースと関連する配置・点検記録を削除しますか？")) return;
    updateState((prev) => ({
      ...prev,
      fieldResources: (prev.fieldResources ?? []).filter((r) => r.id !== id),
      resourceAllocations: (prev.resourceAllocations ?? []).filter((a) => a.resourceId !== id),
      resourceInspections: (prev.resourceInspections ?? []).filter((i) => i.resourceId !== id),
    }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="muted-text">重機・機材・車両・人員を登録します（{resources.length}件）</span>
        <button className="ghost-button" onClick={openCreate} style={{ background: "var(--green)", color: "#fff", borderColor: "transparent" }}>＋ リソース追加</button>
      </div>

      {TYPES.map((type) => {
        const list = resources.filter((r) => r.type === type);
        if (list.length === 0) return null;
        return (
          <section className="panel" key={type}>
            <div className="panel-title" style={{ marginBottom: 10 }}>
              <span style={{ color: TYPE_COLOR[type] }}>{type}</span>
              <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--muted)", marginLeft: 8 }}>{list.length}件</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[r.status], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13 }}>{r.name}</strong>
                    <div className="muted-text" style={{ fontSize: 11, marginTop: 2 }}>
                      {r.status}{r.maker ? ` ・ ${r.maker}` : ""}{r.notes ? ` ・ ${r.notes}` : ""}
                    </div>
                  </div>
                  <button className="ghost-button" style={{ fontSize: 12 }} onClick={() => openEdit(r)}>編集</button>
                  <button className="ghost-button danger-text" style={{ fontSize: 12 }} onClick={() => remove(r.id)}>削除</button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "リソースを編集" : "リソースを追加"} width={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label>名称 <span style={{ color: "var(--red)" }}>*</span>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="例: バックホウ 0.45" style={{ display: "block", width: "100%", marginTop: 5 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ flex: 1 }}>種類
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FieldResourceType }))} style={{ display: "block", width: "100%", marginTop: 5 }}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ flex: 1 }}>状態
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as FieldResourceStatus }))} style={{ display: "block", width: "100%", marginTop: 5 }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label>メーカー・型式
            <input value={form.maker} onChange={(e) => setForm((p) => ({ ...p, maker: e.target.value }))} placeholder="例: コマツ PC138US" style={{ display: "block", width: "100%", marginTop: 5 }} />
          </label>
          <label>備考
            <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="例: 6月末リース返却" style={{ display: "block", width: "100%", marginTop: 5 }} />
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="ghost-button" onClick={() => setOpen(false)}>キャンセル</button>
            <button className="ghost-button" onClick={save} disabled={!form.name.trim()} style={{ background: form.name.trim() ? "var(--green)" : "var(--line)", color: form.name.trim() ? "#fff" : "var(--muted)", borderColor: "transparent" }}>保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─────────────── 稼働予定 ─────────────── */
export function ScheduleTab() {
  const { state, updateState } = useApp();
  const resources = state.fieldResources ?? [];
  const workspaces = state.workspaces ?? [];
  const byId = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);
  const wsById = useMemo(() => new Map(workspaces.map((w) => [w.id, w])), [workspaces]);

  const dates = useMemo(() => {
    const set = new Set((state.resourceAllocations ?? []).map((a) => a.date));
    return [...set].sort();
  }, [state.resourceAllocations]);

  function release(id: string) {
    updateState((prev) => ({
      ...prev,
      resourceAllocations: (prev.resourceAllocations ?? []).filter((a) => a.id !== id),
    }));
  }

  if (dates.length === 0) {
    return <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>配置がまだありません。「配置ボード」でリソースを現場に割り当ててください。</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <span className="muted-text">日付ごとの配置一覧です。行の「解除」で配置を取り消します。</span>
      {dates.map((date) => {
        const dayAllocs = (state.resourceAllocations ?? []).filter((a) => a.date === date);
        return (
          <section className="panel" key={date}>
            <div className="panel-title" style={{ marginBottom: 10 }}>{date}<span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--muted)", marginLeft: 8 }}>{dayAllocs.length}件</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {dayAllocs.map((a) => {
                const r = byId.get(a.resourceId);
                const ws = wsById.get(a.workspaceId);
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: ws?.color ?? "var(--muted)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 140 }}>{ws?.name ?? "不明な現場"}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r ? TYPE_COLOR[r.type] : "var(--muted)" }}>{r?.type ?? "?"}</span>
                    <span style={{ fontSize: 13 }}>{r?.name ?? "削除済みリソース"}</span>
                    <button className="ghost-button danger-text" style={{ fontSize: 12, marginLeft: "auto" }} onClick={() => release(a.id)}>解除</button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ─────────────── 点検簿 ─────────────── */
export function InspectionTab() {
  const { state, updateState } = useApp();
  const resources = state.fieldResources ?? [];
  const byId = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);
  const me = state.users.find((u) => u.id === state.currentUser)?.name ?? "";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    resourceId: resources[0]?.id ?? "",
    date: TODAY,
    inspector: me,
    result: "良" as InspectionResult,
    note: "",
  });

  const list = useMemo(
    () => [...(state.resourceInspections ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [state.resourceInspections],
  );

  function openCreate() {
    setForm({ resourceId: resources[0]?.id ?? "", date: TODAY, inspector: me, result: "良", note: "" });
    setOpen(true);
  }
  function save() {
    if (!form.resourceId) return;
    const ni: ResourceInspection = {
      id: uid("ri"),
      resourceId: form.resourceId,
      date: form.date,
      inspector: form.inspector.trim() || "未記入",
      result: form.result,
      note: form.note.trim() || undefined,
    };
    updateState((prev) => ({ ...prev, resourceInspections: [ni, ...(prev.resourceInspections ?? [])] }));
    setOpen(false);
  }
  function remove(id: string) {
    updateState((prev) => ({ ...prev, resourceInspections: (prev.resourceInspections ?? []).filter((i) => i.id !== id) }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="muted-text">重機・機材ごとの点検記録（{list.length}件）</span>
        <button className="ghost-button" onClick={openCreate} disabled={resources.length === 0} style={{ background: "var(--green)", color: "#fff", borderColor: "transparent" }}>＋ 点検を記録</button>
      </div>

      <section className="panel">
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}>点検記録がありません。</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {list.map((i) => {
              const r = byId.get(i.resourceId);
              return (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums", minWidth: 82 }}>{i.date}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 150 }}>{r?.name ?? "削除済みリソース"}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: RESULT_COLOR[i.result], padding: "2px 8px", borderRadius: 999, border: `1px solid ${RESULT_COLOR[i.result]}` }}>{i.result}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>点検者: {i.inspector}</span>
                  {i.note && <span style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.note}</span>}
                  <button className="ghost-button danger-text" style={{ fontSize: 12, marginLeft: "auto" }} onClick={() => remove(i.id)}>削除</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="点検を記録" width={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label>対象リソース
            <select value={form.resourceId} onChange={(e) => setForm((p) => ({ ...p, resourceId: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 5 }}>
              {resources.map((r) => <option key={r.id} value={r.id}>{r.type}｜{r.name}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ flex: 1 }}>点検日
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 5 }} />
            </label>
            <label style={{ flex: 1 }}>結果
              <select value={form.result} onChange={(e) => setForm((p) => ({ ...p, result: e.target.value as InspectionResult }))} style={{ display: "block", width: "100%", marginTop: 5 }}>
                {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
          <label>点検者
            <input value={form.inspector} onChange={(e) => setForm((p) => ({ ...p, inspector: e.target.value }))} placeholder="例: 田中" style={{ display: "block", width: "100%", marginTop: 5 }} />
          </label>
          <label>所見・メモ
            <input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="例: 始業前点検 異常なし" style={{ display: "block", width: "100%", marginTop: 5 }} />
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="ghost-button" onClick={() => setOpen(false)}>キャンセル</button>
            <button className="ghost-button" onClick={save} disabled={!form.resourceId} style={{ background: form.resourceId ? "var(--green)" : "var(--line)", color: form.resourceId ? "#fff" : "var(--muted)", borderColor: "transparent" }}>保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* 各タブは工事スペース（Spaces）ハブから読み込んで利用する（統合済み） */
