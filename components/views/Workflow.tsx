"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import type { WorkflowRequest, WorkflowRouteStep, WorkflowTemplate } from "@/lib/types";
import { isWorkflowPendingFor, uid, userName, workflowRoute as routeFor } from "@/lib/utils";

function printWorkflowSlip(
  detail: WorkflowRequest & { route: WorkflowRouteStep[] },
  resolveUserName: (id: string) => string
) {
  const routeRows = detail.route.map((step, i) => {
    const names = step.userIds.map(resolveUserName).join("、");
    const result = step.result ?? (i === (detail.currentStep ?? 0) ? "処理待ち" : "未処理");
    const resultColor = result === "承認" ? "#166534" : result === "却下" ? "#b91c1c" : "#555";
    return `<tr>
      <td>${i + 1}</td>
      <td>${step.kind}</td>
      <td>${step.role}</td>
      <td>${names}</td>
      <td style="color:${resultColor};font-weight:600">${result}</td>
      <td>${step.completedAt ? step.completedAt.slice(0, 10) : ""}</td>
      <td>${step.comment ?? ""}</td>
    </tr>`;
  }).join("");

  const historyRows = (detail.history ?? []).map((h) =>
    `<tr><td>${h.date.slice(0, 16).replace("T", " ")}</td><td>${resolveUserName(h.userId)}</td><td>${h.action}</td><td>${h.comment ?? ""}</td></tr>`
  ).join("");

  const extraFields = detail.formData ? Object.entries({
    "代理申請": detail.formData.proxyApplicant ? resolveUserName(detail.formData.proxyApplicant) : "",
    "現金受取人": detail.formData.cashRecipient ? resolveUserName(detail.formData.cashRecipient) : "",
    "受取方法": detail.formData.receiveMethod ?? "",
    "工事・案件番号": detail.formData.projectNumber ?? "",
    "工事・案件略称": detail.formData.projectName ?? "",
    "申請期間": detail.formData.periodStart ? `${detail.formData.periodStart} ～ ${detail.formData.periodEnd ?? ""}` : "",
  }).filter(([, v]) => v).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("") : "";

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
<title>${detail.number} ${detail.title}</title>
<style>
  body { font-family: "Yu Gothic", "Meiryo", sans-serif; font-size: 12px; margin: 24px; color: #111; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 4px; }
  .subtitle { text-align: center; font-size: 12px; color: #555; margin-bottom: 20px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #ccc; margin-bottom: 14px; }
  .meta-grid .row { display: contents; }
  .meta-grid th, .meta-grid td { padding: 6px 10px; border: 1px solid #ccc; }
  .meta-grid th { background: #f0f4f8; font-weight: 600; width: 110px; }
  .detail-box { border: 1px solid #ccc; padding: 10px 14px; min-height: 60px; white-space: pre-wrap; margin-bottom: 14px; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  table th, table td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; font-size: 11px; }
  table th { background: #f0f4f8; font-weight: 600; }
  .section-title { font-size: 13px; font-weight: 700; margin: 14px 0 6px; border-left: 3px solid #1e3a5f; padding-left: 8px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-weight: 700;
    background: ${detail.status === "承認済" ? "#d1fae5" : detail.status === "却下" ? "#fee2e2" : "#fffbeb"};
    color: ${detail.status === "承認済" ? "#166534" : detail.status === "却下" ? "#b91c1c" : "#92400e"}; }
  @media print { @page { size: A4; margin: 15mm; } }
</style></head><body>
<h1>申請伺書</h1>
<div class="subtitle">出力日: ${new Date().toLocaleDateString("ja-JP")}</div>
<table class="meta-grid" style="margin-bottom:14px">
  <tr><th>申請番号</th><td>${detail.number}</td><th>ステータス</th><td><span class="status-badge">${detail.status}</span></td></tr>
  <tr><th>申請種別</th><td>${detail.type}</td><th>申請日</th><td>${detail.date}</td></tr>
  <tr><th>申請者</th><td>${resolveUserName(detail.applicant)}</td><th>所属</th><td>${detail.dept}</td></tr>
  ${detail.amount ? `<tr><th>金額</th><td colspan="3"><strong>¥${detail.amount.toLocaleString()}</strong></td></tr>` : ""}
  ${extraFields}
</table>
<div class="section-title">件名</div>
<div style="font-size:15px;font-weight:700;margin-bottom:12px">${detail.title}</div>
<div class="section-title">申請内容</div>
<div class="detail-box">${detail.detail}</div>
${routeRows ? `<div class="section-title">承認経路</div>
<table><thead><tr><th>#</th><th>種別</th><th>役割</th><th>処理者</th><th>結果</th><th>処理日</th><th>コメント</th></tr></thead><tbody>${routeRows}</tbody></table>` : ""}
${historyRows ? `<div class="section-title">処理履歴</div>
<table><thead><tr><th>日時</th><th>処理者</th><th>操作</th><th>コメント</th></tr></thead><tbody>${historyRows}</tbody></table>` : ""}
<script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };<\/script>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=900,height=750");
  if (w) { setTimeout(() => URL.revokeObjectURL(url), 10000); }
}

type ListMode = "latest" | "sent" | "inbox" | "pending" | "results" | "drafts";
type WizardStep = 1 | 2 | 3;

const LISTS: Array<[ListMode, string]> = [["latest", "最新一覧"], ["sent", "送信一覧"], ["inbox", "受信一覧"], ["pending", "未処理"], ["results", "結果一覧"], ["drafts", "下書き"]];
const KINDS: WorkflowRouteStep["kind"][] = ["承認", "決裁", "確認", "回覧"];
const OPTIONAL_FIELDS: Array<[string, string]> = [
  ["amount", "金額"], ["proxyApplicant", "代理申請者"], ["cashRecipient", "現金受取人"], ["receiveMethod", "受取方法"],
  ["projectNumber", "工事・案件番号"], ["projectName", "工事・案件略称"], ["periodStart", "申請期間開始"], ["periodEnd", "申請期間終了"],
];

function numberFor(index: number) {
  const year = new Date().getFullYear();
  return `WF-${year}-${String(index + 1).padStart(4, "0")}`;
}
function resultTone(status: string) {
  if (status === "承認済") return "#e7f5eb";
  if (status === "却下" || status === "差し戻し") return "#fff0ec";
  return "var(--soft)";
}

function moveStep(steps: WorkflowRouteStep[], id: string, dir: "up" | "down"): WorkflowRouteStep[] {
  const idx = steps.findIndex((step) => step.id === id);
  const j = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || j < 0 || j >= steps.length) return steps;
  const next = [...steps];
  [next[idx], next[j]] = [next[j], next[idx]];
  return next;
}
// 処理者を追加/除外する。最低1名は残す。
function toggleUserId(userIds: string[], userId: string): string[] {
  if (userIds.includes(userId)) return userIds.length <= 1 ? userIds : userIds.filter((value) => value !== userId);
  return [...userIds, userId];
}

// 現在ステップに対する承認/却下/差し戻しを1件へ適用する。詳細画面の決裁と一括承認で共有。
function applyDecision(item: WorkflowRequest, me: string, action: "承認" | "却下" | "差し戻し", comment: string, now: string): WorkflowRequest {
  const route = [...routeFor(item)];
  const index = item.currentStep ?? item.approved.length;
  const step = route[index];
  if (!step?.userIds.includes(me)) return item;
  const history = [...(item.history ?? []), { id: uid("wh"), date: now, userId: me, action, comment }];
  if (action === "却下") { route[index] = { ...step, completedBy: me, completedAt: now, result: "却下", comment }; return { ...item, route, status: "却下", rejected: true, updatedAt: now, history }; }
  if (action === "差し戻し") { route[index] = { ...step, completedBy: me, completedAt: now, result: "差し戻し", comment }; return { ...item, route, status: "差し戻し", updatedAt: now, history }; }
  // 承認: 全員承認モードでは、全処理者が承認するまで同じステップに留まる。
  const approvedBy = Array.from(new Set([...(step.approvedBy ?? []), me]));
  const needAll = step.approvalMode === "all" && step.userIds.length > 1;
  const stepDone = !needAll || step.userIds.every((userId) => approvedBy.includes(userId));
  const approved = [...item.approved, me];
  if (!stepDone) {
    route[index] = { ...step, approvedBy };
    return { ...item, route, approved, status: "承認待ち", updatedAt: now, history };
  }
  route[index] = { ...step, approvedBy, completedBy: me, completedAt: now, result: "承認", comment };
  const next = index + 1;
  return { ...item, route, currentStep: next, status: next >= route.length ? "承認済" : "承認待ち", approved, updatedAt: now, history };
}

export default function WorkflowView() {
  const { state, updateState, currentUser, can } = useApp();
  const me = currentUser ?? state.currentUser;
  const [mode, setMode] = useState<ListMode>("latest");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [wizard, setWizard] = useState<WizardStep>(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  function changeMode(value: ListMode) { setMode(value); setSelectedIds(new Set()); }
  const [tplManagerOpen, setTplManagerOpen] = useState(false);
  const [tplEditing, setTplEditing] = useState<WorkflowTemplate | null>(null);
  const admins = state.users.filter((user) => user.role === "管理者" || user.role === "部門管理者");
  const defaultRoutes = (): WorkflowRouteStep[] => [
    { id: uid("route"), kind: "承認", role: "所属長", userIds: [admins[0]?.id ?? me] },
    { id: uid("route"), kind: "決裁", role: "管理責任者", userIds: [admins[1]?.id ?? admins[0]?.id ?? me] },
    { id: uid("route"), kind: "回覧", role: "関係者", userIds: [me] },
  ];
  const initialForm = () => ({
    templateId: "", type: "稟議", title: "", amount: "", detail: "", proxyApplicant: "", cashRecipient: "", receiveMethod: "振込",
    projectNumber: "", projectName: "", periodStart: "", periodEnd: "", relatedFiles: [] as string[], route: defaultRoutes(),
  });
  const [form, setForm] = useState(initialForm);
  const activeTemplate = state.workflowTemplates.find((template) => template.id === form.templateId) ?? null;
  // 様式未選択（自由申請）ならすべての任意項目を表示、選択時は様式が定義する項目のみ表示。
  const showField = (key: string) => !activeTemplate || activeTemplate.fields.includes(key);
  function applyTemplate(id: string) {
    const tpl = state.workflowTemplates.find((template) => template.id === id);
    if (!tpl) { setForm((prev) => ({ ...prev, templateId: "" })); return; }
    setForm((prev) => ({
      ...prev,
      templateId: id,
      type: tpl.type,
      route: tpl.defaultRoute.map((step) => ({ ...step, id: uid("route"), completedBy: undefined, completedAt: undefined, result: undefined, comment: undefined })),
    }));
  }

  const rawDetail = state.workflows.find((item) => item.id === detailId) ?? null;
  const detail = rawDetail ? { ...rawDetail, route: routeFor(rawDetail), currentStep: rawDetail.currentStep ?? rawDetail.approved.length } : null;
  const visible = useMemo(() => state.workflows.filter((item) => {
    const route = routeFor(item);
    const routeUsers = route.flatMap((step) => step.userIds);
    if (mode === "sent" && item.applicant !== me) return false;
    if (mode === "inbox" && !routeUsers.includes(me)) return false;
    if (mode === "pending" && !isWorkflowPendingFor(item, me)) return false;
    if (mode === "results" && !["承認済", "却下", "差し戻し"].includes(item.status)) return false;
    if (mode === "drafts" && !(item.draft && item.applicant === me)) return false;
    if (mode !== "drafts" && item.draft) return false;
    return !query || `${item.number} ${item.title} ${item.type} ${item.detail} ${userName(state, item.applicant)}`.toLowerCase().includes(query.toLowerCase());
  }), [state, mode, me, query]);

  function setData(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function toggleFile(id: string) {
    setForm((prev) => ({ ...prev, relatedFiles: prev.relatedFiles.includes(id) ? prev.relatedFiles.filter((value) => value !== id) : [...prev.relatedFiles, id] }));
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleSelectAll() {
    setSelectedIds((prev) => prev.size === visible.length ? new Set() : new Set(visible.map((item) => item.id)));
  }
  function updateRoute(id: string, patch: Partial<WorkflowRouteStep>) {
    setForm((prev) => ({ ...prev, route: prev.route.map((step) => step.id === id ? { ...step, ...patch } : step) }));
  }
  function addRoute() {
    setForm((prev) => ({ ...prev, route: [...prev.route, { id: uid("route"), kind: "承認", role: "承認者", userIds: [admins[0]?.id ?? me] }] }));
  }
  function moveRoute(id: string, dir: "up" | "down") {
    setForm((prev) => ({ ...prev, route: moveStep(prev.route, id, dir) }));
  }
  function toggleRouteUser(id: string, userId: string) {
    setForm((prev) => ({ ...prev, route: prev.route.map((step) => step.id === id ? { ...step, userIds: toggleUserId(step.userIds, userId) } : step) }));
  }
  function openNew() {
    setEditingId(null); setForm(initialForm()); setWizard(1); setFormOpen(true);
  }
  function openDraft(item: WorkflowRequest) {
    setEditingId(item.id);
    setForm({
      templateId: "", type: item.type, title: item.title, amount: item.amount ? String(item.amount) : "", detail: item.detail,
      proxyApplicant: item.formData?.proxyApplicant ?? "", cashRecipient: item.formData?.cashRecipient ?? "",
      receiveMethod: item.formData?.receiveMethod ?? "振込", projectNumber: item.formData?.projectNumber ?? "",
      projectName: item.formData?.projectName ?? "", periodStart: item.formData?.periodStart ?? "", periodEnd: item.formData?.periodEnd ?? "",
      relatedFiles: item.relatedFiles ?? [], route: item.route?.length ? item.route : defaultRoutes(),
    });
    setWizard(1); setFormOpen(true);
  }
  function buildRequest(draft: boolean): WorkflowRequest {
    const existing = editingId ? state.workflows.find((item) => item.id === editingId) : undefined;
    const now = new Date().toISOString();
    return {
      id: existing?.id ?? uid("w"), number: existing?.number ?? numberFor(state.workflows.length), type: form.type, title: form.title.trim(),
      applicant: me, dept: state.users.find((user) => user.id === me)?.dept ?? "", date: existing?.date ?? now.slice(0, 10), updatedAt: now,
      status: draft ? "下書き" : "申請中", amount: form.amount ? Number(form.amount) : undefined, detail: form.detail,
      approvers: form.route.flatMap((step) => step.userIds), approved: [], rejected: false, draft, currentStep: 0, route: form.route,
      formData: { proxyApplicant: form.proxyApplicant, cashRecipient: form.cashRecipient, receiveMethod: form.receiveMethod, projectNumber: form.projectNumber, projectName: form.projectName, periodStart: form.periodStart, periodEnd: form.periodEnd },
      relatedFiles: form.relatedFiles,
      history: [{ id: uid("wh"), date: now, userId: me, action: draft ? "下書き保存" : "申請" }],
    };
  }
  function save(draft: boolean) {
    if (!form.title.trim()) return;
    const request = buildRequest(draft);
    updateState((prev) => ({ ...prev, workflows: editingId ? prev.workflows.map((item) => item.id === editingId ? request : item) : [request, ...prev.workflows] }));
    setFormOpen(false); setEditingId(null); setMode(draft ? "drafts" : "sent");
  }
  function decide(action: "承認" | "却下" | "差し戻し") {
    if (!detail) return;
    const now = new Date().toISOString();
    updateState((prev) => ({ ...prev, workflows: prev.workflows.map((item) => item.id === detail.id ? applyDecision(item, me, action, decisionComment, now) : item) }));
    setDecisionComment(""); setDetailId(null);
  }
  function bulkApprove() {
    if (selectedIds.size === 0) return;
    const now = new Date().toISOString();
    updateState((prev) => ({ ...prev, workflows: prev.workflows.map((item) =>
      selectedIds.has(item.id) && isWorkflowPendingFor(item, me) ? applyDecision(item, me, "承認", "一括承認", now) : item) }));
    setSelectedIds(new Set());
  }
  function newTemplate() {
    setTplEditing({ id: uid("wt"), name: "", type: "稟議", description: "", detailHint: "", fields: ["amount"], defaultRoute: [{ id: uid("route"), kind: "承認", role: "所属長", userIds: [admins[0]?.id ?? me] }] });
  }
  function patchTemplate(patch: Partial<WorkflowTemplate>) {
    setTplEditing((prev) => prev ? { ...prev, ...patch } : prev);
  }
  function toggleTemplateField(key: string) {
    setTplEditing((prev) => prev ? { ...prev, fields: prev.fields.includes(key) ? prev.fields.filter((value) => value !== key) : [...prev.fields, key] } : prev);
  }
  function patchTemplateRoute(id: string, patch: Partial<WorkflowRouteStep>) {
    setTplEditing((prev) => prev ? { ...prev, defaultRoute: prev.defaultRoute.map((step) => step.id === id ? { ...step, ...patch } : step) } : prev);
  }
  function addTemplateRoute() {
    setTplEditing((prev) => prev ? { ...prev, defaultRoute: [...prev.defaultRoute, { id: uid("route"), kind: "承認", role: "承認者", userIds: [admins[0]?.id ?? me] }] } : prev);
  }
  function removeTemplateRoute(id: string) {
    setTplEditing((prev) => prev ? { ...prev, defaultRoute: prev.defaultRoute.filter((step) => step.id !== id) } : prev);
  }
  function moveTemplateRoute(id: string, dir: "up" | "down") {
    setTplEditing((prev) => prev ? { ...prev, defaultRoute: moveStep(prev.defaultRoute, id, dir) } : prev);
  }
  function toggleTemplateRouteUser(id: string, userId: string) {
    setTplEditing((prev) => prev ? { ...prev, defaultRoute: prev.defaultRoute.map((step) => step.id === id ? { ...step, userIds: toggleUserId(step.userIds, userId) } : step) } : prev);
  }
  function saveTemplate() {
    if (!tplEditing || !tplEditing.name.trim()) return;
    const tpl = tplEditing;
    updateState((prev) => ({ ...prev, workflowTemplates: prev.workflowTemplates.some((t) => t.id === tpl.id) ? prev.workflowTemplates.map((t) => t.id === tpl.id ? tpl : t) : [...prev.workflowTemplates, tpl] }));
    setTplEditing(null);
  }
  function deleteTemplate(id: string) {
    updateState((prev) => ({ ...prev, workflowTemplates: prev.workflowTemplates.filter((t) => t.id !== id) }));
    setTplEditing((prev) => prev?.id === id ? null : prev);
  }
  function resubmit() {
    if (!detail) return;
    const now = new Date().toISOString();
    updateState((prev) => ({ ...prev, workflows: prev.workflows.map((item) => {
      if (item.id !== detail.id) return item;
      const route = routeFor(item).map((step) => ({ ...step, completedBy: undefined, completedAt: undefined, result: undefined, comment: undefined }));
      return { ...item, route, status: "申請中", currentStep: 0, rejected: false, updatedAt: now, history: [...(item.history ?? []), { id: uid("wh"), date: now, userId: me, action: "再申請" }] };
    }) }));
    setDetailId(null);
  }
  function exportRequest() {
    if (!detail) return;
    const route = routeFor(detail).map((step) => `${step.kind} / ${step.role} / ${step.userIds.map((id) => userName(state, id)).join("、")} / ${step.result ?? "未処理"}`).join("\n");
    const body = `${detail.number}\n${detail.title}\n${detail.type} / ${detail.status}\n申請者: ${userName(state, detail.applicant)}\n\n${detail.detail}\n\n承認経路\n${route}`;
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${detail.number}.txt`; link.click(); URL.revokeObjectURL(url);
  }

  const pendingForMe = detail && isWorkflowPendingFor(detail, me);

  return (
    <div className="workflow-view" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="panel workflow-toolbar" style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
        <button className="ghost-button" onClick={openNew} style={{ background: "var(--green)", color: "white", borderColor: "var(--green)" }}>申請する</button>
        {can("admin") && <button className="ghost-button" onClick={() => { setTplEditing(null); setTplManagerOpen(true); }}>様式管理</button>}
        {LISTS.map(([value, label]) => <button key={value} className="ghost-button" onClick={() => changeMode(value)} style={{ background: mode === value ? "var(--soft)" : "var(--panel)" }}>{label}</button>)}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="申請を検索" style={{ marginLeft: "auto", minWidth: 190 }} />
      </section>

      <motion.section key={mode} className="panel workflow-list" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .2 }}>
        <div className="panel-title">{LISTS.find(([value]) => value === mode)?.[1]} <span className="muted-text">{visible.length}件</span></div>
        {mode === "pending" && visible.length > 0 && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 4px", borderBottom: "1px solid var(--line)" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
              <input type="checkbox" checked={selectedIds.size === visible.length} onChange={toggleSelectAll} />全選択
            </label>
            <span className="muted-text">{selectedIds.size}件選択中</span>
            <button className="ghost-button" disabled={selectedIds.size === 0} onClick={bulkApprove} style={{ marginLeft: "auto", background: selectedIds.size ? "var(--green)" : "var(--panel)", color: selectedIds.size ? "white" : "var(--muted)" }}>選択を一括承認</button>
          </div>
        )}
        {visible.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center" }}>該当する申請はありません。</div>}
        <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }} initial="hidden" animate="show">
        {visible.map((item) => <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.17 } } }} key={item.id} style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: "1px solid var(--line)" }}>{mode === "pending" && <input type="checkbox" aria-label={`${item.title}を選択`} checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ marginLeft: 8, flexShrink: 0 }} />}<motion.button whileHover={{ backgroundColor: "var(--soft)" }} onClick={() => item.draft ? openDraft(item) : setDetailId(item.id)} style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", color: "var(--text)", padding: "13px 4px", textAlign: "left", display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}><span className="muted-text">{item.number ?? item.id}</span><div><strong>{item.title}</strong><div className="muted-text">{item.type} / {userName(state, item.applicant)} / {item.dept} / {item.date}</div></div><span style={{ padding: "4px 8px", borderRadius: 5, background: resultTone(item.status), fontSize: 11 }}>{item.status}</span></motion.button></motion.div>)}
        </motion.div>
      </motion.section>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="申請の作成" width={820}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 18 }}>{[[1, "申請内容"], [2, "承認経路"], [3, "内容確認"]].map(([value, label]) => <div key={value} style={{ padding: 9, textAlign: "center", borderBottom: wizard === value ? "2px solid var(--green)" : "2px solid var(--line)", fontWeight: wizard === value ? 700 : 400 }}>{value}. {label}</div>)}</div>
        {wizard === 1 && <div style={{ display: "grid", gap: 12 }}>
          {state.workflowTemplates.length > 0 && <label>申請様式<select value={form.templateId} onChange={(event) => applyTemplate(event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="">自由申請（様式なし）</option>{state.workflowTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>{activeTemplate?.description && <div className="muted-text" style={{ marginTop: 4 }}>{activeTemplate.description}</div>}</label>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>申請フォーム<select value={form.type} onChange={(event) => setData("type", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option>稟議</option><option>経費精算</option><option>現金申請</option><option>勤怠・休暇</option><option>購買申請</option><option>その他</option></select></label><label>件名<input value={form.title} onChange={(event) => setData("title", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label></div>
          <label>申請内容<textarea value={form.detail} onChange={(event) => setData("detail", event.target.value)} rows={5} placeholder={activeTemplate?.detailHint ?? ""} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>{showField("amount") && <label>金額<input type="number" value={form.amount} onChange={(event) => setData("amount", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>}{showField("proxyApplicant") && <label>代理申請者<select value={form.proxyApplicant} onChange={(event) => setData("proxyApplicant", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="">なし</option>{state.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>}{showField("cashRecipient") && <label>現金受取人<select value={form.cashRecipient} onChange={(event) => setData("cashRecipient", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="">指定なし</option>{state.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>}{showField("receiveMethod") && <label>受取方法<select value={form.receiveMethod} onChange={(event) => setData("receiveMethod", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option>振込</option><option>現金受取</option><option>立替精算</option></select></label>}{showField("projectNumber") && <label>工事・案件番号<input value={form.projectNumber} onChange={(event) => setData("projectNumber", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>}{showField("projectName") && <label>工事・案件略称<input value={form.projectName} onChange={(event) => setData("projectName", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>}{showField("periodStart") && <label>申請期間開始<input type="date" value={form.periodStart} onChange={(event) => setData("periodStart", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>}{showField("periodEnd") && <label>申請期間終了<input type="date" value={form.periodEnd} onChange={(event) => setData("periodEnd", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>}</div>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>関連ファイル</legend>{state.files.map((file) => <label key={file.id} style={{ display: "flex", gap: 6, marginBottom: 5 }}><input type="checkbox" checked={form.relatedFiles.includes(file.id)} onChange={() => toggleFile(file.id)} />{file.name}</label>)}</fieldset>
          <div style={{ display: "flex", justifyContent: "space-between" }}><button className="ghost-button" onClick={() => save(true)}>下書き保存</button><button className="ghost-button" onClick={() => setWizard(2)} style={{ background: "var(--green)", color: "white" }}>次に、経路を設定</button></div>
        </div>}

        {wizard === 2 && <div style={{ display: "grid", gap: 10 }}><div className="muted-text">上から順番に処理されます。並べ替え・処理者（複数可）・承認条件を設定してください。</div>{form.route.map((step, index) => <div key={step.id} style={{ display: "grid", gap: 8, padding: 10, border: "1px solid var(--line)", borderRadius: 8 }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><strong style={{ width: 20 }}>{index + 1}</strong><select value={step.kind} onChange={(event) => updateRoute(step.id, { kind: event.target.value as WorkflowRouteStep["kind"] })}>{KINDS.map((value) => <option key={value}>{value}</option>)}</select><input value={step.role} onChange={(event) => updateRoute(step.id, { role: event.target.value })} placeholder="役割" style={{ flex: 1, minWidth: 80 }} /><div style={{ marginLeft: "auto", display: "flex", gap: 4 }}><button className="ghost-button" aria-label="上へ" disabled={index === 0} onClick={() => moveRoute(step.id, "up")}>↑</button><button className="ghost-button" aria-label="下へ" disabled={index === form.route.length - 1} onClick={() => moveRoute(step.id, "down")}>↓</button><button className="ghost-button" disabled={form.route.length <= 1} onClick={() => setForm((prev) => ({ ...prev, route: prev.route.filter((value) => value.id !== step.id) }))}>削除</button></div></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><span className="muted-text">処理者:</span>{state.users.map((user) => <label key={user.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, padding: "2px 6px", border: "1px solid var(--line)", borderRadius: 6 }}><input type="checkbox" checked={step.userIds.includes(user.id)} onChange={() => toggleRouteUser(step.id, user.id)} />{user.name}</label>)}</div>{step.userIds.length > 1 && <label style={{ fontSize: 12 }}>承認条件 <select value={step.approvalMode ?? "all"} onChange={(event) => updateRoute(step.id, { approvalMode: event.target.value as "all" | "any" })}><option value="all">全員の承認が必要</option><option value="any">いずれか1名の承認</option></select></label>}</div>)}<button className="ghost-button" onClick={addRoute}>経路を追加</button><div style={{ display: "flex", justifyContent: "space-between" }}><button className="ghost-button" onClick={() => setWizard(1)}>前の画面へ戻る</button><button className="ghost-button" onClick={() => setWizard(3)} style={{ background: "var(--green)", color: "white" }}>次に、内容を確認</button></div></div>}

        {wizard === 3 && <div style={{ display: "grid", gap: 14 }}><section style={{ padding: 14, background: "var(--soft)", borderRadius: 8 }}><div className="muted-text">{form.type}</div><h3 style={{ margin: "4px 0 10px" }}>{form.title}</h3><div style={{ whiteSpace: "pre-wrap" }}>{form.detail}</div>{form.amount && <strong style={{ display: "block", marginTop: 10 }}>金額 ¥{Number(form.amount).toLocaleString()}</strong>}</section><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{Object.entries({ "代理申請": form.proxyApplicant ? userName(state, form.proxyApplicant) : "なし", "現金受取人": form.cashRecipient ? userName(state, form.cashRecipient) : "指定なし", "受取方法": form.receiveMethod, "工事・案件番号": form.projectNumber || "未入力", "工事・案件略称": form.projectName || "未入力", "申請期間": form.periodStart ? `${form.periodStart} ～ ${form.periodEnd || ""}` : "未入力" }).map(([label, value]) => <div key={label} style={{ padding: 10, borderBottom: "1px solid var(--line)" }}><span className="muted-text">{label}</span><div>{value}</div></div>)}</div><div><strong>承認経路</strong>{form.route.map((step, index) => <div key={step.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>{index + 1}. {step.kind} / {step.role} / {step.userIds.map((id) => userName(state, id)).join("、")}{step.userIds.length > 1 ? `（${step.approvalMode === "any" ? "いずれか1名" : "全員承認"}）` : ""}</div>)}</div><div style={{ display: "flex", justifyContent: "space-between" }}><button className="ghost-button" onClick={() => setWizard(2)}>前の画面へ戻る</button><button className="ghost-button" onClick={() => save(false)} style={{ background: "var(--green)", color: "white" }}>申請する</button></div></div>}
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetailId(null)} title="申請データの詳細" width={820}>{detail && <div style={{ display: "grid", gap: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div className="muted-text">{detail.number} / {detail.type}</div><h2 style={{ margin: "4px 0" }}>{detail.title}</h2><div className="muted-text">申請者 {userName(state, detail.applicant)} / {detail.dept} / {detail.date}</div></div><span style={{ alignSelf: "start", padding: "5px 9px", borderRadius: 6, background: resultTone(detail.status) }}>{detail.status}</span></div><div style={{ padding: 14, background: "var(--soft)", borderRadius: 8, whiteSpace: "pre-wrap" }}>{detail.detail}</div>{detail.amount && <div><span className="muted-text">金額</span><strong style={{ display: "block", fontSize: 18 }}>¥{detail.amount.toLocaleString()}</strong></div>}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{Object.entries({ "代理申請": detail.formData?.proxyApplicant ? userName(state, detail.formData.proxyApplicant) : "なし", "現金受取人": detail.formData?.cashRecipient ? userName(state, detail.formData.cashRecipient) : "指定なし", "受取方法": detail.formData?.receiveMethod || "未設定", "工事・案件番号": detail.formData?.projectNumber || "未入力", "工事・案件略称": detail.formData?.projectName || "未入力", "申請期間": detail.formData?.periodStart ? `${detail.formData.periodStart} ～ ${detail.formData.periodEnd || ""}` : "未入力" }).map(([label, value]) => <div key={label} style={{ padding: 9, borderBottom: "1px solid var(--line)" }}><span className="muted-text">{label}</span><div>{value}</div></div>)}</div><div><div className="panel-title">承認経路</div>{(detail.route ?? []).map((step, index) => <div key={step.id} style={{ display: "grid", gridTemplateColumns: "36px 100px minmax(0, 1fr) auto", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--line)" }}><strong>{index + 1}</strong><span>{step.kind}</span><span>{step.role} / {step.userIds.map((id) => userName(state, id)).join("、")}{step.userIds.length > 1 ? `（${step.approvalMode === "any" ? "いずれか1名" : "全員承認"}）` : ""}</span><span className="muted-text">{step.result ?? (step.approvalMode === "all" && step.userIds.length > 1 && (step.approvedBy ?? []).length > 0 ? `${(step.approvedBy ?? []).length}/${step.userIds.length}承認` : (index === (detail.currentStep ?? 0) ? "処理待ち" : "未処理"))}</span></div>)}</div>{(detail.history ?? []).length > 0 && <div><div className="panel-title">履歴</div>{(detail.history ?? []).map((item) => <div key={item.id} className="muted-text" style={{ padding: "5px 0" }}>{item.date.slice(0, 16).replace("T", " ")} / {userName(state, item.userId)} / {item.action}{item.comment ? ` / ${item.comment}` : ""}</div>)}</div>}<div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button className="ghost-button" onClick={exportRequest}>ファイル出力</button><button className="ghost-button" onClick={() => detail && printWorkflowSlip({ ...detail, route: detail.route ?? [] }, (id) => userName(state, id))}>🖨 申請伺書を印刷</button></div>{pendingForMe && <div style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}><textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} rows={3} placeholder="処理コメント" style={{ width: "100%" }} /><div style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 8 }}><button className="ghost-button" onClick={() => decide("差し戻し")}>差し戻し</button><button className="ghost-button" onClick={() => decide("却下")} style={{ color: "#a33" }}>却下</button><button className="ghost-button" onClick={() => decide("承認")} style={{ background: "var(--green)", color: "white" }}>承認</button></div></div>}{detail.status === "差し戻し" && detail.applicant === me && <div style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}><div className="muted-text" style={{ marginBottom: 8 }}>この申請は差し戻されました。内容を確認のうえ再申請できます。</div><div style={{ display: "flex", gap: 8 }}><button className="ghost-button" onClick={() => { openDraft(detail); setDetailId(null); }}>内容を修正して再申請</button><button className="ghost-button" onClick={resubmit} style={{ background: "var(--blue)", color: "white" }}>そのまま再申請する</button></div></div>}</div>}</Modal>

      <Modal open={tplManagerOpen} onClose={() => { setTplManagerOpen(false); setTplEditing(null); }} title="申請様式の管理" width={760}>
        {!tplEditing && <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="muted-text">申請時に選べる様式を管理します。</span><button className="ghost-button" onClick={newTemplate} style={{ background: "var(--green)", color: "white" }}>様式を新規作成</button></div>
          {state.workflowTemplates.length === 0 && <div className="muted-text" style={{ padding: 16, textAlign: "center" }}>様式が登録されていません。</div>}
          {state.workflowTemplates.map((template) => <div key={template.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}><div><strong>{template.name}</strong><div className="muted-text">{template.type} / 項目{template.fields.length} / 経路{template.defaultRoute.length}段</div>{template.description && <div className="muted-text">{template.description}</div>}</div><div style={{ display: "flex", gap: 6 }}><button className="ghost-button" onClick={() => setTplEditing(template)}>編集</button><button className="ghost-button" onClick={() => deleteTemplate(template.id)} style={{ color: "#a33" }}>削除</button></div></div>)}
        </div>}
        {tplEditing && <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>様式名<input value={tplEditing.name} onChange={(event) => patchTemplate({ name: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>申請種別<select value={tplEditing.type} onChange={(event) => patchTemplate({ type: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }}><option>稟議</option><option>経費精算</option><option>現金申請</option><option>勤怠・休暇</option><option>購買申請</option><option>その他</option></select></label></div>
          <label>説明<input value={tplEditing.description ?? ""} onChange={(event) => patchTemplate({ description: event.target.value })} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <label>申請内容のヒント<input value={tplEditing.detailHint ?? ""} onChange={(event) => patchTemplate({ detailHint: event.target.value })} placeholder="申請内容欄のプレースホルダーとして表示されます" style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>表示する項目</legend><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 6 }}>{OPTIONAL_FIELDS.map(([key, label]) => <label key={key} style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={tplEditing.fields.includes(key)} onChange={() => toggleTemplateField(key)} />{label}</label>)}</div></fieldset>
          <div><div className="panel-title">既定の承認経路</div>{tplEditing.defaultRoute.map((step, index) => <div key={step.id} style={{ display: "grid", gap: 8, padding: 8, border: "1px solid var(--line)", borderRadius: 8, marginBottom: 6 }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><strong style={{ width: 18 }}>{index + 1}</strong><select value={step.kind} onChange={(event) => patchTemplateRoute(step.id, { kind: event.target.value as WorkflowRouteStep["kind"] })}>{KINDS.map((value) => <option key={value}>{value}</option>)}</select><input value={step.role} onChange={(event) => patchTemplateRoute(step.id, { role: event.target.value })} placeholder="役割" style={{ flex: 1, minWidth: 70 }} /><div style={{ marginLeft: "auto", display: "flex", gap: 4 }}><button className="ghost-button" aria-label="上へ" disabled={index === 0} onClick={() => moveTemplateRoute(step.id, "up")}>↑</button><button className="ghost-button" aria-label="下へ" disabled={index === tplEditing!.defaultRoute.length - 1} onClick={() => moveTemplateRoute(step.id, "down")}>↓</button><button className="ghost-button" disabled={tplEditing!.defaultRoute.length <= 1} onClick={() => removeTemplateRoute(step.id)}>削除</button></div></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><span className="muted-text">処理者:</span>{state.users.map((user) => <label key={user.id} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, padding: "2px 6px", border: "1px solid var(--line)", borderRadius: 6 }}><input type="checkbox" checked={step.userIds.includes(user.id)} onChange={() => toggleTemplateRouteUser(step.id, user.id)} />{user.name}</label>)}</div>{step.userIds.length > 1 && <label style={{ fontSize: 12 }}>承認条件 <select value={step.approvalMode ?? "all"} onChange={(event) => patchTemplateRoute(step.id, { approvalMode: event.target.value as "all" | "any" })}><option value="all">全員の承認が必要</option><option value="any">いずれか1名の承認</option></select></label>}</div>)}<button className="ghost-button" onClick={addTemplateRoute}>経路を追加</button></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><button className="ghost-button" onClick={() => setTplEditing(null)}>一覧へ戻る</button><button className="ghost-button" onClick={saveTemplate} disabled={!tplEditing.name.trim()} style={{ background: "var(--green)", color: "white" }}>保存する</button></div>
        </div>}
      </Modal>
    </div>
  );
}
