"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/context";
import { uid } from "@/lib/utils";
import { DailyReport, DailyReportAttendee, DailyReportSubcontractor, DailyReportEquipment, DailyReportMaterial, DailyReportSafetyItem } from "@/lib/types";

const WEATHER_OPTIONS = ["晴れ", "曇り", "雨", "雪", "晴れ時々曇り", "曇り時々雨"];
const APPROVAL_ROLES = ["社長", "工事部部長", "工事部次長", "統括所長", "工事担当者"];

const emptyForm = (): Omit<DailyReport, "id" | "createdBy" | "createdAt"> => ({
  workspaceId: "",
  meetingDate: new Date().toISOString().slice(0, 10),
  implementDate: new Date().toISOString().slice(0, 10),
  weather: "晴れ",
  plannedWork: "",
  actualWork: "",
  safetyItems: [{ who: "", toWhom: "", status: "" }],
  attendees: [{ name: "", jobType: "", present: true, startTime: "08:00", endTime: "17:00" }],
  subcontractors: [{ company: "", jobType: "", workers: 1, startTime: "08:00", endTime: "17:00" }],
  equipment: [{ name: "", count: 1, fuel: 0 }],
  materials: [{ name: "", type: "", receivedToday: 0, receivedTotal: 0, usedToday: 0, usedTotal: 0, remaining: 0 }],
  progressRate: 0,
  plannedDays: 0,
  remainingDays: 0,
  notes: "",
  approvals: {},
  status: "draft",
});

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, style }: { value: string | number; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12, ...style }}
    />
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`status ${color}`}>{label}</span>;
}

function statusBadge(status: DailyReport["status"]) {
  if (status === "approved") return <Badge label="承認済" color="green" />;
  if (status === "submitted") return <Badge label="提出済" color="blue" />;
  return <Badge label="下書き" color="yellow" />;
}

export default function DailyReportView() {
  const { state, updateState, currentUser } = useApp();
  const [mode, setMode] = useState<"list" | "form" | "detail">("list");
  const [editing, setEditing] = useState<DailyReport | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [detailId, setDetailId] = useState<string | null>(null);

  const reports = (state.dailyReports ?? []).sort((a, b) => b.implementDate.localeCompare(a.implementDate));
  const detail = reports.find((r) => r.id === detailId) ?? null;

  const workspaceName = (id: string) => state.workspaces?.find((w) => w.id === id)?.name ?? id;

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setMode("form");
  }

  function openEdit(r: DailyReport) {
    setEditing(r);
    setForm({ ...r });
    setMode("form");
  }

  function openDetail(id: string) {
    setDetailId(id);
    setMode("detail");
  }

  function setF(partial: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function save(status: DailyReport["status"]) {
    const now = new Date().toISOString().slice(0, 10);
    if (editing) {
      updateState((prev) => ({
        ...prev,
        dailyReports: (prev.dailyReports ?? []).map((r) =>
          r.id === editing.id ? { ...editing, ...form, status } : r
        ),
      }));
    } else {
      const newReport: DailyReport = {
        ...form,
        id: uid("dr"),
        createdBy: currentUser ?? state.currentUser,
        createdAt: now,
        status,
      };
      updateState((prev) => ({
        ...prev,
        dailyReports: [...(prev.dailyReports ?? []), newReport],
      }));
    }
    setMode("list");
  }

  function approve(id: string, role: string) {
    updateState((prev) => ({
      ...prev,
      dailyReports: (prev.dailyReports ?? []).map((r) =>
        r.id === id
          ? { ...r, approvals: { ...r.approvals, [role]: currentUser ?? state.currentUser }, status: "approved" as const }
          : r
      ),
    }));
  }

  function deleteReport(id: string) {
    updateState((prev) => ({
      ...prev,
      dailyReports: (prev.dailyReports ?? []).filter((r) => r.id !== id),
    }));
    setMode("list");
  }

  function addRow<T>(field: keyof typeof form, empty: T) {
    setForm((prev) => ({ ...prev, [field]: [...(prev[field] as T[]), empty] }));
  }

  function updateRow<T>(field: keyof typeof form, idx: number, patch: Partial<T>) {
    setForm((prev) => {
      const arr = [...(prev[field] as T[])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [field]: arr };
    });
  }

  function removeRow(field: keyof typeof form, idx: number) {
    setForm((prev) => {
      const arr = [...(prev[field] as unknown[])];
      arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });
  }

  if (mode === "form") {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button className="ghost-button" onClick={() => setMode("list")} style={{ fontSize: 12 }}>← 一覧</button>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{editing ? "日報を編集" : "新規日報作成"}</h2>
        </div>

        {/* 基本情報 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>基本情報</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>工事名</div>
              <select value={form.workspaceId} onChange={(e) => setF({ workspaceId: e.target.value })} style={{ width: "100%", padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12 }}>
                <option value="">選択してください</option>
                {(state.workspaces ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>打合日</div>
              <Input value={form.meetingDate} onChange={(v) => setF({ meetingDate: v })} style={{ fontFamily: "monospace" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>実施日</div>
              <Input value={form.implementDate} onChange={(v) => setF({ implementDate: v })} style={{ fontFamily: "monospace" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>天候</div>
              <select value={form.weather} onChange={(e) => setF({ weather: e.target.value })} style={{ width: "100%", padding: "5px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12 }}>
                {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>進捗率 (%)</div>
                <Input value={form.progressRate} onChange={(v) => setF({ progressRate: Number(v) })} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>計画日数</div>
                <Input value={form.plannedDays} onChange={(v) => setF({ plannedDays: Number(v) })} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>計画日数残</div>
                <Input value={form.remainingDays} onChange={(v) => setF({ remainingDays: Number(v) })} />
              </div>
            </div>
          </div>
        </div>

        {/* 作業内容 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>作業内容</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>作業予定内容</div>
              <textarea value={form.plannedWork} onChange={(e) => setF({ plannedWork: e.target.value })} rows={4} style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12, resize: "vertical" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>作業実施内容</div>
              <textarea value={form.actualWork} onChange={(e) => setF({ actualWork: e.target.value })} rows={4} style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12, resize: "vertical" }} />
            </div>
          </div>
        </div>

        {/* 品質安全指示事項 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>品質安全指示事項</SectionTitle>
          {form.safetyItems.map((item, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 8, marginBottom: 6 }}>
              <Input value={item.who} onChange={(v) => updateRow<DailyReportSafetyItem>("safetyItems", i, { who: v })} placeholder="誰が" />
              <Input value={item.toWhom} onChange={(v) => updateRow<DailyReportSafetyItem>("safetyItems", i, { toWhom: v })} placeholder="誰に" />
              <Input value={item.status} onChange={(v) => updateRow<DailyReportSafetyItem>("safetyItems", i, { status: v })} placeholder="確認及び是正状況" />
              <button onClick={() => removeRow("safetyItems", i)} style={{ padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ))}
          <button className="ghost-button" onClick={() => addRow<DailyReportSafetyItem>("safetyItems", { who: "", toWhom: "", status: "" })} style={{ fontSize: 12, marginTop: 4 }}>＋ 行追加</button>
        </div>

        {/* 社員出面表 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>社員出面表</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 60px 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            {["氏名", "職種", "出欠", "開始", "終了", ""].map((h) => <div key={h} style={{ fontSize: 11, color: "var(--muted)" }}>{h}</div>)}
          </div>
          {form.attendees.map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 60px 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
              <Input value={a.name} onChange={(v) => updateRow<DailyReportAttendee>("attendees", i, { name: v })} placeholder="氏名" />
              <Input value={a.jobType} onChange={(v) => updateRow<DailyReportAttendee>("attendees", i, { jobType: v })} placeholder="職種" />
              <select value={a.present ? "出" : "欠"} onChange={(e) => updateRow<DailyReportAttendee>("attendees", i, { present: e.target.value === "出" })} style={{ padding: "5px 4px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12 }}>
                <option>出</option><option>欠</option>
              </select>
              <Input value={a.startTime} onChange={(v) => updateRow<DailyReportAttendee>("attendees", i, { startTime: v })} placeholder="08:00" />
              <Input value={a.endTime} onChange={(v) => updateRow<DailyReportAttendee>("attendees", i, { endTime: v })} placeholder="17:00" />
              <button onClick={() => removeRow("attendees", i)} style={{ padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ))}
          <button className="ghost-button" onClick={() => addRow<DailyReportAttendee>("attendees", { name: "", jobType: "", present: true, startTime: "08:00", endTime: "17:00" })} style={{ fontSize: 12 }}>＋ 行追加</button>
        </div>

        {/* 協力業者 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>協力業者就業表</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 60px 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            {["業者名", "工種", "人員", "開始", "終了", ""].map((h) => <div key={h} style={{ fontSize: 11, color: "var(--muted)" }}>{h}</div>)}
          </div>
          {form.subcontractors.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 60px 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
              <Input value={s.company} onChange={(v) => updateRow<DailyReportSubcontractor>("subcontractors", i, { company: v })} placeholder="業者名" />
              <Input value={s.jobType} onChange={(v) => updateRow<DailyReportSubcontractor>("subcontractors", i, { jobType: v })} placeholder="工種" />
              <Input value={s.workers} onChange={(v) => updateRow<DailyReportSubcontractor>("subcontractors", i, { workers: Number(v) })} />
              <Input value={s.startTime} onChange={(v) => updateRow<DailyReportSubcontractor>("subcontractors", i, { startTime: v })} placeholder="08:00" />
              <Input value={s.endTime} onChange={(v) => updateRow<DailyReportSubcontractor>("subcontractors", i, { endTime: v })} placeholder="17:00" />
              <button onClick={() => removeRow("subcontractors", i)} style={{ padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ))}
          <button className="ghost-button" onClick={() => addRow<DailyReportSubcontractor>("subcontractors", { company: "", jobType: "", workers: 1, startTime: "08:00", endTime: "17:00" })} style={{ fontSize: 12 }}>＋ 行追加</button>
        </div>

        {/* 使用機械 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>使用機械</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            {["機械名称", "台数", "給油量(ℓ)", ""].map((h) => <div key={h} style={{ fontSize: 11, color: "var(--muted)" }}>{h}</div>)}
          </div>
          {form.equipment.map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
              <Input value={e.name} onChange={(v) => updateRow<DailyReportEquipment>("equipment", i, { name: v })} placeholder="機械名称" />
              <Input value={e.count} onChange={(v) => updateRow<DailyReportEquipment>("equipment", i, { count: Number(v) })} />
              <Input value={e.fuel} onChange={(v) => updateRow<DailyReportEquipment>("equipment", i, { fuel: Number(v) })} />
              <button onClick={() => removeRow("equipment", i)} style={{ padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ))}
          <button className="ghost-button" onClick={() => addRow<DailyReportEquipment>("equipment", { name: "", count: 1, fuel: 0 })} style={{ fontSize: 12 }}>＋ 行追加</button>
        </div>

        {/* 使用資材 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>使用資材</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            {["資材名称", "種類", "受入(本日)", "受入(累計)", "使用(本日)", "使用(累計)", "残量", ""].map((h) => <div key={h} style={{ fontSize: 10, color: "var(--muted)" }}>{h}</div>)}
          </div>
          {form.materials.map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
              <Input value={m.name} onChange={(v) => updateRow<DailyReportMaterial>("materials", i, { name: v })} placeholder="資材名称" />
              <Input value={m.type} onChange={(v) => updateRow<DailyReportMaterial>("materials", i, { type: v })} placeholder="種類" />
              <Input value={m.receivedToday} onChange={(v) => updateRow<DailyReportMaterial>("materials", i, { receivedToday: Number(v) })} />
              <Input value={m.receivedTotal} onChange={(v) => updateRow<DailyReportMaterial>("materials", i, { receivedTotal: Number(v) })} />
              <Input value={m.usedToday} onChange={(v) => updateRow<DailyReportMaterial>("materials", i, { usedToday: Number(v) })} />
              <Input value={m.usedTotal} onChange={(v) => updateRow<DailyReportMaterial>("materials", i, { usedTotal: Number(v) })} />
              <Input value={m.remaining} onChange={(v) => updateRow<DailyReportMaterial>("materials", i, { remaining: Number(v) })} />
              <button onClick={() => removeRow("materials", i)} style={{ padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ))}
          <button className="ghost-button" onClick={() => addRow<DailyReportMaterial>("materials", { name: "", type: "", receivedToday: 0, receivedTotal: 0, usedToday: 0, usedTotal: 0, remaining: 0 })} style={{ fontSize: 12 }}>＋ 行追加</button>
        </div>

        {/* 特記事項 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>報告事項・特記事項</SectionTitle>
          <textarea value={form.notes} onChange={(e) => setF({ notes: e.target.value })} rows={3} placeholder="特記事項・連絡事項を入力" style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", color: "var(--text)", fontSize: 12, resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="ghost-button" onClick={() => setMode("list")}>キャンセル</button>
          <button className="ghost-button" onClick={() => save("draft")}>下書き保存</button>
          <motion.button className="ghost-button" whileTap={{ scale: 0.97 }} onClick={() => save("submitted")} style={{ background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}>提出</motion.button>
        </div>
      </div>
    );
  }

  if (mode === "detail" && detail) {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="ghost-button" onClick={() => setMode("list")} style={{ fontSize: 12 }}>← 一覧</button>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{workspaceName(detail.workspaceId)} — 工事打合簿</h2>
            {statusBadge(detail.status)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ghost-button" onClick={() => openEdit(detail)} style={{ fontSize: 12 }}>編集</button>
            <button className="ghost-button" onClick={() => { if (confirm("削除しますか？")) deleteReport(detail.id); }} style={{ fontSize: 12, color: "var(--red)" }}>削除</button>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>基本情報</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
            {[
              ["打合日", detail.meetingDate],
              ["実施日", detail.implementDate],
              ["天候", detail.weather],
              ["進捗率", `${detail.progressRate}%`],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>作業予定内容</div>
              <div style={{ fontSize: 12, whiteSpace: "pre-wrap", background: "var(--soft)", padding: "8px 10px", borderRadius: 6 }}>{detail.plannedWork || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>作業実施内容</div>
              <div style={{ fontSize: 12, whiteSpace: "pre-wrap", background: "var(--soft)", padding: "8px 10px", borderRadius: 6 }}>{detail.actualWork || "—"}</div>
            </div>
          </div>
          {/* 進捗バー */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
              <span>工程進捗</span>
              <span>計画 {detail.plannedDays}日 / 残 {detail.remainingDays}日</span>
            </div>
            <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(detail.progressRate, 100)}%`, background: "var(--blue)", borderRadius: 4, transition: "width 0.5s" }} />
            </div>
          </div>
        </div>

        {/* 品質安全 */}
        {detail.safetyItems.length > 0 && (
          <div className="panel" style={{ marginBottom: 14 }}>
            <SectionTitle>品質安全指示事項</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--soft)" }}>
                  {["誰が", "誰に", "確認及び是正状況"].map((h) => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 11 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {detail.safetyItems.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "7px 10px" }}>{s.who}</td>
                    <td style={{ padding: "7px 10px" }}>{s.toWhom}</td>
                    <td style={{ padding: "7px 10px" }}>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 社員出面表 */}
        {detail.attendees.length > 0 && (
          <div className="panel" style={{ marginBottom: 14 }}>
            <SectionTitle>社員出面表</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--soft)" }}>
                  {["氏名", "職種", "出欠", "就業時間"].map((h) => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 11 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {detail.attendees.map((a, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "7px 10px" }}>{a.name}</td>
                    <td style={{ padding: "7px 10px" }}>{a.jobType}</td>
                    <td style={{ padding: "7px 10px" }}><span className={`status ${a.present ? "green" : "red"}`}>{a.present ? "出" : "欠"}</span></td>
                    <td style={{ padding: "7px 10px" }}>{a.startTime} ～ {a.endTime}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--soft)", fontWeight: 600 }}>
                  <td colSpan={2} style={{ padding: "6px 10px", fontSize: 11 }}>日計</td>
                  <td colSpan={2} style={{ padding: "6px 10px" }}>{detail.attendees.filter((a) => a.present).length} 名</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 協力業者 */}
        {detail.subcontractors.filter((s) => s.company).length > 0 && (
          <div className="panel" style={{ marginBottom: 14 }}>
            <SectionTitle>協力業者就業表</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--soft)" }}>
                  {["協力業者名", "工種", "実施人員", "就業時間"].map((h) => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 11 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {detail.subcontractors.filter((s) => s.company).map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "7px 10px" }}>{s.company}</td>
                    <td style={{ padding: "7px 10px" }}>{s.jobType}</td>
                    <td style={{ padding: "7px 10px" }}>{s.workers} 名</td>
                    <td style={{ padding: "7px 10px" }}>{s.startTime} ～ {s.endTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 使用機械 */}
        {detail.equipment.filter((e) => e.name).length > 0 && (
          <div className="panel" style={{ marginBottom: 14 }}>
            <SectionTitle>使用機械</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--soft)" }}>
                  {["機械名称", "台数", "給油量(ℓ)"].map((h) => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 11 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {detail.equipment.filter((e) => e.name).map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "7px 10px" }}>{e.name}</td>
                    <td style={{ padding: "7px 10px" }}>{e.count} 台</td>
                    <td style={{ padding: "7px 10px" }}>{e.fuel} ℓ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 使用資材 */}
        {detail.materials.filter((m) => m.name).length > 0 && (
          <div className="panel" style={{ marginBottom: 14 }}>
            <SectionTitle>使用資材</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--soft)" }}>
                  {["資材名称", "種類", "受入(本日)", "受入(累計)", "使用(本日)", "使用(累計)", "残量"].map((h) => <th key={h} style={{ padding: "5px 8px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 10 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {detail.materials.filter((m) => m.name).map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "6px 8px" }}>{m.name}</td>
                    <td style={{ padding: "6px 8px" }}>{m.type}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{m.receivedToday}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{m.receivedTotal}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{m.usedToday}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{m.usedTotal}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{m.remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 特記事項 */}
        {detail.notes && (
          <div className="panel" style={{ marginBottom: 14 }}>
            <SectionTitle>報告事項・特記事項</SectionTitle>
            <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{detail.notes}</div>
          </div>
        )}

        {/* 承認欄 */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <SectionTitle>承認欄</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {APPROVAL_ROLES.map((role) => {
              const approved = detail.approvals?.[role];
              return (
                <div key={role} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{role}</div>
                  {approved ? (
                    <div>
                      <div style={{ fontSize: 18, color: "var(--blue)" }}>✓</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>承認済</div>
                    </div>
                  ) : (
                    <button className="ghost-button" onClick={() => approve(detail.id, role)} style={{ fontSize: 11, padding: "4px 10px" }}>承認する</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>全 {reports.length} 件</div>
        <motion.button className="ghost-button" onClick={openNew} whileTap={{ scale: 0.97 }} style={{ background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}>
          ＋ 新規日報
        </motion.button>
      </div>

      <AnimatePresence>
        {reports.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 13 }}>
            日報がまだありません。「新規日報」から作成してください。
          </div>
        )}
        {reports.map((r) => (
          <motion.div
            key={r.id}
            className="row-card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => openDetail(r.id)}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ width: 4, height: 40, borderRadius: 2, background: state.workspaces?.find((w) => w.id === r.workspaceId)?.color ?? "var(--blue)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{workspaceName(r.workspaceId)}</div>
              <div className="muted-text">実施日: {r.implementDate} ／ 天候: {r.weather} ／ 進捗: {r.progressRate}%</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {statusBadge(r.status)}
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                出面: {r.attendees.filter((a) => a.present).length}名
              </div>
              <button className="ghost-button" onClick={(e) => { e.stopPropagation(); openEdit(r); }} style={{ fontSize: 11, padding: "3px 8px" }}>編集</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
