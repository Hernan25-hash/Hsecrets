"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";

export default function AuthWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
