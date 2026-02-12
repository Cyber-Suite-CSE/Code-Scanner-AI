import { FileEntry, FrameworkDetectionResult } from "./code-cleaner/types";
import {
  addJobLog,
  updateJobProgress,
  updateJobStatus,
  setJobResult,
  getJob,
  AnalysisResult,
  createJob,
} from "./job-store";
import {
  createSentinelAgent,
  createGuardianAgent,
  createInspectorAgent,
  generateProjectTree,
  EndpointProfile,
  SentinelAgent,
  GuardianAgent,
  InspectorAgent,
  SENTINEL_PROJECT_TREE_DEPTH,
} from "./agents/index";
import {
    FlowProfile,
    SecurityChecklist,
    GuardianCompletedResponse
} from "./agents/guardian-agent";
import {
    SecurityReport,
    InspectionInput
} from "./agents/inspector-agent";

// Progress allocation (total = 100%)
const PROGRESS = {
  INIT: { start: 0, end: 5 },
  SENTINEL: { start: 5, end: 35 },
  GUARDIAN: { start: 35, end: 65 },
  INSPECTOR: { start: 65, end: 95 },
  FINALIZE: { start: 95, end: 100 },
};

// Custom error for cancellation
class CancellationError extends Error {
  constructor() {
    super("Job was cancelled");
    this.name = "CancellationError";
  }
}

// Check if job should continue
function checkCancellation(jobId: string, signal?: AbortSignal): void {
  const job = getJob(jobId);
  if (signal?.aborted || job?.status === "cancelled") {
    throw new CancellationError();
  }
}

// Calculate progress within a stage
function calcProgress(stage: { start: number; end: number }, current: number, total: number): number {
  if (total === 0) return stage.end;
  const stageRange = stage.end - stage.start;
  return Math.round(stage.start + (current / total) * stageRange);
}

/**
 * Run the analysis process using AI agents
 */
export async function runAnalysis(
  jobId: string,
  files: FileEntry[],
  framework: FrameworkDetectionResult
): Promise<void> {
  const startTime = Date.now();
  
  // Get job to access its abort signal
  const job = getJob(jobId);
  if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
  }
  
  const signal = job.abortController?.signal;

  try {
    // Start the job
    updateJobStatus(jobId, "running");
    updateJobProgress(jobId, PROGRESS.INIT.start, 100, "Initializing");
    addJobLog(jobId, `🚀 Starting analysis for ${framework.framework} project (${files.length} files)`, "info");

    // Stage 1: Sentinel Agent - Endpoint Discovery
    checkCancellation(jobId, signal);
    updateJobProgress(jobId, PROGRESS.SENTINEL.start, 100, "Sentinel Agent: Discovering endpoints");
    addJobLog(jobId, "🛡️ Sentinel Agent: Analyzing codebase for endpoints...", "info");
    
    let endpointProfiles: EndpointProfile[] = [];
    let projectTree = "";
    
    try {
      let endpointsFound = 0;
      const sentinelAgent = createSentinelAgent({
        saveDebugOutput: false,
        onLog: (message: string) => {
          addJobLog(jobId, `   ${message}`, "info");
          // Increment progress for each endpoint found (estimate ~10 max for progress)
          if (message.includes("endpoint") || message.includes("flow")) {
            endpointsFound++;
            const progress = calcProgress(PROGRESS.SENTINEL, Math.min(endpointsFound, 10), 10);
            updateJobProgress(jobId, progress, 100, `Sentinel Agent: Found ${endpointsFound} endpoint(s)`);
          }
        },
        abortSignal: signal,
      });
      
      endpointProfiles = await sentinelAgent.analyze(files);
      projectTree = generateProjectTree(files, SENTINEL_PROJECT_TREE_DEPTH);
      
      updateJobProgress(jobId, PROGRESS.SENTINEL.end, 100, `Sentinel Agent: Complete (${endpointProfiles.length} endpoints)`);
      addJobLog(jobId, `✓ Sentinel Agent: Discovered ${endpointProfiles.length} endpoints`, "info");
    } catch (error) {
      if (error instanceof CancellationError) throw error;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      addJobLog(jobId, `⚠️ Sentinel Agent error: ${errorMsg}`, "warning");
    }

    // Stage 2: Guardian Agent - Security Checklist Generation
    checkCancellation(jobId, signal);
    let securityChecklists: SecurityChecklist[] = [];
    
    if (endpointProfiles.length > 0) {
      updateJobProgress(jobId, PROGRESS.GUARDIAN.start, 100, "Guardian Agent: Generating security checklists");
      addJobLog(jobId, "🔐 Guardian Agent: Creating security checklists...", "info");
      
      try {
        const flowProfiles: FlowProfile[] = endpointProfiles.map((ep) => ({
          flow_name: ep.flow_name,
          purpose: ep.purpose,
          entry_point: ep.entry_point,
          input_types: ep.input_types,
          output_types: ep.output_types,
          sensitivity_level: ep.sensitivity_level,
        }));

        const totalFlows = flowProfiles.length;
        let completedFlows = 0;

        const guardianAgent = createGuardianAgent({
          saveDebugOutput: false,
          onLog: (message: string) => {
            addJobLog(jobId, `   ${message}`, "info");
            // Track progress when analyzing a flow (matches "[X/Y] Analyzing:")
            if (message.includes("Analyzing:")) {
              const match = message.match(/\[(\d+)\/(\d+)\]/);
              if (match) {
                completedFlows = parseInt(match[1], 10) - 1; // Currently analyzing, not completed yet
                const progress = calcProgress(PROGRESS.GUARDIAN, completedFlows, totalFlows);
                updateJobProgress(jobId, progress, 100, `Guardian Agent: Analyzing ${completedFlows + 1}/${totalFlows}`);
              }
            }
            // Track completed flows (matches "✅ Generated X required")
            if (message.includes("✅ Generated")) {
              completedFlows++;
              const progress = calcProgress(PROGRESS.GUARDIAN, completedFlows, totalFlows);
              updateJobProgress(jobId, progress, 100, `Guardian Agent: ${completedFlows}/${totalFlows} checklists`);
            }
          },
          abortSignal: signal,
        });

        securityChecklists = await guardianAgent.analyzeFlows(flowProfiles, framework, projectTree);

        updateJobProgress(jobId, PROGRESS.GUARDIAN.end, 100, `Guardian Agent: Complete (${securityChecklists.length} checklists)`);
        
        const totalRequired = securityChecklists.reduce((sum, c) => sum + c.required_controls.length, 0);
        const totalRecommended = securityChecklists.reduce((sum, c) => sum + c.recommended_controls.length, 0);
        addJobLog(jobId, `✓ Guardian Agent: ${securityChecklists.length} checklists (${totalRequired} required, ${totalRecommended} recommended controls)`, "info");
      } catch (error) {
        if (error instanceof CancellationError) throw error;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        addJobLog(jobId, `⚠️ Guardian Agent error: ${errorMsg}`, "warning");
      }
    } else {
      updateJobProgress(jobId, PROGRESS.GUARDIAN.end, 100, "Guardian Agent: Skipped (no endpoints)");
      addJobLog(jobId, "⏭️ Guardian Agent: Skipped (no endpoints discovered)", "info");
    }

    // Stage 3: Inspector Agent - Code Inspection
    checkCancellation(jobId, signal);
    let securityReports: SecurityReport[] = [];
    
    if (endpointProfiles.length > 0 && securityChecklists.length > 0) {
      updateJobProgress(jobId, PROGRESS.INSPECTOR.start, 100, "Inspector Agent: Inspecting code");
      addJobLog(jobId, "🕵️ Inspector Agent: Performing security inspection...", "info");
      
      try {
        const inspectionInputs: InspectionInput[] = [];
        for (const endpoint of endpointProfiles) {
          const checklist = securityChecklists.find((c) => c.flow_name === endpoint.flow_name);
          if (checklist) {
            inspectionInputs.push({ endpoint, checklist });
          }
        }

        if (inspectionInputs.length > 0) {
          const totalInspections = inspectionInputs.length;
          let completedInspections = 0;

          const inspectorAgent = createInspectorAgent({
            saveDebugOutput: false,
            onLog: (message: string) => {
              addJobLog(jobId, `   ${message}`, "info");
              // Track progress when inspecting a flow (matches "[X/Y] Inspecting:")
              if (message.includes("Inspecting:")) {
                const match = message.match(/\[(\d+)\/(\d+)\]/);
                if (match) {
                  completedInspections = parseInt(match[1], 10) - 1; // Currently inspecting, not completed yet
                  const progress = calcProgress(PROGRESS.INSPECTOR, completedInspections, totalInspections);
                  updateJobProgress(jobId, progress, 100, `Inspector Agent: Inspecting ${completedInspections + 1}/${totalInspections}`);
                }
              }
              // Track completed inspections (matches "✅ X implemented")
              if (message.includes("✅") && message.includes("implemented")) {
                completedInspections++;
                const progress = calcProgress(PROGRESS.INSPECTOR, completedInspections, totalInspections);
                updateJobProgress(jobId, progress, 100, `Inspector Agent: ${completedInspections}/${totalInspections} inspected`);
              }
            },
            abortSignal: signal,
          });

          securityReports = await inspectorAgent.inspectFlows(inspectionInputs);

          updateJobProgress(jobId, PROGRESS.INSPECTOR.end, 100, `Inspector Agent: Complete (${securityReports.length} reports)`);
          
          // Summary
          const totalImplemented = securityReports.reduce((sum, r) => sum + r.implemented.length, 0);
          const totalMissing = securityReports.reduce((sum, r) => sum + r.missing.length, 0);
          const totalVulns = securityReports.reduce((sum, r) => sum + (r.vulnerabilities?.length || 0), 0);
          
          addJobLog(jobId, `✓ Inspector Agent: ${totalImplemented} implemented, ${totalMissing} missing controls`, "info");
          
          if (totalVulns > 0) {
            addJobLog(jobId, `🔴 Found ${totalVulns} vulnerabilities`, "warning");
          }
          
          const criticalCount = securityReports.filter(r => r.summary.overall_severity === "critical").length;
          const highCount = securityReports.filter(r => r.summary.overall_severity === "high").length;
          if (criticalCount > 0) addJobLog(jobId, `🚨 ${criticalCount} endpoint(s) with critical severity`, "warning");
          if (highCount > 0) addJobLog(jobId, `⚠️ ${highCount} endpoint(s) with high severity`, "warning");
        }
      } catch (error) {
        if (error instanceof CancellationError) throw error;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        addJobLog(jobId, `⚠️ Inspector Agent error: ${errorMsg}`, "warning");
      }
    } else {
      updateJobProgress(jobId, PROGRESS.INSPECTOR.end, 100, "Inspector Agent: Skipped");
      addJobLog(jobId, "⏭️ Inspector Agent: Skipped (no checklists available)", "info");
    }

    // Finalize
    checkCancellation(jobId, signal);
    updateJobProgress(jobId, 100, 100, "Complete");
    
    const analysisTime = Date.now() - startTime;
    const totalMissingControls = securityReports.reduce((sum, r) => sum + r.missing.length, 0);
    const totalVulnerabilities = securityReports.reduce((sum, r) => sum + (r.vulnerabilities?.length || 0), 0);
    
    // Map findings for the result
    const findings: AnalysisResult["findings"] = [];
    
    // Helper to map SecuritySeverity to AnalysisResult severity ("info" | "warning" | "critical")
    function mapSeverity(severity: string): "info" | "warning" | "critical" {
      const s = severity.toLowerCase();
      if (s === "critical" || s === "high") return "critical";
      if (s === "medium") return "warning";
      return "info";
    }

    securityReports.forEach(r => {
        r.missing.forEach(m => {
             findings.push({
                    type: "Missing Control",
                    severity: mapSeverity(m.severity),
                    message: `Missing ${m.control_id}: ${m.control_name} in ${r.flow_name}`,
                });
        });
        
        r.vulnerabilities.forEach(v => {
             findings.push({
                    type: v.type,
                    severity: mapSeverity(v.severity),
                    message: `${v.title}: ${v.description}`,
                    file: v.location.file
                });
        });
    });

    const result: AnalysisResult = {
      summary: `Analysis completed for ${framework.framework} project with ${files.length} files.`,
      findings,
      endpointProfiles,
      securityChecklists,
      securityReports,
      metrics: {
        filesAnalyzed: files.length,
        endpointsFound: endpointProfiles.length,
        securityChecklistsGenerated: securityChecklists.length,
        securityReportsGenerated: securityReports.length,
        issuesFound: totalMissingControls,
        vulnerabilitiesFound: totalVulnerabilities,
        analysisTime,
      },
    };

    setJobResult(jobId, result);
    addJobLog(jobId, `✅ Analysis completed in ${(analysisTime / 1000).toFixed(1)}s`, "info");

  } catch (error) {
    if (error instanceof CancellationError) {
      addJobLog(jobId, "⚠️ Analysis cancelled by user.", "warning");
      updateJobStatus(jobId, "cancelled");
      return;
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    addJobLog(jobId, `❌ Analysis failed: ${errorMessage}`, "error");
    updateJobStatus(jobId, "failed", errorMessage);
  }
}
