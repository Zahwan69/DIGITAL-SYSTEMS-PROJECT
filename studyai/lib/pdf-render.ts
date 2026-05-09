import "server-only";

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Resolve pdfjs's worker file in node_modules at module load. Without this,
// Next.js's dev bundler can't locate the worker via dynamic import and pdfjs
// falls back to a "fake worker" that also fails ("Setting up fake worker failed").
{
  try {
    const req = createRequire(`${process.cwd()}/package.json`);
    const workerPath = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    const opts = (pdfjs as unknown as { GlobalWorkerOptions?: { workerSrc?: string } })
      .GlobalWorkerOptions;
    if (opts) {
      opts.workerSrc = pathToFileURL(workerPath).href;
    }
  } catch {
    // ignore; PDF.js will surface a clear worker error if rendering needs it
  }
}

type CanvasFactory = (width: number, height: number) => {
  getContext: (contextId: "2d") => unknown;
  toBuffer: (mimeType?: string) => Buffer;
};

function resolveCanvasFactory(): CanvasFactory {
  const require = createRequire(import.meta.url);
  const canvasPkg = ["can", "vas"].join("");
  const napiPkg = ["@napi-rs", "canvas"].join("/");
  try {
    const canvas = require(canvasPkg) as { createCanvas?: CanvasFactory };
    if (typeof canvas.createCanvas === "function") {
      return canvas.createCanvas;
    }
  } catch {
    // fall through to @napi-rs/canvas
  }

  const napiCanvas = require(napiPkg) as { createCanvas?: CanvasFactory };
  if (typeof napiCanvas.createCanvas === "function") {
    return napiCanvas.createCanvas;
  }
  throw new Error("No compatible canvas backend found. Install canvas or @napi-rs/canvas.");
}

type ImageLoader = (data: Buffer) => Promise<{
  width: number;
  height: number;
}>;

/**
 * Crop a PNG buffer to a normalized 0-1000 bounding box using @napi-rs/canvas.
 * `bbox` is `[y_min, x_min, y_max, x_max]`. Returns a fresh PNG buffer.
 * Falls back to the original buffer if the canvas backend is missing image
 * support (older envs).
 */
export async function cropPng(
  pngBuffer: Buffer,
  bbox: [number, number, number, number]
): Promise<Buffer> {
  const require = createRequire(import.meta.url);
  const napiPkg = ["@napi-rs", "canvas"].join("/");
  const napi = require(napiPkg) as {
    createCanvas?: CanvasFactory;
    loadImage?: ImageLoader;
    Image?: new () => { src: Buffer; width: number; height: number };
  };
  const createCanvas = napi.createCanvas;
  const loadImage = napi.loadImage;
  if (!createCanvas || !loadImage) {
    return pngBuffer;
  }

  const image = (await loadImage(pngBuffer)) as { width: number; height: number };
  const w = image.width;
  const h = image.height;

  const [yMin, xMin, yMax, xMax] = bbox;
  let sx = (xMin / 1000) * w;
  let sy = (yMin / 1000) * h;
  let ex = (xMax / 1000) * w;
  let ey = (yMax / 1000) * h;

  // Pad 4% so the diagram isn't clipped at the edges
  const padX = (ex - sx) * 0.04;
  const padY = (ey - sy) * 0.04;
  sx = Math.max(0, sx - padX);
  sy = Math.max(0, sy - padY);
  ex = Math.min(w, ex + padX);
  ey = Math.min(h, ey + padY);

  const sw = Math.max(1, Math.round(ex - sx));
  const sh = Math.max(1, Math.round(ey - sy));

  const canvas = createCanvas(sw, sh) as ReturnType<CanvasFactory>;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(
    image as unknown as CanvasImageSource,
    Math.round(sx),
    Math.round(sy),
    sw,
    sh,
    0,
    0,
    sw,
    sh
  );
  return canvas.toBuffer("image/png");
}

export async function renderPdfPageToPng(
  pdfBytes: Uint8Array,
  pageNumber: number,
  scale = 2
): Promise<Buffer> {
  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale });
  const createCanvas = resolveCanvasFactory();
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  return canvas.toBuffer("image/png");
}
