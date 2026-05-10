import "server-only";

import { createRequire } from "node:module";

import type { PdfBox, PdfLine, PdfPageLayout } from "@/lib/pdf-layout";
import type { QuestionPageSpan } from "@/lib/question-segmentation";

export type NormalizedBoundingBox = [number, number, number, number];

type CanvasFactory = (width: number, height: number) => {
  getContext: (contextId: "2d") => unknown;
  toBuffer: (mimeType?: string) => Buffer;
};

type ImageLoader = (data: Buffer) => Promise<{
  width: number;
  height: number;
}>;

type CanvasTools = {
  createCanvas: CanvasFactory;
  loadImage: ImageLoader;
};

type PixelBox = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  pixelCount: number;
};

function canvasTools(): CanvasTools {
  const require = createRequire(import.meta.url);
  const napiPkg = ["@napi-rs", "canvas"].join("/");
  const napi = require(napiPkg) as {
    createCanvas?: CanvasFactory;
    loadImage?: ImageLoader;
  };

  if (!napi.createCanvas || !napi.loadImage) {
    throw new Error("@napi-rs/canvas image support is unavailable.");
  }

  return {
    createCanvas: napi.createCanvas,
    loadImage: napi.loadImage,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pdfBoxToPixels(box: PdfBox, page: PdfPageLayout, imageWidth: number, imageHeight: number, pad = 0) {
  const xScale = imageWidth / page.width;
  const yScale = imageHeight / page.height;
  const xMin = clamp(Math.floor(box.x * xScale - pad), 0, imageWidth - 1);
  const yMin = clamp(Math.floor(box.y * yScale - pad), 0, imageHeight - 1);
  const xMax = clamp(Math.ceil((box.x + box.width) * xScale + pad), xMin + 1, imageWidth);
  const yMax = clamp(Math.ceil((box.y + box.height) * yScale + pad), yMin + 1, imageHeight);

  return { xMin, yMin, xMax, yMax };
}

function markRect(mask: Uint8Array, width: number, rect: PixelBox) {
  const xMin = clamp(rect.xMin, 0, width - 1);
  const xMax = clamp(rect.xMax, xMin + 1, width);

  for (let y = rect.yMin; y < rect.yMax; y += 1) {
    const start = y * width + xMin;
    mask.fill(1, start, y * width + xMax);
  }
}

function isDarkPixel(data: Uint8ClampedArray, index: number) {
  const offset = index * 4;
  const r = data[offset] ?? 255;
  const g = data[offset + 1] ?? 255;
  const b = data[offset + 2] ?? 255;
  const a = data[offset + 3] ?? 255;
  if (a < 30) return false;

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 238;
}

function componentLooksLikeDiagram(box: PixelBox) {
  const width = box.xMax - box.xMin;
  const height = box.yMax - box.yMin;
  if (box.pixelCount < 70) return false;
  if (width < 18 || height < 12) return false;
  if (width > 40 && height <= 4) return false;
  if (height > 40 && width <= 4) return false;
  return true;
}

function findComponents(
  data: Uint8ClampedArray,
  textMask: Uint8Array,
  width: number,
  height: number,
  roi: PixelBox
) {
  const visited = new Uint8Array(width * height);
  const components: PixelBox[] = [];
  const queue: number[] = [];

  for (let y = roi.yMin; y < roi.yMax; y += 1) {
    for (let x = roi.xMin; x < roi.xMax; x += 1) {
      const start = y * width + x;
      if (visited[start] || textMask[start] || !isDarkPixel(data, start)) continue;

      let qIndex = 0;
      queue.length = 0;
      queue.push(start);
      visited[start] = 1;

      const box: PixelBox = { xMin: x, yMin: y, xMax: x + 1, yMax: y + 1, pixelCount: 0 };

      while (qIndex < queue.length) {
        const current = queue[qIndex++];
        const cx = current % width;
        const cy = Math.floor(current / width);
        box.pixelCount += 1;
        box.xMin = Math.min(box.xMin, cx);
        box.yMin = Math.min(box.yMin, cy);
        box.xMax = Math.max(box.xMax, cx + 1);
        box.yMax = Math.max(box.yMax, cy + 1);

        const neighbors = [
          current - 1,
          current + 1,
          current - width,
          current + width,
        ];

        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue;
          const nx = next % width;
          const ny = Math.floor(next / width);
          if (nx < roi.xMin || nx >= roi.xMax || ny < roi.yMin || ny >= roi.yMax) continue;
          if (textMask[next] || !isDarkPixel(data, next)) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }

      if (componentLooksLikeDiagram(box)) {
        components.push(box);
      }
    }
  }

  return components;
}

function unionPixelBoxes(boxes: PixelBox[]): PixelBox | null {
  if (boxes.length === 0) return null;
  return {
    xMin: Math.min(...boxes.map((box) => box.xMin)),
    yMin: Math.min(...boxes.map((box) => box.yMin)),
    xMax: Math.max(...boxes.map((box) => box.xMax)),
    yMax: Math.max(...boxes.map((box) => box.yMax)),
    pixelCount: boxes.reduce((sum, box) => sum + box.pixelCount, 0),
  };
}

function toNormalizedBox(box: PixelBox, imageWidth: number, imageHeight: number): NormalizedBoundingBox {
  const padX = Math.max(8, (box.xMax - box.xMin) * 0.08);
  const padY = Math.max(8, (box.yMax - box.yMin) * 0.08);
  const xMin = clamp(box.xMin - padX, 0, imageWidth);
  const yMin = clamp(box.yMin - padY, 0, imageHeight);
  const xMax = clamp(box.xMax + padX, xMin + 1, imageWidth);
  const yMax = clamp(box.yMax + padY, yMin + 1, imageHeight);

  return [
    Math.round((yMin / imageHeight) * 1000),
    Math.round((xMin / imageWidth) * 1000),
    Math.round((yMax / imageHeight) * 1000),
    Math.round((xMax / imageWidth) * 1000),
  ];
}

export async function detectDiagramBoxForQuestionSpan({
  pagePng,
  page,
  span,
  pageLines,
}: {
  pagePng: Buffer;
  page: PdfPageLayout;
  span: QuestionPageSpan;
  pageLines: PdfLine[];
}): Promise<NormalizedBoundingBox | null> {
  const { createCanvas, loadImage } = canvasTools();
  const image = await loadImage(pagePng);
  const imageWidth = image.width;
  const imageHeight = image.height;
  const canvas = createCanvas(imageWidth, imageHeight) as ReturnType<CanvasFactory>;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D & {
    getImageData: (sx: number, sy: number, sw: number, sh: number) => { data: Uint8ClampedArray };
  };

  ctx.drawImage(image as unknown as CanvasImageSource, 0, 0);
  const { data } = ctx.getImageData(0, 0, imageWidth, imageHeight);
  const textMask = new Uint8Array(imageWidth * imageHeight);

  for (const line of pageLines) {
    const rect = pdfBoxToPixels(line, page, imageWidth, imageHeight, 5);
    markRect(textMask, imageWidth, { ...rect, pixelCount: 0 });
  }

  const roi = pdfBoxToPixels(span.box, page, imageWidth, imageHeight, 8);
  const components = findComponents(data, textMask, imageWidth, imageHeight, { ...roi, pixelCount: 0 });
  const meaningfulComponents = components.filter((component) => {
    const width = component.xMax - component.xMin;
    const height = component.yMax - component.yMin;
    const roiArea = Math.max(1, (roi.xMax - roi.xMin) * (roi.yMax - roi.yMin));
    const componentArea = width * height;
    if (componentArea / roiArea > 0.75) return false;
    return true;
  });

  const union = unionPixelBoxes(meaningfulComponents);
  if (!union) return null;
  return toNormalizedBox(union, imageWidth, imageHeight);
}

