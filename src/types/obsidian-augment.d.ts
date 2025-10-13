import "obsidian";

declare module "obsidian" {
  interface Vault {
    on(name: "modify", callback: (file: TFile) => void, ctx?: object): EventRef;
  }

  interface MetadataCache {
    on(
      name: "changed",
      callback: (file: TFile) => void,
      ctx?: object
    ): EventRef;
  }
}
