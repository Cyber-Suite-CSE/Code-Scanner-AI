import { FileEntry, FrameworkDetectionResult } from "./code-cleaner";
import {
  addLog,
  updateProgress,
  updateStatus,
  setResult,
  setError,
  setAbortController,
  isJobCancelled,
  AnalysisResult,
} from "./job-store";
import {
  createSentinelAgent,
  createGuardianAgent,
  createInspectorAgent,
  generateProjectTree,
  EndpointProfile,
  FlowProfile,
  SecurityChecklist,
  SecurityReport,
  InspectionInput,
  SENTINEL_PROJECT_TREE_DEPTH,
} from "./agents";

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
  if (signal?.aborted || isJobCancelled(jobId)) {
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
  
  // Create abort controller for this job
  const abortController = new AbortController();
  setAbortController(jobId, abortController);
  const signal = abortController.signal;

  try {
    // Start the job
    updateStatus(jobId, "running");
    updateProgress(jobId, PROGRESS.INIT.start, 100, "Initializing");
    addLog(jobId, "info", `🚀 Starting analysis for ${framework.framework} project (${files.length} files)`);

    // Stage 1: Sentinel Agent - Endpoint Discovery
    checkCancellation(jobId, signal);
    updateProgress(jobId, PROGRESS.SENTINEL.start, 100, "Sentinel Agent: Discovering endpoints");
    addLog(jobId, "info", "🛡️ Sentinel Agent: Analyzing codebase for endpoints...");
    
    let endpointProfiles: EndpointProfile[] = [];
    let projectTree = "";
    
    try {
      let endpointsFound = 0;
      const sentinelAgent = createSentinelAgent({
        saveDebugOutput: false,
        onLog: (message) => {
          addLog(jobId, "info", `   ${message}`);
          // Increment progress for each endpoint found (estimate ~10 max for progress)
          if (message.includes("endpoint") || message.includes("flow")) {
            endpointsFound++;
            const progress = calcProgress(PROGRESS.SENTINEL, Math.min(endpointsFound, 10), 10);
            updateProgress(jobId, progress, 100, `Sentinel Agent: Found ${endpointsFound} endpoint(s)`);
          }
        },
        abortSignal: signal,
      });
      
      endpointProfiles = await sentinelAgent.analyze(files);
      projectTree = generateProjectTree(files, SENTINEL_PROJECT_TREE_DEPTH);
      
      updateProgress(jobId, PROGRESS.SENTINEL.end, 100, `Sentinel Agent: Complete (${endpointProfiles.length} endpoints)`);
      addLog(jobId, "success", `✓ Sentinel Agent: Discovered ${endpointProfiles.length} endpoints`);
    } catch (error) {
      if (error instanceof CancellationError) throw error;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      addLog(jobId, "warn", `⚠️ Sentinel Agent error: ${errorMsg}`);
    }

    // Stage 2: Guardian Agent - Security Checklist Generation
    checkCancellation(jobId, signal);
    let securityChecklists: SecurityChecklist[] = [];
    
    if (endpointProfiles.length > 0) {
      updateProgress(jobId, PROGRESS.GUARDIAN.start, 100, "Guardian Agent: Generating security checklists");
      addLog(jobId, "info", "🔐 Guardian Agent: Creating security checklists...");
      
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
          onLog: (message) => {
            addLog(jobId, "info", `   ${message}`);
            // Track progress when analyzing a flow (matches "[X/Y] Analyzing:")
            if (message.includes("Analyzing:")) {
              const match = message.match(/\[(\d+)\/(\d+)\]/);
              if (match) {
                completedFlows = parseInt(match[1], 10) - 1; // Currently analyzing, not completed yet
                const progress = calcProgress(PROGRESS.GUARDIAN, completedFlows, totalFlows);
                updateProgress(jobId, progress, 100, `Guardian Agent: Analyzing ${completedFlows + 1}/${totalFlows}`);
              }
            }
            // Track completed flows (matches "✅ Generated X required")
            if (message.includes("✅ Generated")) {
              completedFlows++;
              const progress = calcProgress(PROGRESS.GUARDIAN, completedFlows, totalFlows);
              updateProgress(jobId, progress, 100, `Guardian Agent: ${completedFlows}/${totalFlows} checklists`);
            }
          },
          abortSignal: signal,
        });

        securityChecklists = await guardianAgent.analyzeFlows(flowProfiles, framework, projectTree);

        updateProgress(jobId, PROGRESS.GUARDIAN.end, 100, `Guardian Agent: Complete (${securityChecklists.length} checklists)`);
        
        const totalRequired = securityChecklists.reduce((sum, c) => sum + c.required_controls.length, 0);
        const totalRecommended = securityChecklists.reduce((sum, c) => sum + c.recommended_controls.length, 0);
        addLog(jobId, "success", `✓ Guardian Agent: ${securityChecklists.length} checklists (${totalRequired} required, ${totalRecommended} recommended controls)`);
      } catch (error) {
        if (error instanceof CancellationError) throw error;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        addLog(jobId, "warn", `⚠️ Guardian Agent error: ${errorMsg}`);
      }
    } else {
      updateProgress(jobId, PROGRESS.GUARDIAN.end, 100, "Guardian Agent: Skipped (no endpoints)");
      addLog(jobId, "info", "⏭️ Guardian Agent: Skipped (no endpoints discovered)");
    }

    // Stage 3: Inspector Agent - Code Inspection
    checkCancellation(jobId, signal);
    let securityReports: SecurityReport[] = [];
    
    if (endpointProfiles.length > 0 && securityChecklists.length > 0) {
      updateProgress(jobId, PROGRESS.INSPECTOR.start, 100, "Inspector Agent: Inspecting code");
      addLog(jobId, "info", "🕵️ Inspector Agent: Performing security inspection...");
      
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
            onLog: (message) => {
              addLog(jobId, "info", `   ${message}`);
              // Track progress when inspecting a flow (matches "[X/Y] Inspecting:")
              if (message.includes("Inspecting:")) {
                const match = message.match(/\[(\d+)\/(\d+)\]/);
                if (match) {
                  completedInspections = parseInt(match[1], 10) - 1; // Currently inspecting, not completed yet
                  const progress = calcProgress(PROGRESS.INSPECTOR, completedInspections, totalInspections);
                  updateProgress(jobId, progress, 100, `Inspector Agent: Inspecting ${completedInspections + 1}/${totalInspections}`);
                }
              }
              // Track completed inspections (matches "✅ X implemented")
              if (message.includes("✅") && message.includes("implemented")) {
                completedInspections++;
                const progress = calcProgress(PROGRESS.INSPECTOR, completedInspections, totalInspections);
                updateProgress(jobId, progress, 100, `Inspector Agent: ${completedInspections}/${totalInspections} inspected`);
              }
            },
            abortSignal: signal,
          });

          securityReports = await inspectorAgent.inspectFlows(inspectionInputs);

          updateProgress(jobId, PROGRESS.INSPECTOR.end, 100, `Inspector Agent: Complete (${securityReports.length} reports)`);
          
          // Summary
          const totalImplemented = securityReports.reduce((sum, r) => sum + r.implemented.length, 0);
          const totalMissing = securityReports.reduce((sum, r) => sum + r.missing.length, 0);
          const totalVulns = securityReports.reduce((sum, r) => sum + (r.vulnerabilities?.length || 0), 0);
          
          addLog(jobId, "success", `✓ Inspector Agent: ${totalImplemented} implemented, ${totalMissing} missing controls`);
          
          if (totalVulns > 0) {
            addLog(jobId, "warn", `🔴 Found ${totalVulns} vulnerabilities`);
          }
          
          const criticalCount = securityReports.filter(r => r.summary.overall_severity === "critical").length;
          const highCount = securityReports.filter(r => r.summary.overall_severity === "high").length;
          if (criticalCount > 0) addLog(jobId, "warn", `🚨 ${criticalCount} endpoint(s) with critical severity`);
          if (highCount > 0) addLog(jobId, "warn", `⚠️ ${highCount} endpoint(s) with high severity`);
        }
      } catch (error) {
        if (error instanceof CancellationError) throw error;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        addLog(jobId, "warn", `⚠️ Inspector Agent error: ${errorMsg}`);
      }
    } else {
      updateProgress(jobId, PROGRESS.INSPECTOR.end, 100, "Inspector Agent: Skipped");
      addLog(jobId, "info", "⏭️ Inspector Agent: Skipped (no checklists available)");
    }

    // Finalize
    checkCancellation(jobId, signal);
    updateProgress(jobId, 100, 100, "Complete");
    
    const analysisTime = Date.now() - startTime;
    const totalMissingControls = securityReports.reduce((sum, r) => sum + r.missing.length, 0);
    const totalVulnerabilities = securityReports.reduce((sum, r) => sum + (r.vulnerabilities?.length || 0), 0);

    const result: AnalysisResult = {
      summary: `Analysis completed for ${framework.framework} project with ${files.length} files.`,
      findings: [],
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

    setResult(jobId, result);
    addLog(jobId, "success", `✅ Analysis completed in ${(analysisTime / 1000).toFixed(1)}s`);
    updateStatus(jobId, "completed");

  } catch (error) {
    if (error instanceof CancellationError) {
      return;
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    addLog(jobId, "error", `❌ Analysis failed: ${errorMessage}`);
    setError(jobId, errorMessage);
  }
}
