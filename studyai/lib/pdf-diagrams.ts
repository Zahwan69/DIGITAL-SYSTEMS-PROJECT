import "server-only";

import type { PdfBox, PdfLine, PdfPageLayout } from "@/lib/pdf-layout";
import type { QuestionPageSpan } from "@/lib/question-segmentation";

export type NormalizedBoundingBox = [number, number, number, number];

export type DiagramDetection = {
  bbox: NormalizedBoundingBox;
  confidence: number;
  pixelCount: number;
  componentCount: number;
  reason: string;
};

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

type CanvasModuleShape = {
  createCanvas?: CanvasFactory;
  loadImage?: ImageLoader;
  default?: { createCanvas?: CanvasFactory; loadImage?: ImageLoader };
};

function pickCanvasTools(mod: CanvasModuleShape): CanvasTools | null {
  const createCanvas = mod.createCanvas ?? mod.default?.createCanvas;
  const loadImage = mod.loadImage ?? mod.default?.loadImage;
  if (typeof createCanvas === "function" && typeof loadImage === "function") {
    return { createCanvas, loadImage };
  }
  return null;
}

async function canvasTools(): Promise<CanvasTools> {
  let napiError: unknown = null;
  try {
    const napi = (await import("@napi-rs/canvas")) as CanvasModuleShape;
    const tools = pickCanvasTools(napi);
    if (tools) return tools;
  } catch (error) {
    napiError = error;
  }

  try {
    const canvas = (await import("canvas")) as CanvasModuleShape;
    const tools = pickCanvasTools(canvas);
    if (tools) return tools;
  } catch (error) {
    const napiMessage = napiError instanceof Error ? napiError.message : String(napiError ?? "unknown");
    const canvasMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No compatible canvas image backend could be loaded. @napi-rs/canvas: ${napiMessage}. canvas: ${canvasMessage}.`
    );
  }

  throw new Error("No compatible canvas image backend found. Install @napi-rs/canvas or canvas.");
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

function looksLikeAnswerRule(box: PixelBox, roi: PixelBox) {
  const width = box.xMax - box.xMin;
  const height = box.yMax - box.yMin;
  if (height <= 0 || width <= 0) return false;
  const aspect = width / height;
  if (aspect < 12) return false;
  const roiHeight = Math.max(1, roi.yMax - roi.yMin);
  const centerY = (box.yMin + box.yMax) / 2;
  const verticalPosition = (centerY - roi.yMin) / roiHeight;
  // Answer rules are very thin, very wide, and live in the lower band of the
  // question. Diagrams that share those traits are vanishingly rare.
  return verticalPosition > 0.35 && height <= 6;
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
}): Promise<DiagramDetection | null> {
  const { createCanvas, loadImage } = await canvasTools();
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

  const roiBox = { ...pdfBoxToPixels(span.box, page, imageWidth, imageHeight, 8), pixelCount: 0 };
  const components = findComponents(data, textMask, imageWidth, imageHeight, roiBox);
  const roiArea = Math.max(1, (roiBox.xMax - roiBox.xMin) * (roiBox.yMax - roiBox.yMin));

  const meaningfulComponents = components.filter((component) => {
    const width = component.xMax - component.xMin;
    const height = component.yMax - component.yMin;
    const componentArea = width * height;
    if (componentArea / roiArea > 0.75) return false;
    if (looksLikeAnswerRule(component, roiBox)) return false;
    return true;
  });

  const union = unionPixelBoxes(meaningfulComponents);
  if (!union) return null;

  // Confidence is derived from real evidence: how much non-text pixel mass
  // is inside the span, how many distinct components were detected, and how
  // much of the span the union covers. The thresholds are deliberately
  // conservative — wrong crops are worse than missing diagrams.
  const unionArea = Math.max(
    1,
    (union.xMax - union.xMin) * (union.yMax - union.yMin)
  );
  const massScore = Math.min(1, union.pixelCount / 1500);
  const componentScore = Math.min(1, meaningfulComponents.length / 3);
  const coverageScore = Math.min(1, Math.max(0, (unionArea / roiArea) * 8));
  const confidence = Math.min(
    0.95,
    massScore * 0.55 + componentScore * 0.25 + coverageScore * 0.2
  );

  return {
    bbox: toNormalizedBox(union, imageWidth, imageHeight),
    confidence,
    pixelCount: union.pixelCount,
    componentCount: meaningfulComponents.length,
    reason: `Detected ${meaningfulComponents.length} non-text component(s) with ${union.pixelCount} dark pixels inside the question span.`,
  };
}
