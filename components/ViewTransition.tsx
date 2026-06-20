"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { ViewId } from "@/lib/types";

interface Props {
  viewId: ViewId;
  children: ReactNode;
}

export default function ViewTransition({ viewId, children }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ height: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
