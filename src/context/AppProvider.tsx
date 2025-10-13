import { createContext, PropsWithChildren } from "react";
import type { App } from "obsidian";

export const AppContext = createContext<App | undefined>(undefined);

interface AppProviderProps extends PropsWithChildren<{ app: App }> {}

export const AppProvider = ({ app, children }: AppProviderProps) => (
  <AppContext.Provider value={app}>
    <div className="crm">{children}</div>
  </AppContext.Provider>
);
