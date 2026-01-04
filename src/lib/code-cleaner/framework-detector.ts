import { Framework, FrameworkDetectionResult, FileEntry } from "./types";

interface FrameworkIndicator {
  framework: Framework;
  weight: number;
  reason: string;
}

/**
 * Detects the framework used in a codebase based on file contents and structure
 */
export function detectFramework(files: FileEntry[]): FrameworkDetectionResult {
  const indicators: FrameworkIndicator[] = [];
  
  // Create a map for quick file lookup
  const fileMap = new Map<string, FileEntry>();
  const fileNames = new Set<string>();
  
  for (const file of files) {
    const fileName = file.path.split("/").pop()?.toLowerCase() || "";
    fileMap.set(file.path.toLowerCase(), file);
    fileNames.add(fileName);
  }

  // Check for package.json (Node.js projects)
  const packageJsonFile = findFile(fileMap, "package.json");
  if (packageJsonFile) {
    try {
      const packageJson = JSON.parse(packageJsonFile.content);
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Next.js detection
      if (deps["next"]) {
        indicators.push({
          framework: "nextjs",
          weight: 10,
          reason: "next package found in package.json",
        });
      }

      // Express detection
      if (deps["express"]) {
        indicators.push({
          framework: "express",
          weight: 10,
          reason: "express package found in package.json",
        });
      }

      // Fastify detection
      if (deps["fastify"]) {
        indicators.push({
          framework: "fastify",
          weight: 10,
          reason: "fastify package found in package.json",
        });
      }

      // NestJS detection
      if (deps["@nestjs/core"] || deps["@nestjs/common"]) {
        indicators.push({
          framework: "nestjs",
          weight: 10,
          reason: "@nestjs packages found in package.json",
        });
      }

    } catch {
      // Invalid JSON, continue with other checks
    }
  }

  // Check for Next.js config files
  if (
    fileNames.has("next.config.js") ||
    fileNames.has("next.config.mjs") ||
    fileNames.has("next.config.ts")
  ) {
    indicators.push({
      framework: "nextjs",
      weight: 8,
      reason: "next.config file found",
    });
  }

  // Check for NestJS config
  if (fileNames.has("nest-cli.json")) {
    indicators.push({
      framework: "nestjs",
      weight: 8,
      reason: "nest-cli.json found",
    });
  }

  // Check for Spring Boot (pom.xml or build.gradle)
  const pomXmlFile = findFile(fileMap, "pom.xml");
  if (pomXmlFile) {
    if (
      pomXmlFile.content.includes("spring-boot") ||
      pomXmlFile.content.includes("org.springframework.boot")
    ) {
      indicators.push({
        framework: "springboot",
        weight: 10,
        reason: "Spring Boot dependency found in pom.xml",
      });
    }
  }

  const buildGradleFile = findFile(fileMap, "build.gradle") || findFile(fileMap, "build.gradle.kts");
  if (buildGradleFile) {
    if (
      buildGradleFile.content.includes("spring-boot") ||
      buildGradleFile.content.includes("org.springframework.boot")
    ) {
      indicators.push({
        framework: "springboot",
        weight: 10,
        reason: "Spring Boot dependency found in build.gradle",
      });
    }
  }

  // Check for Flask/Django (requirements.txt or pyproject.toml)
  const requirementsFile = findFile(fileMap, "requirements.txt");
  if (requirementsFile) {
    const content = requirementsFile.content.toLowerCase();
    
    if (content.includes("flask")) {
      indicators.push({
        framework: "flask",
        weight: 10,
        reason: "Flask found in requirements.txt",
      });
    }
    
    if (content.includes("django")) {
      indicators.push({
        framework: "django",
        weight: 10,
        reason: "Django found in requirements.txt",
      });
    }
  }

  const pyprojectFile = findFile(fileMap, "pyproject.toml");
  if (pyprojectFile) {
    const content = pyprojectFile.content.toLowerCase();
    
    if (content.includes("flask")) {
      indicators.push({
        framework: "flask",
        weight: 10,
        reason: "Flask found in pyproject.toml",
      });
    }
    
    if (content.includes("django")) {
      indicators.push({
        framework: "django",
        weight: 10,
        reason: "Django found in pyproject.toml",
      });
    }
  }

  // Check for Django-specific files
  if (fileNames.has("manage.py")) {
    // Check if it's a Django manage.py
    const managePyFile = findFile(fileMap, "manage.py");
    if (managePyFile && managePyFile.content.includes("django")) {
      indicators.push({
        framework: "django",
        weight: 8,
        reason: "Django manage.py found",
      });
    }
  }

  // Check for Flask app patterns
  for (const file of files) {
    if (file.path.endsWith(".py")) {
      if (
        file.content.includes("from flask import") ||
        file.content.includes("import flask")
      ) {
        indicators.push({
          framework: "flask",
          weight: 5,
          reason: `Flask import found in ${file.path}`,
        });
        break;
      }
    }
  }

  // Check for Express patterns in JS/TS files
  for (const file of files) {
    if (file.path.endsWith(".js") || file.path.endsWith(".ts")) {
      if (
        file.content.includes("require('express')") ||
        file.content.includes('require("express")') ||
        file.content.includes("from 'express'") ||
        file.content.includes('from "express"')
      ) {
        indicators.push({
          framework: "express",
          weight: 5,
          reason: `Express import found in ${file.path}`,
        });
        break;
      }
    }
  }

  // Check for Fastify patterns in JS/TS files
  for (const file of files) {
    if (file.path.endsWith(".js") || file.path.endsWith(".ts")) {
      if (
        file.content.includes("require('fastify')") ||
        file.content.includes('require("fastify")') ||
        file.content.includes("from 'fastify'") ||
        file.content.includes('from "fastify"')
      ) {
        indicators.push({
          framework: "fastify",
          weight: 5,
          reason: `Fastify import found in ${file.path}`,
        });
        break;
      }
    }
  }

  // Check for Spring annotations in Java files
  for (const file of files) {
    if (file.path.endsWith(".java")) {
      if (
        file.content.includes("@SpringBootApplication") ||
        file.content.includes("@RestController") ||
        file.content.includes("@Controller") ||
        file.content.includes("import org.springframework")
      ) {
        indicators.push({
          framework: "springboot",
          weight: 5,
          reason: `Spring annotation found in ${file.path}`,
        });
        break;
      }
    }
  }

  // Calculate scores for each framework
  const scores = new Map<Framework, number>();
  const reasons = new Map<Framework, string[]>();

  for (const indicator of indicators) {
    const currentScore = scores.get(indicator.framework) || 0;
    scores.set(indicator.framework, currentScore + indicator.weight);
    
    const currentReasons = reasons.get(indicator.framework) || [];
    currentReasons.push(indicator.reason);
    reasons.set(indicator.framework, currentReasons);
  }

  // Find the framework with the highest score
  let detectedFramework: Framework = "unknown";
  let highestScore = 0;

  for (const [framework, score] of scores) {
    if (score > highestScore) {
      highestScore = score;
      detectedFramework = framework;
    }
  }

  // Determine confidence based on score
  let confidence: "high" | "medium" | "low" = "low";
  if (highestScore >= 15) {
    confidence = "high";
  } else if (highestScore >= 8) {
    confidence = "medium";
  }

  return {
    framework: detectedFramework,
    confidence,
    indicators: reasons.get(detectedFramework) || [],
  };
}

/**
 * Helper function to find a file by name (case-insensitive)
 */
function findFile(fileMap: Map<string, FileEntry>, fileName: string): FileEntry | undefined {
  const lowerFileName = fileName.toLowerCase();
  
  for (const [path, file] of fileMap) {
    if (path.endsWith("/" + lowerFileName) || path === lowerFileName) {
      return file;
    }
  }
  
  return undefined;
}
