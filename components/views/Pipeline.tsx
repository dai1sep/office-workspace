"use client";

import { useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import { uid, userName } from "@/lib/utils";
import { TODAY } from "@/lib/store";
import type { Deal, DealStage, Customer, SectorKind, WorkSpace, Schedule } from "@/lib/types";

const STAGES: { id: DealStage; color: string }[] = [
  { id: "引合", color: "#8a8578" },
  { id: "見積作成", color: "#356c8a" },
  { id: "見積提出", color: "#3a7a8a" },
  { id: "受注", color: "#3f6b5b" },
  { id: "施工中", color: "#a9622a" },
  { id: "完成", color: "#5a4a8a" },
];
const STAGE_COLOR: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.id, s.color]));
const LOST_COLOR = "#b45454";
const WS_COLORS = ["#3f6b5b", "#356c8a", "#a9622a", "#b64f4f", "#5a4a8a", "#3a7a8a", "#7a5a3a", "#4a6a3a"];

function yen(n?: number) { return n == null ? "—" : "¥" + n.toLocaleString("ja-JP"); }

// ── カード（見た目） ──
function CardInner({ deal, customerName, owner, ws, dragging }: {
  deal: Deal; customerName: string; owner: string; ws?: WorkSpace; dragging?: boolean;
}) {
  const overdue = deal.termEnd && deal.termEnd < TODAY && deal.stage !== "完成" && !deal.lost;
  const md = (d: string) => d.slice(5).replace("-", "/");
  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `4px solid ${deal.lost ? LOST_COLOR : STAGE_COLOR[deal.stage]}`,
      borderRadius: 9, padding: "9px 11px", boxShadow: dragging ? "0 10px 26px rgba(0,0,0,.22)" : "var(--shadow-soft)",
      display: "flex", flexDirection: "column", gap: 6, opacity: deal.lost ? 0.72 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
        <strong style={{ fontSize: 13, lineHeight: 1.35 }}>{deal.title}</strong>
        <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "var(--soft)", color: "var(--muted)", flexShrink: 0 }}>{deal.sector}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{customerName}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{yen(deal.amount)}</span>
        {deal.execDate && <span style={{ fontSize: 10.5, color: "var(--muted)" }}>実行 {md(deal.execDate)}</span>}
      </div>
      {(deal.termStart || deal.termEnd) && (
        <div style={{ fontSize: 10.5, color: overdue ? "var(--orange)" : "var(--muted)", fontWeight: overdue ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>
          工期 {deal.termStart ? md(deal.termStart) : "—"}〜{deal.termEnd ? md(deal.termEnd) : "—"}{overdue ? " ⚠" : ""}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{owner ? `担当 ${owner}` : "担当 未設定"}</span>
        {ws && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: `${ws.color}22`, color: ws.color }}>🏗 {ws.name.length > 8 ? ws.name.slice(0, 8) + "…" : ws.name}</span>}
      </div>
    </div>
  );
}

function DraggableCard({ deal, onClick, ...rest }: {
  deal: Deal; customerName: string; owner: string; ws?: WorkSpace; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id, data: { dealId: deal.id } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); onClick(); } }}
      style={{ cursor: "grab", touchAction: "none", opacity: isDragging ? 0.35 : 1 }}>
      <motion.div whileHover={{ y: -2 }}><CardInner deal={deal} {...rest} /></motion.div>
    </div>
  );
}

function Column({ id, title, color, count, sum, children }: {
  id: string; title: string; color: string; count: number; sum: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{
      flex: "0 0 244px", display: "flex", flexDirection: "column", borderRadius: 12,
      background: isOver ? `${color}0f` : "var(--soft)", border: isOver ? `2px dashed ${color}` : "1px solid var(--line)",
      transition: "background .15s, border .15s", maxHeight: "100%",
    }}>
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
          <strong style={{ fontSize: 12.5 }}>{title}</strong>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{count}</span>
        </div>
        {sum > 0 && <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{yen(sum)}</div>}
      </div>
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", minHeight: 80 }}>
        {children}
      </div>
    </div>
  );
}

type Form = {
  id: string | null;
  customerId: string;
  newCustomer: boolean;
  newCustomerName: string;
  newCustomerKind: SectorKind;
  title: string;
  stage: DealStage;
  ownerId: string;
  amount: string;
  sector: SectorKind;
  execDate: string;
  termStart: string;
  termEnd: string;
  estimateRef: string;
  notes: string;
  lost: boolean;
};

export default function PipelineView() {
  const { state, updateState, can, currentUser } = useApp();
  const me = currentUser ?? state.currentUser;
  const deals = state.deals ?? [];
  const customers = state.customers ?? [];
  const [form, setForm] = useState<Form | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const custName = useMemo(() => new Map((state.customers ?? []).map((c) => [c.id, c.name])), [state.customers]);
  const wsById = useMemo(() => new Map(state.workspaces.map((w) => [w.id, w])), [state.workspaces]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const active = deals.filter((d) => !d.lost);
  const lost = deals.filter((d) => d.lost);
  const leadValue = active.filter((d) => d.stage === "引合" || d.stage === "見積作成" || d.stage === "見積提出").reduce((s, d) => s + (d.amount ?? 0), 0);
  const wonValue = active.filter((d) => d.stage === "受注" || d.stage === "施工中" || d.stage === "完成").reduce((s, d) => s + (d.amount ?? 0), 0);

  function dealsIn(stage: DealStage) {
    return active.filter((d) => d.stage === stage);
  }

  // ── ドラッグでステージ移動 ──
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active: a, over } = e;
    if (!over) return;
    const dealId = a.id as string;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    const target = over.id as string;

    if (target.startsWith("stage::")) {
      const stage = target.slice(7) as DealStage;
      if (deal.stage === stage && !deal.lost) return;
      // 受注へ昇格：工事現場の作成を確認
      if (stage === "受注" && !deal.workspaceId) {
        const make = typeof window !== "undefined" && window.confirm(`「${deal.title}」を受注にします。\n工事現場（スペース）を作成して紐付けますか？`);
        if (make) { promote(deal, stage); return; }
      }
      updateState((prev) => ({ ...prev, deals: prev.deals.map((d) => (d.id === dealId ? { ...d, stage, lost: false } : d)) }));
    }
  }

  // 案件 → 工事現場を生成して相互リンク（昇格）
  function promote(deal: Deal, stage: DealStage) {
    const ws: WorkSpace = {
      id: uid("ws"), name: deal.title, color: WS_COLORS[state.workspaces.length % WS_COLORS.length],
      memberIds: deal.ownerId ? [deal.ownerId] : [], location: custName.get(deal.customerId) ?? "", description: "", createdAt: TODAY,
    };
    updateState((prev) => ({
      ...prev,
      workspaces: [...prev.workspaces, ws],
      deals: prev.deals.map((d) => (d.id === deal.id ? { ...d, stage, lost: false, workspaceId: ws.id } : d)),
    }));
  }

  // ── フォーム ──
  function openNew() {
    setForm({
      id: null, customerId: customers[0]?.id ?? "", newCustomer: customers.length === 0, newCustomerName: "", newCustomerKind: "民間",
      title: "", stage: "引合", ownerId: "", amount: "", sector: "民間", execDate: "", termStart: "", termEnd: "", estimateRef: "", notes: "", lost: false,
    });
  }
  function openEdit(d: Deal) {
    setForm({
      id: d.id, customerId: d.customerId, newCustomer: false, newCustomerName: "", newCustomerKind: "民間",
      title: d.title, stage: d.stage, ownerId: d.ownerId ?? "", amount: d.amount != null ? String(d.amount) : "",
      sector: d.sector, execDate: d.execDate ?? "", termStart: d.termStart ?? "", termEnd: d.termEnd ?? "", estimateRef: d.estimateRef ?? "", notes: d.notes ?? "", lost: d.lost ?? false,
    });
  }
  function patch(p: Partial<Form>) { setForm((f) => (f ? { ...f, ...p } : f)); }

  function save() {
    if (!form) return;
    if (!form.title.trim()) return;
    let customerId = form.customerId;
    let newCust: Customer | null = null;
    if (form.newCustomer) {
      if (!form.newCustomerName.trim()) return;
      customerId = uid("c");
      newCust = { id: customerId, name: form.newCustomerName.trim(), kind: form.newCustomerKind };
    }
    if (!customerId) return;
    const amount = form.amount.trim() ? Number(form.amount.replace(/[^\d.]/g, "")) : undefined;
    const base: Deal = {
      id: form.id ?? uid("dl"),
      customerId,
      title: form.title.trim(),
      stage: form.stage,
      lost: form.lost,
      ownerId: form.ownerId || undefined,
      amount: Number.isFinite(amount) ? amount : undefined,
      sector: form.sector,
      workspaceId: form.id ? deals.find((d) => d.id === form.id)?.workspaceId : undefined,
      estimateRef: form.estimateRef.trim() || undefined,
      execDate: form.execDate || undefined,
      termStart: form.termStart || undefined,
      termEnd: form.termEnd || undefined,
      createdAt: form.id ? deals.find((d) => d.id === form.id)?.createdAt ?? TODAY : TODAY,
      notes: form.notes.trim() || undefined,
    };
    const termSchedId = `s_term_${base.id}`;
    updateState((prev) => {
      const exists = prev.deals.some((d) => d.id === base.id);
      // 受注後（現場あり）に工期が入っていればスケジュールへ自動反映
      const ws = base.workspaceId ? prev.workspaces.find((w) => w.id === base.workspaceId) : undefined;
      const reflect = ws && base.termStart && base.termEnd && !base.lost;
      let schedules = prev.schedules.filter((s) => s.id !== termSchedId);
      if (reflect) {
        // スケジュールは「参加者に自分が含まれる予定」だけ表示されるため、
        // 現場の配属メンバー＋案件担当＋設定した本人を必ず参加者に含める（空だと一覧に出ない）
        const members = Array.from(new Set([...ws!.memberIds, ...(base.ownerId ? [base.ownerId] : []), me]));
        const termSched: Schedule = {
          id: termSchedId, title: `${base.title}（工期）`, date: base.termStart!, endDate: base.termEnd!,
          start: "08:00", end: "17:00", allDay: true, location: ws!.location ?? "",
          members,
          type: "work", detail: "案件パイプラインの工期から自動反映", workspaceId: ws!.id, scheduleMode: "multiDay",
        };
        schedules = [...schedules, termSched];
      }
      return {
        ...prev,
        customers: newCust ? [...prev.customers, newCust] : prev.customers,
        deals: exists ? prev.deals.map((d) => (d.id === base.id ? base : d)) : [base, ...prev.deals],
        schedules,
      };
    });
    setForm(null);
  }
  function remove(id: string) {
    updateState((prev) => ({
      ...prev,
      deals: prev.deals.filter((d) => d.id !== id),
      schedules: prev.schedules.filter((s) => s.id !== `s_term_${id}`),
    }));
    setForm(null);
  }
  function createWorkspaceFromForm() {
    if (!form?.id) return;
    const deal = deals.find((d) => d.id === form.id);
    if (!deal) return;
    promote(deal, deal.stage === "引合" || deal.stage === "見積作成" || deal.stage === "見積提出" ? "受注" : deal.stage);
    setForm(null);
  }

  const editingDeal = form?.id ? deals.find((d) => d.id === form.id) : undefined;
  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 116px)", gap: 12 }}>
      {/* サマリー */}
      <div className="panel" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div>
          <span className="muted-text">見込み（引合〜見積提出）</span>
          <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{yen(leadValue)} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>／ {active.filter((d) => d.stage === "引合" || d.stage === "見積作成" || d.stage === "見積提出").length}件</span></div>
        </div>
        <div style={{ width: 1, height: 32, background: "var(--line)" }} />
        <div>
          <span className="muted-text">受注以降（受注〜完成）</span>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{yen(wonValue)} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>／ {active.filter((d) => d.stage === "受注" || d.stage === "施工中" || d.stage === "完成").length}件</span></div>
        </div>
        <div style={{ width: 1, height: 32, background: "var(--line)" }} />
        <button
          onClick={() => setLostOpen(true)}
          title="失注一覧" aria-label="失注一覧を開く"
          style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", border: "1px solid var(--line)", borderRadius: 999, background: "var(--panel)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--muted)" }}
        >
          <span style={{ fontSize: 15 }}>🗑</span>失注
          {lost.length > 0 && <span style={{ background: LOST_COLOR, color: "#fff", fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>{lost.length}</span>}
        </button>
        <button className="primary-button" style={{ marginLeft: "auto" }} onClick={openNew} disabled={!can("any")}>＋ 案件を追加</button>
      </div>

      {/* カンバン */}
      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
          {STAGES.map((s) => {
            const list = dealsIn(s.id);
            return (
              <Column key={s.id} id={`stage::${s.id}`} title={s.id} color={s.color} count={list.length} sum={list.reduce((a, d) => a + (d.amount ?? 0), 0)}>
                {list.map((d) => (
                  <DraggableCard key={d.id} deal={d} customerName={custName.get(d.customerId) ?? "顧客未設定"} owner={d.ownerId ? userName(state, d.ownerId) : ""} ws={d.workspaceId ? wsById.get(d.workspaceId) : undefined} onClick={() => openEdit(d)} />
                ))}
                {list.length === 0 && <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", padding: "14px 0" }}>—</div>}
              </Column>
            );
          })}
        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: "ease" }}>
          {activeDeal && <CardInner deal={activeDeal} customerName={custName.get(activeDeal.customerId) ?? ""} owner={activeDeal.ownerId ? userName(state, activeDeal.ownerId) : ""} ws={activeDeal.workspaceId ? wsById.get(activeDeal.workspaceId) : undefined} dragging />}
        </DragOverlay>
      </DndContext>

      {/* 追加・編集モーダル */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "案件を編集" : "案件を追加"} width={520}>
        {form && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* 顧客 */}
            <div className="field">
              <span>顧客 {!form.id && <button type="button" onClick={() => patch({ newCustomer: !form.newCustomer })} style={{ border: 0, background: "transparent", color: "var(--green)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{form.newCustomer ? "既存から選ぶ" : "＋ 新規顧客"}</button>}</span>
              {form.newCustomer ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={form.newCustomerName} onChange={(e) => patch({ newCustomerName: e.target.value })} placeholder="顧客名" style={{ flex: 1 }} />
                  <select value={form.newCustomerKind} onChange={(e) => patch({ newCustomerKind: e.target.value as SectorKind })}><option>民間</option><option>官公庁</option></select>
                </div>
              ) : (
                <select value={form.customerId} onChange={(e) => patch({ customerId: e.target.value })} style={{ display: "block", width: "100%", marginTop: 4 }}>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.kind}）</option>)}
                </select>
              )}
            </div>
            <label className="field"><span>案件名</span><input value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="例: 田辺邸新築工事" autoFocus style={{ display: "block", width: "100%", marginTop: 4 }} /></label>
            <div style={{ display: "flex", gap: 12 }}>
              <label className="field" style={{ flex: 1 }}><span>ステージ</span>
                <select value={form.stage} onChange={(e) => patch({ stage: e.target.value as DealStage })} style={{ display: "block", width: "100%", marginTop: 4 }}>
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
                </select>
              </label>
              <label className="field" style={{ flex: 1 }}><span>区分</span>
                <select value={form.sector} onChange={(e) => patch({ sector: e.target.value as SectorKind })} style={{ display: "block", width: "100%", marginTop: 4 }}><option>民間</option><option>官公庁</option></select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <label className="field" style={{ flex: 1 }}><span>担当</span>
                <select value={form.ownerId} onChange={(e) => patch({ ownerId: e.target.value })} style={{ display: "block", width: "100%", marginTop: 4 }}>
                  <option value="">未設定</option>
                  {state.users.filter((u) => u.active !== false).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </label>
              <label className="field" style={{ flex: 1 }}><span>金額（円）</span><input value={form.amount} onChange={(e) => patch({ amount: e.target.value })} inputMode="numeric" placeholder="例: 24000000" style={{ display: "block", width: "100%", marginTop: 4 }} /></label>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <label className="field" style={{ flex: 1 }}><span>実行日</span><input type="date" value={form.execDate} onChange={(e) => patch({ execDate: e.target.value })} style={{ display: "block", width: "100%", marginTop: 4 }} /></label>
              <label className="field" style={{ flex: 1 }}><span>見積/積算ID（任意）</span><input value={form.estimateRef} onChange={(e) => patch({ estimateRef: e.target.value })} placeholder="将来の積算AI/入札DB連携用" style={{ display: "block", width: "100%", marginTop: 4 }} /></label>
            </div>
            <div className="field">
              <span>工期{editingDeal?.workspaceId ? "（入力するとこの現場のスケジュールに自動反映）" : "（受注して現場を作成するとスケジュールへ反映されます）"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input type="date" value={form.termStart} onChange={(e) => patch({ termStart: e.target.value })} style={{ flex: 1 }} />
                <span style={{ color: "var(--muted)" }}>〜</span>
                <input type="date" value={form.termEnd} min={form.termStart} onChange={(e) => patch({ termEnd: e.target.value })} style={{ flex: 1 }} />
              </div>
            </div>
            <label className="field"><span>メモ</span><textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })} rows={2} style={{ display: "block", width: "100%", marginTop: 4 }} /></label>
            {form.id && <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}><input type="checkbox" checked={form.lost} onChange={(e) => patch({ lost: e.target.checked })} style={{ width: "auto" }} />失注として扱う</label>}

            {/* 工事現場リンク */}
            {form.id && (editingDeal?.workspaceId
              ? <div style={{ fontSize: 12, color: "var(--muted)" }}>紐付く工事現場：<strong style={{ color: "var(--text)" }}>{wsById.get(editingDeal.workspaceId)?.name ?? "（削除済み）"}</strong></div>
              : <button type="button" className="ghost-button" onClick={createWorkspaceFromForm} style={{ alignSelf: "flex-start" }}>🏗 工事現場を作成して受注に昇格</button>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 2 }}>
              {form.id ? <button className="danger-text" onClick={() => remove(form.id!)} style={{ border: 0, background: "transparent" }}>削除</button> : <span />}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="ghost-button" onClick={() => setForm(null)}>キャンセル</button>
                <button className="primary-button" onClick={save} disabled={!form.title.trim() || (form.newCustomer && !form.newCustomerName.trim())}>保存</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 失注：右からスライドインする一覧（クリックで詳細） */}
      <AnimatePresence>
        {lostOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLostOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.35)" }}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.22 }}
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 380, maxWidth: "92vw", zIndex: 8001, background: "var(--panel)", borderLeft: "1px solid var(--line)", boxShadow: "-8px 0 28px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
                <strong style={{ fontSize: 15 }}>🗑 失注 <span className="muted-text">{lost.length}件</span></strong>
                <button className="ghost-button" onClick={() => setLostOpen(false)}>閉じる</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {lost.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "32px 0" }}>失注はありません。</div>
                ) : (
                  lost.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { openEdit(d); setLostOpen(false); }}
                      style={{ textAlign: "left", background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `4px solid ${LOST_COLOR}`, borderRadius: 9, padding: "10px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                        <strong style={{ fontSize: 13 }}>{d.title}</strong>
                        <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--muted)" }}>{yen(d.amount)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {custName.get(d.customerId) ?? "顧客未設定"}
                        {d.ownerId ? ` ・ 担当 ${userName(state, d.ownerId)}` : ""}
                        {` ・ ${d.stage}で失注`}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
