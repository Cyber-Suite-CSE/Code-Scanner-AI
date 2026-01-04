"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CancelledCard() {
  return (
    <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="text-lg text-orange-800 dark:text-orange-200">
          Analysis Cancelled
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-orange-700 dark:text-orange-300">
          The analysis was terminated by user request.
        </p>
      </CardContent>
    </Card>
  );
}
