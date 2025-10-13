import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { CRMDashboardView } from "./CRMDashboardView";

export const CRM_DASHBOARD_VIEW = "crm-dashboard-view";

export class CRMDashboardViewWrapper extends ItemView {
  private root: Root | null = null;
  private iconName: string;

  constructor(leaf: WorkspaceLeaf, iconName: string) {
    super(leaf);
    this.iconName = iconName;
  }

  getViewType() {
    return CRM_DASHBOARD_VIEW;
  }
  getDisplayText() {
    return "CRM Dashboard";
  }
  getIcon(): string {
    return this.iconName;
  }

  async onOpen() {
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(
      <AppProvider app={this.app}>
        <CRMDashboardView />
      </AppProvider>
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
