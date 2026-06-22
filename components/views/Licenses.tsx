"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import type { ConstructionLicense, EmployeeCertification } from "@/lib/types";
import { uid } from "@/lib/utils";

type Tab = "permits" | "certifications" | "matrix";
type StatusFilter = "all" | "expired" | "danger" | "warn" | "ok";

const STATUS_LABEL: Record<string, string> = { ok: "有効", warn: "更新検討", danger: "期限切れ間近", expired: "失効" };
const STATUS_COLOR: Record<string, string> = { ok: "var(--green)", warn: "var(--orange)", danger: "var(--red)", expired: "var(--muted)" };
const WF_BG: Record<string, string> = { 未起票: "var(--soft)", 申請中: "color-mix(in srgb, var(--blue) 15%, transparent)", 承認済: "color-mix(in srgb, var(--green) 15%, transparent)", 差戻し: "color-mix(in srgb, var(--red) 15%, transparent)" };
const WF_FG: Record<string, string> = { 未起票: "var(--muted)", 申請中: "var(--blue)", 承認済: "var(--green)", 差戻し: "var(--red)" };

const CERT_CATS = [
  { key: "construction-management", label: "施工管理系" },
  { key: "design", label: "設計・建築系" },
  { key: "electrical", label: "電気・危険物系" },
  { key: "field", label: "現場作業系" },
];

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "var(--muted)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 12, fontSize: 11, background: `color-mix(in srgb, ${color} 15%, transparent)`, color, fontWeight: 600, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function MetricCard({ label, value, color, active, onClick }: { label: string; value: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} style={{ flex: 1, minWidth: 70, padding: "10px 12px", background: active ? `color-mix(in srgb, ${color} 18%, var(--panel))` : "var(--panel)", border: `1px solid ${active ? color : "var(--line)"}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: value > 0 ? color : "var(--muted)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </motion.button>
  );
}

const emptyPermitForm = () => ({ type: "", num: "", kubun: "知事・一般" as ConstructionLicense["kubun"], acquired: "", expires: "", person: "", dept: "", notes: "" });
const emptyCertForm = () => ({ name: "", category: "construction-management", person: "", dept: "", acquired: "", expires: "", renewal: "", notify: false });

export default function LicensesView() {
  const { state, updateState } = useApp();
  const { constructionLicenses, employeeCertifications } = state;

  const [tab, setTab] = useState<Tab>("permits");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedPermit, setSelectedPermit] = useState<ConstructionLicense | null>(null);
  const [selectedCert, setSelectedCert] = useState<EmployeeCertification | null>(null);
  const [permitModal, setPermitModal] = useState(false);
  const [certModal, setCertModal] = useState(false);
  const [permitForm, setPermitForm] = useState(emptyPermitForm());
  const [certForm, setCertForm] = useState(emptyCertForm());

  const metrics = useMemo(() => {
    const all = [...constructionLicenses, ...employeeCertifications];
    return {
      expired: all.filter((i) => i.status === "expired").length,
      danger: all.filter((i) => i.status === "danger").length,
      warn: all.filter((i) => i.status === "warn").length,
      ok: all.filter((i) => i.status === "ok").length,
    };
  }, [constructionLicenses, employeeCertifications]);

  const filteredPermits = useMemo(() => {
    return constructionLicenses
      .filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return p.type.toLowerCase().includes(q) || p.num.toLowerCase().includes(q) || p.person.toLowerCase().includes(q);
      })
      .sort((a, b) => a.days - b.days);
  }, [constructionLicenses, statusFilter, query]);

  const filteredCerts = useMemo(() => {
    return employeeCertifications
      .filter((c) => {
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.person.toLowerCase().includes(q) || c.categoryLabel.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  }, [employeeCertifications, statusFilter, query]);

  const alerts = useMemo(() => {
    const pa = constructionLicenses.filter((p) => p.status !== "ok").map((p) => ({ kind: "permit" as const, id: p.id, label: p.type, sub: `${p.person} / ${p.dept}`, status: p.status, days: p.days }));
    const ca = employeeCertifications.filter((c) => c.status !== "ok").map((c) => ({ kind: "cert" as const, id: c.id, label: c.name, sub: `${c.person} / ${c.dept}`, status: c.status, days: c.days }));
    return [...pa, ...ca].sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  }, [constructionLicenses, employeeCertifications]);

  const persons = useMemo(() => {
    const map = new Map<string, string>();
    employeeCertifications.forEach((c) => map.set(c.person, c.dept));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "ja"));
  }, [employeeCertifications]);

  function savePermit() {
    if (!permitForm.type.trim()) return;
    const item: ConstructionLicense = {
      id: uid("p"), type: permitForm.type.trim(), num: permitForm.num.trim(), kubun: permitForm.kubun,
      acquired: permitForm.acquired, expires: permitForm.expires, days: 0,
      person: permitForm.person.trim(), dept: permitForm.dept.trim(),
      wf: "未起票", files: 0, status: "ok", notes: permitForm.notes.trim(),
    };
    updateState((prev) => ({ ...prev, constructionLicenses: [...prev.constructionLicenses, item] }));
    setPermitModal(false);
    setPermitForm(emptyPermitForm());
  }

  function saveCert() {
    if (!certForm.name.trim()) return;
    const item: EmployeeCertification = {
      id: uid("l"), name: certForm.name.trim(),
      category: certForm.category, categoryLabel: CERT_CATS.find((c) => c.key === certForm.category)?.label ?? "",
      person: certForm.person.trim(), dept: certForm.dept.trim(),
      acquired: certForm.acquired, expires: certForm.expires || null, days: null,
      renewal: certForm.renewal.trim(), status: "ok", notify: certForm.notify,
    };
    updateState((prev) => ({ ...prev, employeeCertifications: [...prev.employeeCertifications, item] }));
    setCertModal(false);
    setCertForm(emptyCertForm());
  }

  const hasDetail = (tab === "permits" && selectedPermit) || (tab === "certifications" && selectedCert);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      {/* Metrics */}
      <section style={{ display: "flex", gap: 8 }}>
        {(["expired", "danger", "warn", "ok"] as const).map((s) => (
          <MetricCard key={s} label={STATUS_LABEL[s]} value={metrics[s]} color={STATUS_COLOR[s]}
            active={statusFilter === s} onClick={() => setStatusFilter((prev) => prev === s ? "all" : s)} />
        ))}
      </section>

      {/* Tabs + toolbar */}
      <section className="panel" style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", flexWrap: "wrap" }}>
        {(["permits", "certifications", "matrix"] as const).map((t) => {
          const labels: Record<Tab, string> = { permits: "建設業許可", certifications: "社員資格", matrix: "資格マトリクス" };
          return (
            <button key={t} className="ghost-button" onClick={() => { setTab(t); setSelectedPermit(null); setSelectedCert(null); }}
              style={{ background: tab === t ? "var(--soft)" : "var(--panel)", fontWeight: tab === t ? 700 : 400 }}>
              {labels[t]}
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名称・番号・担当者を検索" style={{ width: 200 }} />
          {tab === "permits" && (
            <button className="ghost-button" onClick={() => setPermitModal(true)} style={{ background: "var(--green)", color: "white", borderColor: "var(--green)", whiteSpace: "nowrap" }}>
              許可を追加
            </button>
          )}
          {tab === "certifications" && (
            <button className="ghost-button" onClick={() => setCertModal(true)} style={{ background: "var(--green)", color: "white", borderColor: "var(--green)", whiteSpace: "nowrap" }}>
              資格を追加
            </button>
          )}
        </div>
      </section>

      {/* Main content */}
      <div style={{ display: "flex", gap: 10, flex: 1, minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {tab === "permits" && (
            <motion.div key="permits" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
              style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
              <div className="panel" style={{ overflow: "hidden" }}>
                <div className="panel-title">建設業許可 <span className="muted-text">{filteredPermits.length}件</span></div>
                {filteredPermits.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center" }}>該当する許可はありません。</div>}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: 11 }}>
                        {["業種", "許可番号", "区分", "取得日", "有効期限", "残日数", "担当者", "WF", "状態"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPermits.map((p) => (
                        <motion.tr key={p.id} onClick={() => setSelectedPermit((prev) => prev?.id === p.id ? null : p)}
                          whileHover={{ background: "var(--soft)" }}
                          style={{ borderBottom: "1px solid var(--line)", cursor: "pointer", background: selectedPermit?.id === p.id ? "var(--soft)" : "transparent" }}>
                          <td style={{ padding: "10px 10px", fontWeight: 600 }}>{p.type}</td>
                          <td style={{ padding: "10px 10px", color: "var(--muted)", fontSize: 11 }}>{p.num}</td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}><span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "var(--soft)" }}>{p.kubun}</span></td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap", color: "var(--muted)" }}>{p.acquired}</td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>{p.expires}</td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap", fontWeight: 600, color: p.days < 0 ? "var(--muted)" : p.days <= 30 ? "var(--red)" : p.days <= 90 ? "var(--orange)" : "var(--text)" }}>
                            {p.days < 0 ? "失効" : `${p.days}日`}
                          </td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>{p.person}<br /><span className="muted-text" style={{ fontSize: 11 }}>{p.dept}</span></td>
                          <td style={{ padding: "10px 10px" }}>
                            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: WF_BG[p.wf], color: WF_FG[p.wf], whiteSpace: "nowrap" }}>{p.wf}</span>
                          </td>
                          <td style={{ padding: "10px 10px" }}><StatusDot status={p.status} /></td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "certifications" && (
            <motion.div key="certifications" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
              style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
              <div className="panel" style={{ overflow: "hidden" }}>
                <div className="panel-title">社員資格 <span className="muted-text">{filteredCerts.length}件</span></div>
                {filteredCerts.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center" }}>該当する資格はありません。</div>}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: 11 }}>
                        {["資格名", "カテゴリ", "保有者", "取得日", "有効期限", "残日数", "更新区分", "通知", "状態"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCerts.map((c) => (
                        <motion.tr key={c.id} onClick={() => setSelectedCert((prev) => prev?.id === c.id ? null : c)}
                          whileHover={{ background: "var(--soft)" }}
                          style={{ borderBottom: "1px solid var(--line)", cursor: "pointer", background: selectedCert?.id === c.id ? "var(--soft)" : "transparent" }}>
                          <td style={{ padding: "10px 10px", fontWeight: 600 }}>{c.name}</td>
                          <td style={{ padding: "10px 10px" }}><span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "var(--soft)" }}>{c.categoryLabel}</span></td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>{c.person}<br /><span className="muted-text" style={{ fontSize: 11 }}>{c.dept}</span></td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap", color: "var(--muted)" }}>{c.acquired}</td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>{c.expires ?? "更新不要"}</td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap", fontWeight: 600, color: c.days === null ? "var(--muted)" : c.days < 0 ? "var(--muted)" : c.days <= 30 ? "var(--red)" : c.days <= 90 ? "var(--orange)" : "var(--text)" }}>
                            {c.days === null ? "—" : c.days < 0 ? "失効" : `${c.days}日`}
                          </td>
                          <td style={{ padding: "10px 10px", whiteSpace: "nowrap", color: "var(--muted)", fontSize: 12 }}>{c.renewal}</td>
                          <td style={{ padding: "10px 10px", textAlign: "center" }}>
                            <span style={{ fontSize: 14 }}>{c.notify ? "🔔" : "—"}</span>
                          </td>
                          <td style={{ padding: "10px 10px" }}><StatusDot status={c.status} /></td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "matrix" && (
            <motion.div key="matrix" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
              style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
              <div className="panel" style={{ overflow: "hidden" }}>
                <div className="panel-title">資格マトリクス <span className="muted-text">カテゴリ別の保有状況</span></div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--line)" }}>
                        <th style={{ padding: "10px 12px", textAlign: "left", background: "var(--soft)", fontWeight: 600, minWidth: 100 }}>氏名 / 部署</th>
                        {CERT_CATS.map((cat) => (
                          <th key={cat.key} style={{ padding: "10px 12px", textAlign: "center", background: "var(--soft)", fontWeight: 600, minWidth: 110, borderLeft: "1px solid var(--line)" }}>{cat.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {persons.map(([person, dept]) => {
                        const certs = employeeCertifications.filter((c) => c.person === person);
                        return (
                          <tr key={person} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap", background: "var(--panel)" }}>
                              {person}<br /><span className="muted-text" style={{ fontWeight: 400, fontSize: 11 }}>{dept}</span>
                            </td>
                            {CERT_CATS.map((cat) => {
                              const held = certs.filter((c) => c.category === cat.key);
                              const worst = held.reduce<string | null>((acc, c) => {
                                const order = ["expired", "danger", "warn", "ok"];
                                if (!acc) return c.status;
                                return order.indexOf(c.status) < order.indexOf(acc) ? c.status : acc;
                              }, null);
                              return (
                                <td key={cat.key} style={{ padding: "10px 12px", textAlign: "center", borderLeft: "1px solid var(--line)", verticalAlign: "top" }}>
                                  {held.length === 0 ? (
                                    <span style={{ color: "var(--line)", fontSize: 18 }}>—</span>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                                      <span style={{ fontSize: 18, fontWeight: 700, color: STATUS_COLOR[worst ?? "ok"] }}>{held.length}</span>
                                      <StatusDot status={worst ?? "ok"} />
                                      {held.map((c) => (
                                        <div key={c.id} style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", maxWidth: 100 }} title={c.name}>{c.name}</div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right panel */}
        {tab !== "matrix" && (
          <AnimatePresence mode="wait">
            {hasDetail ? (
              <motion.div key="detail" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }}
                style={{ width: 280, flexShrink: 0 }}>
                {tab === "permits" && selectedPermit && (
                  <PermitDetail permit={selectedPermit} onClose={() => setSelectedPermit(null)} />
                )}
                {tab === "certifications" && selectedCert && (
                  <CertDetail cert={selectedCert} onClose={() => setSelectedCert(null)} />
                )}
              </motion.div>
            ) : (
              <motion.div key="alerts" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }}
                style={{ width: 280, flexShrink: 0 }}>
                <div className="panel" style={{ height: "100%" }}>
                  <div className="panel-title">要対応アラート <span className="muted-text">{alerts.length}件</span></div>
                  {alerts.length === 0 && <div className="muted-text" style={{ padding: 16, textAlign: "center", fontSize: 13 }}>現在対応が必要な許可・資格はありません。</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {alerts.map((alert) => (
                      <div key={`${alert.kind}-${alert.id}`} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--soft)", border: `1px solid color-mix(in srgb, ${STATUS_COLOR[alert.status]} 25%, transparent)` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 12, flex: 1 }}>{alert.label}</span>
                          <StatusDot status={alert.status} />
                        </div>
                        <div className="muted-text" style={{ fontSize: 11 }}>{alert.sub}</div>
                        {alert.days !== null && (
                          <div style={{ marginTop: 5, fontSize: 11, color: STATUS_COLOR[alert.status], fontWeight: 600 }}>
                            {alert.days < 0 ? `${Math.abs(alert.days)}日超過` : `残${alert.days}日`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Permit registration modal */}
      <Modal open={permitModal} onClose={() => { setPermitModal(false); setPermitForm(emptyPermitForm()); }} title="建設業許可を追加" width={560}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>業種名<input value={permitForm.type} onChange={(e) => setPermitForm((p) => ({ ...p, type: e.target.value }))} placeholder="例: 建築工事業" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
            <label>区分<select value={permitForm.kubun} onChange={(e) => setPermitForm((p) => ({ ...p, kubun: e.target.value as ConstructionLicense["kubun"] }))} style={{ display: "block", width: "100%", marginTop: 5 }}>
              <option>知事・一般</option><option>知事・特定</option><option>大臣・一般</option><option>大臣・特定</option>
            </select></label>
          </div>
          <label>許可番号<input value={permitForm.num} onChange={(e) => setPermitForm((p) => ({ ...p, num: e.target.value }))} placeholder="例: 知事-般-04第123456号" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>取得日<input type="date" value={permitForm.acquired} onChange={(e) => setPermitForm((p) => ({ ...p, acquired: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
            <label>有効期限<input type="date" value={permitForm.expires} onChange={(e) => setPermitForm((p) => ({ ...p, expires: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>担当者名<input value={permitForm.person} onChange={(e) => setPermitForm((p) => ({ ...p, person: e.target.value }))} placeholder="例: 田中 一郎" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
            <label>部署<input value={permitForm.dept} onChange={(e) => setPermitForm((p) => ({ ...p, dept: e.target.value }))} placeholder="例: 工務部" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          </div>
          <label>備考<textarea value={permitForm.notes} onChange={(e) => setPermitForm((p) => ({ ...p, notes: e.target.value }))} rows={2} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="ghost-button" onClick={() => { setPermitModal(false); setPermitForm(emptyPermitForm()); }}>キャンセル</button>
            <button className="ghost-button" onClick={savePermit} style={{ background: "var(--green)", color: "white", borderColor: "var(--green)" }}>登録する</button>
          </div>
        </div>
      </Modal>

      {/* Certification registration modal */}
      <Modal open={certModal} onClose={() => { setCertModal(false); setCertForm(emptyCertForm()); }} title="社員資格を追加" width={560}>
        <div style={{ display: "grid", gap: 12 }}>
          <label>資格名<input value={certForm.name} onChange={(e) => setCertForm((p) => ({ ...p, name: e.target.value }))} placeholder="例: 一級施工管理技士（土木）" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>カテゴリ<select value={certForm.category} onChange={(e) => setCertForm((p) => ({ ...p, category: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 5 }}>
              {CERT_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select></label>
            <label>更新区分<input value={certForm.renewal} onChange={(e) => setCertForm((p) => ({ ...p, renewal: e.target.value }))} placeholder="例: 講習更新" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>保有者名<input value={certForm.person} onChange={(e) => setCertForm((p) => ({ ...p, person: e.target.value }))} placeholder="例: 田中 一郎" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
            <label>部署<input value={certForm.dept} onChange={(e) => setCertForm((p) => ({ ...p, dept: e.target.value }))} placeholder="例: 工務部" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>取得日<input type="date" value={certForm.acquired} onChange={(e) => setCertForm((p) => ({ ...p, acquired: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
            <label>有効期限（更新不要は空欄）<input type="date" value={certForm.expires} onChange={(e) => setCertForm((p) => ({ ...p, expires: e.target.value }))} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={certForm.notify} onChange={(e) => setCertForm((p) => ({ ...p, notify: e.target.checked }))} />
            期限前に通知する
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="ghost-button" onClick={() => { setCertModal(false); setCertForm(emptyCertForm()); }}>キャンセル</button>
            <button className="ghost-button" onClick={saveCert} style={{ background: "var(--green)", color: "white", borderColor: "var(--green)" }}>登録する</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PermitDetail({ permit, onClose }: { permit: ConstructionLicense; onClose: () => void }) {
  const daysColor = permit.days < 0 ? "var(--muted)" : permit.days <= 30 ? "var(--red)" : permit.days <= 90 ? "var(--orange)" : "var(--green)";
  const progress = permit.days < 0 ? 0 : Math.min(100, Math.round((permit.days / (365 * 5)) * 100));
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="panel-title" style={{ margin: 0 }}>許可の詳細</div>
        <button className="ghost-button" onClick={onClose} style={{ padding: "2px 8px", fontSize: 12 }}>閉じる</button>
      </div>
      <div>
        <div className="muted-text" style={{ fontSize: 11 }}>{permit.kubun}</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{permit.type}</div>
        <div className="muted-text" style={{ fontSize: 11, marginTop: 4 }}>{permit.num}</div>
      </div>
      <StatusDot status={permit.status} />
      <div style={{ padding: "10px 12px", background: "var(--soft)", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span className="muted-text" style={{ fontSize: 11 }}>有効期限まで</span>
          <span style={{ fontWeight: 700, color: daysColor }}>
            {permit.days < 0 ? `${Math.abs(permit.days)}日超過` : `残${permit.days}日`}
          </span>
        </div>
        <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: daysColor, borderRadius: 3, transition: "width 0.4s" }} />
        </div>
      </div>
      {[["取得日", permit.acquired], ["有効期限", permit.expires], ["担当者", permit.person], ["部署", permit.dept],
        ["WFステータス", permit.wf], ["関連ファイル", `${permit.files}件`]].map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
          <span className="muted-text">{label}</span>
          <span style={{ fontWeight: 500 }}>{value}</span>
        </div>
      ))}
      {permit.notes && (
        <div style={{ padding: "8px 10px", background: "var(--soft)", borderRadius: 6, fontSize: 12 }}>
          <div className="muted-text" style={{ fontSize: 11, marginBottom: 4 }}>備考</div>
          {permit.notes}
        </div>
      )}
    </div>
  );
}

function CertDetail({ cert, onClose }: { cert: EmployeeCertification; onClose: () => void }) {
  const daysColor = cert.days === null ? "var(--green)" : cert.days < 0 ? "var(--muted)" : cert.days <= 30 ? "var(--red)" : cert.days <= 90 ? "var(--orange)" : "var(--green)";
  const progress = cert.days === null ? 100 : cert.days < 0 ? 0 : Math.min(100, Math.round((cert.days / (365 * 5)) * 100));
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="panel-title" style={{ margin: 0 }}>資格の詳細</div>
        <button className="ghost-button" onClick={onClose} style={{ padding: "2px 8px", fontSize: 12 }}>閉じる</button>
      </div>
      <div>
        <div className="muted-text" style={{ fontSize: 11 }}>{cert.categoryLabel}</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{cert.name}</div>
      </div>
      <StatusDot status={cert.status} />
      {cert.expires && (
        <div style={{ padding: "10px 12px", background: "var(--soft)", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="muted-text" style={{ fontSize: 11 }}>有効期限まで</span>
            <span style={{ fontWeight: 700, color: daysColor }}>
              {cert.days === null ? "更新不要" : cert.days < 0 ? `${Math.abs(cert.days)}日超過` : `残${cert.days}日`}
            </span>
          </div>
          <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: daysColor, borderRadius: 3, transition: "width 0.4s" }} />
          </div>
        </div>
      )}
      {[["保有者", cert.person], ["部署", cert.dept], ["取得日", cert.acquired],
        ["有効期限", cert.expires ?? "更新不要"], ["更新区分", cert.renewal], ["通知", cert.notify ? "有効" : "無効"]].map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
          <span className="muted-text">{label}</span>
          <span style={{ fontWeight: 500 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
