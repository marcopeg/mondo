import { Setting } from "obsidian";

export const createSettingsSection = (
  parent: HTMLElement,
  heading: string,
  description?: string
) => {
  const createSetting = () => new Setting(parent);

  const headingSetting = createSetting();
  headingSetting.setName(heading);
  if (description) {
    headingSetting.setDesc(description);
  }
  headingSetting.setHeading();

  return {
    element: parent,
    createSetting,
  };
};
