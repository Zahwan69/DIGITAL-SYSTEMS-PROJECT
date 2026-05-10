import "server-only";

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

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
    // PDF.js will surface a clearer worker error if it needs to.
  }
}

export type PdfBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfTextItem = {
  text: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfLine = {
  id: string;
  pageNumber: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  items: PdfTextItem[];
};

export type PdfPageLayout = {
  pageNumber: number;
  width: number;
  height: number;
  lines: PdfLine[];
};

export type PdfDocumentLayout = {
  pages: PdfPageLayout[];
  lines: PdfLine[];
};

type TextItemLike = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

function lineBox(items: PdfTextItem[]) {
  const xMin = Math.min(...items.map((item) => item.x));
  const yMin = Math.min(...items.map((item) => item.y));
  const xMax = Math.max(...items.map((item) => item.x + item.width));
  const yMax = Math.max(...items.map((item) => item.y + item.height));

  return {
    x: xMin,
    y: yMin,
    width: xMax - xMin,
    height: yMax - yMin,
  };
}

function joinLineText(items: PdfTextItem[]) {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let text = "";
  let previous: PdfTextItem | null = null;

  for (const item of sorted) {
    if (previous) {
      const gap = item.x - (previous.x + previous.width);
      if (gap > Math.max(1.5, previous.height * 0.18) && !text.endsWith(" ")) {
        text += " ";
      }
    }
    text += item.text;
    previous = item;
  }

  return text.replace(/\s+/g, " ").trim();
}

function groupItemsIntoLines(items: PdfTextItem[], pageNumber: number): PdfLine[] {
  const rows: PdfTextItem[][] = [];
  const sorted = [...items].sort((a, b) => {
    const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
    if (Math.abs(dy) > 2.5) return dy;
    return a.x - b.x;
  });

  for (const item of sorted) {
    const centerY = item.y + item.height / 2;
    const row = rows.find((candidate) => {
      const rowCenter =
        candidate.reduce((sum, current) => sum + current.y + current.height / 2, 0) /
        candidate.length;
      const rowHeight = Math.max(...candidate.map((current) => current.height));
      return Math.abs(centerY - rowCenter) <= Math.max(2.8, rowHeight * 0.55);
    });

    if (row) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows
    .map((row, index) => {
      const box = lineBox(row);
      return {
        id: `${pageNumber}:${index}`,
        pageNumber,
        text: joinLineText(row),
        ...box,
        items: [...row].sort((a, b) => a.x - b.x),
      };
    })
    .filter((line) => line.text.length > 0)
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) > 2.5) return a.y - b.y;
      return a.x - b.x;
    });
}

export async function extractPdfLayout(pdfBytes: Uint8Array): Promise<PdfDocumentLayout> {
  const loadingTask = pdfjs.getDocument({ data: pdfBytes, verbosity: 0 });
  const pdf = await loadingTask.promise;
  const pages: PdfPageLayout[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const rawItems = textContent.items as TextItemLike[];

    const items = rawItems
      .map((item): PdfTextItem | null => {
        const text = typeof item.str === "string" ? item.str : "";
        const transform = item.transform;
        if (!text.trim() || !Array.isArray(transform) || transform.length < 6) {
          return null;
        }

        const fontHeight = Math.abs(item.height ?? transform[3] ?? 10);
        const width = Math.max(0.5, item.width ?? text.length * fontHeight * 0.5);
        const x = Number(transform[4] ?? 0);
        const baselineY = Number(transform[5] ?? 0);
        const y = Math.max(0, viewport.height - baselineY - fontHeight);

        return {
          text,
          pageNumber,
          x,
          y,
          width,
          height: Math.max(1, fontHeight),
        };
      })
      .filter((item): item is PdfTextItem => Boolean(item));

    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      lines: groupItemsIntoLines(items, pageNumber),
    });
  }

  return {
    pages,
    lines: pages.flatMap((page) => page.lines),
  };
}

export function unionBoxes(boxes: PdfBox[]): PdfBox | null {
  if (boxes.length === 0) return null;

  const xMin = Math.min(...boxes.map((box) => box.x));
  const yMin = Math.min(...boxes.map((box) => box.y));
  const xMax = Math.max(...boxes.map((box) => box.x + box.width));
  const yMax = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: xMin,
    y: yMin,
    width: xMax - xMin,
    height: yMax - yMin,
  };
}

