import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { CRMSideView } from "./CRMSideView";
import { AppProvider } from "../../context/AppProvider";

export const CRM_SIDE_VIEW = "crm-side-view";

export class CRMSideViewWrapper extends ItemView {
  root: Root | null = null;
  icon: string;

  constructor(leaf: WorkspaceLeaf, icon: string) {
    super(leaf);
    this.icon = icon;
  }

  getViewType() {
    return CRM_SIDE_VIEW;
  }

  getIcon(): string {
    return this.icon;
  }

  getDisplayText() {
    return "CRM";
  }

  async onOpen() {
    this.root = createRoot(this.contentEl);
    this.root.render(
      <StrictMode>
        <AppProvider app={this.app}>
          <CRMSideView />
        </AppProvider>
      </StrictMode>
    );
  }

  async onClose() {
    this.root?.unmount();
  }
}
