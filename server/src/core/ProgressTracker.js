export class ProgressTracker {
  constructor() {
    this.steps = [
      { id: 'initialization', name: 'Initializing scan...', weight: 4 },
      { id: 'extraction', name: 'Extracting and analyzing codebase...', weight: 14 },
      { id: 'tech-stack-identification', name: 'Identifying technology stacks...', weight: 19 },
      { id: 'rule-creation', name: 'Creating security rules...', weight: 14 },
      { id: 'security-analysis', name: 'Performing security analysis...', weight: 24 },
      { id: 'vulnerability-classification', name: 'Classifying vulnerabilities...', weight: 9 },
      { id: 'suggestion-generation', name: 'Generating security suggestions...', weight: 14 },
      { id: 'report-generation', name: 'Generating comprehensive report...', weight: 9 },
      { id: 'finalization', name: 'Finalizing results...', weight: 4 }
    ];
    
    this.currentStepIndex = 0;
    this.currentProgress = 0;
    this.stepProgress = 0; // Progress within current step (0-100)
  }

  getCurrentStep() {
    if (this.currentStepIndex >= this.steps.length) {
      return this.steps[this.steps.length - 1];
    }
    return this.steps[this.currentStepIndex];
  }

  getCurrentProgress() {
    return Math.round(this.currentProgress);
  }

  getCurrentStepProgress() {
    return Math.round(this.stepProgress);
  }

  setStepProgress(progress) {
    this.stepProgress = Math.max(0, Math.min(100, progress));
    this.updateOverallProgress();
  }

  moveToNextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.stepProgress = 0;
      this.updateOverallProgress();
    }
  }

  setStep(stepId) {
    const stepIndex = this.steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      this.currentStepIndex = stepIndex;
      this.stepProgress = 0;
      this.updateOverallProgress();
    }
  }

  updateOverallProgress() {
    let totalProgress = 0;
    
    // Add progress from completed steps
    for (let i = 0; i < this.currentStepIndex; i++) {
      totalProgress += this.steps[i].weight;
    }
    
    // Add progress from current step
    if (this.currentStepIndex < this.steps.length) {
      totalProgress += (this.steps[this.currentStepIndex].weight * this.stepProgress / 100);
    }
    
    this.currentProgress = totalProgress;
  }

  getProgressData() {
    const currentStep = this.getCurrentStep();
    return {
      currentStep: currentStep.name,
      currentStepId: currentStep.id,
      progress: this.getCurrentProgress(),
      stepProgress: this.getCurrentStepProgress(),
      stepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      isComplete: this.currentStepIndex >= this.steps.length - 1 && this.stepProgress >= 100
    };
  }

  reset() {
    this.currentStepIndex = 0;
    this.currentProgress = 0;
    this.stepProgress = 0;
  }

  // Helper method to simulate progress within a step
  simulateStepProgress(duration = 2000, updateInterval = 100) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        this.setStepProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, updateInterval);
    });
  }
}
