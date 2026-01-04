"use client";

import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AnalysisResult } from "./types";

interface FindingsChartProps {
  result: AnalysisResult;
}

export function FindingsChart({ result }: FindingsChartProps) {
  // Aggregate data from all security reports
  const totals = result.securityReports.reduce(
    (acc, report) => ({
      implemented: acc.implemented + report.implemented.length,
      missing: acc.missing + report.missing.length,
      autoHandled: acc.autoHandled + report.auto_handled.length,
      vulnerabilities: acc.vulnerabilities + (report.vulnerabilities?.length || 0),
    }),
    { implemented: 0, missing: 0, autoHandled: 0, vulnerabilities: 0 }
  );

  const total = totals.implemented + totals.missing + totals.autoHandled + totals.vulnerabilities;

  // Don't render if no data
  if (total === 0) {
    return null;
  }

  const chartData = [
    {
      category: "implemented",
      count: totals.implemented,
      fill: "var(--color-implemented)",
    },
    {
      category: "missing",
      count: totals.missing,
      fill: "var(--color-missing)",
    },
    {
      category: "autoHandled",
      count: totals.autoHandled,
      fill: "var(--color-autoHandled)",
    },
    {
      category: "vulnerabilities",
      count: totals.vulnerabilities,
      fill: "var(--color-vulnerabilities)",
    },
  ].filter((item) => item.count > 0); // Only show categories with data

  const chartConfig = {
    count: {
      label: "Count",
    },
    implemented: {
      label: "Implemented",
      color: "hsl(160, 84%, 39%)", // emerald-500
    },
    missing: {
      label: "Missing",
      color: "hsl(25, 95%, 53%)", // orange-500
    },
    autoHandled: {
      label: "Auto-Handled",
      color: "hsl(199, 89%, 48%)", // sky-500
    },
    vulnerabilities: {
      label: "Vulnerabilities",
      color: "hsl(346, 77%, 50%)", // rose-500
    },
  } satisfies ChartConfig;

  // Helper to get color from chart config
  const getColor = (category: string): string => {
    const config = chartConfig[category as keyof typeof chartConfig];
    return "color" in config ? config.color : "";
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-base">Security Controls Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[200px] w-full"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="category"
              innerRadius={40}
              outerRadius={80}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-wrap justify-center gap-3 px-4 pb-4 text-xs">
        {chartData.map((item) => (
          <div key={item.category} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getColor(item.category) }}
            />
            <span className="text-zinc-600 dark:text-zinc-400">
              {chartConfig[item.category as keyof typeof chartConfig]?.label}: {item.count}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
