"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/Dropzone";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type AnalyseResponse = {
  paperId?: string;
  paperIds?: string[];
  questionsExtracted?: number;
  error?: string;
};

export default function UploadPage() {
  const [syllabusCode, setSyllabusCode] = useState("");
  const [year, setYear] = useState("");
  const [level, setLevel] = useState("IGCSE");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paperIds, setPaperIds] = useState<string[]>([]);

  const viewQuestionsHref = useMemo(() => {
    return paperIds[0] ? `/papers/${paperIds[0]}` : null;
  }, [paperIds]);

  function handleFilesAccepted(pickedFiles: File[]) {
    setError(null);
    setSuccessMessage(null);
    setPaperIds([]);

    if (pickedFiles.length > 10) {
      setFiles([]);
      setSelectedFilenames([]);
      setError("You can upload up to 10 PDF files at once.");
      return;
    }

    const hasNonPdf = pickedFiles.some((pickedFile) => pickedFile.type !== "application/pdf");
    if (hasNonPdf) {
      setFiles([]);
      setSelectedFilenames([]);
      setError("Only PDF files are allowed.");
      return;
    }

    setFiles(pickedFiles);
    setSelectedFilenames(pickedFiles.map((pickedFile) => pickedFile.name));
  }

  function handleFilesRejected() {
    setFiles([]);
    setSelectedFilenames([]);
    setError("Only PDF files are allowed (max 10).");
  }

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setPaperIds([]);

    if (files.length === 0) {
      setError("Please select at least one PDF file before submitting.");
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

      const data = (await response.json()) as AnalyseResponse;

      if (!response.ok) {
        setError(data.error ?? "Upload failed. Please try again.");
        return;
      }

      const extractedCount = data.questionsExtracted ?? 0;
      const returnedIds = data.paperIds ?? (data.paperId ? [data.paperId] : []);
      setSuccessMessage(`Done! ${extractedCount} questions extracted from your upload.`);
      setPaperIds(returnedIds);
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
          <h1 className="font-serif text-2xl font-semibold text-text">Upload a Past Paper</h1>
          <p className="mt-1 text-sm text-text-muted">
            Enter a syllabus code, select up to 10 PDFs, and let AI extract the questions.
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

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-text" htmlFor="syllabusCode">
                Syllabus Code
              </label>
              <Input
                id="syllabusCode"
                value={syllabusCode}
                onChange={(e) => setSyllabusCode(e.target.value)}
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
                onChange={(e) => setYear(e.target.value)}
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
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="IGCSE">IGCSE</option>
                <option value="AS-Level">AS-Level</option>
                <option value="A-Level">A-Level</option>
              </select>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-text">PDF Files</span>
              <Dropzone
                accept={{ "application/pdf": [".pdf"] }}
                multiple
                maxFiles={10}
                onFilesAccepted={handleFilesAccepted}
                onFilesRejected={handleFilesRejected}
                label="Drop PDFs here, or click to browse"
                hint="Up to 10 PDF files"
              />
              {selectedFilenames.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-text-muted">
                  {selectedFilenames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Uploading and analysing with AI..." : "Upload and Analyse"}
            </Button>
          </form>

          {viewQuestionsHref && (
            <div className="mt-4">
              <Link
                href={viewQuestionsHref}
                className="text-sm font-medium text-accent hover:underline"
              >
                View your questions →
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
