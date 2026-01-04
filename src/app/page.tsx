"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SuccessResult,
  ErrorMessage,
  ZipUploadTab,
  GitHubRepoTab,
  ApiResponse,
} from "@/components/upload";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const handleZipUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-zip", {
        method: "POST",
        body: formData,
      });

      const data: ApiResponse = await response.json();

      if (!data.success) {
        setError(data.error || data.message || "Failed to process ZIP file");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubFetch = async (repoUrl: string, patToken?: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/fetch-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl,
          patToken,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!data.success) {
        setError(data.error || data.message || "Failed to fetch repository");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setError(null);
    setResult(null);
  };

  const handleStartAnalysis = async () => {
    if (!result?.files || !result.framework) return;

    setIsStartingAnalysis(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: result.files,
          framework: result.framework,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to start analysis");
      } else {
        // Redirect to the task page
        router.push(`/task/${data.jobId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start analysis");
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 font-sans dark:bg-black">
      <main className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            🛡️ Code Scanner AI
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            AI-powered security analysis for your codebase
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
            Powered by multi-agent AI • OWASP mapped • Framework aware
          </p>
        </div>

        {/* Success Result */}
        {result && result.success && (
          <SuccessResult
            result={result}
            isStartingAnalysis={isStartingAnalysis}
            onStartAnalysis={handleStartAnalysis}
            onReset={resetState}
          />
        )}

        {/* Error Message */}
        {error && (
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Upload Your Codebase</CardTitle>
            <CardDescription>
              Choose how you want to provide your code for scanning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="github" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="github">GitHub Repository</TabsTrigger>
                <TabsTrigger value="zip">Upload ZIP File</TabsTrigger>
              </TabsList>

              <TabsContent value="zip" className="mt-6">
                <ZipUploadTab isLoading={isLoading} onUpload={handleZipUpload} />
              </TabsContent>

              <TabsContent value="github" className="mt-6">
                <GitHubRepoTab isLoading={isLoading} onFetch={handleGitHubFetch} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Your code is analyzed securely and never stored permanently •{" "}
          <a
            href="https://github.com/kavienanj/code-scanner-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Open Source
          </a>
        </p>
      </main>
    </div>
  );
}
