"use client";

import { useState, useRef, ReactNode, useEffect } from "react";

interface Props {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
}

export default function Tooltip({ content, children, delay = 400 }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function show() {
    timer.current = setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  }

  useEffect(() => {
    if (visible && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
  }, [visible]);

  return (
    <div ref={ref} style={{ display: "inline-block" }} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div style={{
          position: "fixed",
          left: pos.x,
          top: pos.y - 8,
          transform: "translate(-50%, -100%)",
          background: "var(--text)",
          color: "#fff",
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 7,
          whiteSpace: "pre-wrap",
          maxWidth: 260,
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          lineHeight: 1.5,
          animation: "fadeIn 0.12s ease",
        }}>
          {content}
          <div style={{
            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: `5px solid var(--text)`,
          }} />
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translate(-50%,-90%) } to { opacity:1; transform:translate(-50%,-100%) } }`}</style>
    </div>
  );
}
