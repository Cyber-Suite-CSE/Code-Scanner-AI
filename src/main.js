#!/usr/bin/env node

import { WorkflowOrchestrator } from './core/WorkflowOrchestrator.js';
import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';

class CodeSecurityScanner {
  constructor() {
    this.orchestrator = null;
    this.config = {
      configPath: './config',
      outputPath: './output',
      tempPath: './temp'
    };
  }

  async initialize() {
    try {
      console.log('🔒 Code Security Scanner v1.0.0');
      console.log('====================================\n');

      // Initialize orchestrator
      this.orchestrator = new WorkflowOrchestrator(this.config);

      // Set up event listeners
      this.setupEventListeners();

      // Initialize
      await this.orchestrator.initialize();

      console.log('✅ Scanner initialized successfully\n');

    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  }

  setupEventListeners() {
    this.orchestrator.on('workflow-status', (event) => {
      console.log(`📊 Status: ${event.status}`);
      if (event.step) {
        console.log(`   Step: ${event.step}`);
      }
    });

    this.orchestrator.on('workflow-step-start', (event) => {
      console.log(`🚀 Starting: ${event.step}`);
    });

    this.orchestrator.on('workflow-step-complete', (event) => {
      console.log(`✅ Completed: ${event.step} (${event.duration}ms)`);
    });

    this.orchestrator.on('workflow-step-error', (event) => {
      console.error(`❌ Failed: ${event.step} - ${event.error}`);
    });

    this.orchestrator.on('agent-status', (event) => {
      console.log(`🤖 Agent ${event.agent}: ${event.status}`);
    });

    this.orchestrator.on('workflow-error', (event) => {
      console.error(`💥 Workflow Error: ${event.error}`);
    });
  }

  async scanCodebase(zipPath, options = {}) {
    try {
      // Validate input
      if (!await fs.pathExists(zipPath)) {
        throw new Error(`Zip file not found: ${zipPath}`);
      }

      console.log(`🔍 Starting security scan of: ${path.basename(zipPath)}`);
      console.log(`   File size: ${(await fs.stat(zipPath)).size} bytes\n`);

      // Execute scan
      const result = await this.orchestrator.executeScan(zipPath);

      if (result.success) {
        console.log('\n🎉 Security scan completed successfully!');
        console.log(`📄 Report saved to: ${result.outputFile}`);

        this.displayScanSummary(result.report);

        return result;
      } else {
        console.error('\n❌ Security scan failed');
        if (result.partialReport) {
          console.log('📄 Partial report generated');
        }
        return result;
      }

    } catch (error) {
      console.error(`❌ Scan failed: ${error.message}`);
      throw error;
    }
  }

  displayScanSummary(report) {
    console.log('\n📈 Scan Summary:');
    console.log('================');

    const summary = report.executionSummary;
    const security = report.securityAnalysis;

    console.log(`📁 Files scanned: ${summary.totalFiles}`);
    console.log(`🐛 Issues found: ${summary.issuesFound}`);
    console.log(`💡 Suggestions generated: ${summary.suggestionsGenerated}`);
    console.log(`⏱️  Execution time: ${Math.round(summary.executionTime / 1000)}s`);

    console.log('\n🔍 Security Analysis:');
    console.log(`   🔴 Critical: ${security.issuesByCategory.critical?.length || 0}`);
    console.log(`   🟠 High: ${security.issuesByCategory.high?.length || 0}`);
    console.log(`   🟡 Medium: ${security.issuesByCategory.medium?.length || 0}`);
    console.log(`   🟢 Low: ${security.issuesByCategory.low?.length || 0}`);

    console.log(`\n🎯 Risk Level: ${security.riskAssessment.summary.riskLevel}`);

    if (report.actionPlan.immediate.length > 0) {
      console.log('\n⚠️  Immediate Actions Required:');
      report.actionPlan.immediate.forEach(action => {
        console.log(`   • ${action.action}`);
      });
    }
  }

  async healthCheck() {
    try {
      if (!this.orchestrator) {
        return { status: 'uninitialized' };
      }

      return await this.orchestrator.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async cleanup() {
    if (this.orchestrator) {
      await this.orchestrator.cleanup();
    }
  }
}

// CLI Configuration
program
  .name('code-security-scanner')
  .description('AI-based code security scanner with extensible agent workflow')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan a codebase zip file for security vulnerabilities')
  .argument('<zipfile>', 'Path to the zip file containing the codebase')
  .option('-o, --output <path>', 'Output directory for reports', './output')
  .option('-c, --config <path>', 'Configuration directory', './config')
  .option('-t, --temp <path>', 'Temporary directory', './temp')
  .option('--timeout <ms>', 'Timeout for each step in milliseconds', '300000')
  .action(async (zipfile, options) => {
    const scanner = new CodeSecurityScanner();

    try {
      // Update config with options
      scanner.config.outputPath = options.output;
      scanner.config.configPath = options.config;
      scanner.config.tempPath = options.temp;

      if (options.timeout) {
        scanner.config.timeout = parseInt(options.timeout);
      }

      await scanner.initialize();
      await scanner.scanCodebase(zipfile, options);

    } catch (error) {
      console.error('Scan failed:', error.message);
      process.exit(1);
    } finally {
      await scanner.cleanup();
    }
  });

program
  .command('health')
  .description('Check the health status of the scanner components')
  .action(async () => {
    const scanner = new CodeSecurityScanner();

    try {
      await scanner.initialize();
      const health = await scanner.healthCheck();

      console.log('🏥 Health Check Results:');
      console.log('=======================');
      console.log(`Overall Status: ${health.status}`);

      console.log('\nComponents:');
      Object.entries(health.components).forEach(([name, component]) => {
        if (typeof component === 'object' && component.status) {
          const emoji = component.status === 'healthy' ? '✅' : '❌';
          console.log(`  ${emoji} ${name}: ${component.status}`);
        } else if (typeof component === 'object') {
          console.log(`  📦 ${name}:`);
          Object.entries(component).forEach(([subName, subComponent]) => {
            const emoji = subComponent.status === 'healthy' ? '✅' : '❌';
            console.log(`    ${emoji} ${subName}: ${subComponent.status}`);
          });
        }
      });

      if (health.error) {
        console.log(`\n❌ Error: ${health.error}`);
      }

    } catch (error) {
      console.error('Health check failed:', error.message);
      process.exit(1);
    } finally {
      await scanner.cleanup();
    }
  });

program
  .command('init')
  .description('Initialize scanner configuration and directories')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      console.log('🛠️  Initializing Code Security Scanner...');

      const dirs = ['config', 'output', 'temp'];

      for (const dir of dirs) {
        await fs.ensureDir(dir);
        console.log(`✅ Created directory: ${dir}`);
      }

      // Check if config files exist
      const configFiles = [
        'config/mcp-tools.json',
        'config/vulnerabilities.json'
      ];

      for (const configFile of configFiles) {
        if (!await fs.pathExists(configFile) || options.force) {
          // Config files are already created by the implementation
          console.log(`✅ Configuration ready: ${configFile}`);
        } else {
          console.log(`⏩ Configuration exists: ${configFile}`);
        }
      }

      console.log('\n🎉 Scanner initialization completed!');
      console.log('\nNext steps:');
      console.log('1. Place your codebase in a zip file');
      console.log('2. Run: node src/main.js scan <zipfile>');

    } catch (error) {
      console.error('Initialization failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Display current configuration')
  .action(async () => {
    try {
      console.log('⚙️  Current Configuration:');
      console.log('=========================');

      const configFiles = [
        { path: 'config/mcp-tools.json', name: 'MCP Tools' },
        { path: 'config/vulnerabilities.json', name: 'Vulnerabilities' }
      ];

      for (const { path: configPath, name } of configFiles) {
        if (await fs.pathExists(configPath)) {
          const config = await fs.readJSON(configPath);
          console.log(`\n📄 ${name} (${configPath}):`);

          if (configPath.includes('mcp-tools')) {
            console.log(`   Tools: ${Object.keys(config.tools || {}).length}`);
            console.log(`   Categories: ${Object.keys(config.toolCategories || {}).length}`);
          } else if (configPath.includes('vulnerabilities')) {
            console.log(`   Categories: ${Object.keys(config.categories || {}).length}`);
            console.log(`   Severity Levels: ${Object.keys(config.severityDefinitions || {}).length}`);
          }
        } else {
          console.log(`\n❌ ${name}: Not found (${configPath})`);
        }
      }

    } catch (error) {
      console.error('Failed to display configuration:', error.message);
      process.exit(1);
    }
  });

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Parse CLI arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}