"use client";

import { FormEvent, useMemo, useState } from "react";

type ApiResponse = {
  cover_letter?: string;
  prompt?: string;
};

export default function Home() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [todaysDate, setTodaysDate] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [resultText, setResultText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const hasResult = useMemo(() => resultText.trim().length > 0, [resultText]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setCopied(false);

    if (!resumeFile) {
      setError("Please upload your resume as a PDF.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("job_description", jobDescription);
    formData.append("company_name", companyName);
    formData.append("todays_date", todaysDate);
    formData.append("job_location", jobLocation);

    try {
      setIsLoading(true);
      setResultText("");

      const response = await fetch("http://localhost:8000/generate", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ApiResponse & { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate cover letter.");
      }

      const generatedText = data.cover_letter || data.prompt;
      if (!generatedText) {
        throw new Error("The API response did not include generated content.");
      }

      setResultText(generatedText);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!hasResult) return;

    // Use CDN-hosted library to avoid backend/runtime coupling.
    const { jsPDF } = (await import(/* webpackIgnore: true */ "https://esm.sh/jspdf@2.5.1")) as {
      jsPDF: new (options: { unit: string; format: string }) => {
        internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
        setFont: (fontName: string, style: string) => void;
        setFontSize: (size: number) => void;
        splitTextToSize: (text: string, maxWidth: number) => string[];
        addPage: () => void;
        text: (text: string, x: number, y: number) => void;
        save: (filename: string) => void;
      };
    };

    const pdf = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    const margin = 48;
    const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const lines = resultText.split("\n");

    let cursorY = margin;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);

    lines.forEach((line) => {
      const wrappedLines = pdf.splitTextToSize(line || " ", maxWidth) as string[];

      wrappedLines.forEach((wrappedLine) => {
        if (cursorY > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          cursorY = margin;
        }

        pdf.text(wrappedLine, margin, cursorY);
        cursorY += 18;
      });
    });

    pdf.save(`${companyName.replace(/\s+/g, "-")}-cover-letter.pdf`);
  };

  const handleDownloadDocx = async () => {
    if (!hasResult) return;

    const { Document, Packer, Paragraph, TextRun } = (await import(
      /* webpackIgnore: true */ "https://esm.sh/docx@9.5.1"
    )) as {
      Document: new (input: {
        sections: { properties: Record<string, never>; children: unknown[] }[];
      }) => unknown;
      Packer: { toBlob: (doc: unknown) => Promise<Blob> };
      Paragraph: new (input: { children: unknown[]; spacing: { after: number } }) => unknown;
      TextRun: new (text: string) => unknown;
    };

    const paragraphs = resultText.split("\n").map(
      (line) =>
        new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 180 },
        }),
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${companyName.replace(/\s+/g, "-")}-cover-letter.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!hasResult) return;

    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Unable to copy to clipboard in this browser.");
    }
  };

  return (
    <div
      className={`min-h-screen px-4 py-10 transition-colors ${
        isDarkMode
          ? "bg-slate-950 text-slate-100"
          : "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 text-slate-900"
      }`}
    >
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section
          className={`rounded-2xl border p-6 shadow-xl backdrop-blur sm:p-8 ${
            isDarkMode
              ? "border-slate-800 bg-slate-900/90 shadow-slate-950/50"
              : "border-white/60 bg-white/90"
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Cover Letter Generator</h1>
              <p className={`mt-2 text-sm sm:text-base ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Upload your resume and provide the job details to generate a tailored cover letter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                isDarkMode
                  ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                  : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              {isDarkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Resume PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                className={`w-full rounded-lg border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:px-3 file:py-2 ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-900 file:bg-slate-700 file:text-slate-100 hover:file:bg-slate-600"
                    : "border-slate-300 bg-white file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300"
                }`}
                required
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Company Name</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="e.g. Google"
                  className={`rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                    isDarkMode
                      ? "border-slate-700 bg-slate-900 focus:border-slate-500"
                      : "border-slate-300 bg-white focus:border-slate-500"
                  }`}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Today&apos;s Date (optional)</span>
                <input
                  type="date"
                  value={todaysDate}
                  onChange={(event) => setTodaysDate(event.target.value)}
                  className={`rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                    isDarkMode
                      ? "border-slate-700 bg-slate-900 focus:border-slate-500"
                      : "border-slate-300 bg-white focus:border-slate-500"
                  }`}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Job Location (optional)</span>
              <input
                type="text"
                value={jobLocation}
                onChange={(event) => setJobLocation(event.target.value)}
                placeholder="e.g. San Francisco, CA"
                className={`rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-900 focus:border-slate-500"
                    : "border-slate-300 bg-white focus:border-slate-500"
                }`}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Job Description</span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the full job description here..."
                rows={8}
                className={`rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-900 focus:border-slate-500"
                    : "border-slate-300 bg-white focus:border-slate-500"
                }`}
                required
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                "Generate Cover Letter"
              )}
            </button>
          </form>

          {error && (
            <p
              className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                isDarkMode
                  ? "border-red-900/70 bg-red-950/60 text-red-300"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {error}
            </p>
          )}
        </section>

        {hasResult && (
          <section
            className={`rounded-2xl border p-6 shadow-xl sm:p-8 ${
              isDarkMode ? "border-slate-800 bg-slate-900" : "border-white/60 bg-white"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold">Generated Cover Letter</h2>
              <button
                type="button"
                onClick={handleCopy}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  isDarkMode
                    ? "border-slate-700 hover:bg-slate-800"
                    : "border-slate-300 hover:bg-slate-100"
                }`}
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>

            <article
              className={`mt-4 rounded-xl border p-4 text-sm leading-7 whitespace-pre-wrap ${
                isDarkMode
                  ? "border-slate-800 bg-slate-950/70 text-slate-100"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              {resultText}
            </article>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Download as PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadDocx}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  isDarkMode
                    ? "border-slate-700 hover:bg-slate-800"
                    : "border-slate-300 hover:bg-slate-100"
                }`}
              >
                Download as DOCX
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
