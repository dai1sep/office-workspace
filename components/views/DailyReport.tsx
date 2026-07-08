"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/context";
import { uid } from "@/lib/utils";
import { downloadDailyReportExcel, printDailyReport } from "@/lib/dailyReportExcel";
import {
  DailyReport,
  DailyReportAttendee,
  DailyReportSubcontractor,
  DailyReportEquipment,
  DailyReportMaterial,
  DailyReportSafetyItem,
} from "@/lib/types";

const WEATHER_OPTIONS = ["晴れ", "曇り", "雨", "雪", "晴れ時々曇り", "曇り時々雨"];
const APPROVAL_ROLES = ["社長", "工事部部長", "工事部次長", "統括所長", "工事担当者"];
const STATUS_FILTERS = ["すべて", "下書き", "提出済", "承認済"] as const;

const emptyForm = (): Omit<DailyReport, "id" | "createdBy" | "createdAt"> => ({
  workspaceId: "",
  meetingDate: new Date().toISOString().slice(0, 10),
  implementDate: new Date().toISOString().slice(0, 10),
  weather: "晴れ",
  plannedWork: "",
  actualWork: "",
  safetyItems: [{ who: "", toWhom: "", status: "" }],
  attendees: [{ name: "", jobType: "", present: true, startTime: "08:00", endTime: "17:00" }],
  subcontractors: [{ company: "", jobType: "", workContent: "", machineName: "", machineCount: 0, machineCumCount: 0, workers: 1, startTime: "08:00", endTime: "17:00" }],
  equipment: [{ name: "", count: 1, fuel: 0 }],
  materials: [{ name: "", type: "", receivedToday: 0, receivedTotal: 0, usedToday: 0, usedTotal: 0, remaining: 0 }],
  progressRate: 0,
  plannedDays: 0,
  remainingDays: 0,
  notes: "",
  approvals: {},
  status: "draft",
  progressItems: [
    { caseType: "CASE-A", unit: "本", totalQty: 0, todayQty: 0, cumQty: 0, remainQty: 0, progress: 0 },
    { caseType: "CASE-B", unit: "本", totalQty: 0, todayQty: 0, cumQty: 0, remainQty: 0, progress: 0 },
    { caseType: "CASE-C", unit: "本", totalQty: 0, todayQty: 0, cumQty: 0, remainQty: 0, progress: 0 },
  ],
  disasterFreeHours: 0,
});

/* ── helpers ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Inp({ value, onChange, placeholder, style }: { value: string | number; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12, ...style }} />
  );
}

function statusLabel(s: DailyReport["status"]) {
  return s === "approved" ? "承認済" : s === "submitted" ? "提出済" : "下書き";
}
function statusColor(s: DailyReport["status"]) {
  return s === "approved" ? "green" : s === "submitted" ? "blue" : "yellow";
}

const WEATHER_ICON: Record<string, string> = {
  "晴れ": "☀️", "曇り": "☁️", "雨": "🌧️", "雪": "❄️", "晴れ時々曲り": "⛅", "曇り時々雨": "🌦️",
};

function PrintView({ r, wsName, onClose }: { r: DailyReport; wsName: string; onClose: () => void }) {
  function openPrint() {
    printDailyReport(r, wsName).catch((e) => alert(String(e?.message ?? e)));
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button className="ghost-button" onClick={onClose}>← 戻る</button>
        <button className="ghost-button" onClick={openPrint}
          style={{ background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}>
          🖨 印刷 / PDF保存
        </button>
      </div>
      <div className="panel" style={{ padding: 20, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
        「印刷 / PDF保存」ボタンを押すと、工事打合簿フォーマットの印刷プレビューが開きます。
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   詳細モーダル（画面内表示）
══════════════════════════════════════════ */
function DetailPane({ r, wsName, onClose, onEdit, onApprove, onDelete }: {
  r: DailyReport; wsName: string;
  onClose: () => void;
  onEdit: () => void;
  onApprove: (role: string) => void;
  onDelete: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  if (printing) return <PrintView r={r} wsName={wsName} onClose={() => setPrinting(false)} />;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="ghost-button" onClick={onClose} style={{ fontSize: 12 }}>← 一覧</button>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{wsName} — 工事打合簿</h2>
          <span className={`status ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ghost-button" onClick={() => downloadDailyReportExcel(r, wsName).catch((e) => alert(String(e?.message ?? e)))} style={{ fontSize: 12 }}>⬇ Excel</button>
          <button className="ghost-button" onClick={() => setPrinting(true)} style={{ fontSize: 12 }}>🖨 印刷・PDF</button>
          <button className="ghost-button" onClick={onEdit} style={{ fontSize: 12 }}>編集</button>
          <button className="ghost-button" onClick={() => { if (confirm("削除しますか？")) onDelete(); }}
            style={{ fontSize: 12, color: "var(--red)" }}>削除</button>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <SectionTitle>基本情報</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 12 }}>
          {[["打合日", r.meetingDate], ["実施日", r.implementDate], ["天候", `${WEATHER_ICON[r.weather] ?? ""} ${r.weather}`], ["進捗率", `${r.progressRate}%`]].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div></div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          {[["作業予定内容", r.plannedWork], ["作業実施内容", r.actualWork]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 12, whiteSpace: "pre-wrap", background: "var(--soft)", padding: "8px 10px", borderRadius: 6, minHeight: 52 }}>{v || "—"}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>計画 {r.plannedDays}日 / 残 {r.remainingDays}日</div>
        <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(r.progressRate, 100)}%`, background: "var(--blue)", borderRadius: 4, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* 品質安全 */}
      {r.safetyItems.some(s => s.who) && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <SectionTitle>品質安全指示事項</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "var(--soft)" }}>
              {["誰が", "誰に", "確認及び是正状況"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 11 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {r.safetyItems.filter(s => s.who).map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "7px 10px" }}>{s.who}</td><td style={{ padding: "7px 10px" }}>{s.toWhom}</td><td style={{ padding: "7px 10px" }}>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 社員出面表 */}
      {r.attendees.some(a => a.name) && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <SectionTitle>社員出面表</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "var(--soft)" }}>
              {["氏名", "職種", "出欠", "就業時間"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 11 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {r.attendees.filter(a => a.name).map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "7px 10px" }}>{a.name}</td><td style={{ padding: "7px 10px" }}>{a.jobType}</td>
                  <td style={{ padding: "7px 10px" }}><span className={`status ${a.present ? "green" : "red"}`}>{a.present ? "出" : "欠"}</span></td>
                  <td style={{ padding: "7px 10px" }}>{a.startTime} ～ {a.endTime}</td>
                </tr>
              ))}
              <tr style={{ background: "var(--soft)", fontWeight: 600 }}>
                <td colSpan={2} style={{ padding: "6px 10px", fontSize: 11 }}>日計</td>
                <td colSpan={2} style={{ padding: "6px 10px" }}>{r.attendees.filter(a => a.present).length} 名</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 協力業者 */}
      {r.subcontractors.some(s => s.company) && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <SectionTitle>協力業者就業表</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "var(--soft)" }}>
              {["業者名", "工種", "実施人員", "就業時間"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 11 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {r.subcontractors.filter(s => s.company).map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "7px 10px" }}>{s.company}</td><td style={{ padding: "7px 10px" }}>{s.jobType}</td>
                  <td style={{ padding: "7px 10px" }}>{s.workers}名</td><td style={{ padding: "7px 10px" }}>{s.startTime} ～ {s.endTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 使用機械 */}
      {r.equipment.some(e => e.name) && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <SectionTitle>使用機械</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "var(--soft)" }}>
              {["機械名称", "台数", "給油量(ℓ)"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 11 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {r.equipment.filter(e => e.name).map((e, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "7px 10px" }}>{e.name}</td><td style={{ padding: "7px 10px" }}>{e.count}台</td><td style={{ padding: "7px 10px" }}>{e.fuel}ℓ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 使用資材 */}
      {r.materials.some(m => m.name) && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <SectionTitle>使用資材</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "var(--soft)" }}>
              {["資材名称", "種類", "受入(本日)", "受入(累計)", "使用(本日)", "使用(累計)", "残量"].map(h => <th key={h} style={{ padding: "5px 8px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 10 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {r.materials.filter(m => m.name).map((m, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "6px 8px" }}>{m.name}</td><td style={{ padding: "6px 8px" }}>{m.type}</td>
                  {[m.receivedToday, m.receivedTotal, m.usedToday, m.usedTotal, m.remaining].map((v, j) => (
                    <td key={j} style={{ padding: "6px 8px", textAlign: "right" }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 特記事項 */}
      {r.notes && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <SectionTitle>報告事項・特記事項</SectionTitle>
          <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{r.notes}</div>
        </div>
      )}

      {/* 承認欄 */}
      <div className="panel" style={{ marginBottom: 12 }}>
        <SectionTitle>承認欄</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
          {APPROVAL_ROLES.map(role => {
            const approved = r.approvals?.[role];
            return (
              <div key={role} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{role}</div>
                {approved
                  ? <div style={{ fontSize: 20, color: "var(--blue)" }}>✓</div>
                  : <button className="ghost-button" onClick={() => onApprove(role)} style={{ fontSize: 11, padding: "4px 10px" }}>承認する</button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   入力フォーム
══════════════════════════════════════════ */
function FormPane({ initial, workspaces, currentUser, onSave, onCancel }: {
  initial: Partial<DailyReport>;
  workspaces: { id: string; name: string }[];
  currentUser: string | null;
  onSave: (r: DailyReport, status: DailyReport["status"]) => void;
  onCancel: () => void;
}) {
  const editing = "id" in initial && initial.id;
  const [form, setForm] = useState<Omit<DailyReport, "id" | "createdBy" | "createdAt">>(() => ({
    ...emptyForm(), ...initial,
  }));
  function setF(p: Partial<typeof form>) { setForm(prev => ({ ...prev, ...p })); }
  function addRow<T>(f: keyof typeof form, empty: T) { setForm(prev => ({ ...prev, [f]: [...(prev[f] as T[]), empty] })); }
  function updRow<T>(f: keyof typeof form, i: number, p: Partial<T>) {
    setForm(prev => { const a = [...(prev[f] as T[])]; a[i] = { ...a[i], ...p }; return { ...prev, [f]: a }; });
  }
  function delRow(f: keyof typeof form, i: number) {
    setForm(prev => { const a = [...(prev[f] as unknown[])]; a.splice(i, 1); return { ...prev, [f]: a }; });
  }
  function save(status: DailyReport["status"]) {
    const now = new Date().toISOString().slice(0, 10);
    const r: DailyReport = editing
      ? { ...(initial as DailyReport), ...form, status }
      : { ...form, id: uid("dr"), createdBy: currentUser ?? "", createdAt: now, status };
    onSave(r, status);
  }

  const selStyle: React.CSSProperties = { width: "100%", padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12 };
  const taStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12, resize: "vertical" };
  const delBtn = (f: keyof typeof form, i: number) => (
    <button onClick={() => delRow(f, i)} style={{ padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button className="ghost-button" onClick={onCancel} style={{ fontSize: 12 }}>← 一覧</button>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{editing ? "日報を編集" : "新規日報作成"}</h2>
      </div>

      {/* 基本情報 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>基本情報</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>工事名</div>
            <select value={form.workspaceId} onChange={e => setF({ workspaceId: e.target.value })} style={selStyle}>
              <option value="">選択してください</option>
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>打合日</div>
            <Inp value={form.meetingDate} onChange={v => setF({ meetingDate: v })} style={{ fontFamily: "monospace" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>実施日</div>
            <Inp value={form.implementDate} onChange={v => setF({ implementDate: v })} style={{ fontFamily: "monospace" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>天候</div>
            <select value={form.weather} onChange={e => setF({ weather: e.target.value })} style={selStyle}>
              {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>進捗率 (%)</div><Inp value={form.progressRate} onChange={v => setF({ progressRate: Number(v) })} /></div>
          <div><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>計画日数</div><Inp value={form.plannedDays} onChange={v => setF({ plannedDays: Number(v) })} /></div>
          <div><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>計画日数残</div><Inp value={form.remainingDays} onChange={v => setF({ remainingDays: Number(v) })} /></div>
        </div>
      </div>

      {/* 作業内容 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>作業内容</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>作業予定内容</div><textarea value={form.plannedWork} onChange={e => setF({ plannedWork: e.target.value })} rows={4} style={taStyle} /></div>
          <div><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>作業実施内容</div><textarea value={form.actualWork} onChange={e => setF({ actualWork: e.target.value })} rows={4} style={taStyle} /></div>
        </div>
      </div>

      {/* 品質安全 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>品質安全指示事項</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 6, marginBottom: 6 }}>
          {["誰が", "誰に", "確認及び是正状況", ""].map(h => <div key={h} style={{ fontSize: 11, color: "var(--muted)" }}>{h}</div>)}
        </div>
        {form.safetyItems.map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 6, marginBottom: 6 }}>
            <Inp value={item.who} onChange={v => updRow<DailyReportSafetyItem>("safetyItems", i, { who: v })} placeholder="誰が" />
            <Inp value={item.toWhom} onChange={v => updRow<DailyReportSafetyItem>("safetyItems", i, { toWhom: v })} placeholder="誰に" />
            <Inp value={item.status} onChange={v => updRow<DailyReportSafetyItem>("safetyItems", i, { status: v })} placeholder="確認及び是正状況" />
            {delBtn("safetyItems", i)}
          </div>
        ))}
        <button className="ghost-button" onClick={() => addRow<DailyReportSafetyItem>("safetyItems", { who: "", toWhom: "", status: "" })} style={{ fontSize: 12 }}>＋ 行追加</button>
      </div>

      {/* 社員出面表 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>社員出面表</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 60px 1fr 1fr auto", gap: 6, marginBottom: 4 }}>
          {["氏名", "職種", "出欠", "開始", "終了", ""].map(h => <div key={h} style={{ fontSize: 11, color: "var(--muted)" }}>{h}</div>)}
        </div>
        {form.attendees.map((a, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 60px 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            <Inp value={a.name} onChange={v => updRow<DailyReportAttendee>("attendees", i, { name: v })} placeholder="氏名" />
            <Inp value={a.jobType} onChange={v => updRow<DailyReportAttendee>("attendees", i, { jobType: v })} placeholder="職種" />
            <select value={a.present ? "出" : "欠"} onChange={e => updRow<DailyReportAttendee>("attendees", i, { present: e.target.value === "出" })} style={{ ...selStyle, padding: "5px 4px" }}>
              <option>出</option><option>欠</option>
            </select>
            <Inp value={a.startTime} onChange={v => updRow<DailyReportAttendee>("attendees", i, { startTime: v })} />
            <Inp value={a.endTime} onChange={v => updRow<DailyReportAttendee>("attendees", i, { endTime: v })} />
            {delBtn("attendees", i)}
          </div>
        ))}
        <button className="ghost-button" onClick={() => addRow<DailyReportAttendee>("attendees", { name: "", jobType: "", present: true, startTime: "08:00", endTime: "17:00" })} style={{ fontSize: 12 }}>＋ 行追加</button>
      </div>

      {/* 協力業者 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>協力業者就業表</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2fr 1.5fr 70px 80px 80px 1fr 1fr auto", gap: 6, marginBottom: 4 }}>
          {["業者名", "工種", "作業内容", "使用機械", "台数", "累計", "人員", "開始", "終了", ""].map(h => <div key={h} style={{ fontSize: 10, color: "var(--muted)" }}>{h}</div>)}
        </div>
        {form.subcontractors.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2fr 1.5fr 70px 80px 80px 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            <Inp value={s.company} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { company: v })} placeholder="業者名" />
            <Inp value={s.jobType} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { jobType: v })} placeholder="工種" />
            <Inp value={s.workContent ?? ""} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { workContent: v })} placeholder="作業内容" />
            <Inp value={s.machineName ?? ""} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { machineName: v })} placeholder="機械名" />
            <Inp value={s.machineCount ?? 0} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { machineCount: Number(v) })} />
            <Inp value={s.machineCumCount ?? 0} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { machineCumCount: Number(v) })} />
            <Inp value={s.workers} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { workers: Number(v) })} />
            <Inp value={s.startTime} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { startTime: v })} />
            <Inp value={s.endTime} onChange={v => updRow<DailyReportSubcontractor>("subcontractors", i, { endTime: v })} />
            {delBtn("subcontractors", i)}
          </div>
        ))}
        <button className="ghost-button" onClick={() => addRow<DailyReportSubcontractor>("subcontractors", { company: "", jobType: "", workContent: "", machineName: "", machineCount: 0, machineCumCount: 0, workers: 1, startTime: "08:00", endTime: "17:00" })} style={{ fontSize: 12 }}>＋ 行追加</button>
      </div>

      {/* 使用機械 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>使用機械</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 6, marginBottom: 4 }}>
          {["機械名称", "台数", "給油量(ℓ)", ""].map(h => <div key={h} style={{ fontSize: 11, color: "var(--muted)" }}>{h}</div>)}
        </div>
        {form.equipment.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            <Inp value={e.name} onChange={v => updRow<DailyReportEquipment>("equipment", i, { name: v })} placeholder="機械名称" />
            <Inp value={e.count} onChange={v => updRow<DailyReportEquipment>("equipment", i, { count: Number(v) })} />
            <Inp value={e.fuel} onChange={v => updRow<DailyReportEquipment>("equipment", i, { fuel: Number(v) })} />
            {delBtn("equipment", i)}
          </div>
        ))}
        <button className="ghost-button" onClick={() => addRow<DailyReportEquipment>("equipment", { name: "", count: 1, fuel: 0 })} style={{ fontSize: 12 }}>＋ 行追加</button>
      </div>

      {/* 使用資材 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>使用資材</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr 1fr auto", gap: 6, marginBottom: 4 }}>
          {["資材名称", "種類", "受入(本日)", "受入(累計)", "使用(本日)", "使用(累計)", "残量", ""].map(h => <div key={h} style={{ fontSize: 10, color: "var(--muted)" }}>{h}</div>)}
        </div>
        {form.materials.map((m, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            <Inp value={m.name} onChange={v => updRow<DailyReportMaterial>("materials", i, { name: v })} placeholder="資材名称" />
            <Inp value={m.type} onChange={v => updRow<DailyReportMaterial>("materials", i, { type: v })} placeholder="種類" />
            <Inp value={m.receivedToday} onChange={v => updRow<DailyReportMaterial>("materials", i, { receivedToday: Number(v) })} />
            <Inp value={m.receivedTotal} onChange={v => updRow<DailyReportMaterial>("materials", i, { receivedTotal: Number(v) })} />
            <Inp value={m.usedToday} onChange={v => updRow<DailyReportMaterial>("materials", i, { usedToday: Number(v) })} />
            <Inp value={m.usedTotal} onChange={v => updRow<DailyReportMaterial>("materials", i, { usedTotal: Number(v) })} />
            <Inp value={m.remaining} onChange={v => updRow<DailyReportMaterial>("materials", i, { remaining: Number(v) })} />
            {delBtn("materials", i)}
          </div>
        ))}
        <button className="ghost-button" onClick={() => addRow<DailyReportMaterial>("materials", { name: "", type: "", receivedToday: 0, receivedTotal: 0, usedToday: 0, usedTotal: 0, remaining: 0 })} style={{ fontSize: 12 }}>＋ 行追加</button>
      </div>

      {/* 現場出来高 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>現場出来高</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 1fr 1fr 1fr 1fr 80px auto", gap: 6, marginBottom: 4 }}>
          {["工種/種別", "単位", "全数量", "本日", "累計", "残数量", "進捗率(%)", ""].map(h => <div key={h} style={{ fontSize: 10, color: "var(--muted)" }}>{h}</div>)}
        </div>
        {(form.progressItems ?? []).map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 1fr 1fr 1fr 1fr 80px auto", gap: 6, marginBottom: 6 }}>
            <Inp value={p.caseType} onChange={v => {
              const items = [...(form.progressItems ?? [])];
              items[i] = { ...items[i], caseType: v };
              setF({ progressItems: items });
            }} placeholder="CASE-A" />
            <Inp value={p.unit} onChange={v => {
              const items = [...(form.progressItems ?? [])];
              items[i] = { ...items[i], unit: v };
              setF({ progressItems: items });
            }} placeholder="本" />
            <Inp value={p.totalQty} onChange={v => {
              const items = [...(form.progressItems ?? [])];
              items[i] = { ...items[i], totalQty: Number(v) };
              setF({ progressItems: items });
            }} />
            <Inp value={p.todayQty} onChange={v => {
              const items = [...(form.progressItems ?? [])];
              items[i] = { ...items[i], todayQty: Number(v) };
              setF({ progressItems: items });
            }} />
            <Inp value={p.cumQty} onChange={v => {
              const items = [...(form.progressItems ?? [])];
              items[i] = { ...items[i], cumQty: Number(v) };
              setF({ progressItems: items });
            }} />
            <Inp value={p.remainQty} onChange={v => {
              const items = [...(form.progressItems ?? [])];
              items[i] = { ...items[i], remainQty: Number(v) };
              setF({ progressItems: items });
            }} />
            <Inp value={p.progress} onChange={v => {
              const items = [...(form.progressItems ?? [])];
              items[i] = { ...items[i], progress: Number(v) };
              setF({ progressItems: items });
            }} />
            <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }} onClick={() => {
              setF({ progressItems: (form.progressItems ?? []).filter((_, j) => j !== i) });
            }}>✕</button>
          </div>
        ))}
        <button className="ghost-button" onClick={() => setF({ progressItems: [...(form.progressItems ?? []), { caseType: "", unit: "本", totalQty: 0, todayQty: 0, cumQty: 0, remainQty: 0, progress: 0 }] })} style={{ fontSize: 12 }}>＋ 行追加</button>
      </div>

      {/* 特記事項 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <SectionTitle>報告事項・特記事項</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>無災害継続時間</label>
          <input type="number" value={form.disasterFreeHours ?? 0} onChange={e => setF({ disasterFreeHours: Number(e.target.value) })}
            style={{ width: 80, padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 4, fontSize: 12, background: "var(--input-bg, var(--soft))", color: "var(--text)" }} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>h</span>
        </div>
        <textarea value={form.notes} onChange={e => setF({ notes: e.target.value })} rows={3} placeholder="特記事項・連絡事項" style={taStyle} />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="ghost-button" onClick={onCancel}>キャンセル</button>
        <button className="ghost-button" onClick={() => save("draft")}>下書き保存</button>
        <motion.button className="ghost-button" whileTap={{ scale: 0.97 }} onClick={() => save("submitted")}
          style={{ background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}>提出</motion.button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   メインビュー（カラム一覧 + 詳細/フォーム）
══════════════════════════════════════════ */
export default function DailyReportView() {
  const { state, updateState, currentUser } = useApp();
  const [mode, setMode] = useState<"list" | "form" | "detail">("list");
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // フィルター
  const [wsFilter, setWsFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("すべて");

  const allReports = state.dailyReports ?? [];
  const workspaces = state.workspaces ?? [];

  const filtered = allReports
    .filter(r => wsFilter === "all" || r.workspaceId === wsFilter)
    .filter(r => statusFilter === "すべて" || statusLabel(r.status) === statusFilter)
    .sort((a, b) => b.implementDate.localeCompare(a.implementDate));

  const wsName = (id: string) => workspaces.find(w => w.id === id)?.name ?? id;

  // 工事別集計（左カラム）
  const wsCounts = workspaces.map(ws => ({
    ...ws,
    total: allReports.filter(r => r.workspaceId === ws.id).length,
    draft: allReports.filter(r => r.workspaceId === ws.id && r.status === "draft").length,
  })).filter(w => w.total > 0);

  function save(r: DailyReport) {
    const exists = allReports.some(x => x.id === r.id);
    updateState(prev => ({
      ...prev,
      dailyReports: exists
        ? (prev.dailyReports ?? []).map(x => x.id === r.id ? r : x)
        : [...(prev.dailyReports ?? []), r],
    }));
    setMode("list");
  }

  function approve(id: string, role: string) {
    updateState(prev => ({
      ...prev,
      dailyReports: (prev.dailyReports ?? []).map(r =>
        r.id === id ? { ...r, approvals: { ...r.approvals, [role]: currentUser ?? "" }, status: "approved" as const } : r
      ),
    }));
  }

  function deleteReport(id: string) {
    updateState(prev => ({
      ...prev,
      dailyReports: (prev.dailyReports ?? []).filter(r => r.id !== id),
    }));
    setMode("list");
    setDetailId(null);
  }

  const detail = allReports.find(r => r.id === detailId) ?? null;

  if (mode === "form") {
    return (
      <FormPane
        initial={editingReport ?? {}}
        workspaces={workspaces}
        currentUser={currentUser}
        onSave={r => save(r)}
        onCancel={() => setMode(detailId ? "detail" : "list")}
      />
    );
  }

  if (mode === "detail" && detail) {
    return (
      <DetailPane
        r={detail}
        wsName={wsName(detail.workspaceId)}
        onClose={() => setMode("list")}
        onEdit={() => { setEditingReport(detail); setMode("form"); }}
        onApprove={role => approve(detail.id, role)}
        onDelete={() => deleteReport(detail.id)}
      />
    );
  }

  /* ── 一覧（カラム形式） ── */
  return (
    <motion.div
      key="list"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr)", gap: 12 }}
    >
      {/* 左: 工事別サイドバー */}
      <aside className="panel" style={{ alignSelf: "start" }}>
        <div className="panel-title">工事で絞り込む</div>

        <button
          onClick={() => setWsFilter("all")}
          style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "7px 10px", border: "none", borderRadius: 6, background: wsFilter === "all" ? "var(--blue)" : "transparent", color: wsFilter === "all" ? "#fff" : "var(--text)", cursor: "pointer", fontSize: 12, marginBottom: 2 }}
        >
          <span>すべて</span><span>{allReports.length}</span>
        </button>

        {wsCounts.map(ws => (
          <button
            key={ws.id}
            onClick={() => setWsFilter(ws.id)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", border: "none", borderRadius: 6, background: wsFilter === ws.id ? "var(--blue)" : "transparent", color: wsFilter === ws.id ? "#fff" : "var(--text)", cursor: "pointer", fontSize: 12, marginBottom: 2, textAlign: "left" }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{ws.name}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {ws.draft > 0 && <span style={{ fontSize: 10, background: wsFilter === ws.id ? "rgba(255,255,255,0.3)" : "var(--yellow)", borderRadius: 4, padding: "1px 5px" }}>{ws.draft}下書</span>}
              <span style={{ fontSize: 11 }}>{ws.total}</span>
            </span>
          </button>
        ))}

        <div style={{ borderTop: "1px solid var(--line)", margin: "10px 0 8px" }} />
        <div className="panel-title" style={{ marginBottom: 6 }}>ステータス</div>
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "6px 10px", border: "none", borderRadius: 6, background: statusFilter === s ? "var(--soft)" : "transparent", color: statusFilter === s ? "var(--blue)" : "var(--text)", fontWeight: statusFilter === s ? 700 : 400, cursor: "pointer", fontSize: 12, marginBottom: 2 }}>
            <span>{s}</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              {s === "すべて" ? allReports.length : allReports.filter(r => statusLabel(r.status) === s).length}
            </span>
          </button>
        ))}
      </aside>

      {/* 右: カード一覧 */}
      <section className="panel">
        <div className="panel-title" style={{ justifyContent: "space-between" }}>
          <span>工事日報 <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>{filtered.length}件</span></span>
          <motion.button
            className="ghost-button"
            whileTap={{ scale: 0.97 }}
            onClick={() => { setEditingReport(null); setMode("form"); }}
            style={{ background: "var(--blue)", color: "#fff", borderColor: "var(--blue)", fontSize: 12 }}
          >＋ 新規日報</motion.button>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13 }}>
            該当する日報はありません。
          </div>
        )}

        {/* カードグリッド */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          <AnimatePresence>
            {filtered.map(r => {
              const ws = workspaces.find(w => w.id === r.workspaceId);
              const approvedCount = Object.keys(r.approvals ?? {}).length;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -2, boxShadow: "var(--shadow)" }}
                  onClick={() => { setDetailId(r.id); setMode("detail"); }}
                  style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--panel)", padding: "12px 14px", cursor: "pointer", position: "relative", overflow: "hidden" }}
                >
                  {/* 工事カラーバー */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: ws?.color ?? "var(--blue)", borderRadius: "10px 10px 0 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, marginTop: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, flex: 1, marginRight: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws?.name ?? "—"}</div>
                    <span className={`status ${statusColor(r.status)}`} style={{ flexShrink: 0 }}>{statusLabel(r.status)}</span>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                    {r.implementDate} ／ {WEATHER_ICON[r.weather] ?? ""} {r.weather}
                  </div>

                  {/* 進捗バー */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>
                      <span>進捗</span><span>{r.progressRate}%</span>
                    </div>
                    <div style={{ height: 5, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(r.progressRate, 100)}%`, background: ws?.color ?? "var(--blue)", borderRadius: 3 }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--muted)" }}>
                    <span>出面 {r.attendees.filter(a => a.present).length}名</span>
                    <span>承認 {approvedCount}/{APPROVAL_ROLES.length}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>
    </motion.div>
  );
}
