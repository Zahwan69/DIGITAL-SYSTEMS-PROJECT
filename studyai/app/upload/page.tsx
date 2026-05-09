"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FileRejection } from "react-dropzone";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/Dropzone";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type AnalyseResponse = {
  paperId?: string;
  paperIds?: string[];
  questionsExtracted?: number;
  diagramWarnings?: string[];
  error?: string;
};

export default function UploadPage() {
  const [syllabusCode, setSyllabusCode] = useState("");
  const [year, setYear] = useState("");
  const [level, setLevel] = useState("IGCSE");
  const [files, setFiles] = useState<File[]>([]);
  const [markSchemeFiles, setMarkSchemeFiles] = useState<File[]>([]);
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);
  const [selectedMarkSchemeFilenames, setSelectedMarkSchemeFilenames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paperIds, setPaperIds] = useState<string[]>([]);
  const [diagramWarnings, setDiagramWarnings] = useState<string[]>([]);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  const viewQuestionsHref = useMemo(() => {
    return paperIds[0] ? `/papers/${paperIds[0]}` : null;
  }, [paperIds]);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("returnTo");
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      setReturnTo(null);
      return;
    }
    setReturnTo(value);
  }, []);

  function clearOutcome() {
    setError(null);
    setSuccessMessage(null);
    setPaperIds([]);
    setDiagramWarnings([]);
  }

  function isPdfFile(file: File) {
    if (/\.pdf$/i.test(file.name)) return true;
    if (!file.type) return false;
    return /pdf/i.test(file.type);
  }

  function rejectedMessage(rejections: FileRejection[], label: string) {
    if (rejections.length === 0) {
      return `Only PDF ${label} files are allowed.`;
    }

    const codes = new Set(rejections.flatMap((r) => r.errors.map((e) => e.code)));
    if (codes.has("too-many-files")) {
      return `Up to 10 ${label} PDFs at a time.`;
    }
    if (codes.has("file-invalid-type")) {
      const names = rejections.map((r) => r.file.name).slice(0, 3).join(", ");
      return `These files aren't PDFs: ${names}`;
    }
    return rejections[0]?.errors[0]?.message ?? "Files were rejected.";
  }

  function handleFilesAccepted(pickedFiles: File[]) {
    clearOutcome();

    if (pickedFiles.length > 10) {
      setFiles([]);
      setSelectedFilenames([]);
      setError("You can upload up to 10 question paper PDF files at once.");
      return;
    }

    const nonPdf = pickedFiles.find((file) => !isPdfFile(file));
    if (nonPdf) {
      setFiles([]);
      setSelectedFilenames([]);
      setError(`"${nonPdf.name}" is not a PDF. Only PDF files are allowed.`);
      return;
    }

    setFiles(pickedFiles);
    setSelectedFilenames(pickedFiles.map((pickedFile) => pickedFile.name));
  }

  function handleMarkSchemeFilesAccepted(pickedFiles: File[]) {
    clearOutcome();

    if (pickedFiles.length > 10) {
      setMarkSchemeFiles([]);
      setSelectedMarkSchemeFilenames([]);
      setError("You can upload up to 10 mark scheme PDF files at once.");
      return;
    }

    const nonPdf = pickedFiles.find((file) => !isPdfFile(file));
    if (nonPdf) {
      setMarkSchemeFiles([]);
      setSelectedMarkSchemeFilenames([]);
      setError(`"${nonPdf.name}" is not a PDF. Only PDF files are allowed.`);
      return;
    }

    setMarkSchemeFiles(pickedFiles);
    setSelectedMarkSchemeFilenames(pickedFiles.map((pickedFile) => pickedFile.name));
  }

  function handleFilesRejected(rejections: FileRejection[]) {
    setFiles([]);
    setSelectedFilenames([]);
    setError(rejectedMessage(rejections, "question paper"));
  }

  function handleMarkSchemeFilesRejected(rejections: FileRejection[]) {
    setMarkSchemeFiles([]);
    setSelectedMarkSchemeFilenames([]);
    setError(rejectedMessage(rejections, "mark scheme"));
  }

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    clearOutcome();

    if (files.length === 0) {
      setError("Please select at least one question paper PDF before submitting.");
      return;
    }

    if (markSchemeFiles.length > 1 && markSchemeFiles.length !== files.length) {
      setError(
        "Upload one mark scheme for all question papers, or one mark scheme for each question paper."
      );
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("syllabusCode", syllabusCode);
    if (year) formData.append("year", year);
    formData.append("level", level);
    files.forEach((file) => {
      formData.append("files", file);
    });
    markSchemeFiles.forEach((file) => {
      formData.append("markSchemeFiles", file);
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Please sign in again before uploading.");
        return;
      }

      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as AnalyseResponse;

      if (!response.ok) {
        setError(data.error ?? "Upload analysis failed. Please try again with a clear PDF.");
        return;
      }

      const extractedCount = data.questionsExtracted ?? 0;
      const returnedIds = data.paperIds ?? (data.paperId ? [data.paperId] : []);
      setSuccessMessage(
        extractedCount > 0
          ? `Done. ${extractedCount} questions were created from your upload.`
          : "Analysis finished, but no questions were extracted. Try another question paper PDF or check the parser output."
      );
      setPaperIds(returnedIds);
      setDiagramWarnings(data.diagramWarnings ?? []);
    } catch {
      setError("Network error while uploading. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-start">
        <div className="w-full rounded-lg border border-border bg-surface p-5 sm:p-6">
          <h1 className="font-serif text-2xl font-semibold text-text">Upload QP and MS</h1>
          <p className="mt-1 text-sm text-text-muted">
            Enter a syllabus code and upload a question paper. Add the mark scheme in the same form when you have it.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-border bg-accent-soft px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-lg border border-border bg-accent-soft px-3 py-2 text-sm text-success">
              {successMessage}
            </div>
          )}

          {diagramWarnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text-muted">
              <p className="font-medium text-text">Some diagrams could not be saved:</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {diagramWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                Question text was still extracted. Check that the{" "}
                <code className="rounded bg-surface px-1">question-images</code> bucket exists in Supabase Storage and is public.
              </p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-text" htmlFor="syllabusCode">
                Syllabus Code
              </label>
              <Input
                id="syllabusCode"
                value={syllabusCode}
                onChange={(event) => setSyllabusCode(event.target.value)}
                placeholder="0580"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text" htmlFor="year">
                Year <span className="text-text-muted">(optional)</span>
              </label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="e.g. 2023"
                min={2000}
                max={2030}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text" htmlFor="level">
                Level <span className="text-text-muted">(optional)</span>
              </label>
              <select
                id="level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="IGCSE">IGCSE</option>
                <option value="AS-Level">AS-Level</option>
                <option value="A-Level">A-Level</option>
              </select>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-text">Question Paper PDFs</span>
              <Dropzone
                multiple
                maxFiles={10}
                onFilesAccepted={handleFilesAccepted}
                onFilesRejected={handleFilesRejected}
                inputProps={{ accept: ".pdf,application/pdf" }}
                label="Drop question paper PDFs here, or click to browse"
                hint="Required. Upload one or more question paper PDFs."
              />
              {selectedFilenames.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-text-muted">
                  {selectedFilenames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-text">
                Mark Scheme PDFs <span className="text-text-muted">(optional)</span>
              </span>
              <Dropzone
                multiple
                maxFiles={10}
                onFilesAccepted={handleMarkSchemeFilesAccepted}
                onFilesRejected={handleMarkSchemeFilesRejected}
                inputProps={{ accept: ".pdf,application/pdf" }}
                label="Drop mark scheme PDFs here, or click to browse"
                hint="Use one mark scheme for all papers, or upload the same number as question papers to pair by order."
              />
              {selectedMarkSchemeFilenames.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-text-muted">
                  {selectedMarkSchemeFilenames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Uploading and creating question cards..." : "Create Question Cards from QP/MS"}
            </Button>
          </form>

          {(viewQuestionsHref || returnTo) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {viewQuestionsHref && (
                <Link
                  href={viewQuestionsHref}
                  className="text-sm font-medium text-text hover:underline"
                >
                  View your questions
                </Link>
              )}
              {returnTo && (
                <Link
                  href={returnTo}
                  className="text-sm font-medium text-text hover:underline"
                >
                  Back to assignment
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
