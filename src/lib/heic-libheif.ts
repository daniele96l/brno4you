/**
 * HEIC→JPEG via libheif-js (includes HEVC/libde265).
 * sharp on Vercel only accepts AVIF for HEIF — not iPhone HEVC.
 * Disables libheif security limits so iref > 16 iPhone photos decode.
 */

type LibheifModule = {
  ready?: Promise<unknown>;
  HeifDecoder: new () => {
    decode: (data: Buffer | Uint8Array | ArrayBuffer) => HeifImage[];
    decoder?: number;
  };
  heif_context_read_from_memory: (ctx: number, data: unknown) => unknown;
  heif_get_disabled_security_limits: () => number;
  heif_context_set_security_limits: (
    ctx: number,
    limits: number,
    err?: unknown,
  ) => unknown;
  heif_context_free?: (ctx: number) => void;
};

type HeifImage = {
  get_width: () => number;
  get_height: () => number;
  display: (
    imageData: { data: Uint8ClampedArray; width: number; height: number },
    callback: (
      displayData: {
        data: Uint8ClampedArray;
        width: number;
        height: number;
      } | null,
    ) => void,
  ) => void;
  free?: () => void;
};

let libheifPromise: Promise<LibheifModule> | null = null;
let patched = false;

async function loadLibheif(): Promise<LibheifModule> {
  if (!libheifPromise) {
    libheifPromise = (async () => {
      const mod = await import("libheif-js/wasm-bundle");
      const factory = (mod as { default?: unknown }).default ?? mod;
      const libheif = (
        typeof factory === "function" ? factory() : factory
      ) as LibheifModule;
      if (libheif.ready) await libheif.ready;
      if (!patched) {
        patched = true;
        const orig = libheif.heif_context_read_from_memory.bind(libheif);
        libheif.heif_context_read_from_memory = (ctx: number, data: unknown) => {
          try {
            const limits = libheif.heif_get_disabled_security_limits();
            if (limits) {
              libheif.heif_context_set_security_limits(ctx, limits);
            }
          } catch {
            // continue with defaults
          }
          return orig(ctx, data);
        };
      }
      return libheif;
    })();
  }
  return libheifPromise;
}

async function heicToRgba(
  buf: Buffer,
): Promise<{ data: Buffer; width: number; height: number }> {
  const libheif = await loadLibheif();
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(buf);
  if (!images?.length) {
    throw new Error("HEIF image not found");
  }

  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  if (!width || !height) {
    throw new Error("HEIF image has no dimensions");
  }

  try {
    const displayData = await new Promise<{
      data: Uint8ClampedArray;
      width: number;
      height: number;
    }>((resolve, reject) => {
      const target = {
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      };
      for (let i = 0; i < width * height; i++) {
        target.data[i * 4 + 3] = 255;
      }
      image.display(target, (result) => {
        if (!result) reject(new Error("HEIF processing error"));
        else resolve(result);
      });
    });

    return {
      data: Buffer.from(
        displayData.data.buffer,
        displayData.data.byteOffset,
        displayData.data.byteLength,
      ),
      width: displayData.width,
      height: displayData.height,
    };
  } finally {
    for (const img of images) {
      try {
        img.free?.();
      } catch {
        /* ignore */
      }
    }
    if (decoder.decoder && libheif.heif_context_free) {
      try {
        libheif.heif_context_free(decoder.decoder);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Decode iPhone HEIC (incl. iref > 16) to JPEG bytes. */
export async function heicBufferToJpeg(buf: Buffer): Promise<Buffer> {
  const { data, width, height } = await heicToRgba(buf);
  const sharp = (await import("sharp")).default;
  return sharp(data, {
    raw: { width, height, channels: 4 },
    unlimited: true,
    failOn: "none",
  })
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88 })
    .toBuffer();
}
