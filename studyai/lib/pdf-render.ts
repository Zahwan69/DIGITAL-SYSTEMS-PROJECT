import "server-only";

import { createRequire } from "node:module";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

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
