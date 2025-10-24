import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { VAULT_FILES_ICON, VAULT_FILES_VIEW } from "./constants";
import { VaultFilesView } from "./VaultFilesView";

export class CRMVaultFilesViewWrapper extends ItemView {
  private root: Root | null = null;
  private iconName: string;

  constructor(leaf: WorkspaceLeaf, iconName: string = VAULT_FILES_ICON) {
    super(leaf);
    this.iconName = iconName;
  }

  getViewType() {
    return VAULT_FILES_VIEW;
  }

  getDisplayText() {
    return "Vault Files";
  }

  getIcon(): string {
    return this.iconName;
  }

  async onOpen() {
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(
      <AppProvider app={this.app}>
        <VaultFilesView />
      </AppProvider>
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
