import { App, Modal, TFile } from "obsidian";
import type Mondo from "@/main";
import { resolveSelfPerson } from "@/utils/selfPerson";

const openFileInWorkspace = async (app: App, file: TFile): Promise<void> => {
  const markdownLeaves = app.workspace.getLeavesOfType("markdown");
  const existingLeaf = markdownLeaves.find((leaf) => {
    try {
      const openedFile = (leaf.view as any)?.file as TFile | undefined | null;
      return openedFile?.path === file.path;
    } catch (error) {
      console.error("Mondo: Failed to inspect leaf file", error);
      return false;
    }
  });

  if (existingLeaf) {
    app.workspace.revealLeaf(existingLeaf);
    return;
  }

  const leaf = app.workspace.getLeaf(false);
  await leaf.openFile(file);
};

const promptConfigureSelfPerson = async (app: App): Promise<boolean> => {
  let settled = false;
  return await new Promise<boolean>((resolve) => {
    class ConfigureSelfModal extends Modal {
      onOpen() {
        const { titleEl, contentEl } = this;
        titleEl.setText("Set up your me note");
        contentEl.empty();
        contentEl.createEl("p", {
          text: "Mondo couldn't find a note configured as yourself.",
        });
        contentEl.createEl("p", {
          text: "To use this command, pick the note that represents yourself in the Mondo settings.",
        });
        contentEl.createEl("p", {
          text: "Would you like to open the Mondo configuration now?",
        });

        const footer = contentEl.createDiv({ cls: "modal-button-container" });
        const cancelButton = footer.createEl("button", { text: "Cancel" });
        const openSettingsButton = footer.createEl("button", {
          text: "Open Mondo settings",
        });
        openSettingsButton.addClass("mod-cta");

        cancelButton.addEventListener("click", () => {
          settled = true;
          this.close();
          resolve(false);
        });

        openSettingsButton.addEventListener("click", () => {
          settled = true;
          this.close();
          resolve(true);
        });
      }

      onClose() {
        if (!settled) {
          resolve(false);
        }
      }
    }

    new ConfigureSelfModal(app).open();
  });
};

const openMondoSettings = (app: App, plugin: Mondo) => {
  const setting = (app as any).setting;
  if (!setting?.open) {
    return;
  }
  setting.open();
  if (typeof setting.openTabById === "function") {
    setting.openTabById(plugin.manifest.id);
  }
};

export const openSelfPersonNote = async (
  app: App,
  plugin: Mondo
): Promise<void> => {
  const configuredPath = (plugin as any)?.settings?.selfPersonPath ?? "";
  const selfInfo = resolveSelfPerson(app, null, configuredPath);

  if (!selfInfo) {
    const shouldOpenSettings = await promptConfigureSelfPerson(app);
    if (shouldOpenSettings) {
      openMondoSettings(app, plugin);
    }
    return;
  }

  await openFileInWorkspace(app, selfInfo.file);
};
