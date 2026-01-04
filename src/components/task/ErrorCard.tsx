"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorCardProps {
  error: string;
}

export function ErrorCard({ error }: ErrorCardProps) {
  return (
    <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
      <CardHeader>
        <CardTitle className="text-lg text-red-800 dark:text-red-200">
          Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </CardContent>
    </Card>
  );
}
