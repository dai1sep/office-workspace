"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/lib/context";
import { allFolderNames, folderByName, uid } from "@/lib/utils";
import { FileFolder } from "@/lib/types";

const EDITABLE_ROLES = ["部門管理者", "一般ユーザー"]; // 管理者は常に可のため対象外

// フォルダ公開設定のマトリクス。行＝フォルダ、列＝部署／ロール。編集は管理者のみ。
export default function FileAccessSettings() {
  const { state, updateState, can } = useApp();
  const isAdmin = can("admin");

  const folderNames = useMemo(() => allFolderNames(state), [state]);
  const depts = useMemo(
    () => Array.from(new Set(state.users.map((u) => u.dept).filter(Boolean))),
    [state.users],
  );
  const fileCount = (name: string) => state.files.filter((f) => f.folder === name).length;
  const restrictedCount = folderNames.filter((n) => folderByName(state.fileFolders, n).scope === "restricted").length;

  // フォルダ設定を upsert（仮想フォルダは初回編集時に実体化）。
  function patchFolder(name: string, patch: Partial<FileFolder>) {
    updateState((prev) => {
      const exists = prev.fileFolders.some((f) => f.name === name);
      const fileFolders = exists
        ? prev.fileFolders.map((f) => (f.name === name ? { ...f, ...patch } : f))
        : [...prev.fileFolders, { id: uid("ff"), name, scope: "all" as const, allowDepts: [], allowRoles: [], ...patch }];
      return { ...prev, fileFolders };
    });
  }

  function setScope(name: string, scope: "all" | "restricted") {
    patchFolder(name, { scope });
  }
  function toggleDept(name: string, dept: string) {
    const cur = folderByName(state.fileFolders, name).allowDepts ?? [];
    patchFolder(name, { allowDepts: cur.includes(dept) ? cur.filter((d) => d !== dept) : [...cur, dept] });
  }
  function toggleRole(name: string, role: string) {
    const cur = folderByName(state.fileFolders, name).allowRoles ?? [];
    patchFolder(name, { allowRoles: cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role] });
  }

  return (
    <section className="panel">
      <div className="panel-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span>ファイル公開設定</span>
        <span className="status blue">制限中 {restrictedCount} / {folderNames.length} フォルダ</span>
      </div>
      <p className="muted-text" style={{ margin: "0 0 12px", fontSize: 12.5, lineHeight: 1.7 }}>
        フォルダ単位で閲覧範囲を設定します。中のファイルは設定を継承します。<br />
        既定は<strong>全社公開</strong>。「制限」にすると、指定した<strong>部署</strong>または<strong>ロール</strong>に一致する人だけが閲覧できます。
        <br />管理者は常に全フォルダを閲覧できます。ファイルの登録者は常に自分のファイルを閲覧できます。
        {!isAdmin && <><br /><strong style={{ color: "var(--danger, #c0392b)" }}>※ 編集できるのは管理者のみです（下記は現在の設定の表示のみ）。</strong></>}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {folderNames.map((name) => {
          const folder = folderByName(state.fileFolders, name);
          const restricted = folder.scope === "restricted";
          return (
            <motion.div
              key={name}
              layout
              className="row-card"
              style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--panel)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15 }}>{restricted ? "🔒" : "📂"}</span>
                  <strong>{name}</strong>
                  <span className="muted-text" style={{ fontSize: 12 }}>{fileCount(name)} ファイル</span>
                </div>
                <div style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                  {(["all", "restricted"] as const).map((s) => (
                    <button
                      key={s}
                      disabled={!isAdmin}
                      onClick={() => setScope(name, s)}
                      className="ghost-button"
                      style={{
                        border: "none", borderRadius: 0, padding: "5px 12px", fontSize: 12.5,
                        background: folder.scope === s ? "var(--brand, #3f6b5b)" : "var(--panel)",
                        color: folder.scope === s ? "#fff" : "var(--text)",
                        cursor: isAdmin ? "pointer" : "default", opacity: isAdmin ? 1 : 0.75,
                      }}
                    >
                      {s === "all" ? "全社公開" : "制限"}
                    </button>
                  ))}
                </div>
              </div>

              {restricted && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <div className="muted-text" style={{ fontSize: 11.5, marginBottom: 4 }}>閲覧できる部署</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {depts.map((d) => {
                        const on = (folder.allowDepts ?? []).includes(d);
                        return (
                          <button
                            key={d}
                            disabled={!isAdmin}
                            onClick={() => toggleDept(name, d)}
                            className="ghost-button"
                            style={chipStyle(on, isAdmin)}
                          >
                            {on ? "✓ " : ""}{d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="muted-text" style={{ fontSize: 11.5, marginBottom: 4 }}>閲覧できるロール</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span className="status green" title="管理者は常に全閲覧">管理者（常に可）</span>
                      {EDITABLE_ROLES.map((r) => {
                        const on = (folder.allowRoles ?? []).includes(r);
                        return (
                          <button
                            key={r}
                            disabled={!isAdmin}
                            onClick={() => toggleRole(name, r)}
                            className="ghost-button"
                            style={chipStyle(on, isAdmin)}
                          >
                            {on ? "✓ " : ""}{r}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function chipStyle(on: boolean, editable: boolean): React.CSSProperties {
  return {
    padding: "4px 10px", fontSize: 12, borderRadius: 999,
    border: `1px solid ${on ? "var(--brand, #3f6b5b)" : "var(--line)"}`,
    background: on ? "var(--soft, #eef4f1)" : "var(--panel)",
    color: on ? "var(--brand, #3f6b5b)" : "var(--muted)",
    fontWeight: on ? 600 : 400,
    cursor: editable ? "pointer" : "default", opacity: editable ? 1 : 0.75,
  };
}
