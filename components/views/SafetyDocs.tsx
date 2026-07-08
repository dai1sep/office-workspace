"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import type {
  ConstructionSystemLedger,
  ConstructionSystemLedgerInsurance,
  PrimeCompanyProfile,
  OrgChartEntry,
  Subcontractor,
  SubcontractorOrgChart,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import { downloadOrgChartExcel, downloadSystemLedgerExcel, printOrgChart, printSystemLedger } from "@/lib/safetyDocsExcel";

type Tab = "master" | "orgchart" | "ledger";

/* ══════════════════════════════════════════
   小さな入力ヘルパー
══════════════════════════════════════════ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "block" }}><span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span><div style={{ marginTop: 4 }}>{children}</div></label>;
}
const inputStyle: React.CSSProperties = { display: "block", width: "100%" };

export default function SafetyDocsView() {
  const { state, updateState, currentUser } = useApp();
  const me = currentUser ?? state.currentUser;
  const [tab, setTab] = useState<Tab>("orgchart");

  /* ---- 業者マスタ ---- */
  const [scEditing, setScEditing] = useState<Subcontractor | null>(null);
  const [scModalOpen, setScModalOpen] = useState(false);
  function newSubcontractor() {
    setScEditing({ id: uid("sc"), companyName: "", representative: "", jobType: "" });
    setScModalOpen(true);
  }
  function saveSubcontractor() {
    if (!scEditing || !scEditing.companyName.trim()) return;
    const sc = scEditing;
    updateState((prev) => ({ ...prev, subcontractors: prev.subcontractors.some((s) => s.id === sc.id) ? prev.subcontractors.map((s) => s.id === sc.id ? sc : s) : [...prev.subcontractors, sc] }));
    setScModalOpen(false);
  }
  function deleteSubcontractor(id: string) {
    updateState((prev) => ({ ...prev, subcontractors: prev.subcontractors.filter((s) => s.id !== id) }));
  }

  /* ---- 下請負業者編成表 ---- */
  const [ocEditing, setOcEditing] = useState<SubcontractorOrgChart | null>(null);
  const [ocWorkspaceId, setOcWorkspaceId] = useState("");
  const [ocModalOpen, setOcModalOpen] = useState(false);
  const [ocDetailId, setOcDetailId] = useState<string | null>(null);

  function emptyEntry(tier: 1 | 2 | 3 | 4, slot: 1 | 2 | 3): OrgChartEntry {
    return { id: uid("oce"), tier, slot, jobType: "", companyName: "", representative: "", licenseNumber: "", safetyOfficer: "", chiefEngineer: "" };
  }
  function newOrgChart() {
    if (!ocWorkspaceId) return;
    const entries: OrgChartEntry[] = [
      emptyEntry(1, 1),
      ...([2, 3, 4] as const).flatMap((tier) => ([1, 2, 3] as const).map((slot) => emptyEntry(tier, slot))),
    ];
    setOcEditing({ id: uid("oc"), workspaceId: ocWorkspaceId, createdDate: new Date().toISOString().slice(0, 10), entries, createdBy: me, createdAt: new Date().toISOString() });
    setOcModalOpen(true);
  }
  function openOrgChartEdit(chart: SubcontractorOrgChart) {
    setOcEditing({ ...chart });
    setOcModalOpen(true);
  }
  function patchOcEntry(id: string, patch: Partial<OrgChartEntry>) {
    setOcEditing((prev) => prev ? { ...prev, entries: prev.entries.map((e) => e.id === id ? { ...e, ...patch } : e) } : prev);
  }
  function applySubcontractorToEntry(entryId: string, subcontractorId: string) {
    const sc = state.subcontractors.find((s) => s.id === subcontractorId);
    patchOcEntry(entryId, {
      subcontractorId: subcontractorId || undefined,
      companyName: sc?.companyName ?? "",
      representative: sc?.representative ?? "",
      licenseNumber: sc ? `${sc.licenseCategory ?? ""}${sc.licenseCategory ? "　" : ""}${sc.licenseNumber ?? ""}`.trim() : "",
      safetyOfficer: sc?.safetyOfficer ?? "",
      chiefEngineer: sc?.chiefEngineer ?? "",
      specialistEngineer: sc?.specialistEngineer ?? "",
      jobType: sc?.jobType ?? "",
    });
  }
  function saveOrgChart() {
    if (!ocEditing) return;
    const chart = ocEditing;
    updateState((prev) => ({ ...prev, orgCharts: prev.orgCharts.some((c) => c.id === chart.id) ? prev.orgCharts.map((c) => c.id === chart.id ? { ...chart, updatedAt: new Date().toISOString() } : c) : [chart, ...prev.orgCharts] }));
    setOcModalOpen(false);
  }
  function deleteOrgChart(id: string) {
    updateState((prev) => ({ ...prev, orgCharts: prev.orgCharts.filter((c) => c.id !== id) }));
  }

  /* ---- 施工体制台帳 ---- */
  const emptyInsurance = (): ConstructionSystemLedgerInsurance => ({ health: "加入", pension: "加入", employment: "加入" });
  const [ldEditing, setLdEditing] = useState<ConstructionSystemLedger | null>(null);
  const [ldWorkspaceId, setLdWorkspaceId] = useState("");
  const [ldModalOpen, setLdModalOpen] = useState(false);

  // 自社（元請）マスタ
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<PrimeCompanyProfile>(state.primeProfile);
  function openProfile() { setProfileDraft(state.primeProfile); setProfileOpen(true); }
  function saveProfile() { updateState((prev) => ({ ...prev, primeProfile: profileDraft })); setProfileOpen(false); }
  type ProfileStrKey = "companyName" | "address" | "phone" | "representative" | "licenseCategory" | "licenseNumber" | "licenseIssuedDate" | "siteAgent" | "chiefEngineerName" | "chiefEngineerQualification" | "specialistEngineerName" | "safetyOfficerName" | "safetyPromoterName" | "laborManagerName";
  const profileField = (label: string, k: ProfileStrKey) => (
    <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>{label}
      <input value={profileDraft[k] ?? ""} onChange={(e) => setProfileDraft((pv) => ({ ...pv, [k]: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 3 }} />
    </label>
  );

  function newLedger() {
    if (!ldWorkspaceId) return;
    const p = state.primeProfile;
    setLdEditing({
      id: uid("sl"), workspaceId: ldWorkspaceId, createdDate: new Date().toISOString().slice(0, 10),
      primeCompanyName: p.companyName, primeAddress: p.address, primePhone: p.phone, primeRepresentative: p.representative,
      primeLicenseCategory: p.licenseCategory, primeLicenseNumber: p.licenseNumber, primeLicenseIssuedDate: p.licenseIssuedDate,
      primeWorkTitle: "", primeOrdererNameAddress: "", primePeriodStart: "", primePeriodEnd: "", primeContractDate: "",
      primeInsurance: { ...p.insurance }, primeSiteAgent: p.siteAgent, primeChiefEngineerName: p.chiefEngineerName, primeChiefEngineerFullTime: p.chiefEngineerFullTime, primeChiefEngineerQualification: p.chiefEngineerQualification,
      primeSpecialistEngineerName: p.specialistEngineerName, primeSafetyOfficerName: p.safetyOfficerName, primeSafetyPromoterName: p.safetyPromoterName, primeLaborManagerName: p.laborManagerName,
      subCompanyName: "", subAddress: "", subRepresentative: "", subLicenseCategory: "", subLicenseNumber: "", subLicenseIssuedDate: "",
      subWorkTitle: "", subPeriodStart: "", subPeriodEnd: "", subContractDate: "", subInsurance: emptyInsurance(), subSiteAgent: "", subChiefEngineerName: "", subSafetyOfficerName: "",
      createdBy: me, createdAt: new Date().toISOString(),
    });
    setLdModalOpen(true);
  }
  function openLedgerEdit(l: ConstructionSystemLedger) {
    setLdEditing({ ...l });
    setLdModalOpen(true);
  }
  function patchLedger(patch: Partial<ConstructionSystemLedger>) {
    setLdEditing((prev) => prev ? { ...prev, ...patch } : prev);
  }
  function applySubcontractorToLedger(subcontractorId: string) {
    const sc = state.subcontractors.find((s) => s.id === subcontractorId);
    patchLedger({
      subcontractorId: subcontractorId || undefined,
      subCompanyName: sc?.companyName ?? "", subAddress: sc?.address ?? "", subRepresentative: sc?.representative ?? "",
      subLicenseCategory: sc?.licenseCategory ?? "", subLicenseNumber: sc?.licenseNumber ?? "", subLicenseIssuedDate: sc?.licenseIssuedDate ?? "",
      subSiteAgent: sc?.safetyOfficer ?? "", subChiefEngineerName: sc?.chiefEngineer ?? "", subSafetyOfficerName: sc?.safetyOfficer ?? "",
    });
  }
  function saveLedger() {
    if (!ldEditing) return;
    const l = ldEditing;
    updateState((prev) => ({ ...prev, systemLedgers: prev.systemLedgers.some((x) => x.id === l.id) ? prev.systemLedgers.map((x) => x.id === l.id ? { ...l, updatedAt: new Date().toISOString() } : x) : [l, ...prev.systemLedgers] }));
    setLdModalOpen(false);
  }
  function deleteLedger(id: string) {
    updateState((prev) => ({ ...prev, systemLedgers: prev.systemLedgers.filter((x) => x.id !== id) }));
  }

  const wsName = (id: string) => state.workspaces.find((w) => w.id === id)?.name ?? "（工事未設定）";
  const ocDetail = state.orgCharts.find((c) => c.id === ocDetailId) ?? null;

  const TIER_LABEL: Record<1 | 2 | 3 | 4, string> = { 1: "一次（作成下請負業者）", 2: "二次下請負業者", 3: "三次下請負業者", 4: "四次下請負業者" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="panel" style={{ display: "flex", gap: 7 }}>
        {([["master", "下請業者マスタ"], ["orgchart", "下請負業者編成表"], ["ledger", "施工体制台帳"]] as [Tab, string][]).map(([value, label]) => (
          <button key={value} className="ghost-button" onClick={() => setTab(value)} style={{ background: tab === value ? "var(--soft)" : "var(--panel)" }}>{label}</button>
        ))}
      </section>

      {tab === "master" && (
        <motion.section key="master" className="panel" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>下請業者マスタ <span className="muted-text">{state.subcontractors.length}件</span></span>
            <button className="ghost-button" onClick={newSubcontractor} style={{ background: "var(--green)", color: "white" }}>業者を登録</button>
          </div>
          {state.subcontractors.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center" }}>登録された下請業者はありません。</div>}
          {state.subcontractors.map((sc) => (
            <div key={sc.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: "12px 4px", borderBottom: "1px solid var(--line)" }}>
              <div><strong>{sc.companyName}</strong><div className="muted-text">{sc.representative} / {sc.jobType} / {sc.licenseCategory} {sc.licenseNumber}</div></div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="ghost-button" onClick={() => { setScEditing(sc); setScModalOpen(true); }}>編集</button>
                <button className="ghost-button" onClick={() => deleteSubcontractor(sc.id)} style={{ color: "#a33" }}>削除</button>
              </div>
            </div>
          ))}
        </motion.section>
      )}

      {tab === "orgchart" && (
        <motion.section key="orgchart" className="panel" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span>下請負業者編成表 <span className="muted-text">{state.orgCharts.length}件</span></span>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={ocWorkspaceId} onChange={(e) => setOcWorkspaceId(e.target.value)}><option value="">工事を選択</option>{state.workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              <button className="ghost-button" disabled={!ocWorkspaceId} onClick={newOrgChart} style={{ background: ocWorkspaceId ? "var(--green)" : "var(--panel)", color: ocWorkspaceId ? "white" : "var(--muted)" }}>新規作成</button>
            </div>
          </div>
          {state.orgCharts.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center" }}>作成された編成表はありません。</div>}
          {state.orgCharts.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: "12px 4px", borderBottom: "1px solid var(--line)" }}>
              <button onClick={() => setOcDetailId(c.id)} style={{ border: 0, background: "transparent", textAlign: "left", color: "var(--text)", cursor: "pointer" }}>
                <strong>{wsName(c.workspaceId)}</strong><div className="muted-text">作成日 {c.createdDate} / 明細 {c.entries.filter((e) => e.companyName).length}件</div>
              </button>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="ghost-button" onClick={() => openOrgChartEdit(c)}>編集</button>
                <button className="ghost-button" onClick={() => printOrgChart(c, wsName(c.workspaceId))}>🖨 印刷</button>
                <button className="ghost-button" onClick={() => downloadOrgChartExcel(c, wsName(c.workspaceId))}>⬇ Excel</button>
                <button className="ghost-button" onClick={() => deleteOrgChart(c.id)} style={{ color: "#a33" }}>削除</button>
              </div>
            </div>
          ))}
        </motion.section>
      )}

      {tab === "ledger" && (
        <motion.section key="ledger" className="panel" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
          <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span>施工体制台帳 <span className="muted-text">{state.systemLedgers.length}件</span></span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="ghost-button" onClick={openProfile}>自社情報</button>
              <select value={ldWorkspaceId} onChange={(e) => setLdWorkspaceId(e.target.value)}><option value="">工事を選択</option>{state.workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              <button className="ghost-button" disabled={!ldWorkspaceId} onClick={newLedger} style={{ background: ldWorkspaceId ? "var(--green)" : "var(--panel)", color: ldWorkspaceId ? "white" : "var(--muted)" }}>新規作成</button>
            </div>
          </div>
          {state.systemLedgers.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center" }}>作成された施工体制台帳はありません。</div>}
          {state.systemLedgers.map((l) => (
            <div key={l.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: "12px 4px", borderBottom: "1px solid var(--line)" }}>
              <div><strong>{wsName(l.workspaceId)}</strong><div className="muted-text">下請：{l.subCompanyName || "（未入力）"} / 作成日 {l.createdDate}</div></div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="ghost-button" onClick={() => openLedgerEdit(l)}>編集</button>
                <button className="ghost-button" onClick={() => printSystemLedger(l, wsName(l.workspaceId))}>🖨 印刷</button>
                <button className="ghost-button" onClick={() => downloadSystemLedgerExcel(l, wsName(l.workspaceId))}>⬇ Excel</button>
                <button className="ghost-button" onClick={() => deleteLedger(l.id)} style={{ color: "#a33" }}>削除</button>
              </div>
            </div>
          ))}
        </motion.section>
      )}

      {/* ── 業者マスタ 編集モーダル ── */}
      <Modal open={scModalOpen} onClose={() => setScModalOpen(false)} title="下請業者の登録" width={560}>
        {scEditing && <div style={{ display: "grid", gap: 12 }}>
          <Field label="会社名"><input style={inputStyle} value={scEditing.companyName} onChange={(e) => setScEditing({ ...scEditing, companyName: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="代表者名"><input style={inputStyle} value={scEditing.representative} onChange={(e) => setScEditing({ ...scEditing, representative: e.target.value })} /></Field>
            <Field label="職種・工種"><input style={inputStyle} value={scEditing.jobType} onChange={(e) => setScEditing({ ...scEditing, jobType: e.target.value })} /></Field>
          </div>
          <Field label="住所"><input style={inputStyle} value={scEditing.address ?? ""} onChange={(e) => setScEditing({ ...scEditing, address: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="電話番号"><input style={inputStyle} value={scEditing.phone ?? ""} onChange={(e) => setScEditing({ ...scEditing, phone: e.target.value })} /></Field>
            <Field label="許可区分"><select style={inputStyle} value={scEditing.licenseCategory ?? ""} onChange={(e) => setScEditing({ ...scEditing, licenseCategory: e.target.value })}><option value="">選択</option><option>大臣　特定</option><option>大臣　一般</option><option>知事　特定</option><option>知事　一般</option></select></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="建設業許可番号"><input style={inputStyle} value={scEditing.licenseNumber ?? ""} onChange={(e) => setScEditing({ ...scEditing, licenseNumber: e.target.value })} /></Field>
            <Field label="許可年月日"><input type="date" style={inputStyle} value={scEditing.licenseIssuedDate ?? ""} onChange={(e) => setScEditing({ ...scEditing, licenseIssuedDate: e.target.value })} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="安全衛生責任者"><input style={inputStyle} value={scEditing.safetyOfficer ?? ""} onChange={(e) => setScEditing({ ...scEditing, safetyOfficer: e.target.value })} /></Field>
            <Field label="主任技術者"><input style={inputStyle} value={scEditing.chiefEngineer ?? ""} onChange={(e) => setScEditing({ ...scEditing, chiefEngineer: e.target.value })} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="専門技術者"><input style={inputStyle} value={scEditing.specialistEngineer ?? ""} onChange={(e) => setScEditing({ ...scEditing, specialistEngineer: e.target.value })} /></Field>
            <Field label="登録基幹技能者"><input style={inputStyle} value={scEditing.registeredSkilledWorker ?? ""} onChange={(e) => setScEditing({ ...scEditing, registeredSkilledWorker: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="ghost-button" onClick={saveSubcontractor} disabled={!scEditing.companyName.trim()} style={{ background: "var(--green)", color: "white" }}>保存する</button></div>
        </div>}
      </Modal>

      {/* ── 下請負業者編成表 編集モーダル ── */}
      <Modal open={ocModalOpen} onClose={() => setOcModalOpen(false)} title="下請負業者編成表の作成" width={920}>
        {ocEditing && <div style={{ display: "grid", gap: 16 }}>
          <div className="muted-text">工事：{wsName(ocEditing.workspaceId)} / 作成日 <input type="date" value={ocEditing.createdDate} onChange={(e) => setOcEditing({ ...ocEditing, createdDate: e.target.value })} /></div>
          {([1, 2, 3, 4] as const).map((tier) => (
            <fieldset key={tier} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
              <legend>{TIER_LABEL[tier]}</legend>
              <div style={{ display: "grid", gridTemplateColumns: tier === 1 ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {ocEditing.entries.filter((e) => e.tier === tier).map((entry) => (
                  <div key={entry.id} style={{ display: "grid", gap: 6, padding: 10, border: "1px solid var(--line)", borderRadius: 8 }}>
                    {tier > 1 && <select value={entry.subcontractorId ?? ""} onChange={(ev) => applySubcontractorToEntry(entry.id, ev.target.value)}><option value="">業者マスタから選択（任意）</option>{state.subcontractors.map((sc) => <option key={sc.id} value={sc.id}>{sc.companyName}</option>)}</select>}
                    <input placeholder="職種・工事" value={entry.jobType} onChange={(ev) => patchOcEntry(entry.id, { jobType: ev.target.value })} />
                    <input placeholder="会社名" value={entry.companyName} onChange={(ev) => patchOcEntry(entry.id, { companyName: ev.target.value })} />
                    <input placeholder="代表者名" value={entry.representative} onChange={(ev) => patchOcEntry(entry.id, { representative: ev.target.value })} />
                    <input placeholder="建設業許可番号" value={entry.licenseNumber} onChange={(ev) => patchOcEntry(entry.id, { licenseNumber: ev.target.value })} />
                    <input placeholder="安全衛生責任者" value={entry.safetyOfficer} onChange={(ev) => patchOcEntry(entry.id, { safetyOfficer: ev.target.value })} />
                    <input placeholder="主任技術者" value={entry.chiefEngineer} onChange={(ev) => patchOcEntry(entry.id, { chiefEngineer: ev.target.value })} />
                    <input placeholder="専門技術者" value={entry.specialistEngineer ?? ""} onChange={(ev) => patchOcEntry(entry.id, { specialistEngineer: ev.target.value })} />
                    <input placeholder="担当工事内容" value={entry.workContent ?? ""} onChange={(ev) => patchOcEntry(entry.id, { workContent: ev.target.value })} />
                    {tier === 1 && <input placeholder="登録基幹技能者" value={entry.registeredSkilledWorker ?? ""} onChange={(ev) => patchOcEntry(entry.id, { registeredSkilledWorker: ev.target.value })} />}
                    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}><input type="checkbox" checked={entry.hasSpecialWork ?? false} onChange={(ev) => patchOcEntry(entry.id, { hasSpecialWork: ev.target.checked })} />特定専門工事{tier === 1 ? "の有無" : "の該当"}</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="date" value={entry.periodStart ?? ""} onChange={(ev) => patchOcEntry(entry.id, { periodStart: ev.target.value })} style={{ flex: 1 }} />
                      <span className="muted-text" style={{ alignSelf: "center" }}>～</span>
                      <input type="date" value={entry.periodEnd ?? ""} onChange={(ev) => patchOcEntry(entry.id, { periodEnd: ev.target.value })} style={{ flex: 1 }} />
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="ghost-button" onClick={saveOrgChart} style={{ background: "var(--green)", color: "white" }}>保存する</button></div>
        </div>}
      </Modal>

      {/* ── 下請負業者編成表 詳細 ── */}
      <Modal open={Boolean(ocDetail)} onClose={() => setOcDetailId(null)} title="下請負業者編成表の詳細" width={820}>
        {ocDetail && <div style={{ display: "grid", gap: 14 }}>
          <div><strong>{wsName(ocDetail.workspaceId)}</strong><div className="muted-text">作成日 {ocDetail.createdDate}</div></div>
          {([1, 2, 3, 4] as const).map((tier) => {
            const entries = ocDetail.entries.filter((e) => e.tier === tier && e.companyName);
            if (!entries.length) return null;
            return (
              <div key={tier}>
                <div className="panel-title">{TIER_LABEL[tier]}</div>
                {entries.map((e) => (
                  <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                    <strong>{e.companyName}</strong><span className="muted-text"> / {e.representative} / {e.jobType}</span>
                    <div className="muted-text">許可：{e.licenseNumber} / 安全衛生責任者：{e.safetyOfficer} / 主任技術者：{e.chiefEngineer}</div>
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 7 }}>
            <button className="ghost-button" onClick={() => printOrgChart(ocDetail, wsName(ocDetail.workspaceId))}>🖨 印刷</button>
            <button className="ghost-button" onClick={() => downloadOrgChartExcel(ocDetail, wsName(ocDetail.workspaceId))}>⬇ Excelダウンロード</button>
          </div>
        </div>}
      </Modal>

      {/* ── 自社（元請）情報 編集モーダル ── */}
      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="自社情報（元請）" width={720}>
        <p className="muted-text" style={{ marginTop: 0, fontSize: 12 }}>ここで一度登録すると、施工体制台帳の新規作成時に元請欄へ自動で入ります。いつでも編集できます。</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          {profileField("会社名", "companyName")}
          {profileField("代表者名", "representative")}
          {profileField("住所", "address")}
          {profileField("電話番号", "phone")}
          {profileField("建設業許可 区分（例：大臣・特定）", "licenseCategory")}
          {profileField("建設業許可 番号", "licenseNumber")}
          {profileField("許可（更新）年月日", "licenseIssuedDate")}
          {profileField("現場代理人名", "siteAgent")}
          {profileField("監理・主任技術者名", "chiefEngineerName")}
          <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>専任 / 非専任
            <select value={profileDraft.chiefEngineerFullTime} onChange={(e) => setProfileDraft((pv) => ({ ...pv, chiefEngineerFullTime: e.target.value as "専任" | "非専任" }))} style={{ display: "block", width: "100%", marginTop: 3 }}>
              <option value="専任">専任</option><option value="非専任">非専任</option>
            </select>
          </label>
          {profileField("資格内容", "chiefEngineerQualification")}
          {profileField("専門技術者名", "specialistEngineerName")}
          {profileField("安全衛生責任者名", "safetyOfficerName")}
          {profileField("安全衛生推進者名", "safetyPromoterName")}
          {profileField("雇用管理責任者名", "laborManagerName")}
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>健康保険等の加入状況</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["health", "pension", "employment"] as const).map((k) => (
              <label key={k} style={{ flex: 1, fontSize: 12 }}>{k === "health" ? "健康保険" : k === "pension" ? "厚生年金" : "雇用保険"}
                <select value={profileDraft.insurance[k]} onChange={(e) => setProfileDraft((pv) => ({ ...pv, insurance: { ...pv.insurance, [k]: e.target.value as ConstructionSystemLedgerInsurance["health"] } }))} style={{ display: "block", width: "100%", marginTop: 3 }}>
                  <option value="加入">加入</option><option value="未加入">未加入</option><option value="適用除外">適用除外</option>
                </select>
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button className="ghost-button" onClick={() => setProfileOpen(false)}>キャンセル</button>
          <button className="ghost-button" onClick={saveProfile} style={{ background: "var(--green)", color: "white" }}>保存</button>
        </div>
      </Modal>

      {/* ── 施工体制台帳 編集モーダル ── */}
      <Modal open={ldModalOpen} onClose={() => setLdModalOpen(false)} title="施工体制台帳の作成" width={920}>
        {ldEditing && <div style={{ display: "grid", gap: 16 }}>
          <div className="muted-text">工事：{wsName(ldEditing.workspaceId)} / 作成日 <input type="date" value={ldEditing.createdDate} onChange={(e) => patchLedger({ createdDate: e.target.value })} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}>
              <legend>元請（自社）に関する事項</legend>
              <input placeholder="会社名" value={ldEditing.primeCompanyName} onChange={(e) => patchLedger({ primeCompanyName: e.target.value })} />
              <input placeholder="住所" value={ldEditing.primeAddress} onChange={(e) => patchLedger({ primeAddress: e.target.value })} />
              <input placeholder="電話番号" value={ldEditing.primePhone ?? ""} onChange={(e) => patchLedger({ primePhone: e.target.value })} />
              <input placeholder="代表者名" value={ldEditing.primeRepresentative} onChange={(e) => patchLedger({ primeRepresentative: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                <select value={ldEditing.primeLicenseCategory} onChange={(e) => patchLedger({ primeLicenseCategory: e.target.value })} style={{ flex: 1 }}><option value="">許可区分</option><option>大臣　特定</option><option>大臣　一般</option><option>知事　特定</option><option>知事　一般</option></select>
                <input placeholder="許可番号" value={ldEditing.primeLicenseNumber} onChange={(e) => patchLedger({ primeLicenseNumber: e.target.value })} style={{ flex: 1 }} />
              </div>
              <input type="date" value={ldEditing.primeLicenseIssuedDate} onChange={(e) => patchLedger({ primeLicenseIssuedDate: e.target.value })} />
              <input placeholder="工事名称及び工事内容" value={ldEditing.primeWorkTitle} onChange={(e) => patchLedger({ primeWorkTitle: e.target.value })} />
              <input placeholder="発注者名及び住所" value={ldEditing.primeOrdererNameAddress} onChange={(e) => patchLedger({ primeOrdererNameAddress: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" value={ldEditing.primePeriodStart} onChange={(e) => patchLedger({ primePeriodStart: e.target.value })} style={{ flex: 1 }} />
                <input type="date" value={ldEditing.primePeriodEnd} onChange={(e) => patchLedger({ primePeriodEnd: e.target.value })} style={{ flex: 1 }} />
              </div>
              <input type="date" placeholder="契約日" value={ldEditing.primeContractDate} onChange={(e) => patchLedger({ primeContractDate: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                {(["health", "pension", "employment"] as const).map((k) => (
                  <select key={k} value={ldEditing.primeInsurance[k]} onChange={(e) => patchLedger({ primeInsurance: { ...ldEditing.primeInsurance, [k]: e.target.value as ConstructionSystemLedgerInsurance["health"] } })} style={{ flex: 1 }}>
                    <option value="加入">加入</option><option value="未加入">未加入</option><option value="適用除外">適用除外</option>
                  </select>
                ))}
              </div>
              <input placeholder="現場代理人名" value={ldEditing.primeSiteAgent} onChange={(e) => patchLedger({ primeSiteAgent: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                <input placeholder="主任（監理）技術者名" value={ldEditing.primeChiefEngineerName} onChange={(e) => patchLedger({ primeChiefEngineerName: e.target.value })} style={{ flex: 1 }} />
                <select value={ldEditing.primeChiefEngineerFullTime} onChange={(e) => patchLedger({ primeChiefEngineerFullTime: e.target.value as "専任" | "非専任" })}><option>専任</option><option>非専任</option></select>
              </div>
              <input placeholder="資格内容" value={ldEditing.primeChiefEngineerQualification} onChange={(e) => patchLedger({ primeChiefEngineerQualification: e.target.value })} />
              <input placeholder="専門技術者名（任意）" value={ldEditing.primeSpecialistEngineerName ?? ""} onChange={(e) => patchLedger({ primeSpecialistEngineerName: e.target.value })} />
              <input placeholder="安全衛生責任者名" value={ldEditing.primeSafetyOfficerName} onChange={(e) => patchLedger({ primeSafetyOfficerName: e.target.value })} />
              <input placeholder="安全衛生推進者名（任意）" value={ldEditing.primeSafetyPromoterName ?? ""} onChange={(e) => patchLedger({ primeSafetyPromoterName: e.target.value })} />
              <input placeholder="雇用管理責任者名（任意）" value={ldEditing.primeLaborManagerName ?? ""} onChange={(e) => patchLedger({ primeLaborManagerName: e.target.value })} />
            </fieldset>

            <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, display: "grid", gap: 8 }}>
              <legend>下請負人に関する事項</legend>
              <select value={ldEditing.subcontractorId ?? ""} onChange={(e) => applySubcontractorToLedger(e.target.value)}><option value="">業者マスタから選択（任意）</option>{state.subcontractors.map((sc) => <option key={sc.id} value={sc.id}>{sc.companyName}</option>)}</select>
              <input placeholder="会社名" value={ldEditing.subCompanyName} onChange={(e) => patchLedger({ subCompanyName: e.target.value })} />
              <input placeholder="住所" value={ldEditing.subAddress} onChange={(e) => patchLedger({ subAddress: e.target.value })} />
              <input placeholder="代表者名" value={ldEditing.subRepresentative} onChange={(e) => patchLedger({ subRepresentative: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                <select value={ldEditing.subLicenseCategory} onChange={(e) => patchLedger({ subLicenseCategory: e.target.value })} style={{ flex: 1 }}><option value="">許可区分</option><option>大臣　特定</option><option>大臣　一般</option><option>知事　特定</option><option>知事　一般</option></select>
                <input placeholder="許可番号" value={ldEditing.subLicenseNumber} onChange={(e) => patchLedger({ subLicenseNumber: e.target.value })} style={{ flex: 1 }} />
              </div>
              <input type="date" value={ldEditing.subLicenseIssuedDate} onChange={(e) => patchLedger({ subLicenseIssuedDate: e.target.value })} />
              <input placeholder="工事名称及び工事内容" value={ldEditing.subWorkTitle} onChange={(e) => patchLedger({ subWorkTitle: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" value={ldEditing.subPeriodStart} onChange={(e) => patchLedger({ subPeriodStart: e.target.value })} style={{ flex: 1 }} />
                <input type="date" value={ldEditing.subPeriodEnd} onChange={(e) => patchLedger({ subPeriodEnd: e.target.value })} style={{ flex: 1 }} />
              </div>
              <input type="date" placeholder="契約日" value={ldEditing.subContractDate} onChange={(e) => patchLedger({ subContractDate: e.target.value })} />
              <div style={{ display: "flex", gap: 6 }}>
                {(["health", "pension", "employment"] as const).map((k) => (
                  <select key={k} value={ldEditing.subInsurance[k]} onChange={(e) => patchLedger({ subInsurance: { ...ldEditing.subInsurance, [k]: e.target.value as ConstructionSystemLedgerInsurance["health"] } })} style={{ flex: 1 }}>
                    <option value="加入">加入</option><option value="未加入">未加入</option><option value="適用除外">適用除外</option>
                  </select>
                ))}
              </div>
              <input placeholder="現場代理人名" value={ldEditing.subSiteAgent} onChange={(e) => patchLedger({ subSiteAgent: e.target.value })} />
              <input placeholder="主任技術者名" value={ldEditing.subChiefEngineerName} onChange={(e) => patchLedger({ subChiefEngineerName: e.target.value })} />
              <input placeholder="安全衛生責任者名" value={ldEditing.subSafetyOfficerName} onChange={(e) => patchLedger({ subSafetyOfficerName: e.target.value })} />
            </fieldset>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="ghost-button" onClick={saveLedger} style={{ background: "var(--green)", color: "white" }}>保存する</button></div>
        </div>}
      </Modal>
    </div>
  );
}
