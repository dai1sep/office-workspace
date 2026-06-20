"use client";

import { ReactNode } from "react";
import { useApp } from "@/lib/context";

type Action = "admin" | "dept_admin" | "any";

interface Props {
  require: Action;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 権限が足りない場合は fallback を表示（デフォルトは何も表示しない）
 * 使い方:
 *   <AccessGate require="admin"><DeleteButton /></AccessGate>
 */
export default function AccessGate({ require: action, children, fallback = null }: Props) {
  const { can } = useApp();
  return can(action) ? <>{children}</> : <>{fallback}</>;
}
