import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { VAULT_NOTES_ICON, VAULT_NOTES_VIEW } from "./constants";
import { VaultNotesView } from "./VaultNotesView";

export class MondoVaultNotesViewWrapper extends ItemView {
  private root: Root | null = null;
  private iconName: string;

  constructor(leaf: WorkspaceLeaf, iconName: string = VAULT_NOTES_ICON) {
    super(leaf);
    this.iconName = iconName;
  }

  getViewType() {
    return VAULT_NOTES_VIEW;
  }

  getDisplayText() {
    return "Markdown Notes";
  }

  getIcon(): string {
    return this.iconName;
  }

  async onOpen() {
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.root.render(
      <AppProvider app={this.app}>
        <VaultNotesView />
      </AppProvider>
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
