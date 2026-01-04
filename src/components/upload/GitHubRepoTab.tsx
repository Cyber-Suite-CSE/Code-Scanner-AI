"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GitHubRepoTabProps {
  isLoading: boolean;
  onFetch: (repoUrl: string, patToken?: string) => Promise<void>;
}

export function GitHubRepoTab({ isLoading, onFetch }: GitHubRepoTabProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [patToken, setPatToken] = useState("");

  const handleSubmit = async () => {
    if (repoUrl) {
      await onFetch(repoUrl, patToken || undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="repo-url">Repository URL</Label>
        <Input
          id="repo-url"
          type="url"
          placeholder="https://github.com/username/repository"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        <p className="text-xs text-zinc-500">
          Enter the full URL of your GitHub repository
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pat-token">
          Personal Access Token (PAT)
          <span className="ml-1 text-xs font-normal text-zinc-400">
            — optional for public repos
          </span>
        </Label>
        <Input
          id="pat-token"
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={patToken}
          onChange={(e) => setPatToken(e.target.value)}
        />
        <p className="text-xs text-zinc-500">
          Required for private repositories. Generate a token with repo access at{" "}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub Settings
          </a>
        </p>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!repoUrl || isLoading}
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
            Fetching...
          </>
        ) : (
          "Fetch & Scan Repository"
        )}
      </Button>
    </div>
  );
}
