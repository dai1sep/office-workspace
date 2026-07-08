"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import { uid } from "@/lib/utils";
import { TODAY } from "@/lib/store";
import type { ProcessTask, ProcessTaskStatus } from "@/lib/types";

const STATUSES: ProcessTaskStatus[] = ["未着手", "進行中", "完了", "遅延"];
const DAY_W = 26; // 1日あたりの幅(px)

// status → 色
const STATUS_COLOR: Record<ProcessTaskStatus, string> = {
  未着手: "#b9b3a6",
  進行中: "#3f6b5b",
  完了: "#3f6b5b",
  遅延: "#c2410c",
};
const STATUS_BG: Record<ProcessTaskStatus, string> = {
  未着手: "rgba(138,133,120,0.14)",
  進行中: "rgba(63,107,91,0.16)",
  完了: "rgba(63,107,91,0.16)",
  遅延: "rgba(194,65,12,0.16)",
};

// ── 日付ユーティリティ ──
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function emptyTask(workspaceId: string): ProcessTask {
  return {
    id: uid("pt"),
    workspaceId,
    name: "",
    start: TODAY,
    end: toISO(addDays(parseDate(TODAY), 4)),
    progress: 0,
    status: "未着手",
    assigneeIds: [],
    dependsOn: [],
  };
}

export default function Process() {
  const { state, updateState } = useApp();
  const workspaces = state.workspaces;
  const [wsId, setWsId] = useState<string>(workspaces[0]?.id ?? "");
  const [editing, setEditing] = useState<ProcessTask | null>(null);
  const [isNew, setIsNew] = useState(false);

  const tasks = useMemo(
    () =>
      (state.processTasks ?? [])
        .filter((t) => t.workspaceId === wsId)
        .slice()
        .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end)),
    [state.processTasks, wsId],
  );

  // タイムライン範囲
  const range = useMemo(() => {
    if (tasks.length === 0) {
      const s = parseDate(TODAY);
      return { min: addDays(s, -3), max: addDays(s, 24), days: 28 };
    }
    let min = parseDate(tasks[0].start);
    let max = parseDate(tasks[0].end);
    tasks.forEach((t) => {
      const s = parseDate(t.start);
      const e = parseDate(t.end);
      if (s < min) min = s;
      if (e > max) max = e;
    });
    min = addDays(min, -2);
    max = addDays(max, 2);
    return { min, max, days: dayDiff(min, max) + 1 };
  }, [tasks]);

  const timelineW = range.days * DAY_W;
  const todayDate = parseDate(TODAY);
  const todayInRange = todayDate >= range.min && todayDate <= range.max;
  const todayLeft = dayDiff(range.min, todayDate) * DAY_W;

  // 月見出し（月ごとに列をまとめる）
  const months = useMemo(() => {
    const out: { label: string; width: number }[] = [];
    for (let i = 0; i < range.days; i++) {
      const d = addDays(range.min, i);
      const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      const last = out[out.length - 1];
      if (last && last.label === label) last.width += DAY_W;
      else out.push({ label, width: DAY_W });
    }
    return out;
  }, [range]);

  const summary = useMemo(() => {
    const counts: Record<ProcessTaskStatus, number> = { 未着手: 0, 進行中: 0, 完了: 0, 遅延: 0 };
    tasks.forEach((t) => (counts[t.status] += 1));
    const avg = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
    return { counts, avg };
  }, [tasks]);

  function openNew() {
    if (!wsId) return;
    setEditing(emptyTask(wsId));
    setIsNew(true);
  }
  function openEdit(t: ProcessTask) {
    setEditing(structuredClone(t));
    setIsNew(false);
  }
  function patch(p: Partial<ProcessTask>) {
    setEditing((e) => (e ? { ...e, ...p } : e));
  }
  function save() {
    if (!editing || !editing.name.trim()) return;
    const t = editing;
    updateState((prev) => {
      const list = prev.processTasks ?? [];
      const exists = list.some((x) => x.id === t.id);
      return { ...prev, processTasks: exists ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t] };
    });
    setEditing(null);
  }
  function remove(id: string) {
    updateState((prev) => ({ ...prev, processTasks: (prev.processTasks ?? []).filter((x) => x.id !== id) }));
    setEditing(null);
  }

  const wsMembers = workspaces.find((w) => w.id === wsId)?.memberIds ?? [];
  const assigneeCandidates = state.users.filter((u) => u.active !== false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 工事現場セレクタ */}
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1, minWidth: 240 }}>
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => setWsId(w.id)}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: `1px solid ${wsId === w.id ? w.color : "var(--line)"}`,
                background: wsId === w.id ? w.color : "transparent",
                color: wsId === w.id ? "#fff" : "var(--text)",
                fontWeight: wsId === w.id ? 600 : 400,
                fontSize: 13,
              }}
            >
              {w.name}
            </button>
          ))}
        </div>
        <button className="primary-button" onClick={openNew} disabled={!wsId}>
          ＋ 工程を追加
        </button>
      </div>

      {/* サマリー */}
      {tasks.length > 0 && (
        <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          <div>
            <span className="muted-text" style={{ fontSize: 12 }}>全体進捗</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <div style={{ width: 160, height: 8, background: "var(--soft)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${summary.avg}%`, height: "100%", background: "var(--green)" }} />
              </div>
              <strong style={{ fontSize: 15 }}>{summary.avg}%</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STATUSES.map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: STATUS_BG[s],
                  color: STATUS_COLOR[s],
                  fontWeight: 600,
                }}
              >
                {s} {summary.counts[s]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ガントチャート */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {tasks.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            この工事現場にはまだ工程がありません。「工程を追加」から登録してください。
          </div>
        ) : (
          <div style={{ display: "flex" }}>
            {/* 左：工程名リスト（固定） */}
            <div style={{ flex: "0 0 210px", borderRight: "1px solid var(--line)" }}>
              <div style={{ height: 48, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                工程・作業
              </div>
              {tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openEdit(t)}
                  style={{ display: "block", width: "100%", textAlign: "left", height: 44, borderBottom: "1px solid var(--line)", padding: "0 14px", background: "transparent" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: STATUS_COLOR[t.status], flex: "0 0 auto" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.milestone ? "◆ " : ""}
                      {t.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* 右：タイムライン（横スクロール） */}
            <div style={{ overflowX: "auto", flex: 1 }}>
              <div style={{ width: timelineW, position: "relative" }}>
                {/* 月ヘッダ */}
                <div style={{ display: "flex", height: 24, borderBottom: "1px solid var(--line)" }}>
                  {months.map((m, i) => (
                    <div key={i} style={{ width: m.width, borderRight: "1px solid var(--line)", fontSize: 11, color: "var(--muted)", padding: "4px 6px", whiteSpace: "nowrap", overflow: "hidden" }}>
                      {m.label}
                    </div>
                  ))}
                </div>
                {/* 日ヘッダ */}
                <div style={{ display: "flex", height: 24, borderBottom: "1px solid var(--line)" }}>
                  {Array.from({ length: range.days }, (_, i) => {
                    const d = addDays(range.min, i);
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={i} style={{ width: DAY_W, borderRight: "1px solid var(--line)", fontSize: 10, textAlign: "center", lineHeight: "24px", color: weekend ? "var(--orange)" : "var(--muted)", background: weekend ? "rgba(169,98,42,0.05)" : "transparent" }}>
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>

                {/* Today マーカー */}
                {todayInRange && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: todayLeft, width: DAY_W, background: "rgba(63,107,91,0.07)", borderLeft: "1.5px solid var(--green)", pointerEvents: "none" }} />
                )}

                {/* タスク行 */}
                {tasks.map((t) => {
                  const s = parseDate(t.start);
                  const e = parseDate(t.end);
                  const left = dayDiff(range.min, s) * DAY_W;
                  const span = (dayDiff(s, e) + 1) * DAY_W;
                  return (
                    <div key={t.id} style={{ position: "relative", height: 44, borderBottom: "1px solid var(--line)" }}>
                      {t.milestone ? (
                        <div
                          onClick={() => openEdit(t)}
                          title={`${t.name}（${t.start}）`}
                          style={{ position: "absolute", top: 13, left: left + DAY_W / 2 - 9, width: 18, height: 18, background: STATUS_COLOR[t.status], transform: "rotate(45deg)", borderRadius: 3, cursor: "pointer" }}
                        />
                      ) : (
                        <div
                          onClick={() => openEdit(t)}
                          title={`${t.name}｜${t.start}〜${t.end}｜進捗${t.progress}%`}
                          style={{ position: "absolute", top: 10, left, width: Math.max(span, 8), height: 24, background: STATUS_BG[t.status], border: `1px solid ${STATUS_COLOR[t.status]}`, borderRadius: 6, cursor: "pointer", overflow: "hidden" }}
                        >
                          <div style={{ width: `${t.progress}%`, height: "100%", background: STATUS_COLOR[t.status], opacity: t.status === "完了" ? 1 : 0.85 }} />
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 6, fontSize: 11, color: t.progress > 55 ? "#fff" : "var(--text)", whiteSpace: "nowrap" }}>
                            {t.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "工程の追加" : "工程の編集"} width={520}>
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label className="field">
              <span>工程・作業名</span>
              <input value={editing.name} onChange={(e) => patch({ name: e.target.value })} placeholder="例: 基礎工事" autoFocus />
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>工区・分類（任意）</span>
                <input value={editing.category ?? ""} onChange={(e) => patch({ category: e.target.value })} placeholder="例: A工区" />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>状態</span>
                <select value={editing.status} onChange={(e) => patch({ status: e.target.value as ProcessTaskStatus })}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>開始日</span>
                <input type="date" value={editing.start} onChange={(e) => patch({ start: e.target.value })} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>終了予定日</span>
                <input type="date" value={editing.end} min={editing.start} onChange={(e) => patch({ end: e.target.value })} />
              </label>
            </div>
            <label className="field">
              <span>進捗率：{editing.progress}%</span>
              <input type="range" min={0} max={100} step={5} value={editing.progress} onChange={(e) => patch({ progress: Number(e.target.value) })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={!!editing.milestone} onChange={(e) => patch({ milestone: e.target.checked })} style={{ width: "auto" }} />
              マイルストーン（節目の日付として点表示）
            </label>

            <div className="field">
              <span>担当者</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {assigneeCandidates.map((u) => {
                  const on = (editing.assigneeIds ?? []).includes(u.id);
                  const member = wsMembers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() =>
                        patch({
                          assigneeIds: on
                            ? (editing.assigneeIds ?? []).filter((x) => x !== u.id)
                            : [...(editing.assigneeIds ?? []), u.id],
                        })
                      }
                      style={{ padding: "5px 10px", borderRadius: 999, fontSize: 12, border: `1px solid ${on ? "var(--green)" : "var(--line)"}`, background: on ? "rgba(63,107,91,0.12)" : "transparent", color: on ? "var(--green)" : "var(--text)", fontWeight: member ? 600 : 400 }}
                      title={member ? "この現場のメンバー" : undefined}
                    >
                      {u.name}
                      {member ? " ★" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {tasks.filter((x) => x.id !== editing.id).length > 0 && (
              <div className="field">
                <span>先行工程（任意）</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {tasks
                    .filter((x) => x.id !== editing.id)
                    .map((x) => {
                      const on = (editing.dependsOn ?? []).includes(x.id);
                      return (
                        <button
                          key={x.id}
                          onClick={() =>
                            patch({
                              dependsOn: on
                                ? (editing.dependsOn ?? []).filter((d) => d !== x.id)
                                : [...(editing.dependsOn ?? []), x.id],
                            })
                          }
                          style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, border: `1px solid ${on ? "var(--green)" : "var(--line)"}`, background: on ? "rgba(63,107,91,0.12)" : "transparent", color: on ? "var(--green)" : "var(--text)" }}
                        >
                          {x.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <label className="field">
              <span>メモ（任意）</span>
              <textarea value={editing.note ?? ""} onChange={(e) => patch({ note: e.target.value })} rows={2} placeholder="留意事項など" />
            </label>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
              {!isNew ? (
                <button className="danger-text" onClick={() => remove(editing.id)} style={{ border: 0, background: "transparent" }}>
                  削除
                </button>
              ) : (
                <span />
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEditing(null)}>キャンセル</button>
                <motion.button className="primary-button" onClick={save} whileTap={{ scale: 0.98 }} disabled={!editing.name.trim()}>
                  保存
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
