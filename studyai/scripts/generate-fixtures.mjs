// Generate StudyAI test-fixture PDFs (question papers + marking schemes).
// Usage from the studyai/ directory:
//   pnpm add -D pdfkit
//   node scripts/generate-fixtures.mjs
//
// Outputs to tests/fixtures/papers/<subject>/{qp,ms}.pdf
// Re-runnable. Overwrites existing files.

import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let PDFDocument;
try {
  const mod = await import("pdfkit");
  PDFDocument = mod.default ?? mod;
} catch {
  console.error("Missing dependency: pdfkit");
  console.error("Install with:  pnpm add -D pdfkit");
  process.exit(1);
}

const SUBJECTS = await Promise.all([
  import("./fixtures-data/biology.mjs"),
  import("./fixtures-data/chemistry.mjs"),
  import("./fixtures-data/physics.mjs"),
]).then((mods) => mods.map((m) => m.default));

const SYLLABUSES = await Promise.all([
  import("./fixtures-data/biology-syllabus.mjs"),
]).then((mods) => mods.map((m) => m.default));

const OUT_ROOT = resolve(__dirname, "..", "tests", "fixtures", "papers");
const SYLLABUS_OUT_ROOT = resolve(__dirname, "..", "tests", "fixtures", "syllabuses");

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pageRoom(doc) {
  return doc.page.height - doc.page.margins.bottom - doc.y;
}

function ensureRoom(doc, needed) {
  if (pageRoom(doc) < needed) doc.addPage();
}

function header(doc, subject, paper, schemeKind) {
  doc.font("Helvetica-Bold").fontSize(16).text(subject.subjectName, { align: "center" });
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(
      `Syllabus ${subject.syllabusCode}  ·  ${subject.level}  ·  ${paper.title}${
        schemeKind ? `  ·  ${schemeKind}` : ""
      }`,
      { align: "center" }
    );
  doc
    .fontSize(9)
    .fillColor("#666")
    .text("TEST FIXTURE — generated for StudyAI ingestion testing", { align: "center" })
    .fillColor("black");
  doc.moveDown(1.5);
}

function renderQuestionPaper(subject, paper, outPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = createWriteStream(outPath);
    doc.pipe(stream);
    stream.on("finish", resolvePromise);
    stream.on("error", rejectPromise);

    header(doc, subject, paper);

    paper.questions.forEach((q, index) => {
      const optionLines = q.type === "mcq" ? q.options.length : 0;
      const estimated = 60 + Math.ceil(q.text.length / 90) * 14 + optionLines * 14;
      ensureRoom(doc, estimated);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(`Question ${index + 1}`, { continued: true })
        .font("Helvetica")
        .text(`   [${q.marks} mark${q.marks !== 1 ? "s" : ""}]`);

      if (q.topic) {
        doc.font("Helvetica-Oblique").fontSize(9).fillColor("#666").text(q.topic).fillColor("black");
      }

      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(10).text(q.text, { align: "left" });

      if (q.type === "mcq") {
        doc.moveDown(0.3);
        q.options.forEach((option) => {
          doc.text(`${option.label})  ${option.text}`, { indent: 18 });
        });
      } else {
        doc.moveDown(0.6);
        doc
          .fillColor("#aaa")
          .text("____________________________________________________________________", {
            indent: 0,
          })
          .text("____________________________________________________________________")
          .text("____________________________________________________________________")
          .fillColor("black");
      }

      doc.moveDown(1.2);
    });

    doc.end();
  });
}

function renderMarkingScheme(subject, paper, outPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = createWriteStream(outPath);
    doc.pipe(stream);
    stream.on("finish", resolvePromise);
    stream.on("error", rejectPromise);

    header(doc, subject, paper, "Marking Scheme");

    paper.questions.forEach((q, index) => {
      const estimated = 70 + Math.ceil((q.scheme?.length ?? 0) / 90) * 14;
      ensureRoom(doc, estimated);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(`Question ${index + 1}`, { continued: true })
        .font("Helvetica")
        .text(`   [${q.marks} mark${q.marks !== 1 ? "s" : ""}]`);

      if (q.topic) {
        doc.font("Helvetica-Oblique").fontSize(9).fillColor("#666").text(q.topic).fillColor("black");
      }

      doc.moveDown(0.4);

      if (q.type === "mcq") {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(`Answer: ${q.answer}`, { indent: 0 });
        if (q.scheme) {
          doc.moveDown(0.2);
          doc.font("Helvetica").fontSize(9).fillColor("#444").text(q.scheme).fillColor("black");
        }
      } else {
        doc.font("Helvetica").fontSize(10).text(q.scheme ?? "(no marking scheme provided)");
      }

      doc.moveDown(1.2);
    });

    doc.end();
  });
}

function renderSyllabus(syllabus, outPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = createWriteStream(outPath);
    doc.pipe(stream);
    stream.on("finish", resolvePromise);
    stream.on("error", rejectPromise);

    // Cover
    doc.font("Helvetica-Bold").fontSize(20).text(`${syllabus.subjectName} Syllabus`, { align: "center" });
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Cambridge ${syllabus.subjectName} ${syllabus.syllabusCode} (${syllabus.level})`, {
        align: "center",
      });
    doc.text(`For examination ${syllabus.yearRange}`, { align: "center" });
    doc.moveDown(0.4);
    doc
      .fontSize(9)
      .fillColor("#666")
      .text("TEST FIXTURE — generated for StudyAI ingestion testing", { align: "center" })
      .fillColor("black");
    doc.moveDown(2);

    // 1. Aims
    doc.font("Helvetica-Bold").fontSize(13).text("1. Syllabus aims");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10);
    syllabus.aims.forEach((aim, i) => {
      ensureRoom(doc, 30);
      doc.text(`1.${i + 1}  ${aim}`, { indent: 16 });
      doc.moveDown(0.15);
    });
    doc.moveDown(0.8);

    // 2. Subject content
    ensureRoom(doc, 80);
    doc.font("Helvetica-Bold").fontSize(13).text("2. Subject content");
    doc.moveDown(0.4);

    syllabus.topics.forEach((topic) => {
      ensureRoom(doc, 100);
      doc.font("Helvetica-Bold").fontSize(11).text(`${topic.number}. ${topic.title}`);
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(10);
      topic.objectives.forEach((objective, i) => {
        ensureRoom(doc, 40);
        doc.text(`${topic.number}.${i + 1}  ${objective}`, { indent: 18 });
        doc.moveDown(0.1);
      });
      doc.moveDown(0.4);
    });

    // 3. Assessment overview
    ensureRoom(doc, 200);
    doc.font("Helvetica-Bold").fontSize(13).text("3. Assessment overview");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10);
    syllabus.assessment.forEach((entry) => {
      ensureRoom(doc, 38);
      doc.font("Helvetica-Bold").text(`${entry.paper} — ${entry.description}`, { indent: 16 });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#555")
        .text(`Duration: ${entry.duration}    Marks: ${entry.marks}    Weighting: ${entry.weight}`, {
          indent: 16,
        })
        .fillColor("black")
        .fontSize(10);
      doc.moveDown(0.25);
    });
    doc.moveDown(0.8);

    // 4. Command words
    ensureRoom(doc, 200);
    doc.font("Helvetica-Bold").fontSize(13).text("4. Command words");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10);
    syllabus.commandWords.forEach((entry) => {
      ensureRoom(doc, 30);
      doc.font("Helvetica-Bold").text(entry.word, { indent: 16, continued: true });
      doc.font("Helvetica").text(` — ${entry.meaning}`);
      doc.moveDown(0.15);
    });

    doc.end();
  });
}

async function main() {
  ensureDir(OUT_ROOT);
  ensureDir(SYLLABUS_OUT_ROOT);

  for (const subject of SUBJECTS) {
    const folder = join(OUT_ROOT, slug(subject.subjectName.replace(/^IGCSE\s+/, "")));
    ensureDir(folder);

    for (const paper of subject.papers) {
      const base = `${slug(paper.title)}-${slug(subject.subjectName)}`;
      const qpPath = join(folder, `${base}-qp.pdf`);
      const msPath = join(folder, `${base}-ms.pdf`);

      console.log(`Writing ${qpPath}`);
      await renderQuestionPaper(subject, paper, qpPath);

      console.log(`Writing ${msPath}`);
      await renderMarkingScheme(subject, paper, msPath);
    }
  }

  for (const syllabus of SYLLABUSES) {
    const outPath = join(SYLLABUS_OUT_ROOT, `${slug(syllabus.subjectName)}-syllabus.pdf`);
    console.log(`Writing ${outPath}`);
    await renderSyllabus(syllabus, outPath);
  }

  console.log("\nDone. Papers in tests/fixtures/papers/, syllabuses in tests/fixtures/syllabuses/");
}

main().catch((error) => {
  console.error("\nFixture generation failed:", error);
  process.exit(1);
});
