// xlsx をZIPとして開き、指定セルの値だけを書き換える。
// 画像・罫線・結合・体裁・印刷設定などは一切触らないため、配布原本の書式を完全再現できる。
// （exceljs の load→save は図形/画像の配置を落とすことがあるため、こちらを使う）
import JSZip from "jszip";

function colToNum(c: string): number {
  let n = 0;
  for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function cellXml(ref: string, styleAttr: string, value: string): string {
  if (value === "" || value == null) return `<c r="${ref}"${styleAttr}/>`;
  return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

// sheetXML 上の1セルを設定（存在すればスタイル保持で置換、無ければ列/行順で挿入）
function setCell(xml: string, ref: string, value: string): string {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return xml;
  const col = m[1], row = Number(m[2]), colN = colToNum(col);

  const cellRe = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?<\\/c>)`);
  const cm = xml.match(cellRe);
  if (cm) {
    const attrs = cm[1] || "";
    const sMatch = attrs.match(/\ss="\d+"/);
    return xml.replace(cellRe, cellXml(ref, sMatch ? sMatch[0] : "", value));
  }

  const newCell = cellXml(ref, "", value);
  const rowRe = new RegExp(`(<row r="${row}"[^>]*>)([\\s\\S]*?)(<\\/row>)`);
  const rm = xml.match(rowRe);
  if (rm) {
    const inner = rm[2];
    const cRe = /<c r="([A-Z]+)\d+"/g;
    let mm: RegExpExecArray | null, at: number | null = null;
    while ((mm = cRe.exec(inner))) { if (colToNum(mm[1]) > colN) { at = mm.index; break; } }
    const ni = at == null ? inner + newCell : inner.slice(0, at) + newCell + inner.slice(at);
    return xml.replace(rowRe, rm[1] + ni + rm[3]);
  }

  const rowElem = `<row r="${row}">${newCell}</row>`;
  const sdRe = /(<sheetData[^>]*>)([\s\S]*?)(<\/sheetData>)/;
  const sd = xml.match(sdRe);
  if (!sd) return xml;
  const inner = sd[2];
  const rRe = /<row r="(\d+)"/g;
  let mm2: RegExpExecArray | null, at2: number | null = null;
  while ((mm2 = rRe.exec(inner))) { if (Number(mm2[1]) > row) { at2 = mm2.index; break; } }
  const ni = at2 == null ? inner + rowElem : inner.slice(0, at2) + rowElem + inner.slice(at2);
  return xml.replace(sdRe, sd[1] + ni + sd[3]);
}

// テンプレ(ArrayBuffer)の最初のワークシートに cellMap を差し込み、xlsx Blob を返す。
export async function patchXlsxCells(templateBuffer: ArrayBuffer, cellMap: Record<string, string>): Promise<Blob> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const sheetPath = Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  const file = sheetPath ? zip.file(sheetPath) : null;
  if (!file) throw new Error("worksheet XML が見つかりません");
  let xml = await file.async("string");
  for (const [ref, val] of Object.entries(cellMap)) xml = setCell(xml, ref, val);
  zip.file(sheetPath, xml);
  return zip.generateAsync({ type: "blob" });
}
