import { ItemView, type ViewStateResult, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { CRMEntityPanelView } from "./CRMEntityPanelView";
import {
  CRMFileType,
  getCRMEntityConfig,
} from "@/types/CRMFileType";

export const CRM_ENTITY_PANEL_VIEW = "crm-entity-panel-view";

export type CRMEntityPanelViewState = {
  entityType: CRMFileType;
};

export class CRMEntityPanelViewWrapper extends ItemView {
  private root: Root | null = null;
  private iconName: string;
  private entityType: CRMFileType = CRMFileType.PERSON;

  constructor(leaf: WorkspaceLeaf, iconName: string) {
    super(leaf);
    this.iconName = iconName;
    this.applyEntityConfig(this.entityType);
  }

  getViewType() {
    return CRM_ENTITY_PANEL_VIEW;
  }

  getDisplayText() {
    const config = getCRMEntityConfig(this.entityType);
    return config?.name ?? this.entityType;
  }

  getIcon(): string {
    return this.iconName;
  }

  getState(): CRMEntityPanelViewState {
    return { entityType: this.entityType };
  }

  async setState(
    state: CRMEntityPanelViewState | undefined,
    result: ViewStateResult
  ): Promise<void> {
    if (state?.entityType) {
      this.entityType = state.entityType;
      this.applyEntityConfig(this.entityType);
    }
    if (this.root) {
      this.render();
    }
    await super.setState(state, result);
  }

  async onOpen() {
    const { state } = this.leaf.getViewState();
    const entityState = state as CRMEntityPanelViewState | undefined;
    if (entityState?.entityType) {
      this.entityType = entityState.entityType;
      this.applyEntityConfig(this.entityType);
    }

    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.render();
  }

  private applyEntityConfig(entityType: CRMFileType) {
    const config = getCRMEntityConfig(entityType);
    if (!config) {
      return;
    }
    this.iconName = config.icon;
    const leaf = this.leaf as unknown as { setIcon?: (icon: string) => void };
    leaf?.setIcon?.(config.icon);
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }

  private render() {
    if (!this.root) {
      return;
    }

    this.root.render(
      <AppProvider app={this.app}>
        <CRMEntityPanelView entityType={this.entityType} />
      </AppProvider>
    );
  }
}
