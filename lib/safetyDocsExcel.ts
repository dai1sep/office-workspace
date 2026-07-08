// 安全書類のExcelダウンロード。元の提出様式のレイアウト（罫線・結合・見出し）を
// exceljsでコード上に再構築し、フォームデータを差し込んで.xlsxとして書き出す。
import ExcelJS from "exceljs";
import type { ConstructionSystemLedger, SubcontractorOrgChart } from "./types";
import { printWorksheet } from "./xlsxToPrintHtml";

// ISO日付(YYYY-MM-DD)を「YYYY年M月D日」に整形。空なら空文字。
function jaDate(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : (iso ?? "");
}
function jaPeriod(s?: string, e?: string): string {
  return s || e ? `${jaDate(s)} ～ ${jaDate(e)}` : "";
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
   public/templates/org-chart-template.xlsx（配布様式の空欄ひな型）へ値を差し込む。
   罫線・結合・レイアウトは配布原本のまま、テキストのみ埋め込む。
   ※値セルの対応は原本レイアウトに基づく。ズレがあれば下記アドレスのみ調整すればよい。
══════════════════════════════════════════ */
const ORG_CHART_TEMPLATE_URL = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/templates/org-chart-template.xlsx";

async function loadOrgChartTemplate(): Promise<ExcelJS.Workbook> {
  const res = await fetch(ORG_CHART_TEMPLATE_URL);
  if (!res.ok) throw new Error("下請負業者編成表テンプレートを読み込めませんでした（public/templates を確認してください）");
  const buf = await res.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

// 二次〜四次：各次数の開始行と、スロット別の職種列/値列/工期列。
const ORG_TIER_BASE: Record<2 | 3 | 4, number> = { 2: 30, 3: 51, 4: 72 };
const ORG_SLOT_COLS: Record<1 | 2 | 3, { job: string; val: string; period: string }> = {
  1: { job: "A", val: "G", period: "C" },
  2: { job: "N", val: "T", period: "P" },
  3: { job: "AA", val: "AG", period: "AC" },
};

// 空欄ひな型のセルへ値を差し込む。空値のセルはひな型のまま（空欄）にする。
export function fillOrgChartSheet(ws: ExcelJS.Worksheet, chart: SubcontractorOrgChart) {
  const set = (addr: string, v?: string | null) => {
    if (v != null && String(v).trim() !== "") ws.getCell(addr).value = v;
  };

  // 作成日（右上 ___年 __月 __日）
  const cd = /^(\d{4})-(\d{2})-(\d{2})/.exec(chart.createdDate ?? "");
  if (cd) { set("AE2", cd[1]); set("AI2", String(Number(cd[2]))); set("AK2", String(Number(cd[3]))); }

  // 一次下請負業者（＝作成下請負業者）
  const primary = chart.entries.find((e) => e.tier === 1);
  if (primary) {
    set("L7", primary.jobType);
    set("U7", primary.companyName);
    set("U9", primary.representative);
    set("U11", primary.licenseNumber);
    set("U13", primary.safetyOfficer);
    set("U15", primary.chiefEngineer);
    set("U17", primary.specialistEngineer);
    set("U19", primary.workContent);
    set("U23", primary.registeredSkilledWorker);
    set("O25", jaPeriod(primary.periodStart, primary.periodEnd));
  }

  // 二次〜四次下請負業者（各3社まで）
  for (const tier of [2, 3, 4] as const) {
    const base = ORG_TIER_BASE[tier];
    for (const slot of [1, 2, 3] as const) {
      const e = chart.entries.find((x) => x.tier === tier && x.slot === slot);
      if (!e) continue;
      const c = ORG_SLOT_COLS[slot];
      set(`${c.job}${base}`, e.jobType);
      set(`${c.val}${base}`, e.companyName);
      set(`${c.val}${base + 2}`, e.representative);
      set(`${c.val}${base + 4}`, e.licenseNumber);
      set(`${c.val}${base + 6}`, e.safetyOfficer);
      set(`${c.val}${base + 8}`, e.chiefEngineer);
      set(`${c.val}${base + 10}`, e.specialistEngineer);
      set(`${c.val}${base + 12}`, e.workContent);
      set(`${c.period}${base + 16}`, jaPeriod(e.periodStart, e.periodEnd));
    }
  }
}

export async function downloadOrgChartExcel(chart: SubcontractorOrgChart, workspaceName: string) {
  const wb = await loadOrgChartTemplate();
  const ws = wb.worksheets[0];
  fillOrgChartSheet(ws, chart);
  await saveWorkbook(wb, `下請負業者編成表_${workspaceName}.xlsx`);
}

// 印刷/PDF：Excelと同じ差し込み済みテンプレートを描画して印刷する（様式どおりの見た目）。
export async function printOrgChart(chart: SubcontractorOrgChart, workspaceName: string) {
  const wb = await loadOrgChartTemplate();
  const ws = wb.worksheets[0];
  fillOrgChartSheet(ws, chart);
  printWorksheet(ws, `下請負業者編成表 ${workspaceName}`);
}

/* ══════════════════════════════════════════
   施工体制台帳（正式Excel様式へ差し込み）
   public/templates/system-ledger-template.xlsx（罫線・結合を保持した空欄ひな型）を
   読み込み、指定セルへ値を差し込んで出力する。書式は配布原本を完全再現する。
   ※値セルの対応は原本レイアウトに基づく。ズレがあれば下記アドレスのみ調整すればよい。
══════════════════════════════════════════ */
const SYSTEM_LEDGER_TEMPLATE_URL = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/templates/system-ledger-template.xlsx";

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

// 印刷/PDF：Excelと同じ差し込み済みテンプレートを描画して印刷する（様式どおりの見た目）。
export async function printSystemLedger(l: ConstructionSystemLedger, workspaceName: string) {
  const wb = await loadLedgerTemplate();
  const ws = wb.worksheets[0];
  fillSystemLedgerSheet(ws, l);
  printWorksheet(ws, `施工体制台帳 ${workspaceName}`);
}
