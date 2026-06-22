"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/context";
import type { KnowledgeArticle } from "@/lib/types";
import { uid, userName } from "@/lib/utils";
import { useIsMobile } from "@/lib/useIsMobile";

const EMPTY_FORM = {
  title: "",
  body: "",
  category: "",
  tags: "",
};

function formFrom(item: KnowledgeArticle) {
  return {
    title: item.title,
    body: item.body,
    category: item.category,
    tags: item.tags.join(", "),
  };
}

export default function KnowledgeView() {
  const { state, updateState, currentUser } = useApp();
  const me = currentUser ?? state.currentUser;
  const myName = userName(state, me);

  const isMobile = useIsMobile();
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const articles = state.knowledge ?? [];

  const categories = useMemo(() => {
    const cats = Array.from(new Set(articles.map((a) => a.category).filter(Boolean)));
    return ["すべて", ...cats];
  }, [articles]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of articles) {
      map[a.category] = (map[a.category] ?? 0) + 1;
    }
    return map;
  }, [articles]);

  const pinnedArticles = useMemo(
    () => articles.filter((a) => a.pinned),
    [articles],
  );

  const filtered = useMemo(() => {
    return articles
      .filter((a) => selectedCategory === "すべて" || a.category === selectedCategory)
      .filter((a) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [articles, selectedCategory, query]);

  const mobileGrouped = useMemo(() => {
    const q = query.toLowerCase();
    const bySearch = articles.filter(
      (a) =>
        !query ||
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)),
    );
    const sorted = [...bySearch].sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
    );
    const map: Record<string, KnowledgeArticle[]> = {};
    for (const a of sorted) {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    }
    return map;
  }, [articles, query]);

  const selectedArticle = articles.find((a) => a.id === selectedId) ?? null;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(item: KnowledgeArticle) {
    setEditingId(item.id);
    setForm(formFrom(item));
    setModalOpen(true);
  }

  function saveArticle() {
    if (!form.title.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingId) {
      updateState((prev) => ({
        ...prev,
        knowledge: prev.knowledge.map((a) =>
          a.id === editingId
            ? { ...a, title: form.title.trim(), body: form.body, category: form.category.trim(), tags, updatedAt: now }
            : a,
        ),
      }));
    } else {
      const newArticle: KnowledgeArticle = {
        id: uid("k"),
        title: form.title.trim(),
        body: form.body,
        author: myName,
        category: form.category.trim() || "未分類",
        tags,
        date: now,
        updatedAt: now,
        pinned: false,
      };
      updateState((prev) => ({
        ...prev,
        knowledge: [newArticle, ...prev.knowledge],
      }));
      setSelectedId(newArticle.id);
    }
    setModalOpen(false);
  }

  function deleteArticle(id: string) {
    updateState((prev) => ({
      ...prev,
      knowledge: prev.knowledge.filter((a) => a.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }

  function togglePin(id: string) {
    updateState((prev) => ({
      ...prev,
      knowledge: prev.knowledge.map((a) =>
        a.id === id ? { ...a, pinned: !a.pinned } : a,
      ),
    }));
  }

  if (isMobile) {
    const visibleCats = categories.filter(
      (c) => c !== "すべて" && (mobileGrouped[c]?.length ?? 0) > 0,
    );
    const mobileTotal = Object.values(mobileGrouped).reduce((n, arr) => n + arr.length, 0);
    const allCollapsed = visibleCats.length > 0 && visibleCats.every((c) => collapsedCats.has(c));
    const toggleAll = () =>
      setCollapsedCats(allCollapsed ? new Set<string>() : new Set(visibleCats));
    const toggleCat = (cat: string) =>
      setCollapsedCats((prev) => {
        const next = new Set(prev);
        if (next.has(cat)) next.delete(cat);
        else next.add(cat);
        return next;
      });
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <AnimatePresence mode="wait">
          {mobileView === "detail" && selectedArticle ? (
            <motion.div
              key="mobile-detail"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--line)", flexShrink: 0, background: "var(--panel)" }}>
                <button onClick={() => setMobileView("list")} style={{ border: 0, background: "transparent", color: "var(--blue)", fontSize: 15, cursor: "pointer", padding: "4px 0" }}>← 一覧</button>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedArticle.title}</span>
                <button onClick={() => openEdit(selectedArticle)} style={{ border: "1px solid var(--line)", background: "transparent", color: "var(--text)", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>編集</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                  {selectedArticle.pinned && <span style={{ color: "var(--orange)", fontSize: 13 }}>📌</span>}
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "var(--soft)", color: "var(--muted)", border: "1px solid var(--line)" }}>{selectedArticle.category}</span>
                  <span className="muted-text" style={{ fontSize: 11 }}>更新 {selectedArticle.updatedAt}</span>
                  <span className="muted-text" style={{ fontSize: 11 }}>著者: {selectedArticle.author}</span>
                </div>
                {selectedArticle.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
                    {selectedArticle.tags.map((tag) => (
                      <span key={tag} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "rgba(59,130,246,0.1)", color: "var(--blue)" }}>#{tag}</span>
                    ))}
                  </div>
                )}
                <div style={{ height: 1, background: "var(--line)", marginBottom: 14 }} />
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>{selectedArticle.body}</pre>
                <div style={{ display: "flex", gap: 8, marginTop: 24, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <button onClick={() => togglePin(selectedArticle.id)} style={{ flex: 1, padding: "9px 0", border: "1px solid var(--line)", borderRadius: 8, background: selectedArticle.pinned ? "var(--orange)" : "transparent", color: selectedArticle.pinned ? "#fff" : "var(--text)", cursor: "pointer", fontSize: 13 }}>{selectedArticle.pinned ? "📌 解除" : "📌 固定"}</button>
                  <button onClick={() => { deleteArticle(selectedArticle.id); setMobileView("list"); }} style={{ padding: "9px 18px", border: "1px solid var(--line)", borderRadius: 8, background: "transparent", color: "#a33", cursor: "pointer", fontSize: 13 }}>削除</button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="mobile-list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
            >
              <div style={{ flexShrink: 0, borderBottom: "1px solid var(--line)", background: "var(--panel)" }}>
                <div style={{ padding: "10px 12px 6px", display: "flex", gap: 8 }}>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="記事を検索..." style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--soft)", color: "var(--text)", fontSize: 13 }} />
                  <button onClick={openCreate} style={{ padding: "7px 14px", background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>+ 新規</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 9px" }}>
                  <span className="muted-text" style={{ fontSize: 11 }}>{visibleCats.length} カテゴリ・{mobileTotal} 件</span>
                  <button onClick={toggleAll} disabled={!!query} style={{ border: 0, background: "transparent", color: query ? "var(--muted)" : "var(--blue)", fontSize: 12, cursor: query ? "default" : "pointer", padding: "2px 0" }}>{allCollapsed ? "▾ すべて展開" : "▸ すべて収納"}</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {visibleCats.length === 0 && <div className="muted-text" style={{ padding: 24, textAlign: "center", fontSize: 13 }}>記事がありません</div>}
                {visibleCats.map((cat) => {
                  const items = mobileGrouped[cat] ?? [];
                  const open = !!query || !collapsedCats.has(cat);
                  return (
                    <div key={cat} style={{ borderBottom: "1px solid var(--line)" }}>
                      <button
                        onClick={() => toggleCat(cat)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "var(--soft)", border: 0, cursor: "pointer", textAlign: "left" }}
                      >
                        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }} style={{ color: "var(--muted)", fontSize: 10, display: "inline-block" }}>▶</motion.span>
                        <span style={{ fontWeight: 600, fontSize: 13, flex: 1, color: "var(--text)" }}>{cat}</span>
                        <span style={{ fontSize: 11, background: "var(--line)", color: "var(--muted)", borderRadius: 10, padding: "1px 8px", minWidth: 20, textAlign: "center" }}>{items.length}</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            key="body"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: "hidden" }}
                          >
                            {items.map((article) => (
                              <div
                                key={article.id}
                                onClick={() => { setSelectedId(article.id); setMobileView("detail"); }}
                                style={{ padding: "12px 14px 12px 30px", borderTop: "1px solid var(--line)", cursor: "pointer" }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                  {article.pinned && <span style={{ color: "var(--orange)", fontSize: 12 }}>📌</span>}
                                  <span style={{ fontWeight: 500, fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.title}</span>
                                  <span style={{ color: "var(--muted)", fontSize: 12 }}>›</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <span className="muted-text" style={{ fontSize: 11 }}>更新 {article.updatedAt}</span>
                                  {article.tags.slice(0, 3).map((tag) => <span key={tag} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "rgba(59,130,246,0.1)", color: "var(--blue)" }}>#{tag}</span>)}
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "記事を編集" : "新規記事を作成"} width={560}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>タイトル</label><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="記事タイトル" style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--soft)", color: "var(--text)", fontSize: 14, boxSizing: "border-box" }} /></div>
            <div><label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>カテゴリ</label><input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="例: FAQ / テンプレート" list="knowledge-categories-m" style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--soft)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} /><datalist id="knowledge-categories-m">{categories.filter((c) => c !== "すべて").map((c) => <option key={c} value={c} />)}</datalist></div>
            <div><label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>タグ（カンマ区切り）</label><input value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="例: FAQ, ヘルプ" style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--soft)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }} /></div>
            <div><label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>本文</label><textarea value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} rows={8} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--soft)", color: "var(--text)", fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} /></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: "8px 18px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 13 }}>キャンセル</button>
              <button onClick={saveArticle} disabled={!form.title.trim()} style={{ padding: "8px 20px", border: "none", borderRadius: 6, background: form.title.trim() ? "var(--blue)" : "var(--line)", color: form.title.trim() ? "#fff" : "var(--muted)", cursor: form.title.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600 }}>保存</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", gap: 0, overflow: "hidden" }}>
      <div
        style={{
          width: 200,
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          overflowY: "auto",
          padding: "12px 0",
          background: "var(--soft)",
        }}
      >
        <div style={{ padding: "0 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>カテゴリ</span>
        </div>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "7px 14px",
              background: selectedCategory === cat ? "var(--blue-bg, rgba(59,130,246,0.1))" : "transparent",
              color: selectedCategory === cat ? "var(--blue)" : "var(--text)",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: selectedCategory === cat ? 600 : 400,
              textAlign: "left",
            }}
          >
            <span>{cat}</span>
            {cat !== "すべて" && categoryCounts[cat] != null && (
              <span
                style={{
                  fontSize: 11,
                  background: "var(--line)",
                  color: "var(--muted)",
                  borderRadius: 10,
                  padding: "1px 6px",
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {categoryCounts[cat]}
              </span>
            )}
            {cat === "すべて" && (
              <span
                style={{
                  fontSize: 11,
                  background: "var(--line)",
                  color: "var(--muted)",
                  borderRadius: 10,
                  padding: "1px 6px",
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {articles.length}
              </span>
            )}
          </button>
        ))}

        {pinnedArticles.length > 0 && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "10px 12px" }} />
            <div style={{ padding: "0 12px 8px" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>📌 ピン留め</span>
            </div>
            {pinnedArticles.map((a) => (
              <button
                key={a.id}
                onClick={() => { setSelectedId(a.id); setSelectedCategory("すべて"); }}
                style={{
                  width: "100%",
                  padding: "6px 14px",
                  background: selectedId === a.id ? "var(--blue-bg, rgba(59,130,246,0.1))" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--text)",
                  textAlign: "left",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {a.title}
              </button>
            ))}
          </>
        )}
      </div>

      <div
        style={{
          width: 300,
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="記事を検索..."
              style={{
                flex: 1,
                padding: "6px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--soft)",
                color: "var(--text)",
                fontSize: 13,
              }}
            />
          </div>
          <button
            onClick={openCreate}
            style={{
              width: "100%",
              padding: "7px 12px",
              background: "var(--blue)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            + 新規記事
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div className="muted-text" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
              記事がありません
            </div>
          )}
          {filtered.map((article) => (
            <motion.div
              key={article.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(article.id)}
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
                background: selectedId === article.id ? "var(--blue-bg, rgba(59,130,246,0.07))" : "transparent",
                transition: "background 0.12s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {article.pinned && <span style={{ color: "var(--orange)", fontSize: 12 }}>📌</span>}
                <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {article.title}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 7px",
                    borderRadius: 10,
                    background: "var(--soft)",
                    color: "var(--muted)",
                    border: "1px solid var(--line)",
                  }}
                >
                  {article.category}
                </span>
                <span className="muted-text" style={{ fontSize: 11 }}>
                  {article.updatedAt}
                </span>
              </div>
              {article.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 10,
                        background: "rgba(59,130,246,0.1)",
                        color: "var(--blue)",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>
        <AnimatePresence mode="wait">
          {selectedArticle ? (
            <motion.div
              key={selectedArticle.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              style={{ padding: 28 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>
                    {selectedArticle.pinned && <span style={{ color: "var(--orange)", marginRight: 6 }}>📌</span>}
                    {selectedArticle.title}
                  </h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "var(--soft)",
                        color: "var(--muted)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {selectedArticle.category}
                    </span>
                    <span className="muted-text" style={{ fontSize: 12 }}>作成: {selectedArticle.date}</span>
                    <span className="muted-text" style={{ fontSize: 12 }}>更新: {selectedArticle.updatedAt}</span>
                    <span className="muted-text" style={{ fontSize: 12 }}>著者: {selectedArticle.author}</span>
                  </div>
                  {selectedArticle.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                      {selectedArticle.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: "rgba(59,130,246,0.1)",
                            color: "var(--blue)",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => togglePin(selectedArticle.id)}
                    title={selectedArticle.pinned ? "ピン解除" : "ピン留め"}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      background: selectedArticle.pinned ? "var(--orange)" : "transparent",
                      color: selectedArticle.pinned ? "#fff" : "var(--text)",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    {selectedArticle.pinned ? "📌 解除" : "📌 固定"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openEdit(selectedArticle)}
                    style={{
                      padding: "6px 14px",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      background: "transparent",
                      color: "var(--text)",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    編集
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => deleteArticle(selectedArticle.id)}
                    style={{
                      padding: "6px 14px",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      background: "transparent",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    削除
                  </motion.button>
                </div>
              </div>

              <div
                style={{
                  height: 1,
                  background: "var(--line)",
                  marginBottom: 20,
                }}
              />

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  fontSize: 14,
                  lineHeight: 1.75,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {selectedArticle.body}
              </pre>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "60%",
                color: "var(--muted)",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 40 }}>📖</span>
              <p style={{ margin: 0, fontSize: 14 }}>記事を選択してください</p>
              <button
                onClick={openCreate}
                style={{
                  marginTop: 8,
                  padding: "8px 18px",
                  background: "var(--blue)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                + 新規記事を作成
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "記事を編集" : "新規記事を作成"}
        width={560}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>タイトル</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="記事タイトル"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--soft)",
                color: "var(--text)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>カテゴリ</label>
            <input
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="例: FAQ / テンプレート / ルール・規程"
              list="knowledge-categories"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--soft)",
                color: "var(--text)",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
            <datalist id="knowledge-categories">
              {categories.filter((c) => c !== "すべて").map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>タグ（カンマ区切り）</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="例: FAQ, ヘルプ, 申請"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--soft)",
                color: "var(--text)",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>本文</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="マークダウン風の書式で記述できます..."
              rows={12}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--soft)",
                color: "var(--text)",
                fontSize: 13,
                lineHeight: 1.6,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                padding: "8px 18px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              キャンセル
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={saveArticle}
              disabled={!form.title.trim()}
              style={{
                padding: "8px 20px",
                border: "none",
                borderRadius: 6,
                background: form.title.trim() ? "var(--blue)" : "var(--line)",
                color: form.title.trim() ? "#fff" : "var(--muted)",
                cursor: form.title.trim() ? "pointer" : "not-allowed",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              保存
            </motion.button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
