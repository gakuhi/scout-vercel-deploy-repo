"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

/** サイドバー開閉を参照する。provider 未設定時は throw。 */
export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within <SidebarProvider>");
  }
  return ctx;
}
