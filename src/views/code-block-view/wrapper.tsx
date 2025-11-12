import { App, MarkdownPostProcessorContext, MarkdownRenderChild } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { AppProvider } from "@/context/AppProvider";
import { CodeBlockView } from "./CodeBlockView";

const REACT_ROOT_SYMBOL = Symbol.for("mondo-react-root");

export class MondoInlineViewWrapper extends MarkdownRenderChild {
  private root: Root | null = null;
  private app: App;
  private source: string;
  private sourcePath: string;

  constructor(
    app: App,
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) {
    super(el);
    this.app = app;
    this.source = source;
    this.sourcePath = ctx.sourcePath;
    
    // Register this component with the context so Obsidian can manage its lifecycle
    ctx.addChild(this);
  }

  onload() {
    // Check if a root already exists for this element
    const existingRoot = (this.containerEl as any)[REACT_ROOT_SYMBOL] as Root | undefined;
    if (existingRoot) {
      try {
        existingRoot.unmount();
      } catch (e) {
        // Root may already be unmounted
      }
    }

    // Create and render the React root
    this.root = createRoot(this.containerEl);
    (this.containerEl as any)[REACT_ROOT_SYMBOL] = this.root;
    
    this.root.render(
      <AppProvider app={this.app}>
        <CodeBlockView source={this.source} sourcePath={this.sourcePath} />
      </AppProvider>
    );
  }

  onunload() {
    // Clean up the React root
    if (this.root) {
      try {
        this.root.unmount();
      } catch (e) {
        // Root may already be unmounted
      }
      this.root = null;
      delete (this.containerEl as any)[REACT_ROOT_SYMBOL];
    }
  }
}
