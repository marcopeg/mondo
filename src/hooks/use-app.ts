import { useContext } from "react";
import type { App } from "obsidian";
import { AppContext } from "@/context/AppProvider";

export const useApp = (): App => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
};
