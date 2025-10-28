import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { VAULT_IMAGES_ICON, VAULT_IMAGES_VIEW } from "./constants";
import { VaultImagesView } from "./VaultImagesView";

export class MondoVaultImagesViewWrapper extends ItemView {
  private root: Root | null = null;
  private iconName: string;

  constructor(leaf: WorkspaceLeaf, iconName: string = VAULT_IMAGES_ICON) {
    super(leaf);
    this.iconName = iconName;
  }

  getViewType() {
    return VAULT_IMAGES_VIEW;
  }

  getDisplayText() {
    return "Vault Images";
  }

  getIcon(): string {
    return this.iconName;
  }

  async onOpen() {
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(
      <AppProvider app={this.app}>
        <VaultImagesView />
      </AppProvider>
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
