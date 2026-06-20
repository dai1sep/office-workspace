"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useApp } from "@/lib/context";
import { statusColor } from "@/lib/utils";
import { Todo } from "@/lib/types";

const COLUMNS = [
  { id: "予定", label: "予定", color: "var(--blue)" },
  { id: "今日", label: "今日", color: "var(--orange)" },
  { id: "今週", label: "今週", color: "var(--green)" },
  { id: "完了", label: "完了", color: "var(--muted)" },
] as const;

function KanbanCard({ todo, isDragging }: { todo: Todo; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        whileHover={{ y: -2, boxShadow: "var(--shadow)" }}
        transition={{ duration: 0.12 }}
        style={{
          background: "var(--panel)", border: "1px solid var(--line)",
          borderRadius: 8, padding: "10px 12px", marginBottom: 8,
          cursor: "grab", userSelect: "none",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--text)",
          textDecoration: todo.status === "完了" ? "line-through" : "none" }}>
          {todo.title}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`status ${statusColor(todo.priority)}`}>{todo.priority}</span>
          {todo.project && <span style={{ fontSize: 10, color: "var(--muted)" }}>{todo.project}</span>}
          <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>{todo.due}</span>
        </div>
      </motion.div>
    </div>
  );
}

function KanbanColumn({
  columnId, label, color, todos, onDrop,
}: {
  columnId: string; label: string; color: string; todos: Todo[]; onDrop: (id: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      style={{
        flex: 1, minWidth: 220,
        background: isOver ? "var(--soft)" : "var(--bg)",
        border: `1.5px solid ${isOver ? color : "var(--line)"}`,
        borderRadius: 10, padding: "12px 10px",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); const id = e.dataTransfer.getData("todoId"); if (id) onDrop(id); }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <strong style={{ fontSize: 13, color: "var(--text)" }}>{label}</strong>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{todos.length}</span>
      </div>
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {todos.map((t) => (
          <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("todoId", t.id)}>
            <KanbanCard todo={t} />
          </div>
        ))}
      </SortableContext>
      {todos.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "20px 0", border: "2px dashed var(--line)", borderRadius: 6 }}>
          ここにドラッグ
        </div>
      )}
    </div>
  );
}

export default function TodoKanban() {
  const { state, updateState } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function moveToColumn(todoId: string, columnId: string) {
    updateState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => t.id === todoId ? { ...t, status: columnId as Todo["status"] } : t),
    }));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // 同じカラム内の並び替え
    updateState((prev) => {
      const oldIndex = prev.todos.findIndex((t) => t.id === active.id);
      const newIndex = prev.todos.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, todos: arrayMove(prev.todos, oldIndex, newIndex) };
    });
  }

  const activeTodo = activeId ? state.todos.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {COLUMNS.map(({ id, label, color }) => (
          <KanbanColumn
            key={id}
            columnId={id}
            label={label}
            color={color}
            todos={state.todos.filter((t) => t.status === id)}
            onDrop={(todoId) => moveToColumn(todoId, id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTodo && (
          <motion.div
            style={{
              background: "var(--panel)", border: "1px solid var(--blue)",
              borderRadius: 8, padding: "10px 12px",
              boxShadow: "var(--shadow)", cursor: "grabbing",
              opacity: 0.95,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{activeTodo.title}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{activeTodo.due}</div>
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
