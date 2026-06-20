"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import type { WorkflowRequest, WorkflowRouteStep } from "@/lib/types";
import { uid, userName } from "@/lib/utils";

type ListMode = "latest" | "sent" | "inbox" | "pending" | "results" | "drafts";
type WizardStep = 1 | 2 | 3;

const LISTS: Array<[ListMode, string]> = [["latest", "最新一覧"], ["sent", "送信一覧"], ["inbox", "受信一覧"], ["pending", "未処理"], ["results", "結果一覧"], ["drafts", "下書き"]];
const KINDS: WorkflowRouteStep["kind"][] = ["承認", "決裁", "確認", "回覧"];

function numberFor(index: number) {
  const year = new Date().getFullYear();
  return `WF-${year}-${String(index + 1).padStart(4, "0")}`;
}
function resultTone(status: string) {
  if (status === "承認済") return "#e7f5eb";
  if (status === "却下" || status === "差し戻し") return "#fff0ec";
  return "var(--soft)";
}
function routeFor(item: WorkflowRequest): WorkflowRouteStep[] {
  if (item.route?.length) return item.route;
  return item.approvers.map((userId, index) => ({
    id: `legacy-${item.id}-${index}`,
    kind: index === item.approvers.length - 1 ? "決裁" : "承認",
    role: index === item.approvers.length - 1 ? "決裁者" : "承認者",
    userIds: [userId],
    completedBy: item.approved.includes(userId) ? userId : undefined,
    result: item.approved.includes(userId) ? "承認" : undefined,
  }));
}

export default function WorkflowView() {
  const { state, updateState, currentUser } = useApp();
  const me = currentUser ?? state.currentUser;
  const [mode, setMode] = useState<ListMode>("latest");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [wizard, setWizard] = useState<WizardStep>(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const admins = state.users.filter((user) => user.role === "管理者" || user.role === "部門管理者");
  const defaultRoutes = (): WorkflowRouteStep[] => [
    { id: uid("route"), kind: "承認", role: "所属長", userIds: [admins[0]?.id ?? me] },
    { id: uid("route"), kind: "決裁", role: "管理責任者", userIds: [admins[1]?.id ?? admins[0]?.id ?? me] },
    { id: uid("route"), kind: "回覧", role: "関係者", userIds: [me] },
  ];
  const initialForm = () => ({
    type: "稟議", title: "", amount: "", detail: "", proxyApplicant: "", cashRecipient: "", receiveMethod: "振込",
    projectNumber: "", projectName: "", periodStart: "", periodEnd: "", relatedFiles: [] as string[], route: defaultRoutes(),
  });
  const [form, setForm] = useState(initialForm);

  const rawDetail = state.workflows.find((item) => item.id === detailId) ?? null;
  const detail = rawDetail ? { ...rawDetail, route: routeFor(rawDetail), currentStep: rawDetail.currentStep ?? rawDetail.approved.length } : null;
  const visible = useMemo(() => state.workflows.filter((item) => {
    const route = routeFor(item);
    const routeUsers = route.flatMap((step) => step.userIds);
    if (mode === "sent" && item.applicant !== me) return false;
    if (mode === "inbox" && !routeUsers.includes(me)) return false;
    if (mode === "pending" && !(route[item.currentStep ?? item.approved.length]?.userIds.includes(me) && !["承認済", "却下", "差し戻し"].includes(item.status))) return false;
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
  function updateRoute(id: string, patch: Partial<WorkflowRouteStep>) {
    setForm((prev) => ({ ...prev, route: prev.route.map((step) => step.id === id ? { ...step, ...patch } : step) }));
  }
  function addRoute() {
    setForm((prev) => ({ ...prev, route: [...prev.route, { id: uid("route"), kind: "承認", role: "承認者", userIds: [admins[0]?.id ?? me] }] }));
  }
  function openNew() {
    setEditingId(null); setForm(initialForm()); setWizard(1); setFormOpen(true);
  }
  function openDraft(item: WorkflowRequest) {
    setEditingId(item.id);
    setForm({
      type: item.type, title: item.title, amount: item.amount ? String(item.amount) : "", detail: item.detail,
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
    updateState((prev) => ({ ...prev, workflows: prev.workflows.map((item) => {
      if (item.id !== detail.id) return item;
      const route = [...routeFor(item)];
      const index = item.currentStep ?? item.approved.length;
      const step = route[index];
      if (!step?.userIds.includes(me)) return item;
      route[index] = { ...step, completedBy: me, completedAt: now, result: action, comment: decisionComment };
      if (action === "却下") return { ...item, route, status: "却下", rejected: true, updatedAt: now, history: [...(item.history ?? []), { id: uid("wh"), date: now, userId: me, action, comment: decisionComment }] };
      if (action === "差し戻し") return { ...item, route, status: "差し戻し", updatedAt: now, history: [...(item.history ?? []), { id: uid("wh"), date: now, userId: me, action, comment: decisionComment }] };
      const next = index + 1;
      return { ...item, route, currentStep: next, status: next >= route.length ? "承認済" : "承認待ち", approved: [...item.approved, me], updatedAt: now, history: [...(item.history ?? []), { id: uid("wh"), date: now, userId: me, action, comment: decisionComment }] };
    }) }));
    setDecisionComment(""); setDetailId(null);
  }
  function exportRequest() {
    if (!detail) return;
    const route = routeFor(detail).map((step) => `${step.kind} / ${step.role} / ${step.userIds.map((id) => userName(state, id)).join("、")} / ${step.result ?? "未処理"}`).join("\n");
    const body = `${detail.number}\n${detail.title}\n${detail.type} / ${detail.status}\n申請者: ${userName(state, detail.applicant)}\n\n${detail.detail}\n\n承認経路\n${route}`;
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${detail.number}.txt`; link.click(); URL.revokeObjectURL(url);
  }

  const pendingForMe = detail && routeFor(detail)[detail.currentStep ?? detail.approved.length]?.userIds.includes(me) && !["承認済", "却下", "差し戻し"].includes(detail.status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section className="panel" style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
        <button className="ghost-button" onClick={openNew} style={{ background: "var(--green)", color: "white", borderColor: "var(--green)" }}>申請する</button>
        {LISTS.map(([value, label]) => <button key={value} className="ghost-button" onClick={() => setMode(value)} style={{ background: mode === value ? "var(--soft)" : "var(--panel)" }}>{label}</button>)}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="申請を検索" style={{ marginLeft: "auto", minWidth: 190 }} />
      </section>

      <motion.section key={mode} className="panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .2 }}>
        <div className="panel-title">{LISTS.find(([value]) => value === mode)?.[1]} <span className="muted-text">{visible.length}件</span></div>
        {visible.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center" }}>該当する申請はありません。</div>}
        {visible.map((item) => <button key={item.id} onClick={() => item.draft ? openDraft(item) : setDetailId(item.id)} style={{ width: "100%", border: 0, borderBottom: "1px solid var(--line)", background: "transparent", color: "var(--text)", padding: "13px 4px", textAlign: "left", display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}><span className="muted-text">{item.number ?? item.id}</span><div><strong>{item.title}</strong><div className="muted-text">{item.type} / {userName(state, item.applicant)} / {item.dept} / {item.date}</div></div><span style={{ padding: "4px 8px", borderRadius: 5, background: resultTone(item.status), fontSize: 11 }}>{item.status}</span></button>)}
      </motion.section>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="申請の作成" width={820}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 18 }}>{[[1, "申請内容"], [2, "承認経路"], [3, "内容確認"]].map(([value, label]) => <div key={value} style={{ padding: 9, textAlign: "center", borderBottom: wizard === value ? "2px solid var(--green)" : "2px solid var(--line)", fontWeight: wizard === value ? 700 : 400 }}>{value}. {label}</div>)}</div>
        {wizard === 1 && <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>申請フォーム<select value={form.type} onChange={(event) => setData("type", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option>稟議</option><option>経費精算</option><option>現金申請</option><option>勤怠・休暇</option><option>購買申請</option><option>その他</option></select></label><label>件名<input value={form.title} onChange={(event) => setData("title", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label></div>
          <label>申請内容<textarea value={form.detail} onChange={(event) => setData("detail", event.target.value)} rows={5} style={{ display: "block", width: "100%", marginTop: 5 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}><label>金額<input type="number" value={form.amount} onChange={(event) => setData("amount", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>代理申請者<select value={form.proxyApplicant} onChange={(event) => setData("proxyApplicant", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="">なし</option>{state.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label>現金受取人<select value={form.cashRecipient} onChange={(event) => setData("cashRecipient", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option value="">指定なし</option>{state.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label>受取方法<select value={form.receiveMethod} onChange={(event) => setData("receiveMethod", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }}><option>振込</option><option>現金受取</option><option>立替精算</option></select></label><label>工事・案件番号<input value={form.projectNumber} onChange={(event) => setData("projectNumber", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>工事・案件略称<input value={form.projectName} onChange={(event) => setData("projectName", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>申請期間開始<input type="date" value={form.periodStart} onChange={(event) => setData("periodStart", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label><label>申請期間終了<input type="date" value={form.periodEnd} onChange={(event) => setData("periodEnd", event.target.value)} style={{ display: "block", width: "100%", marginTop: 5 }} /></label></div>
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}><legend>関連ファイル</legend>{state.files.map((file) => <label key={file.id} style={{ display: "flex", gap: 6, marginBottom: 5 }}><input type="checkbox" checked={form.relatedFiles.includes(file.id)} onChange={() => toggleFile(file.id)} />{file.name}</label>)}</fieldset>
          <div style={{ display: "flex", justifyContent: "space-between" }}><button className="ghost-button" onClick={() => save(true)}>下書き保存</button><button className="ghost-button" onClick={() => setWizard(2)} style={{ background: "var(--green)", color: "white" }}>次に、経路を設定</button></div>
        </div>}

        {wizard === 2 && <div style={{ display: "grid", gap: 10 }}><div className="muted-text">上から順番に処理されます。処理者と役割を確認してください。</div>{form.route.map((step, index) => <div key={step.id} style={{ display: "grid", gridTemplateColumns: "36px 110px minmax(120px, 1fr) minmax(150px, 1fr) auto", gap: 8, alignItems: "center", padding: 10, border: "1px solid var(--line)", borderRadius: 8 }}><strong>{index + 1}</strong><select value={step.kind} onChange={(event) => updateRoute(step.id, { kind: event.target.value as WorkflowRouteStep["kind"] })}>{KINDS.map((value) => <option key={value}>{value}</option>)}</select><input value={step.role} onChange={(event) => updateRoute(step.id, { role: event.target.value })} placeholder="役割" /><select value={step.userIds[0] ?? ""} onChange={(event) => updateRoute(step.id, { userIds: [event.target.value] })}>{state.users.map((user) => <option key={user.id} value={user.id}>{user.name} / {user.dept}</option>)}</select><button className="ghost-button" onClick={() => setForm((prev) => ({ ...prev, route: prev.route.filter((item) => item.id !== step.id) }))}>削除</button></div>)}<button className="ghost-button" onClick={addRoute}>経路を追加</button><div style={{ display: "flex", justifyContent: "space-between" }}><button className="ghost-button" onClick={() => setWizard(1)}>前の画面へ戻る</button><button className="ghost-button" onClick={() => setWizard(3)} style={{ background: "var(--green)", color: "white" }}>次に、内容を確認</button></div></div>}

        {wizard === 3 && <div style={{ display: "grid", gap: 14 }}><section style={{ padding: 14, background: "var(--soft)", borderRadius: 8 }}><div className="muted-text">{form.type}</div><h3 style={{ margin: "4px 0 10px" }}>{form.title}</h3><div style={{ whiteSpace: "pre-wrap" }}>{form.detail}</div>{form.amount && <strong style={{ display: "block", marginTop: 10 }}>金額 ¥{Number(form.amount).toLocaleString()}</strong>}</section><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{Object.entries({ "代理申請": form.proxyApplicant ? userName(state, form.proxyApplicant) : "なし", "現金受取人": form.cashRecipient ? userName(state, form.cashRecipient) : "指定なし", "受取方法": form.receiveMethod, "工事・案件番号": form.projectNumber || "未入力", "工事・案件略称": form.projectName || "未入力", "申請期間": form.periodStart ? `${form.periodStart} ～ ${form.periodEnd || ""}` : "未入力" }).map(([label, value]) => <div key={label} style={{ padding: 10, borderBottom: "1px solid var(--line)" }}><span className="muted-text">{label}</span><div>{value}</div></div>)}</div><div><strong>承認経路</strong>{form.route.map((step, index) => <div key={step.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>{index + 1}. {step.kind} / {step.role} / {step.userIds.map((id) => userName(state, id)).join("、")}</div>)}</div><div style={{ display: "flex", justifyContent: "space-between" }}><button className="ghost-button" onClick={() => setWizard(2)}>前の画面へ戻る</button><button className="ghost-button" onClick={() => save(false)} style={{ background: "var(--green)", color: "white" }}>申請する</button></div></div>}
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetailId(null)} title="申請データの詳細" width={820}>{detail && <div style={{ display: "grid", gap: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div className="muted-text">{detail.number} / {detail.type}</div><h2 style={{ margin: "4px 0" }}>{detail.title}</h2><div className="muted-text">申請者 {userName(state, detail.applicant)} / {detail.dept} / {detail.date}</div></div><span style={{ alignSelf: "start", padding: "5px 9px", borderRadius: 6, background: resultTone(detail.status) }}>{detail.status}</span></div><div style={{ padding: 14, background: "var(--soft)", borderRadius: 8, whiteSpace: "pre-wrap" }}>{detail.detail}</div>{detail.amount && <div><span className="muted-text">金額</span><strong style={{ display: "block", fontSize: 18 }}>¥{detail.amount.toLocaleString()}</strong></div>}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{Object.entries({ "代理申請": detail.formData?.proxyApplicant ? userName(state, detail.formData.proxyApplicant) : "なし", "現金受取人": detail.formData?.cashRecipient ? userName(state, detail.formData.cashRecipient) : "指定なし", "受取方法": detail.formData?.receiveMethod || "未設定", "工事・案件番号": detail.formData?.projectNumber || "未入力", "工事・案件略称": detail.formData?.projectName || "未入力", "申請期間": detail.formData?.periodStart ? `${detail.formData.periodStart} ～ ${detail.formData.periodEnd || ""}` : "未入力" }).map(([label, value]) => <div key={label} style={{ padding: 9, borderBottom: "1px solid var(--line)" }}><span className="muted-text">{label}</span><div>{value}</div></div>)}</div><div><div className="panel-title">承認経路</div>{(detail.route ?? []).map((step, index) => <div key={step.id} style={{ display: "grid", gridTemplateColumns: "36px 100px minmax(0, 1fr) auto", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--line)" }}><strong>{index + 1}</strong><span>{step.kind}</span><span>{step.role} / {step.userIds.map((id) => userName(state, id)).join("、")}</span><span className="muted-text">{step.result ?? (index === (detail.currentStep ?? 0) ? "処理待ち" : "未処理")}</span></div>)}</div>{(detail.history ?? []).length > 0 && <div><div className="panel-title">履歴</div>{(detail.history ?? []).map((item) => <div key={item.id} className="muted-text" style={{ padding: "5px 0" }}>{item.date.slice(0, 16).replace("T", " ")} / {userName(state, item.userId)} / {item.action}{item.comment ? ` / ${item.comment}` : ""}</div>)}</div>}<div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button className="ghost-button" onClick={exportRequest}>ファイル出力</button><button className="ghost-button" onClick={() => window.print()}>印刷</button></div>{pendingForMe && <div style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}><textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} rows={3} placeholder="処理コメント" style={{ width: "100%" }} /><div style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 8 }}><button className="ghost-button" onClick={() => decide("差し戻し")}>差し戻し</button><button className="ghost-button" onClick={() => decide("却下")} style={{ color: "#a33" }}>却下</button><button className="ghost-button" onClick={() => decide("承認")} style={{ background: "var(--green)", color: "white" }}>承認</button></div></div>}</div>}</Modal>
    </div>
  );
}
