import { addIcon, getIcon } from "obsidian";

export const CRM_DICTATION_ICON_ID = "crm-dictation-mic";

const CRM_DICTATION_ICON_SVG = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 19v3" />
  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
  <rect x="9" y="2" width="6" height="13" rx="3" />
</svg>
`;

let dictationIconRegistered = false;

export const registerDictationIcon = () => {
  if (dictationIconRegistered) {
    return;
  }

  if (getIcon(CRM_DICTATION_ICON_ID)) {
    dictationIconRegistered = true;
    return;
  }

  addIcon(CRM_DICTATION_ICON_ID, CRM_DICTATION_ICON_SVG.trim());
  dictationIconRegistered = true;
};
