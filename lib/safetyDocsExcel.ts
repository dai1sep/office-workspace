// 安全書類のExcelダウンロード。元の提出様式のレイアウト（罫線・結合・見出し）を
// exceljsでコード上に再構築し、フォームデータを差し込んで.xlsxとして書き出す。
import ExcelJS from "exceljs";
import type { ConstructionSystemLedger, ConstructionSystemLedgerInsurance, OrgChartEntry, SubcontractorOrgChart } from "./types";

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
   施工体制台帳
══════════════════════════════════════════ */
export async function downloadSystemLedgerExcel(l: ConstructionSystemLedger, workspaceName: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("施工体制台帳", { pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true } });
  ws.columns = Array.from({ length: 8 }, () => ({ width: 16 }));

  mergeSet(ws, "A1:H1", `作成日：${l.createdDate}`);
  mergeSet(ws, "A2:H3", "施工体制台帳", true);
  ws.getCell("A2").font = { bold: true, size: 16 };
  ws.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
  mergeSet(ws, "A4:H4", `工事名：${workspaceName}`);

  function insRow(row: number, startCol: "A" | "E", ins: ConstructionSystemLedgerInsurance) {
    const c0 = startCol;
    const c1 = String.fromCharCode(c0.charCodeAt(0) + 3) as "D" | "H";
    setCell(ws, `${c0}${row}`, "健康保険/厚生年金/雇用保険", true);
    setCell(ws, `${c1}${row}`, `${ins.health} / ${ins.pension} / ${ins.employment}`);
  }

  function party(startRow: number, startCol: "A", title: string, p: {
    companyName: string; address: string; phone?: string; representative: string;
    licenseCategory: string; licenseNumber: string; licenseIssuedDate: string;
    workTitle: string; ordererNameAddress?: string; periodStart: string; periodEnd: string; contractDate: string;
    insurance: ConstructionSystemLedgerInsurance; siteAgent: string;
    chiefEngineerName: string; chiefEngineerFullTime?: string; chiefEngineerQualification?: string;
    specialistEngineerName?: string; safetyOfficerName: string; safetyPromoterName?: string; laborManagerName?: string;
  }) {
    const labelCol = startCol;
    const valueCol = String.fromCharCode(startCol.charCodeAt(0) + 1) as "B";
    const valueEndCol = "D";
    let row = startRow;
    mergeSet(ws, `${labelCol}${row}:${valueEndCol}${row}`, title, true);
    ws.getCell(`${labelCol}${row}`).font = { bold: true, size: 10 };
    row++;
    const lines: [string, string | undefined][] = [
      ["会社名", p.companyName],
      ["住所", `${p.address}${p.phone ? `（TEL：${p.phone}）` : ""}`],
      ["代表者名", p.representative],
      ["建設業の許可", `${p.licenseCategory}　${p.licenseNumber}　（${p.licenseIssuedDate}）`],
      ["工事名称及び工事内容", p.workTitle],
      ...(p.ordererNameAddress !== undefined ? [["発注者名及び住所", p.ordererNameAddress] as [string, string]] : []),
      ["工期", `自　${p.periodStart}　至　${p.periodEnd}`],
      ["契約日", p.contractDate],
    ];
    lines.forEach(([label, value]) => {
      setCell(ws, `${labelCol}${row}`, label, true);
      mergeSet(ws, `${valueCol}${row}:${valueEndCol}${row}`, value);
      row++;
    });
    insRow(row, startCol, p.insurance);
    row++;
    const lines2: [string, string | undefined][] = [
      ["現場代理人名", p.siteAgent],
      ["主任（監理）技術者名", `${p.chiefEngineerName}${p.chiefEngineerFullTime ? `（${p.chiefEngineerFullTime}）` : ""}`],
      ...(p.chiefEngineerQualification !== undefined ? [["資格内容", p.chiefEngineerQualification] as [string, string]] : []),
      ...(p.specialistEngineerName !== undefined ? [["専門技術者名", p.specialistEngineerName] as [string, string]] : []),
      ["安全衛生責任者名", p.safetyOfficerName],
      ...(p.safetyPromoterName !== undefined ? [["安全衛生推進者名", p.safetyPromoterName] as [string, string]] : []),
      ...(p.laborManagerName !== undefined ? [["雇用管理責任者名", p.laborManagerName] as [string, string]] : []),
    ];
    lines2.forEach(([label, value]) => {
      setCell(ws, `${labelCol}${row}`, label, true);
      mergeSet(ws, `${valueCol}${row}:${valueEndCol}${row}`, value);
      row++;
    });
    return row;
  }

  const endRowPrime = party(6, "A", "《元請に関する事項》", {
    companyName: l.primeCompanyName, address: l.primeAddress, phone: l.primePhone, representative: l.primeRepresentative,
    licenseCategory: l.primeLicenseCategory, licenseNumber: l.primeLicenseNumber, licenseIssuedDate: l.primeLicenseIssuedDate,
    workTitle: l.primeWorkTitle, ordererNameAddress: l.primeOrdererNameAddress, periodStart: l.primePeriodStart, periodEnd: l.primePeriodEnd, contractDate: l.primeContractDate,
    insurance: l.primeInsurance, siteAgent: l.primeSiteAgent,
    chiefEngineerName: l.primeChiefEngineerName, chiefEngineerFullTime: l.primeChiefEngineerFullTime, chiefEngineerQualification: l.primeChiefEngineerQualification,
    specialistEngineerName: l.primeSpecialistEngineerName, safetyOfficerName: l.primeSafetyOfficerName,
    safetyPromoterName: l.primeSafetyPromoterName, laborManagerName: l.primeLaborManagerName,
  });

  // 元請ブロックは A-D列。下請ブロックは E-H列を使い、同じ開始行から並べる。
  function partyRight(startRow: number, title: string, p: {
    companyName: string; address: string; representative: string;
    licenseCategory: string; licenseNumber: string; licenseIssuedDate: string;
    workTitle: string; periodStart: string; periodEnd: string; contractDate: string;
    insurance: ConstructionSystemLedgerInsurance; siteAgent: string;
    chiefEngineerName: string; safetyOfficerName: string;
  }) {
    const labelCol = "E", valueCol = "F", valueEndCol = "H";
    let row = startRow;
    mergeSet(ws, `${labelCol}${row}:${valueEndCol}${row}`, title, true);
    ws.getCell(`${labelCol}${row}`).font = { bold: true, size: 10 };
    row++;
    const lines: [string, string][] = [
      ["会社名", p.companyName],
      ["住所", p.address],
      ["代表者名", p.representative],
      ["建設業の許可", `${p.licenseCategory}　${p.licenseNumber}　（${p.licenseIssuedDate}）`],
      ["工事名称及び工事内容", p.workTitle],
      ["工期", `自　${p.periodStart}　至　${p.periodEnd}`],
      ["契約日", p.contractDate],
    ];
    lines.forEach(([label, value]) => {
      setCell(ws, `${labelCol}${row}`, label, true);
      mergeSet(ws, `${valueCol}${row}:${valueEndCol}${row}`, value);
      row++;
    });
    insRow(row, "E", p.insurance);
    row++;
    const lines2: [string, string][] = [
      ["現場代理人名", p.siteAgent],
      ["主任技術者名", p.chiefEngineerName],
      ["安全衛生責任者名", p.safetyOfficerName],
    ];
    lines2.forEach(([label, value]) => {
      setCell(ws, `${labelCol}${row}`, label, true);
      mergeSet(ws, `${valueCol}${row}:${valueEndCol}${row}`, value);
      row++;
    });
    return row;
  }

  partyRight(6, "《下請負人に関する事項》", {
    companyName: l.subCompanyName, address: l.subAddress, representative: l.subRepresentative,
    licenseCategory: l.subLicenseCategory, licenseNumber: l.subLicenseNumber, licenseIssuedDate: l.subLicenseIssuedDate,
    workTitle: l.subWorkTitle, periodStart: l.subPeriodStart, periodEnd: l.subPeriodEnd, contractDate: l.subContractDate,
    insurance: l.subInsurance, siteAgent: l.subSiteAgent,
    chiefEngineerName: l.subChiefEngineerName, safetyOfficerName: l.subSafetyOfficerName,
  });
  void endRowPrime;

  await saveWorkbook(wb, `施工体制台帳_${workspaceName}_${l.subCompanyName || "下請"}.xlsx`);
}
