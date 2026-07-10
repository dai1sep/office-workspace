// 工事日報（工事打合簿）の Excel 出力。
// public/templates/daily-report-template.xlsx（第一建設機工ロゴ入りの配布原本）へ
// セル値だけを差し込み、書式・ロゴを完全再現して出力する。
import ExcelJS from "exceljs";
import type { DailyReport } from "./types";
import { patchXlsxCells } from "./xlsxPatch";
import { printWorksheet } from "./xlsxToPrintHtml";

const TEMPLATE_URL = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/templates/daily-report-template.xlsx";
const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

function dparts(d?: string): { y2: string; m: string; day: string; wd: string } | null {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return { y2: y.slice(2), m: String(Number(m)), day: String(Number(day)), wd: DAYS[new Date(d).getDay()] ?? "" };
}

// DailyReport → 工事打合簿テンプレのセルマップ（左上原点、原本レイアウト準拠）。
export function buildDailyReportCellMap(r: DailyReport, wsName: string): Record<string, string> {
  const map: Record<string, string> = {};
  const put = (ref: string, v?: string | number | null) => {
    if (v !== undefined && v !== null && String(v) !== "") map[ref] = String(v);
  };

  // 残存値のクリア（年・就業時間欄）
  ["H3", "I3", "H4", "I4"].forEach((a) => { map[a] = ""; });
  for (let x = 23; x <= 29; x++) { ["M", "N", "P", "Q", "AD", "AE", "AG", "AH"].forEach((c) => { map[c + x] = ""; }); }

  // 見出し
  put("P2", wsName);
  const md = dparts(r.meetingDate);
  if (md) { put("H3", md.y2); put("K3", md.m); put("N3", md.day); put("S3", md.wd); }
  const id = dparts(r.implementDate);
  if (id) { put("H4", id.y2); put("K4", id.m); put("N4", id.day); put("S4", id.wd); }
  map["Y4"] = `　晴　・　雨　・　曇り　(　${r.weather ?? ""}　)`;

  // 業者・作業内容（行8-17）
  (r.subcontractors ?? []).slice(0, 10).forEach((s, i) => {
    const R = 8 + i; put("A" + R, s.company); put("H" + R, s.jobType); put("L" + R, s.workContent);
  });
  // 使用機械（行8-17）
  (r.equipment ?? []).slice(0, 10).forEach((e, i) => {
    const R = 8 + i; put("Z" + R, e.name); put("AE" + R, e.count || "");
  });

  // 作業指示・確認是正
  put("A19", r.plannedWork);
  put("R19", r.actualWork);

  // 就労人員（社員：行23-27）
  (r.attendees ?? []).slice(0, 5).forEach((a, i) => {
    const R = 23 + i; put("A" + R, a.name); put("J" + R, a.jobType);
    put("M" + R, a.startTime); put("P" + R, a.endTime); // 開始=M:N / 終了=P:Q（O列の「～」は原本）
  });
  // 協力業者（行23-26）
  (r.subcontractors ?? []).filter((s) => s.workers).slice(0, 4).forEach((s, i) => {
    const R = 23 + i; put("R" + R, s.company); put("Y" + R, s.workers); put("AA" + R, s.jobType);
    put("AD" + R, s.startTime); put("AG" + R, s.endTime); // 開始=AD:AE / 終了=AG:AH（AF列の「～」は原本）
  });
  // 集計（行28）
  const emp = (r.attendees ?? []).filter((a) => a.name).length;
  const sub = (r.subcontractors ?? []).reduce((n, s) => n + (s.workers || 0), 0);
  put("R28", emp || ""); put("V28", sub || ""); put("Z28", (emp + sub) || "");

  // 現場出来高（D/H/L/P/T列, 行31-37）
  const cols = ["D", "H", "L", "P", "T"];
  (r.progressItems ?? []).slice(0, 5).forEach((p, i) => {
    const c = cols[i];
    put(c + "31", p.caseType); put(c + "33", p.totalQty || ""); put(c + "34", p.todayQty || "");
    put(c + "35", p.cumQty || ""); put(c + "36", p.remainQty || ""); put(c + "37", p.progress ? p.progress + "%" : "");
  });
  // 記事
  put("X31", r.notes);

  // 作業員 電子サイン欄: テンプレートの「サイン欄」ボックス（B38:S42）にサイン確定者を記名
  const signed = (r.signedWorkers ?? []).filter((n) => n && n.trim());
  if (signed.length) put("B38", signed.join("　"));

  return map;
}

export async function downloadDailyReportExcel(r: DailyReport, wsName: string) {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error("工事打合簿テンプレートを読み込めませんでした（public/templates を確認してください）");
  const buf = await res.arrayBuffer();
  const blob = await patchXlsxCells(buf, buildDailyReportCellMap(r, wsName));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `工事打合簿_${wsName}_${r.implementDate || ""}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// 印刷/PDF：Excelと同じテンプレート＋セルマップを描画して印刷する（様式どおりの見た目）。
// ※ロゴ画像はVML浮動画像のため、この描画（罫線・値の様式再現）には含まれない。
export async function printDailyReport(r: DailyReport, wsName: string) {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error("工事打合簿テンプレートを読み込めませんでした（public/templates を確認してください）");
  const buf = await res.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const map = buildDailyReportCellMap(r, wsName);
  for (const [ref, val] of Object.entries(map)) ws.getCell(ref).value = val === "" ? null : val;
  printWorksheet(ws, `工事打合簿 ${wsName}`);
}
