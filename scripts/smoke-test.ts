/**
 * Standalone integration smoke test for Sub-Task 5.
 *
 * Exercises the full pipeline:
 *   analyseRepo → analyseImpact → writeTask → runChecks → saveResult
 *
 * Runs against the real task-api repository (main branch, all tests passing).
 * Prints each stage result and the final RunResult verdict.
 *
 * Usage:  node scripts/smoke-test.mjs
 *
 * NOTE: This script uses Node's --experimental-vm-modules resolution via
 * module aliases resolved manually, because the compiled lib files use @/
 * path aliases that don't resolve outside Next.js. We import the TS source
 * via tsx instead.
 */

// We run this via: npx tsx scripts/smoke-test.ts
import { resolve } from 'path';
import { analyseRepo } from '../lib/analyser';
import { analyseImpact } from '../lib/impactAnalyser';
import { writeTask } from '../lib/taskWriter';
import { runChecks } from '../lib/runner';
import { createSession, updateSession, saveResult } from '../lib/store';

const REPO_PATH = resolve(process.cwd(), 'task-api');
const CHANGE_REQUEST = 'Add a status field to POST /tasks response and ensure tests cover it';

console.log('=== RepoMind Sub-Task 5 Smoke Test ===\n');
console.log(`Demo repo: ${REPO_PATH}`);
console.log(`Change request: "${CHANGE_REQUEST}"\n`);

// Step 1: Analyse
console.log('--- Step 1: analyseRepo ---');
const analysis = analyseRepo(REPO_PATH);
console.log('File tree:', analysis.fileTree);
console.log('Entry points:', analysis.entryPoints);
console.log('Recent commits:', analysis.recentCommits.length);
console.log();

// Step 2: Create session
console.log('--- Step 2: createSession ---');
let session = createSession(REPO_PATH, CHANGE_REQUEST);
session = updateSession(session.id, { analysis });
console.log('Session ID:', session.id);
console.log('Status:', session.status);
console.log();

// Step 3: Impact analysis
console.log('--- Step 3: analyseImpact ---');
const impactReport = analyseImpact(CHANGE_REQUEST, analysis);
session = updateSession(session.id, { impactReport, status: 'impact_assessed' });
console.log('Affected files:', impactReport.affectedFiles);
console.log('Risk level:', impactReport.riskLevel);
console.log('Test scope:', impactReport.testScope);
console.log('Rationale:', impactReport.rationale);
console.log();

// Step 4: Write task
console.log('--- Step 4: writeTask ---');
const taskResult = writeTask(REPO_PATH, CHANGE_REQUEST, impactReport);
session = updateSession(session.id, { taskSpec: taskResult.taskSpec, status: 'task_written' });
console.log('Commit SHA:', taskResult.commitSha);
console.log('taskSpec.riskLevel:', taskResult.taskSpec.riskLevel);
console.log();

// Step 5: Verify (the core of Sub-Task 5)
console.log('--- Step 5: runChecks (REAL npm run build + npm test) ---');
console.log('Running... this will take ~40 seconds on first run.\n');
const runResult = runChecks(REPO_PATH, session.id);

saveResult(runResult);
session = updateSession(session.id, {
  status: 'verified',
  lastRunId: runResult.runId,
});

console.log('Run ID:', runResult.runId);
console.log('VERDICT:', runResult.verdict.toUpperCase());
console.log('Total duration:', runResult.totalDurationMs + 'ms');
console.log();

for (const cmd of runResult.commands) {
  console.log(`  Command: ${cmd.command}`);
  console.log(`  Exit code: ${cmd.exitCode}`);
  console.log(`  Duration: ${cmd.durationMs}ms`);
  if (cmd.stderr.trim()) {
    // Print last 8 lines of stderr (Jest outputs to stderr)
    const lines = cmd.stderr.trim().split('\n');
    console.log(`  Stderr (last 8 lines):\n    ${lines.slice(-8).join('\n    ')}`);
  }
  console.log();
}

console.log('=== Final session status:', session.status, '===');
console.log('=== lastRunId:', session.lastRunId, '===');
console.log('\nSmoke test complete.');
