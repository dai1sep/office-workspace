"use client";

import { useRef, useState } from "react";
import type { Attachment } from "@/lib/types";
import { uid } from "@/lib/utils";

const DEFAULT_MAX_MB = 3;

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(a: Attachment) {
  return a.type.startsWith("image/");
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** 作成フォーム用：ファイルを選んで添付リストを編集する */
export function AttachmentInput({ value, onChange, maxMB = DEFAULT_MAX_MB }: {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  maxMB?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // 同じファイルを続けて選べるように
    if (files.length === 0) return;
    setError("");
    const added: Attachment[] = [];
    for (const f of files) {
      if (f.size > maxMB * 1024 * 1024) {
        setError(`「${f.name}」は${maxMB}MBを超えるため添付できません`);
        continue;
      }
      try {
        const dataUrl = await readFile(f);
        added.push({ id: uid("att"), name: f.name, type: f.type || "application/octet-stream", size: f.size, dataUrl });
      } catch {
        setError(`「${f.name}」の読み込みに失敗しました`);
      }
    }
    if (added.length) onChange([...value, ...added]);
  }

  function remove(id: string) {
    onChange(value.filter((a) => a.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="ghost-button" onClick={() => inputRef.current?.click()}>＋ ファイルを添付</button>
        <span className="muted-text">1ファイル最大 {maxMB}MB</span>
        <input ref={inputRef} type="file" multiple onChange={onPick} style={{ display: "none" }} />
      </div>
      {error && <span style={{ fontSize: 12, color: "var(--red, #c2410c)" }}>{error}</span>}
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {value.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 6px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--panel)", maxWidth: 240 }}>
              {isImage(a)
                // eslint-disable-next-line @next/next/no-img-element -- dataURLプレビュー（静的書き出しでnext/image不可）
                ? <img src={a.dataUrl} alt={a.name} style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                : <span style={{ width: 34, height: 34, display: "grid", placeItems: "center", background: "var(--soft)", borderRadius: 5, fontSize: 15, flexShrink: 0 }}>📄</span>}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{fmtSize(a.size)}</div>
              </div>
              <button type="button" onClick={() => remove(a.id)} aria-label="削除" style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 表示用：添付ファイルを画像サムネイル＋ダウンロードチップで見せる */
export function AttachmentList({ items, label = "添付ファイル" }: { items?: Attachment[]; label?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="muted-text">{label}（{items.length}）</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((a) => (
          isImage(a)
            ? <a key={a.id} href={a.dataUrl} target="_blank" rel="noreferrer" title={`${a.name}（${fmtSize(a.size)}）`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- dataURLプレビュー（静的書き出しでnext/image不可） */}
                <img src={a.dataUrl} alt={a.name} style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
              </a>
            : <a key={a.id} href={a.dataUrl} download={a.name} title={`${a.name} をダウンロード`}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--panel)", color: "var(--text)", textDecoration: "none", maxWidth: 260 }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--muted)" }}>{fmtSize(a.size)} ・ ダウンロード</span>
                </span>
              </a>
        ))}
      </div>
    </div>
  );
}
