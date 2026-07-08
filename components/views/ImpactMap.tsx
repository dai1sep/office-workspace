"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/context";
import { userName } from "@/lib/utils";
import { TODAY } from "@/lib/store";
import type { ProgressMap, ProgressNode, ProgressNodeType, ProgressStatus } from "@/lib/types";

// ── 定数 ────────────────────────────────────────────────────────────────────
const C: Record<ProgressNodeType, { bg: string; ring: string; text: string; label: string }> = {
  goal:        { bg: "#1e3a5f", ring: "#0f2035", text: "#fff", label: "ゴール" },
  actor:       { bg: "#185FA5", ring: "#104080", text: "#fff", label: "アクター" },
  impact:      { bg: "#166534", ring: "#0f4a25", text: "#fff", label: "インパクト" },
  deliverable: { bg: "#7c3aed", ring: "#5b21b6", text: "#fff", label: "デリバラブル" },
};
const W: Record<ProgressNodeType, number> = { goal: 176, actor: 140, impact: 140, deliverable: 140 };
const H: Record<ProgressNodeType, number> = { goal: 92, actor: 74, impact: 74, deliverable: 74 };
const CHILD: Record<ProgressNodeType, ProgressNodeType | null> = { goal: "actor", actor: "impact", impact: "deliverable", deliverable: null };

const STATUS_LIST: ProgressStatus[] = ["未着手", "進行中", "確認中", "完了", "停滞"];
const STATUS: Record<ProgressStatus, { color: string; soft: string }> = {
  未着手: { color: "#9a9488", soft: "rgba(154,148,136,0.16)" },
  進行中: { color: "#c08a2d", soft: "rgba(192,138,45,0.16)" },
  確認中: { color: "#356c8a", soft: "rgba(53,108,138,0.16)" },
  完了:   { color: "#3f6b5b", soft: "rgba(63,107,91,0.16)" },
  停滞:   { color: "#a9622a", soft: "rgba(169,98,42,0.16)" },
};

function uid() { return "n" + Math.random().toString(36).slice(2, 9); }

// ── ロールアップ（枝ノードは子から集計） ──────────────────────────────────────
function childrenOf(nodes: ProgressNode[], id: string) {
  return nodes.filter((n) => n.parentId === id);
}
function effProgress(nodes: ProgressNode[], node: ProgressNode): number {
  const kids = childrenOf(nodes, node.id);
  if (kids.length === 0) return node.progress;
  return Math.round(kids.reduce((s, k) => s + effProgress(nodes, k), 0) / kids.length);
}
function derivedStatus(nodes: ProgressNode[], node: ProgressNode): ProgressStatus {
  const kids = childrenOf(nodes, node.id);
  if (kids.length === 0) return node.status;
  const st = kids.map((k) => derivedStatus(nodes, k));
  if (st.some((s) => s === "停滞")) return "停滞";
  if (st.every((s) => s === "完了")) return "完了";
  if (st.some((s) => s === "進行中" || s === "確認中" || s === "完了")) return "進行中";
  return "未着手";
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`;
}

// ── ルート ────────────────────────────────────────────────────────────────────
export default function ImpactMapView() {
  const { state, updateState } = useApp();
  const maps = state.progressMaps ?? [];
  const [activeId, setActiveId] = useState<string>(maps[0]?.id ?? "");
  const [view, setView] = useState<"map" | "board">("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.85);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [showNew, setShowNew] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const panning = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const panAnchor = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const dragging = useRef<{ id: string; mx: number; my: number; nx: number; ny: number } | null>(null);

  // アクティブなマップ（無ければ先頭にフォールバック）
  const map = maps.find((m) => m.id === activeId) ?? maps[0];
  const activeUser = useMemo(() => state.users.filter((u) => u.active !== false), [state.users]);

  function updateMap(fn: (m: ProgressMap) => ProgressMap) {
    if (!map) return;
    updateState((prev) => ({ ...prev, progressMaps: (prev.progressMaps ?? []).map((m) => (m.id === map.id ? fn(m) : m)) }));
  }
  function patchNode(id: string, patch: Partial<ProgressNode>) {
    updateMap((m) => ({ ...m, nodes: m.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }

  useEffect(() => {
    if (view !== "map") return;
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPan({ x: width * 0.26, y: height / 2 });
  }, [activeId, view]);

  // ── ポインタ操作（地図ビュー） ──
  function onBgDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".im-node")) return;
    panning.current = true;
    setIsPanning(true);
    panAnchor.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (panning.current) {
      setPan({ x: panAnchor.current.px + e.clientX - panAnchor.current.mx, y: panAnchor.current.py + e.clientY - panAnchor.current.my });
    }
    if (dragging.current) {
      const d = dragging.current;
      const dx = (e.clientX - d.mx) / scale;
      const dy = (e.clientY - d.my) / scale;
      patchNode(d.id, { x: d.nx + dx, y: d.ny + dy });
    }
  }
  function onMouseUp() { panning.current = false; dragging.current = null; setIsPanning(false); }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((s) => Math.min(2, Math.max(0.25, s * factor)));
  }
  function startNodeDrag(e: React.MouseEvent, node: ProgressNode) {
    e.stopPropagation();
    dragging.current = { id: node.id, mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y };
  }

  function dblNode(node: ProgressNode) { setEditing(node.id); setEditLabel(node.label); }
  function commitEdit() {
    if (!editing) return;
    patchNode(editing, { label: editLabel });
    setEditing(null);
  }
  function addChild(parent: ProgressNode) {
    const childType = CHILD[parent.type];
    if (!childType) return;
    const siblings = map ? map.nodes.filter((n) => n.parentId === parent.id) : [];
    const node: ProgressNode = {
      id: uid(), type: childType, label: C[childType].label, parentId: parent.id,
      x: parent.x + 300, y: parent.y + siblings.length * 92, status: "未着手", progress: 0,
    };
    updateMap((m) => ({ ...m, nodes: [...m.nodes, node] }));
    setSelected(node.id);
    setTimeout(() => { setEditing(node.id); setEditLabel(node.label); }, 60);
  }
  function deleteNode(id: string) {
    if (!map) return;
    const kill = new Set<string>();
    const q = [id];
    while (q.length) { const c = q.shift()!; kill.add(c); map.nodes.filter((n) => n.parentId === c).forEach((n) => q.push(n.id)); }
    updateMap((m) => ({ ...m, nodes: m.nodes.filter((n) => !kill.has(n.id)) }));
    setSelected(null);
  }
  function createMap() {
    if (!newTitle.trim()) return;
    const id = uid();
    const goal: ProgressNode = { id: uid(), type: "goal", label: "ゴールを入力", parentId: null, x: 0, y: 0, status: "未着手", progress: 0 };
    updateState((prev) => ({ ...prev, progressMaps: [...(prev.progressMaps ?? []), { id, title: newTitle.trim(), nodes: [goal] }] }));
    setActiveId(id); setNewTitle(""); setShowNew(false); setSelected(null);
  }

  // 空状態
  if (!map) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
        進捗マップがありません。
        <div style={{ marginTop: 12 }}>
          <button className="primary-button" onClick={() => { setShowNew(true); createMap(); }}>新規マップを作成</button>
        </div>
      </div>
    );
  }

  const nodes = map.nodes;
  const goal = nodes.find((n) => n.parentId === null) ?? nodes[0];
  const overall = goal ? effProgress(nodes, goal) : 0;
  const deliverables = nodes.filter((n) => n.type === "deliverable");
  const doneCount = deliverables.filter((n) => n.status === "完了").length;
  const selNode = selected ? nodes.find((n) => n.id === selected) ?? null : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 116px)", gap: 10 }}>
      {/* ── ツールバー ── */}
      <div className="panel" style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {maps.map((m) => (
            <button key={m.id} onClick={() => { setActiveId(m.id); setSelected(null); }} className="ghost-button"
              style={{ fontWeight: m.id === map.id ? 700 : 400, background: m.id === map.id ? "var(--soft)" : "var(--panel)" }}>
              {m.title}
            </button>
          ))}
          {showNew
            ? <span style={{ display: "flex", gap: 6 }}>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createMap()} placeholder="マップ名" autoFocus style={{ fontSize: 13, padding: "4px 8px" }} />
                <button className="primary-button" onClick={createMap}>作成</button>
                <button className="ghost-button" onClick={() => setShowNew(false)}>✕</button>
              </span>
            : <button className="ghost-button" onClick={() => setShowNew(true)}>＋ 新規</button>
          }
        </div>

        {/* ビュー切替 */}
        <div style={{ display: "flex", gap: 2, background: "var(--soft)", borderRadius: 999, padding: 3 }}>
          {([["map", "地図"], ["board", "ボード"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "5px 14px", borderRadius: 999, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", background: view === v ? "var(--green)" : "transparent", color: view === v ? "#fff" : "var(--muted)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* 全体進捗 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
          <div style={{ width: 120, height: 7, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}>
            <motion.div animate={{ width: `${overall}%` }} transition={{ duration: 0.5 }} style={{ height: "100%", background: "var(--green)", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>全体 {overall}%・完了 {doneCount}/{deliverables.length}</span>
        </div>

        {/* ズーム（地図のみ） */}
        {view === "map" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <button className="ghost-button" onClick={() => setScale((s) => Math.min(2, s + 0.1))}>＋</button>
            <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 36, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
            <button className="ghost-button" onClick={() => setScale((s) => Math.max(0.25, s - 0.1))}>－</button>
            <button className="ghost-button" onClick={() => { const el = containerRef.current; if (el) { const { width, height } = el.getBoundingClientRect(); setPan({ x: width * 0.26, y: height / 2 }); } setScale(0.85); }}>リセット</button>
          </div>
        )}
      </div>

      {/* ── 本体（ビュー ＋ インスペクタ） ── */}
      <div style={{ flex: 1, display: "flex", gap: 10, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {view === "map"
            ? <MapCanvas
                containerRef={containerRef} nodes={nodes} pan={pan} scale={scale} selected={selected} editing={editing} editLabel={editLabel}
                setEditLabel={setEditLabel} panning={isPanning}
                onBgDown={onBgDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onWheel={onWheel}
                onNodeDown={startNodeDrag} onNodeClick={(e, id) => { e.stopPropagation(); setSelected((p) => (p === id ? null : id)); }}
                onNodeDbl={dblNode} onCommitEdit={commitEdit} onClearSel={() => setSelected(null)}
                onAddChild={addChild} onDelete={deleteNode}
              />
            : <BoardView nodes={nodes} goal={goal} selected={selected} onSelect={setSelected} onAddChild={addChild} state={state} />
          }
        </div>

        {/* インスペクタ */}
        <AnimatePresence>
          {selNode && (
            <motion.div
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
              className="panel"
              style={{ width: 268, flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}
            >
              <Inspector
                node={selNode} nodes={nodes} users={activeUser}
                onPatch={(p) => patchNode(selNode.id, p)}
                onRename={() => dblNode(selNode)}
                onAddChild={() => addChild(selNode)}
                onDelete={() => deleteNode(selNode.id)}
                onClose={() => setSelected(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── インスペクタ ──────────────────────────────────────────────────────────────
function Inspector({ node, nodes, users, onPatch, onRename, onAddChild, onDelete, onClose }: {
  node: ProgressNode; nodes: ProgressNode[]; users: { id: string; name: string }[];
  onPatch: (p: Partial<ProgressNode>) => void; onRename: () => void; onAddChild: () => void; onDelete: () => void; onClose: () => void;
}) {
  const isLeaf = childrenOf(nodes, node.id).length === 0;
  const rollup = effProgress(nodes, node);
  const status = isLeaf ? node.status : derivedStatus(nodes, node);
  const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 4 };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C[node.type].bg }}>{C[node.type].label}</span>
        <button className="ghost-button" style={{ minHeight: 24, padding: "2px 8px", fontSize: 11 }} onClick={onClose}>✕</button>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{node.label}</div>
        <button className="ghost-button" style={{ marginTop: 6, minHeight: 26, fontSize: 11.5 }} onClick={onRename}>✏️ 名称を編集</button>
      </div>

      {/* 進捗 */}
      <div>
        <span className="muted-text">進捗{isLeaf ? "" : "（自動集計）"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ width: `${isLeaf ? node.progress : rollup}%`, height: "100%", background: STATUS[status].color }} />
          </div>
          <strong style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "right" }}>{isLeaf ? node.progress : rollup}%</strong>
        </div>
        {isLeaf && (
          <input type="range" min={0} max={100} step={5} value={node.progress} onChange={(e) => onPatch({ progress: Number(e.target.value) })} style={{ width: "100%", marginTop: 6 }} />
        )}
      </div>

      {/* 状態 */}
      <label className="field">
        <span>状態{isLeaf ? "" : "（自動）"}</span>
        {isLeaf ? (
          <select value={node.status} onChange={(e) => onPatch({ status: e.target.value as ProgressStatus })} style={inputStyle}>
            {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span style={{ marginTop: 4, display: "inline-block", width: "fit-content", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: STATUS[status].soft, color: STATUS[status].color }}>{status}</span>
        )}
      </label>

      {/* 担当 */}
      <label className="field">
        <span>担当</span>
        <select value={node.assigneeId ?? ""} onChange={(e) => onPatch({ assigneeId: e.target.value || undefined })} style={inputStyle}>
          <option value="">未割当</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>

      {/* 期限 */}
      <label className="field">
        <span>期限</span>
        <input type="date" value={node.due ?? ""} onChange={(e) => onPatch({ due: e.target.value || undefined })} style={inputStyle} />
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--line)" }}>
        {CHILD[node.type] && <button className="ghost-button" style={{ flex: 1 }} onClick={onAddChild}>＋ 子を追加</button>}
        {node.type !== "goal" && <button className="ghost-button danger-text" onClick={onDelete}>削除</button>}
      </div>
    </>
  );
}

// ── ボードビュー（ツリー＋進捗バー） ──────────────────────────────────────────
function BoardView({ nodes, goal, selected, onSelect, onAddChild, state }: {
  nodes: ProgressNode[]; goal?: ProgressNode; selected: string | null;
  onSelect: (id: string) => void; onAddChild: (n: ProgressNode) => void; state: ReturnType<typeof useApp>["state"];
}) {
  function Row({ node, depth }: { node: ProgressNode; depth: number }) {
    const kids = childrenOf(nodes, node.id).sort((a, b) => a.y - b.y);
    const isLeaf = kids.length === 0;
    const pct = effProgress(nodes, node);
    const status = isLeaf ? node.status : derivedStatus(nodes, node);
    const isSel = selected === node.id;
    const overdue = node.due && node.due < TODAY && status !== "完了";
    return (
      <>
        <div
          onClick={() => onSelect(node.id)}
          className="panel"
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer",
            marginLeft: depth * 22, borderLeft: `4px solid ${C[node.type].bg}`,
            boxShadow: isSel ? `0 0 0 2px var(--green)` : "var(--shadow-soft)",
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: STATUS[status].color, flexShrink: 0 }} title={status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "pre-wrap", lineHeight: 1.3 }}>{node.label.replace(/\n/g, " ")}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: STATUS[status].color, fontWeight: 700 }}>{status}</span>
              {node.assigneeId && <span>担当: {userName(state, node.assigneeId)}</span>}
              {node.due && <span style={{ color: overdue ? "var(--orange)" : "var(--muted)", fontWeight: overdue ? 700 : 400 }}>期限: {node.due}{overdue ? " ⚠" : ""}</span>}
            </div>
          </div>
          <div style={{ width: 120, height: 7, borderRadius: 4, background: "var(--line)", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: STATUS[status].color }} />
          </div>
          <strong style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", width: 38, textAlign: "right", flexShrink: 0 }}>{pct}%</strong>
          {CHILD[node.type] && (
            <button className="ghost-button" style={{ minHeight: 26, padding: "2px 8px", fontSize: 11, flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); onAddChild(node); }}>＋</button>
          )}
        </div>
        {kids.map((k) => <Row key={k.id} node={k} depth={depth + 1} />)}
      </>
    );
  }
  return (
    <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 7, paddingRight: 4 }}>
      {goal ? <Row node={goal} depth={0} /> : <div className="panel" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>ノードがありません</div>}
    </div>
  );
}

// ── 地図ビュー（キャンバス） ──────────────────────────────────────────────────
function MapCanvas(props: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodes: ProgressNode[]; pan: { x: number; y: number }; scale: number; selected: string | null; editing: string | null; editLabel: string;
  setEditLabel: (v: string) => void; panning: boolean;
  onBgDown: (e: React.MouseEvent) => void; onMouseMove: (e: React.MouseEvent) => void; onMouseUp: () => void; onWheel: (e: React.WheelEvent) => void;
  onNodeDown: (e: React.MouseEvent, n: ProgressNode) => void; onNodeClick: (e: React.MouseEvent, id: string) => void; onNodeDbl: (n: ProgressNode) => void;
  onCommitEdit: () => void; onClearSel: () => void; onAddChild: (n: ProgressNode) => void; onDelete: (id: string) => void;
}) {
  const { containerRef, nodes, pan, scale, selected, editing, editLabel, setEditLabel } = props;
  return (
    <div
      ref={containerRef}
      onMouseDown={props.onBgDown} onMouseMove={props.onMouseMove} onMouseUp={props.onMouseUp} onMouseLeave={props.onMouseUp}
      onClick={props.onClearSel} onWheel={props.onWheel}
      style={{ height: "100%", overflow: "hidden", position: "relative", borderRadius: 12, border: "1px solid var(--line)", background: "#f0f4f8", cursor: props.panning ? "grabbing" : "grab", userSelect: "none" }}
    >
      {/* ドットグリッド */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <pattern id="dot" width={28 * scale} height={28 * scale} patternUnits="userSpaceOnUse" x={pan.x % (28 * scale)} y={pan.y % (28 * scale)}>
            <circle cx={1} cy={1} r={1} fill="#c8d4e0" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot)" />
      </svg>

      {/* 接続線 */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
        <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
          {nodes.filter((n) => n.parentId).map((n) => {
            const p = nodes.find((x) => x.id === n.parentId);
            if (!p) return null;
            const done = derivedStatus(nodes, n) === "完了";
            return <path key={n.id} d={bezier(p.x + W[p.type] / 2, p.y, n.x - W[n.type] / 2, n.y)} fill="none" stroke={C[n.type].ring} strokeWidth={done ? 1.5 : 2} strokeOpacity={done ? 0.4 : 0.6} strokeDasharray={done ? "5 3" : undefined} />;
          })}
        </g>
      </svg>

      {/* ノード */}
      {nodes.map((node) => {
        const sc = scale;
        const w = W[node.type] * sc, h = H[node.type] * sc;
        const sx = pan.x + node.x * sc, sy = pan.y + node.y * sc;
        const col = C[node.type];
        const isSel = selected === node.id;
        const isEdit = editing === node.id;
        const pct = effProgress(nodes, node);
        const status = childrenOf(nodes, node.id).length === 0 ? node.status : derivedStatus(nodes, node);
        const sColor = STATUS[status].color;
        const done = status === "完了";

        return (
          <div key={node.id} className="im-node" onMouseDown={(e) => props.onNodeDown(e, node)} onClick={(e) => props.onNodeClick(e, node.id)} onDoubleClick={() => props.onNodeDbl(node)}
            style={{ position: "absolute", left: sx - w / 2, top: sy - h / 2, width: w, height: h, cursor: "grab", zIndex: isSel ? 20 : 2 }}>
            <div style={{
              width: "100%", height: "100%", borderRadius: 11 * sc, background: col.bg,
              border: `${isSel ? 3 : 2}px solid ${isSel ? "#fff" : sColor}`,
              boxShadow: isSel ? `0 0 0 3px ${sColor}, 0 10px 28px rgba(0,0,0,.3)` : "0 3px 10px rgba(0,0,0,.18)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: `${5 * sc}px ${9 * sc}px`, position: "relative", overflow: "hidden", transition: "box-shadow .15s",
            }}>
              {/* 進捗フィル（下地） */}
              <div style={{ position: "absolute", left: 0, bottom: 0, height: 3 * sc, width: `${pct}%`, background: sColor }} />
              {isEdit
                ? <textarea autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={props.onCommitEdit}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); props.onCommitEdit(); } }} onClick={(e) => e.stopPropagation()} rows={2}
                    style={{ background: "transparent", border: "none", outline: "none", color: "#fff", textAlign: "center", width: "100%", fontSize: (node.type === "goal" ? 13 : 11) * sc, fontWeight: 700, lineHeight: 1.4, resize: "none" }} />
                : <>
                    <span style={{ fontSize: (node.type === "goal" ? 13 : 11) * sc, fontWeight: node.type === "goal" ? 800 : 700, color: col.text, textAlign: "center", whiteSpace: "pre-wrap", lineHeight: 1.35, overflow: "hidden" }}>{node.label}</span>
                    {sc > 0.5 && (
                      <span style={{ marginTop: 3 * sc, display: "flex", alignItems: "center", gap: 4 * sc }}>
                        <span style={{ width: 6 * sc, height: 6 * sc, borderRadius: "50%", background: sColor, boxShadow: "0 0 0 1.5px rgba(255,255,255,.5)" }} />
                        <span style={{ fontSize: 8.5 * sc, color: `${col.text}dd`, fontWeight: 700 }}>{done ? "✓ 完了" : `${status}・${pct}%`}</span>
                      </span>
                    )}
                  </>
              }
            </div>

            {/* 選択時ミニツールバー */}
            <AnimatePresence>
              {isSel && !isEdit && (
                <motion.div initial={{ opacity: 0, y: -6, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.92 }} transition={{ duration: 0.13 }} onClick={(e) => e.stopPropagation()}
                  style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, whiteSpace: "nowrap", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 4, boxShadow: "0 4px 16px rgba(0,0,0,.14)" }}>
                  <button onClick={() => props.onNodeDbl(node)} title="名称編集" style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: "var(--soft)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>✏️</button>
                  {CHILD[node.type] && <button onClick={() => props.onAddChild(node)} title="子を追加" style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>＋</button>}
                  {node.type !== "goal" && <button onClick={() => props.onDelete(node.id)} title="削除" style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✕</button>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
