// 安全書類のExcelダウンロード。元の提出様式のレイアウト（罫線・結合・見出し）を
// exceljsでコード上に再構築し、フォームデータを差し込んで.xlsxとして書き出す。
import ExcelJS from "exceljs";
import type { ConstructionSystemLedger, OrgChartEntry, SubcontractorOrgChart } from "./types";

const THIN: Partial<ExcelJS.Border> = { style: "thin" };
const BORDER: Partial<ExcelJS.Borders> = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };

function setCell(ws: ExcelJS.Worksheet, addr: string, value: string | number | undefined, header = false) {
  const cell = ws.getCell(addr);
  cell.value = value ?? "";
  cell.border = BORDER;
  cell.alignment = { vertical: "middle", horizontal: header ? "center" : "left", wrapText: true };
  cell.font = header ? { bold: true, size: 9 } : { size: 9.5 };
  if (header) cell.fill = HEADER_FILL;
  return cell;
}
function mergeSet(ws: ExcelJS.Worksheet, range: string, value: string | number | undefined, header = false) {
  ws.mergeCells(range);
  return setCell(ws, range.split(":")[0], value, header);
}
async function saveWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ══════════════════════════════════════════
   下請負業者編成表（全建統一様式第１号－乙）
══════════════════════════════════════════ */
export async function downloadOrgChartExcel(chart: SubcontractorOrgChart, workspaceName: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("下請負業者編成表", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true } });
  ws.columns = Array.from({ length: 13 }, () => ({ width: 10 }));

  mergeSet(ws, "A1:D1", "全建統一様式第１号－乙");
  mergeSet(ws, "K1:M1", `作成日：${chart.createdDate}`);
  mergeSet(ws, "A2:M3", "下請負業者編成表", true);
  ws.getCell("A2").font = { bold: true, size: 16 };
  ws.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
  mergeSet(ws, "A4:M4", `工事名：${workspaceName}`);

  let row = 6;
  const primary = chart.entries.find((e) => e.tier === 1);
  mergeSet(ws, `A${row}:M${row}`, "（一次下請負業者＝作成下請負業者）", true);
  row++;
  if (primary) {
    const r0 = row;
    mergeSet(ws, `A${r0}:A${r0 + 5}`, primary.jobType || "工事", true);
    mergeSet(ws, `B${r0}:C${r0}`, "会社名", true); mergeSet(ws, `D${r0}:M${r0}`, primary.companyName);
    mergeSet(ws, `B${r0 + 1}:C${r0 + 1}`, "代表者名", true); mergeSet(ws, `D${r0 + 1}:M${r0 + 1}`, primary.representative);
    mergeSet(ws, `B${r0 + 2}:C${r0 + 2}`, "建設業許可番号", true); mergeSet(ws, `D${r0 + 2}:F${r0 + 2}`, primary.licenseNumber);
    mergeSet(ws, `G${r0 + 2}:H${r0 + 2}`, "安全衛生責任者", true); mergeSet(ws, `I${r0 + 2}:M${r0 + 2}`, primary.safetyOfficer);
    mergeSet(ws, `B${r0 + 3}:C${r0 + 3}`, "主任技術者", true); mergeSet(ws, `D${r0 + 3}:F${r0 + 3}`, primary.chiefEngineer);
    mergeSet(ws, `G${r0 + 3}:H${r0 + 3}`, "専門技術者", true); mergeSet(ws, `I${r0 + 3}:M${r0 + 3}`, primary.specialistEngineer);
    mergeSet(ws, `B${r0 + 4}:C${r0 + 4}`, "担当工事内容", true); mergeSet(ws, `D${r0 + 4}:F${r0 + 4}`, primary.workContent);
    mergeSet(ws, `G${r0 + 4}:H${r0 + 4}`, "特定専門工事の有無", true); mergeSet(ws, `I${r0 + 4}:M${r0 + 4}`, primary.hasSpecialWork ? "有" : "無");
    mergeSet(ws, `B${r0 + 5}:C${r0 + 5}`, "登録基幹技能者", true); mergeSet(ws, `D${r0 + 5}:F${r0 + 5}`, primary.registeredSkilledWorker);
    mergeSet(ws, `G${r0 + 5}:H${r0 + 5}`, "工期", true);
    mergeSet(ws, `I${r0 + 5}:M${r0 + 5}`, primary.periodStart || primary.periodEnd ? `${primary.periodStart ?? ""} ～ ${primary.periodEnd ?? ""}` : "");
    row = r0 + 6;
  }
  row++;

  const TIER_LABEL: Record<2 | 3 | 4, string> = { 2: "（二次下請負業者）", 3: "（三次下請負業者）", 4: "（四次下請負業者）" };
  const colBlocks = [["A", "D"], ["F", "I"], ["K", "M"]] as const; // label col, value col per slot (approx 3 cols wide each pair)

  for (const tier of [2, 3, 4] as const) {
    mergeSet(ws, `A${row}:M${row}`, TIER_LABEL[tier], true);
    row++;
    const entries = [1, 2, 3].map((slot) => chart.entries.find((e) => e.tier === tier && e.slot === slot));
    const r0 = row;
    const rows = [
      ["会社名", (e?: OrgChartEntry) => e?.companyName],
      ["代表者名", (e?: OrgChartEntry) => e?.representative],
      ["建設業許可番号", (e?: OrgChartEntry) => e?.licenseNumber],
      ["安全衛生責任者", (e?: OrgChartEntry) => e?.safetyOfficer],
      ["主任技術者", (e?: OrgChartEntry) => e?.chiefEngineer],
      ["専門技術者", (e?: OrgChartEntry) => e?.specialistEngineer],
      ["担当工事内容", (e?: OrgChartEntry) => e?.workContent],
      ["特定専門工事の該当", (e?: OrgChartEntry) => (e ? (e.hasSpecialWork ? "有" : "無") : "")],
      ["工期", (e?: OrgChartEntry) => (e && (e.periodStart || e.periodEnd) ? `${e.periodStart ?? ""} ～ ${e.periodEnd ?? ""}` : "")],
    ] as const;
    colBlocks.forEach(([labelCol, valueCol], slotIdx) => {
      setCell(ws, `${labelCol}${r0}`, entries[slotIdx]?.jobType || "職種", true);
      const nextLabelCol = colBlocks[slotIdx + 1]?.[0];
      if (nextLabelCol) ws.mergeCells(`${valueCol}${r0}:${String.fromCharCode(nextLabelCol.charCodeAt(0) - 1)}${r0}`);
    });
    rows.forEach(([label, fn], i) => {
      const r = r0 + 1 + i;
      colBlocks.forEach(([labelCol, valueCol], slotIdx) => {
        setCell(ws, `${labelCol}${r}`, label, true);
        const nextLabelCol = colBlocks[slotIdx + 1]?.[0];
        const endCol = nextLabelCol ? String.fromCharCode(nextLabelCol.charCodeAt(0) - 1) : "M";
        if (endCol !== valueCol) ws.mergeCells(`${valueCol}${r}:${endCol}${r}`);
        setCell(ws, `${valueCol}${r}`, fn(entries[slotIdx]));
      });
    });
    row = r0 + 1 + rows.length + 1;
  }

  mergeSet(ws, `A${row}:M${row}`, "（記入要領）");
  row++;
  mergeSet(ws, `A${row}:M${row}`, "1．一次下請負業者は、二次下請負業者以下の業者から提出された「届出書」(様式第１号－甲) に基づいて本表を作成の上、元請に届け出ること。");
  row++;
  mergeSet(ws, `A${row}:M${row}`, "2．この下請負業者編成表でまとめきれない場合には、本様式をコピーするなどして適宜使用すること。");
  row++;
  mergeSet(ws, `A${row}:M${row}`, "3．二次下請負業者を使用しない場合は、この書類は提出不要。");

  await saveWorkbook(wb, `下請負業者編成表_${workspaceName}.xlsx`);
}

/* ══════════════════════════════════════════
   施工体制台帳（正式Excel様式へ差し込み）
   public/templates/system-ledger-template.xlsx（罫線・結合を保持した空欄ひな型）を
   読み込み、指定セルへ値を差し込んで出力する。書式は配布原本を完全再現する。
   ※値セルの対応は原本レイアウトに基づく。ズレがあれば下記アドレスのみ調整すればよい。
══════════════════════════════════════════ */
const SYSTEM_LEDGER_TEMPLATE_URL = "/templates/system-ledger-template.xlsx";

async function loadLedgerTemplate(): Promise<ExcelJS.Workbook> {
  const res = await fetch(SYSTEM_LEDGER_TEMPLATE_URL);
  if (!res.ok) throw new Error("施工体制台帳テンプレートを読み込めませんでした（public/templates を確認してください）");
  const buf = await res.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

// 空欄ひな型のセルへ値を差し込む（左＝元請/自社, 右＝下請）。空値のセルは空欄のまま。
export function fillSystemLedgerSheet(ws: ExcelJS.Worksheet, l: ConstructionSystemLedger) {
  const set = (addr: string, v?: string | null) => {
    if (v != null && String(v).trim() !== "") ws.getCell(addr).value = v;
  };
  const period = (s?: string, e?: string) => (s || e ? `自　${s ?? ""}　　至　${e ?? ""}` : "");

  // ── 左：元請負人（自社）に関する事項 ──
  set("B5", l.primeCompanyName);
  set("W11", [l.primeLicenseCategory, l.primeLicenseNumber].filter(Boolean).join("　"));
  set("AF11", l.primeLicenseIssuedDate);
  set("H16", l.primeWorkTitle);
  set("H19", l.primeOrdererNameAddress);
  set("H22", period(l.primePeriodStart, l.primePeriodEnd));
  set("AC22", l.primeContractDate);
  set("N28", l.primeCompanyName);
  set("AC28", l.primeAddress);
  set("N35", l.primeInsurance.health);
  set("X35", l.primeInsurance.pension);
  set("AG35", l.primeInsurance.employment);
  set("H49", l.primeSiteAgent);
  set("H51", [l.primeChiefEngineerName, l.primeChiefEngineerFullTime].filter(Boolean).join("　"));
  set("AC51", l.primeChiefEngineerQualification);
  set("H55", l.primeSpecialistEngineerName);

  // ── 右：下請負人に関する事項 ──
  set("AX5", l.subCompanyName);
  set("BS5", l.subRepresentative);
  set("AX8", l.subAddress);
  set("AX11", l.subWorkTitle);
  set("AX14", period(l.subPeriodStart, l.subPeriodEnd));
  set("BS14", l.subContractDate);
  set("AX20", l.subLicenseCategory);
  set("BM20", l.subLicenseNumber);
  set("BV20", l.subLicenseIssuedDate);
  set("BD27", l.subInsurance.health);
  set("BN27", l.subInsurance.pension);
  set("BW27", l.subInsurance.employment);
  set("BD31", l.subCompanyName);
  set("AZ34", l.subSiteAgent);
  set("BU34", l.subSafetyOfficerName);
  set("BD38", l.subChiefEngineerName);
  set("BN44", l.subWorkTitle);
}

export async function downloadSystemLedgerExcel(l: ConstructionSystemLedger, workspaceName: string) {
  const wb = await loadLedgerTemplate();
  const ws = wb.worksheets[0];
  fillSystemLedgerSheet(ws, l);
  await saveWorkbook(wb, `施工体制台帳_${workspaceName}_${l.subCompanyName || "下請"}.xlsx`);
}
