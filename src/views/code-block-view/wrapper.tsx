import { App, MarkdownPostProcessorContext } from "obsidian";
import { createRoot } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { CodeBlockView } from "./CodeBlockView";

export class CRMInlineViewWrapper {
  constructor(
    app: App,
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) {
    // Render the app:
    const root = createRoot(el);
    root.render(
      <AppProvider app={app}>
        <CodeBlockView source={source} />
      </AppProvider>
    );

    // Cleanup when the element is removed from the DOM
    const observer = new MutationObserver(() => {
      if (!document.body.contains(el)) {
        root.unmount();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
