"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, DragEvent, ChangeEvent } from "react";

export interface UploadedFile {
  name: string;
  size: string;
  type: string;
  dataUrl: string; // ブラウザ内プレビュー用 base64
}

interface Props {
  onUpload: (files: UploadedFile[]) => void;
  accept?: string;
  multiple?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fileIcon(type: string): string {
  if (type.startsWith("image/")) return "🖼";
  if (type === "application/pdf") return "📄";
  if (type.includes("word")) return "📝";
  if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
  if (type.includes("zip") || type.includes("compressed")) return "🗜";
  return "📁";
}

export default function FileUpload({ onUpload, accept = "*/*", multiple = true }: Props) {
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFiles(rawFiles: FileList | null) {
    if (!rawFiles || rawFiles.length === 0) return;
    const arr = Array.from(rawFiles);

    const uploaded = await Promise.all(
      arr.map(
        (f) =>
          new Promise<UploadedFile>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: f.name,
                size: formatSize(f.size),
                type: f.type,
                dataUrl: reader.result as string,
              });
            reader.readAsDataURL(f);
          })
      )
    );

    setPreviews((prev) => [...prev, ...uploaded]);
    onUpload(uploaded);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  function onDragOver(e: DragEvent) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    processFiles(e.target.files);
    e.target.value = "";
  }

  function remove(name: string) {
    setPreviews((prev) => prev.filter((f) => f.name !== name));
  }

  return (
    <div>
      {/* ドロップゾーン */}
      <motion.div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        animate={{ borderColor: dragging ? "var(--accent)" : "var(--line)", background: dragging ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "var(--bg)" }}
        transition={{ duration: 0.15 }}
        style={{
          border: "2px dashed var(--line)",
          borderRadius: 10,
          padding: "28px 16px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>{dragging ? "📂" : "☁"}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
          {dragging ? "ここでドロップ" : "クリックまたはドラッグ&ドロップ"}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          {multiple ? "複数ファイルを選択できます" : "ファイルを1つ選択"}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          style={{ display: "none" }}
        />
      </motion.div>

      {/* プレビュー一覧 */}
      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}
          >
            {previews.map((f) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "var(--soft)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                }}
              >
                {f.type.startsWith("image/") ? (
                  <img src={f.dataUrl} alt={f.name} style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 24 }}>{fileIcon(f.type)}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{f.size}</div>
                </div>
                <button
                  onClick={() => remove(f.name)}
                  style={{ fontSize: 14, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
