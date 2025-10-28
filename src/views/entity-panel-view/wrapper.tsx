import { ItemView, type ViewStateResult, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { EntityView } from "./EntityView";
import { CRMFileType, getCRMEntityConfig } from "@/types/CRMFileType";
import { CRM_ENTITY_TYPES } from "@/entities";

export const ENTITY_PANEL_VIEW = "entity-panel-view";

export type CRMEntityPanelViewState = {
  entityType: CRMFileType;
};

export class CRMEntityPanelViewWrapper extends ItemView {
  private root: Root | null = null;
  private iconName: string;
  // Default to the first available entity type from current config to avoid undefined when certain
  // built-in types (like PERSON) are not present in custom configurations.
  private entityType: CRMFileType = ((): CRMFileType => {
    const first = CRM_ENTITY_TYPES[0];
    return (first ?? ("person" as CRMFileType)) as CRMFileType;
  })();

  constructor(leaf: WorkspaceLeaf, iconName: string) {
    super(leaf);
    this.iconName = iconName;
    this.applyEntityConfig(this.entityType);
  }

  getViewType() {
    return ENTITY_PANEL_VIEW;
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
      // Keep the existing iconName when config is missing to avoid flicker/undefined in title bar
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
        <EntityView entityType={this.entityType} />
      </AppProvider>
    );
  }
}
