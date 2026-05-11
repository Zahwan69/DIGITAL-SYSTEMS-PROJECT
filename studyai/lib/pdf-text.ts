import "server-only";

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// See lib/pdf-render.ts; resolve the worker path here too in case this module
// loads first and pdf-render.ts hasn't initialised it yet.
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
    // ignore
  }
}

type TextItemLike = { str?: string };

function copyPdfBytes(pdfBytes: Uint8Array) {
  return new Uint8Array(pdfBytes);
}

export async function extractPdfText(pdfBytes: Uint8Array): Promise<{ text: string; pageCount: number }> {
  const loadingTask = pdfjs.getDocument({ data: copyPdfBytes(pdfBytes), verbosity: 0 });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItemLike[];
    const text = items
      .map((item) => (typeof item.str === "string" ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pageTexts.push(text);
  }

  return { text: pageTexts.join("\n\n").trim(), pageCount: pdf.numPages };
}
