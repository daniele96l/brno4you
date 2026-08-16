declare module "libheif-js/wasm-bundle" {
  const factory: unknown;
  export default factory;
}

declare module "libheif-js" {
  const factory: unknown;
  export default factory;
}

declare module "heic-to" {
  export function isHeic(file: Blob): Promise<boolean>;
  export function heicTo(options: {
    blob: Blob;
    type: string;
    quality?: number;
    options?: Record<string, unknown>;
  }): Promise<Blob>;
}
