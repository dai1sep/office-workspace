"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────────────
type NodeType = "goal" | "actor" | "impact" | "deliverable";

interface MapNode {
  id: string;
  type: NodeType;
  label: string;
  parentId: string | null;
  x: number;
  y: number;
  done?: boolean;
}

interface MapData {
  id: string;
  title: string;
  nodes: MapNode[];
}

// ── Constants ────────────────────────────────────────────────────────────────
const C: Record<NodeType, { bg: string; ring: string; text: string; chip: string; label: string }> = {
  goal:        { bg: "#1e3a5f", ring: "#0f2035", text: "#fff", chip: "#3b82f6", label: "ゴール" },
  actor:       { bg: "#185FA5", ring: "#104080", text: "#fff", chip: "#60a5fa", label: "アクター" },
  impact:      { bg: "#166534", ring: "#0f4a25", text: "#fff", chip: "#4ade80", label: "インパクト" },
  deliverable: { bg: "#7c3aed", ring: "#5b21b6", text: "#fff", chip: "#c4b5fd", label: "デリバラブル" },
};
const W: Record<NodeType, number> = { goal: 170, actor: 138, impact: 138, deliverable: 138 };
const H: Record<NodeType, number> = { goal: 88, actor: 68, impact: 68, deliverable: 68 };
const CHILD: Record<NodeType, NodeType | null> = { goal: "actor", actor: "impact", impact: "deliverable", deliverable: null };

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED: MapData[] = [{
  id: "m1",
  title: "新規事業計画",
  nodes: [
    { id: "g1",  type: "goal",        label: "新規顧客獲得で\n売上30%増を達成",   parentId: null, x: 0,    y: 0 },
    { id: "a1",  type: "actor",       label: "見込み顧客",                        parentId: "g1", x: 300,  y: -220 },
    { id: "a2",  type: "actor",       label: "既存顧客",                          parentId: "g1", x: 300,  y: 0 },
    { id: "a3",  type: "actor",       label: "営業チーム",                        parentId: "g1", x: 300,  y: 220 },
    { id: "i1",  type: "impact",      label: "サービスを\n友人に紹介する",        parentId: "a1", x: 590,  y: -300 },
    { id: "i2",  type: "impact",      label: "問い合わせを\n自発的に増やす",      parentId: "a1", x: 590,  y: -140 },
    { id: "i3",  type: "impact",      label: "リピート購入\nを増やす",            parentId: "a2", x: 590,  y: 60 },
    { id: "i4",  type: "impact",      label: "提案数・商談数\nを増やす",          parentId: "a3", x: 590,  y: 260 },
    { id: "d1",  type: "deliverable", label: "紹介キャンペーン\nLP制作",          parentId: "i1", x: 880,  y: -340, done: true },
    { id: "d2",  type: "deliverable", label: "SNS広告\n運用開始",                 parentId: "i1", x: 880,  y: -240 },
    { id: "d3",  type: "deliverable", label: "チャットbot\n導入",                 parentId: "i2", x: 880,  y: -140 },
    { id: "d4",  type: "deliverable", label: "会員特典\nプログラム策定",          parentId: "i3", x: 880,  y: 60,  done: true },
    { id: "d5",  type: "deliverable", label: "営業支援ツール\n整備",              parentId: "i4", x: 880,  y: 220 },
    { id: "d6",  type: "deliverable", label: "提案資料\nテンプレ化",              parentId: "i4", x: 880,  y: 320 },
  ],
}];

// ── Bezier connection ────────────────────────────────────────────────────────
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`;
}

// ── ImpactMap view ────────────────────────────────────────────────────────────
export default function ImpactMapView() {
  const [maps, setMaps] = useState<MapData[]>(SEED);
  const [activeId, setActiveId] = useState("m1");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.85);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const panning = useRef(false);
  const panAnchor = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const dragging = useRef<{ id: string; mx: number; my: number; nx: number; ny: number } | null>(null);

  const map = maps.find((m) => m.id === activeId)!;

  function updateMap(fn: (m: MapData) => MapData) {
    setMaps((all) => all.map((m) => m.id === activeId ? fn(m) : m));
  }

  // Center on mount / map switch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPan({ x: width * 0.28, y: height / 2 });
  }, [activeId]);

  // ── Pointer handlers ──────────────────────────────────────────────────────
  function onBgDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".im-node")) return;
    panning.current = true;
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
      updateMap((m) => ({ ...m, nodes: m.nodes.map((n) => n.id === d.id ? { ...n, x: d.nx + dx, y: d.ny + dy } : n) }));
    }
  }

  function onMouseUp() { panning.current = false; dragging.current = null; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((s) => Math.min(2, Math.max(0.25, s * factor)));
  }

  function startNodeDrag(e: React.MouseEvent, node: MapNode) {
    e.stopPropagation();
    dragging.current = { id: node.id, mx: e.clientX, my: e.clientY, nx: node.x, ny: node.y };
  }

  function clickNode(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setSelected((prev) => prev === id ? null : id);
  }

  function dblNode(node: MapNode) {
    setEditing(node.id);
    setEditLabel(node.label);
  }

  function commitEdit() {
    if (!editing) return;
    updateMap((m) => ({ ...m, nodes: m.nodes.map((n) => n.id === editing ? { ...n, label: editLabel } : n) }));
    setEditing(null);
  }

  function addChild(parent: MapNode) {
    const childType = CHILD[parent.type];
    if (!childType) return;
    const siblings = map.nodes.filter((n) => n.parentId === parent.id);
    const newNode: MapNode = {
      id: uid(), type: childType,
      label: C[childType].label,
      parentId: parent.id,
      x: parent.x + 300,
      y: parent.y + siblings.length * 90,
    };
    updateMap((m) => ({ ...m, nodes: [...m.nodes, newNode] }));
    setSelected(newNode.id);
    // auto-edit after render
    setTimeout(() => { setEditing(newNode.id); setEditLabel(newNode.label); }, 60);
  }

  function toggleDone(id: string) {
    updateMap((m) => ({ ...m, nodes: m.nodes.map((n) => n.id === id ? { ...n, done: !n.done } : n) }));
  }

  function deleteNode(id: string) {
    const kill = new Set<string>();
    const q = [id];
    while (q.length) { const c = q.shift()!; kill.add(c); map.nodes.filter((n) => n.parentId === c).forEach((n) => q.push(n.id)); }
    updateMap((m) => ({ ...m, nodes: m.nodes.filter((n) => !kill.has(n.id)) }));
    setSelected(null);
  }

  function createMap() {
    if (!newTitle.trim()) return;
    const id = uid();
    const goal: MapNode = { id: uid(), type: "goal", label: "ゴールを入力", parentId: null, x: 0, y: 0 };
    setMaps((all) => [...all, { id, title: newTitle.trim(), nodes: [goal] }]);
    setActiveId(id);
    setNewTitle(""); setShowNew(false);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const deliverables = map.nodes.filter((n) => n.type === "deliverable");
  const done = deliverables.filter((n) => n.done).length;
  const progress = deliverables.length ? Math.round((done / deliverables.length) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 116px)", gap: 10 }}>

      {/* ── Toolbar ── */}
      <div className="panel" style={{ padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {/* Map tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {maps.map((m) => (
            <button key={m.id} onClick={() => setActiveId(m.id)} className="ghost-button"
              style={{ fontWeight: m.id === activeId ? 700 : 400, background: m.id === activeId ? "var(--soft)" : "var(--panel)" }}>
              {m.title}
            </button>
          ))}
          {showNew
            ? <span style={{ display: "flex", gap: 6 }}>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createMap()} placeholder="マップ名" autoFocus style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)" }} />
                <button className="ghost-button" onClick={createMap} style={{ background: "var(--green)", color: "#fff", borderColor: "var(--green)" }}>作成</button>
                <button className="ghost-button" onClick={() => setShowNew(false)}>✕</button>
              </span>
            : <button className="ghost-button" onClick={() => setShowNew(true)}>＋ 新規</button>
          }
        </div>

        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
          <div style={{ width: 100, height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} style={{ height: "100%", background: "#10b981", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{done}/{deliverables.length} 完了 ({progress}%)</span>
        </div>

        {/* Zoom */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <button className="ghost-button" onClick={() => setScale((s) => Math.min(2, s + 0.1))}>＋</button>
          <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 36, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
          <button className="ghost-button" onClick={() => setScale((s) => Math.max(0.25, s - 0.1))}>－</button>
          <button className="ghost-button" onClick={() => {
            const el = containerRef.current;
            if (el) { const { width, height } = el.getBoundingClientRect(); setPan({ x: width * 0.28, y: height / 2 }); }
            setScale(0.85);
          }}>リセット</button>
          <button className="ghost-button" onClick={() => setShowLegend((v) => !v)}>{showLegend ? "凡例を隠す" : "凡例"}</button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        onMouseDown={onBgDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={() => setSelected(null)}
        onWheel={onWheel}
        style={{ flex: 1, overflow: "hidden", position: "relative", borderRadius: 12, border: "1px solid var(--line)", background: "#f0f4f8", cursor: panning.current ? "grabbing" : "grab", userSelect: "none" }}
      >
        {/* Dot grid */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <defs>
            <pattern id="dot" width={28 * scale} height={28 * scale} patternUnits="userSpaceOnUse"
              x={pan.x % (28 * scale)} y={pan.y % (28 * scale)}>
              <circle cx={1} cy={1} r={1} fill="#c8d4e0" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot)" />
        </svg>

        {/* SVG connections */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
          <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
            {map.nodes.filter((n) => n.parentId).map((n) => {
              const p = map.nodes.find((x) => x.id === n.parentId);
              if (!p) return null;
              const x1 = p.x + W[p.type] / 2, y1 = p.y;
              const x2 = n.x - W[n.type] / 2, y2 = n.y;
              return (
                <path key={n.id} d={bezier(x1, y1, x2, y2)}
                  fill="none" stroke={C[n.type].ring} strokeWidth={n.done ? 1.5 : 2}
                  strokeOpacity={n.done ? 0.4 : 0.65} strokeDasharray={n.done ? "5 3" : undefined} />
              );
            })}
          </g>
        </svg>

        {/* Nodes */}
        {map.nodes.map((node) => {
          const sc = scale;
          const w = W[node.type] * sc, h = H[node.type] * sc;
          const sx = pan.x + node.x * sc, sy = pan.y + node.y * sc;
          const col = C[node.type];
          const isSel = selected === node.id;
          const isEdit = editing === node.id;

          return (
            <div
              key={node.id}
              className="im-node"
              onMouseDown={(e) => startNodeDrag(e, node)}
              onClick={(e) => clickNode(e, node.id)}
              onDoubleClick={() => dblNode(node)}
              style={{
                position: "absolute",
                left: sx - w / 2, top: sy - h / 2,
                width: w, height: h,
                cursor: "grab",
                zIndex: isSel ? 20 : 2,
              }}
            >
              {/* Node body */}
              <div style={{
                width: "100%", height: "100%", borderRadius: 10 * sc,
                background: node.done ? "#d1d5db" : col.bg,
                border: `${isSel ? 3 : 1.5}px solid ${isSel ? "#fff" : col.ring}`,
                boxShadow: isSel
                  ? `0 0 0 3px ${col.ring}80, 0 10px 28px rgba(0,0,0,.3)`
                  : "0 3px 10px rgba(0,0,0,.18)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: `${5 * sc}px ${8 * sc}px`,
                opacity: node.done ? 0.65 : 1,
                transition: "box-shadow .15s, opacity .2s",
              }}>
                {isEdit
                  ? <textarea
                      autoFocus value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); } }}
                      onClick={(e) => e.stopPropagation()}
                      rows={2}
                      style={{
                        background: "transparent", border: "none", outline: "none",
                        color: "#fff", textAlign: "center", width: "100%",
                        fontSize: (node.type === "goal" ? 13 : 11) * sc,
                        fontWeight: 700, lineHeight: 1.4, resize: "none",
                      }}
                    />
                  : <>
                      <span style={{
                        fontSize: (node.type === "goal" ? 13 : 11) * sc,
                        fontWeight: node.type === "goal" ? 800 : 700,
                        color: node.done ? "#6b7280" : col.text,
                        textAlign: "center", whiteSpace: "pre-wrap", lineHeight: 1.4,
                        overflow: "hidden",
                        textDecoration: node.done ? "line-through" : "none",
                      }}>
                        {node.label}
                      </span>
                      {sc > 0.5 && (
                        <span style={{
                          fontSize: 8.5 * sc, marginTop: 3 * sc,
                          color: node.done ? "#9ca3af" : `${col.text}90`,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          {node.done ? "✓ 完了" : col.label}
                        </span>
                      )}
                    </>
                }
              </div>

              {/* Action toolbar (selected) */}
              <AnimatePresence>
                {isSel && !isEdit && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.92 }}
                    transition={{ duration: 0.13 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex", gap: 4, whiteSpace: "nowrap",
                      background: "var(--panel)", border: "1px solid var(--line)",
                      borderRadius: 8, padding: 4, boxShadow: "0 4px 16px rgba(0,0,0,.14)",
                    }}
                  >
                    <button onClick={() => dblNode(node)} title="編集"
                      style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: "var(--soft)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                      ✏️
                    </button>
                    {CHILD[node.type] && (
                      <button onClick={() => addChild(node)} title="子ノードを追加"
                        style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: "#185FA5", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                        ＋
                      </button>
                    )}
                    {node.type === "deliverable" && (
                      <button onClick={() => toggleDone(node.id)} title={node.done ? "未完了に戻す" : "完了にする"}
                        style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: node.done ? "#d1fae5" : "#f0fdf4", color: "#166534", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                        {node.done ? "↩" : "✓"}
                      </button>
                    )}
                    {node.type !== "goal" && (
                      <button onClick={() => deleteNode(node.id)} title="削除"
                        style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                        ✕
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Legend */}
        <AnimatePresence>
          {showLegend && (
            <motion.div
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
              style={{
                position: "absolute", top: 12, right: 12,
                background: "var(--panel)", border: "1px solid var(--line)",
                borderRadius: 10, padding: "10px 14px", fontSize: 11,
                boxShadow: "0 3px 12px rgba(0,0,0,.1)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>インパクトマッピング</div>
              {(["goal","actor","impact","deliverable"] as NodeType[]).map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <span style={{ width: 26, height: 14, borderRadius: 3, background: C[t].bg, display: "block", flexShrink: 0 }} />
                  <span style={{ color: "var(--muted)" }}>{C[t].label}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 7, lineHeight: 1.8 }}>
                クリック: 選択<br />
                ダブルクリック: 編集<br />
                ドラッグ: 移動<br />
                スクロール: ズーム
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
