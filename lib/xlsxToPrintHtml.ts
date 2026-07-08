// 差し込み済みのExcelワークシート（exceljs）を、罫線・結合・列幅を保持したHTMLに変換し、
// window.print() で印刷/PDF化する。Excelダウンロードと同じテンプレートを描画するので、
// 印刷結果も配布様式どおりのレイアウトになる。
import type ExcelJS from "exceljs";

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Excelの列幅(文字数基準)→px近似（1文字≈7px）。scaleで最終寸法へ。未指定列は既定幅。
function colWidthPx(w: number | undefined, scale: number): number {
  return Math.max(1, Math.round((w ?? 9) * 7 * scale));
}
// Excelの行高(pt)→px（96dpi: pt×96/72）。scaleで最終寸法へ。未指定行は既定行高。
function rowHeightPx(h: number | undefined, defaultPt: number, scale: number): number {
  return Math.max(1, Math.round((h ?? defaultPt) * (96 / 72) * scale));
}

function colToNum(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

// 印刷範囲 "A1:AH42"（$やシート名付きも許容）→ 範囲。無ければnull。
function parsePrintArea(area?: string): { r1: number; c1: number; r2: number; c2: number } | null {
  if (!area) return null;
  const m = /([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)/.exec(area.replace(/\$/g, ""));
  if (!m) return null;
  return { c1: colToNum(m[1]), r1: Number(m[2]), c2: colToNum(m[3]), r2: Number(m[4]) };
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join("");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if ("text" in o) return String(o.text ?? "");
    if ("result" in o) return String(o.result ?? "");
    if ("hyperlink" in o) return String(o.text ?? o.hyperlink ?? "");
    return "";
  }
  return String(v);
}

function borderCss(b?: Partial<ExcelJS.Borders>): string {
  const side = (s?: Partial<ExcelJS.Border>) => (s && s.style ? "1px solid #000" : "none");
  return `border-top:${side(b?.top)};border-bottom:${side(b?.bottom)};border-left:${side(b?.left)};border-right:${side(b?.right)};`;
}

// 結合セルの枠は、外周セルのいずれかに罫線があればそれを採用（枠はアンカーだけに載らないため）。
function mergedBorderCss(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number): string {
  const has = (cells: ExcelJS.Cell[], side: "top" | "bottom" | "left" | "right") =>
    cells.some((cell) => { const b = cell.border?.[side]; return Boolean(b && b.style); }) ? "1px solid #000" : "none";
  const top: ExcelJS.Cell[] = [], bottom: ExcelJS.Cell[] = [], left: ExcelJS.Cell[] = [], right: ExcelJS.Cell[] = [];
  for (let c = c1; c <= c2; c++) { top.push(ws.getCell(r1, c)); bottom.push(ws.getCell(r2, c)); }
  for (let r = r1; r <= r2; r++) { left.push(ws.getCell(r, c1)); right.push(ws.getCell(r, c2)); }
  return `border-top:${has(top, "top")};border-bottom:${has(bottom, "bottom")};border-left:${has(left, "left")};border-right:${has(right, "right")};`;
}

// 範囲内の列幅合計・行高合計（scale=1の自然寸法）。
function contentDims(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number): { widthPx: number; heightPx: number } {
  let widthPx = 0;
  for (let c = c1; c <= c2; c++) widthPx += colWidthPx(ws.getColumn(c).width, 1);
  const defaultRowPt = ws.properties?.defaultRowHeight || 15;
  let heightPx = 0;
  for (let r = r1; r <= r2; r++) heightPx += rowHeightPx(ws.getRow(r).height, defaultRowPt, 1);
  return { widthPx, heightPx };
}

interface RenderOpts { scale?: number; r1?: number; c1?: number; r2?: number; c2?: number; }

// ワークシート（指定範囲）をHTMLテーブルへ。結合はcolspan/rowspan、被覆セルはスキップ。
// scaleで全寸法（列幅・行高・文字）を最終サイズに縮小して描画する（transformは使わない＝罫線が均一）。
export function worksheetToHtml(ws: ExcelJS.Worksheet, opts: RenderOpts = {}): { html: string; widthPx: number; heightPx: number } {
  const scale = opts.scale ?? 1;
  const R1 = opts.r1 ?? 1, C1 = opts.c1 ?? 1;
  const R2 = opts.r2 ?? Math.max(ws.rowCount, 1), C2 = opts.c2 ?? Math.max(ws.columnCount, 1);

  const anchor = new Map<string, { colspan: number; rowspan: number }>();
  const covered = new Set<string>();
  for (const m of (ws.model.merges ?? []) as string[]) {
    const [a, b] = m.split(":");
    const am = /([A-Z]+)(\d+)/.exec(a);
    const bm = /([A-Z]+)(\d+)/.exec(b);
    if (!am || !bm) continue;
    const mc1 = colToNum(am[1]), mr1 = Number(am[2]), mc2 = colToNum(bm[1]), mr2 = Number(bm[2]);
    if (mr1 < R1 || mc1 < C1 || mr1 > R2 || mc1 > C2) continue; // アンカーが範囲外の結合は無視
    const ec2 = Math.min(mc2, C2), er2 = Math.min(mr2, R2); // 範囲でクランプ
    anchor.set(`${mr1},${mc1}`, { colspan: ec2 - mc1 + 1, rowspan: er2 - mr1 + 1 });
    for (let r = mr1; r <= er2; r++) for (let c = mc1; c <= ec2; c++) if (!(r === mr1 && c === mc1)) covered.add(`${r},${c}`);
  }

  let widthPx = 0, cols = "";
  for (let c = C1; c <= C2; c++) { const w = colWidthPx(ws.getColumn(c).width, scale); widthPx += w; cols += `<col style="width:${w}px">`; }

  const defaultRowPt = ws.properties?.defaultRowHeight || 15;
  let heightPx = 0, body = "";
  for (let r = R1; r <= R2; r++) {
    const hpx = rowHeightPx(ws.getRow(r).height, defaultRowPt, scale);
    heightPx += hpx;
    body += `<tr style="height:${hpx}px">`;
    for (let c = C1; c <= C2; c++) {
      const key = `${r},${c}`;
      if (covered.has(key)) continue;
      const span = anchor.get(key);
      const cell = ws.getCell(r, c);
      const al = cell.alignment ?? {};
      const font = cell.font ?? {};
      const fill = cell.fill as { type?: string; pattern?: string; fgColor?: { argb?: string } } | undefined;
      const border = span ? mergedBorderCss(ws, r, c, r + span.rowspan - 1, c + span.colspan - 1) : borderCss(cell.border);
      let style = border + "padding:0 2px;overflow:hidden;";
      style += `text-align:${al.horizontal === "distributed" ? "center" : (al.horizontal ?? "left")};vertical-align:${al.vertical === "middle" ? "middle" : (al.vertical ?? "top")};`;
      const rot = al.textRotation;
      if (rot === "vertical") {
        style += "writing-mode:vertical-rl;text-orientation:upright;white-space:nowrap;";
      } else if (typeof rot === "number" && rot !== 0) {
        style += `transform:rotate(${rot > 90 ? 90 - rot : -rot}deg);white-space:nowrap;`;
      } else {
        style += al.wrapText ? "white-space:pre-wrap;word-break:break-all;" : "white-space:nowrap;";
      }
      if (font.bold) style += "font-weight:bold;";
      if (font.size) style += `font-size:${Math.max(6, Math.round(font.size * scale))}px;`;
      if (fill && fill.type === "pattern" && fill.pattern === "solid" && fill.fgColor?.argb) {
        style += `background:#${fill.fgColor.argb.slice(-6)};`;
      }
      const span2 = span ? ` colspan="${span.colspan}" rowspan="${span.rowspan}"` : "";
      body += `<td${span2} style="${style}">${escHtml(cellText(cell.value))}</td>`;
    }
    body += "</tr>";
  }

  const baseFont = Math.max(6, Math.round(10.5 * scale));
  const html = `<table style="border-collapse:collapse;table-layout:fixed;width:${widthPx}px;font-size:${baseFont}px;line-height:1.05"><colgroup>${cols}</colgroup><tbody>${body}</tbody></table>`;
  return { html, widthPx, heightPx };
}

// 差し込み済みワークシートから、用紙にフィットさせた印刷用HTMLドキュメントを組み立てる。
export function buildPrintDoc(ws: ExcelJS.Worksheet, title: string): string {
  // 印刷範囲があればそれでクリップ（様式外の余分な罫線・空行を除外）。
  const area = parsePrintArea(ws.pageSetup?.printArea);
  const R1 = area?.r1 ?? 1, C1 = area?.c1 ?? 1;
  const R2 = area?.r2 ?? Math.max(ws.rowCount, 1), C2 = area?.c2 ?? Math.max(ws.columnCount, 1);

  const nat = contentDims(ws, R1, C1, R2, C2);
  const orientation = ws.pageSetup?.orientation;
  const landscape = orientation ? orientation === "landscape" : nat.widthPx > 900;

  // 印刷ダイアログの既定余白（約10mm）でChromeに再縮小されないよう、その版面に
  // 「実寸描画」で収める（transformは使わない＝罫線が均一）。0.96は行の丸め累積の安全率。
  const SIZ_MM = 10;
  const toPx = (mm: number) => Math.round((mm / 25.4) * 96);
  const printW = toPx((landscape ? 297 : 210) - SIZ_MM * 2);
  const printH = toPx((landscape ? 210 : 297) - SIZ_MM * 2);
  const scale = Math.min(1, printW / nat.widthPx, printH / nat.heightPx) * 0.96;

  const { html } = worksheetToHtml(ws, { scale, r1: R1, c1: C1, r2: R2, c2: C2 });

  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff}
  body{font-family:"Yu Gothic","Meiryo","ＭＳ Ｐゴシック",sans-serif;color:#000;
    min-height:${printH}px;display:flex;align-items:center;justify-content:center}
  @media print{@page{size:A4 ${landscape ? "landscape" : "portrait"}}}
</style></head><body>
${html}
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>
</body></html>`;
}

// 変換したHTMLを新規ウィンドウで開き、用紙にフィットさせて印刷（PDF保存）する。
export function printWorksheet(ws: ExcelJS.Worksheet, title: string) {
  const doc = buildPrintDoc(ws, title);
  const blob = new Blob([doc], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=1100,height=850");
  if (w) setTimeout(() => URL.revokeObjectURL(url), 15000);
}
