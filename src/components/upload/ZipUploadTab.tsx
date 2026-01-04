"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

interface ZipUploadTabProps {
  isLoading: boolean;
  onUpload: (file: File) => Promise<void>;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function ZipUploadTab({ isLoading, onUpload }: ZipUploadTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".zip")) {
        setUploadedFile(file);
        setFileError(null);
      } else {
        setFileError("Please upload a ZIP file");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".zip")) {
        setUploadedFile(file);
        setFileError(null);
      } else {
        setFileError("Please upload a ZIP file");
      }
    }
  };

  const handleSubmit = async () => {
    if (uploadedFile) {
      await onUpload(uploadedFile);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <input
          id="file-upload"
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadedFile ? (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
              {uploadedFile.name}
            </p>
            <p className="text-sm text-zinc-500">
              {formatFileSize(uploadedFile.size)}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadedFile(null);
              }}
              className="mt-2 text-sm text-red-500 hover:text-red-600"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-primary">Click to upload</span>{" "}
              or drag and drop
            </p>
            <p className="text-xs text-zinc-500">ZIP files only (max 50MB)</p>
          </div>
        )}
      </div>

      {fileError && (
        <p className="text-sm text-red-500">{fileError}</p>
      )}

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!uploadedFile || isLoading}
      >
        {isLoading ? (
          <>
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </>
        ) : (
          "Scan Codebase"
        )}
      </Button>
    </div>
  );
}
