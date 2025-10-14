declare module "style-mod" {
  export type StyleSpec = Record<string, Record<string, string | number>>;

  export class StyleModule {
    constructor(spec: StyleSpec);
  }
}
