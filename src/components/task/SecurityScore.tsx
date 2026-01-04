"use client";

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { AnalysisResult } from "./types";

interface SecurityScoreProps {
  result: AnalysisResult;
}

/**
 * Security Score Calculation Schema (0-100)
 * ==========================================
 * 
 * The score starts at 100 and deductions are made based on findings:
 * 
 * 1. VULNERABILITY PENALTIES (max -50 points):
 *    - Critical vulnerability: -15 points each
 *    - High vulnerability: -10 points each
 *    - Medium vulnerability: -5 points each
 *    - Low vulnerability: -2 points each
 * 
 * 2. MISSING CONTROL PENALTIES (max -40 points):
 *    - Critical missing control: -8 points each
 *    - High missing control: -5 points each
 *    - Medium missing control: -3 points each
 *    - Low missing control: -1 point each
 * 
 * 3. IMPLEMENTATION BONUS (max +10 points):
 *    - If >80% of controls are implemented/auto-handled: +10 points
 *    - If >60% of controls are implemented/auto-handled: +5 points
 *    - If >40% of controls are implemented/auto-handled: +2 points
 * 
 * Score Grades:
 *    - 90-100: Excellent (A) - Green
 *    - 80-89:  Good (B) - Light Green
 *    - 70-79:  Fair (C) - Yellow
 *    - 60-69:  Poor (D) - Orange
 *    - 0-59:   Critical (F) - Red
 * 
 * Minimum score is 0.
 */
function calculateSecurityScore(result: AnalysisResult): {
  score: number;
  grade: string;
  color: string;
  chartColor: string;
  breakdown: {
    vulnerabilityPenalty: number;
    missingControlPenalty: number;
    implementationBonus: number;
  };
} {
  let score = 100;
  let vulnerabilityPenalty = 0;
  let missingControlPenalty = 0;
  let implementationBonus = 0;

  // Count totals for implementation ratio
  let totalControls = 0;
  let implementedOrAutoHandled = 0;

  for (const report of result.securityReports) {
    // Vulnerability penalties
    for (const vuln of report.vulnerabilities || []) {
      switch (vuln.severity) {
        case "critical":
          vulnerabilityPenalty += 15;
          break;
        case "high":
          vulnerabilityPenalty += 10;
          break;
        case "medium":
          vulnerabilityPenalty += 5;
          break;
        case "low":
          vulnerabilityPenalty += 2;
          break;
      }
    }

    // Missing control penalties
    for (const missing of report.missing) {
      switch (missing.severity) {
        case "critical":
          missingControlPenalty += 8;
          break;
        case "high":
          missingControlPenalty += 5;
          break;
        case "medium":
          missingControlPenalty += 3;
          break;
        case "low":
          missingControlPenalty += 1;
          break;
      }
    }

    // Count for implementation ratio
    totalControls += report.implemented.length + report.missing.length + report.auto_handled.length;
    implementedOrAutoHandled += report.implemented.length + report.auto_handled.length;
  }

  // Cap penalties
  vulnerabilityPenalty = Math.min(vulnerabilityPenalty, 50);
  missingControlPenalty = Math.min(missingControlPenalty, 40);

  // Calculate implementation bonus
  if (totalControls > 0) {
    const implementationRatio = implementedOrAutoHandled / totalControls;
    if (implementationRatio > 0.8) {
      implementationBonus = 10;
    } else if (implementationRatio > 0.6) {
      implementationBonus = 5;
    } else if (implementationRatio > 0.4) {
      implementationBonus = 2;
    }
  }

  // Calculate final score
  score = score - vulnerabilityPenalty - missingControlPenalty + implementationBonus;
  score = Math.max(0, Math.min(100, score)); // Clamp between 0-100

  // Determine grade and colors
  let grade: string;
  let color: string;
  let chartColor: string;

  if (score >= 90) {
    grade = "A";
    color = "text-emerald-500";
    chartColor = "hsl(160, 84%, 39%)";
  } else if (score >= 80) {
    grade = "B";
    color = "text-green-500";
    chartColor = "hsl(142, 71%, 45%)";
  } else if (score >= 70) {
    grade = "C";
    color = "text-yellow-500";
    chartColor = "hsl(48, 96%, 53%)";
  } else if (score >= 60) {
    grade = "D";
    color = "text-orange-500";
    chartColor = "hsl(25, 95%, 53%)";
  } else {
    grade = "F";
    color = "text-red-500";
    chartColor = "hsl(0, 84%, 60%)";
  }

  return {
    score: Math.round(score),
    grade,
    color,
    chartColor,
    breakdown: {
      vulnerabilityPenalty,
      missingControlPenalty,
      implementationBonus,
    },
  };
}

export function SecurityScore({ result }: SecurityScoreProps) {
  // Don't render if no security reports
  if (!result.securityReports || result.securityReports.length === 0) {
    return null;
  }

  const { score, grade, color, chartColor, breakdown } = calculateSecurityScore(result);

  const chartData = [{ score, fill: chartColor }];

  const chartConfig = {
    score: {
      label: "Score",
    },
  } satisfies ChartConfig;

  // Calculate end angle based on score (0-100 maps to 0-360)
  const endAngle = (score / 100) * 360;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-base">Security Score</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[200px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={endAngle}
            innerRadius={70}
            outerRadius={100}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[76, 64]}
            />
            <RadialBar dataKey="score" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 8}
                          className="fill-foreground text-4xl font-bold tracking-tight"
                        >
                          {score}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-muted-foreground text-sm font-medium"
                        >
                          out of 100
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
        <div className="text-center">
          <span className={`text-lg font-semibold ${color}`}>
            Grade {grade}
          </span>
          <span className="ml-2 text-sm text-muted-foreground">
            {score >= 90 ? "Excellent" : score >= 80 ? "Good" : score >= 70 ? "Fair" : score >= 60 ? "Poor" : "Critical"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-1.5 px-6 pt-0 text-sm">
        {breakdown.vulnerabilityPenalty > 0 && (
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Vulnerability penalty</span>
            <span className="font-medium text-red-500">−{breakdown.vulnerabilityPenalty}</span>
          </div>
        )}
        {breakdown.missingControlPenalty > 0 && (
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Missing controls</span>
            <span className="font-medium text-orange-500">−{breakdown.missingControlPenalty}</span>
          </div>
        )}
        {breakdown.implementationBonus > 0 && (
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground">Implementation bonus</span>
            <span className="font-medium text-emerald-500">+{breakdown.implementationBonus}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
