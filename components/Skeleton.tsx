"use client";

import { motion } from "framer-motion";

interface Props {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export function SkeletonLine({ width = "100%", height = 14, borderRadius = 6, style }: Props) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width, height,
        background: "var(--line)",
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--line)", flexShrink: 0 }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <SkeletonLine width="60%" height={12} />
          <SkeletonLine width="40%" height={10} />
        </div>
      </div>
      <SkeletonLine width="90%" height={12} />
      <SkeletonLine width="70%" height={12} />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
            style={{ width: 16, height: 16, borderRadius: 3, background: "var(--line)", flexShrink: 0 }}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
            <SkeletonLine width={`${60 + (i % 3) * 10}%`} height={12} />
            <SkeletonLine width={`${30 + (i % 2) * 15}%`} height={10} />
          </div>
          <SkeletonLine width={48} height={20} borderRadius={99} />
        </div>
      ))}
    </div>
  );
}
