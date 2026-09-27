import { writeFileSync } from 'fs';
import { join } from 'path';
import type { CommandResult, Feedback, FeedbackIssue, RunResult } from '@/types/index';

// ---------------------------------------------------------------------------
// Jest output parsers
// ---------------------------------------------------------------------------

/**
 * Extract individual test failure blocks from Jest stderr/stdout.
 *
 * Jest formats each failure as:
 *
 *   ● <describe block> › <test name>
 *
 *     <failure detail lines...>
 *
 *     Expected: <value>
 *     Received: <value>
 *
 *       at <file>:<line>:<col>
 *
 * We capture as much of that structure as the actual output contains.
 */
function parseJestFailures(output: string): FeedbackIssue[] {
  const issues: FeedbackIssue[] = [];

  // Split on the "● " bullet that marks the start of each failure block
  const blocks = output.split(/\n\s*●\s+/).slice(1); // drop the part before the first ●

  for (const block of blocks) {
    const lines = block.split('\n');

    // First line of the block is the full test name (possibly "suite › test")
    const testName = lines[0]?.trim() ?? '';

    // Extract Expected / Received lines
    let expected = '';
    let received = '';
    for (const line of lines) {
      const expMatch = /^\s*Expected(?:\s+value)?:\s*(.+)$/.exec(line);
      if (expMatch && !expected) expected = expMatch[1].trim();

      const recMatch = /^\s*Received(?:\s+value)?:\s*(.+)$/.exec(line);
      if (recMatch && !received) received = recMatch[1].trim();
    }

    // Extract the innermost "at <file>:<line>" location reference
    let location = '';
    for (const line of lines) {
      const atMatch = /at\s+Object\.<anonymous>\s+\(([^)]+)\)/.exec(line);
      if (atMatch) {
        location = atMatch[1].trim();
        break;
      }
    }
    // Fallback: any "at ..." line referencing a .ts file
    if (!location) {
      for (const line of lines) {
        const tsMatch = /at\s+.*\(([^)]*\.ts:\d+:\d+)\)/.exec(line);
        if (tsMatch) {
          location = tsMatch[1].trim();
          break;
        }
      }
    }

    if (testName) {
      issues.push({ testName, expected, received, location });
    }
  }

  return issues;
}

/**
 * Produce a single actionable suggestion string for a FeedbackIssue.
 */
function suggestionFor(issue: FeedbackIssue): string {
  const loc = issue.location ? ` (${issue.location})` : '';
  if (issue.expected && issue.received) {
    return (
      `Fix "${issue.testName}"${loc}: ` +
      `the test expected ${issue.expected} but received ${issue.received}. ` +
      `Check the relevant handler and ensure its response matches the expectation.`
    );
  }
  return (
    `Fix "${issue.testName}"${loc}: ` +
    `review the implementation against the test assertion.`
  );
}

// ---------------------------------------------------------------------------
// Build-failure parser
// ---------------------------------------------------------------------------

/**
 * When build fails (tsc exits non-zero) extract TypeScript error lines.
 * These have the form:  src/file.ts(line,col): error TSxxxx: message
 */
function parseBuildErrors(stderr: string): FeedbackIssue[] {
  const issues: FeedbackIssue[] = [];
  const tsErrorRe = /([^\s(]+\.[tj]sx?\(\d+,\d+\)):\s+error\s+(TS\d+:\s*.+)/g;
  let m: RegExpExecArray | null;
  while ((m = tsErrorRe.exec(stderr)) !== null) {
    issues.push({
      testName: `Build error at ${m[1]}`,
      expected: '',
      received: m[2].trim(),
      location: m[1],
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// FEEDBACK.md renderer
// ---------------------------------------------------------------------------

function renderFeedbackMd(feedback: Feedback, commands: CommandResult[]): string {
  const failedCommands = commands
    .filter((c) => c.exitCode !== 0)
    .map((c) => `- \`${c.command}\` (exit code ${c.exitCode})`)
    .join('\n');

  const issueBlocks = feedback.issues.map((issue, i) => {
    const lines = [`### Issue ${i + 1}: ${issue.testName}`];
    if (issue.location) lines.push(`**Location:** \`${issue.location}\``);
    if (issue.expected) lines.push(`**Expected:** ${issue.expected}`);
    if (issue.received) lines.push(`**Received:** ${issue.received}`);
    return lines.join('\n');
  });

  const suggestionList = feedback.suggestions
    .map((s) => `- ${s}`)
    .join('\n');

  return `# RepoMind Verification Feedback

> This file is managed by RepoMind. Read it to understand why verification
> failed and what needs to be fixed before re-verification.

---

## Verdict: ${feedback.verdict.toUpperCase()}

## Failed Commands

${failedCommands || '_None recorded._'}

---

## Failing Tests / Errors

${issueBlocks.length > 0 ? issueBlocks.join('\n\n') : '_No structured issue data available — see raw output below._'}

---

## Suggested Fixes

${suggestionList || '_Review the raw output below._'}

---

## Raw Output

\`\`\`
${feedback.rawOutput}
\`\`\`

---

*Generated by RepoMind — implement the fixes above, commit, then trigger
re-verification from the RepoMind dashboard.*
`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GenerateFeedbackResult {
  feedback: Feedback;
  feedbackMdPath: string;
}

/**
 * Generate structured feedback from a RunResult and write FEEDBACK.md into
 * the demo repository.
 *
 * Parsing is performed only on the actual captured stdout/stderr — no values
 * are invented. On a passing run the function still writes FEEDBACK.md (with
 * a pass verdict) so it is always up-to-date.
 *
 * @param runResult The stored RunResult from lib/runner.
 * @param repoPath  Absolute path to the demo repository.
 */
export function generateFeedback(
  runResult: RunResult,
  repoPath: string,
): GenerateFeedbackResult {
  const issues: FeedbackIssue[] = [];

  // Collect raw output from all commands for display
  const rawParts: string[] = [];

  for (const cmd of runResult.commands) {
    const combined = [cmd.stdout, cmd.stderr].filter(Boolean).join('\n');
    if (combined.trim()) {
      rawParts.push(`$ ${cmd.command}  [exit ${cmd.exitCode}]\n${combined}`);
    }

    if (cmd.exitCode === 0) continue;

    // Determine failure type and extract structured issues
    const lowerCmd = cmd.command.toLowerCase();
    if (lowerCmd.includes('test')) {
      // Jest test runner — parse bullet-block format
      issues.push(...parseJestFailures(combined));
    } else if (lowerCmd.includes('build') || lowerCmd.includes('tsc')) {
      issues.push(...parseBuildErrors(cmd.stderr));
    }
  }

  const rawOutput = rawParts.join('\n\n---\n\n');

  const suggestions =
    issues.length > 0
      ? issues.map(suggestionFor)
      : runResult.verdict !== 'pass'
        ? ['Review the raw output above for error details and fix the indicated files.']
        : ['All checks passed — no fixes required.'];

  const feedback: Feedback = {
    runId: runResult.runId,
    verdict: runResult.verdict,
    issues,
    suggestions,
    rawOutput,
  };

  const feedbackMdPath = join(repoPath, 'FEEDBACK.md');
  writeFileSync(
    feedbackMdPath,
    renderFeedbackMd(feedback, runResult.commands),
    'utf8',
  );

  return { feedback, feedbackMdPath };
}
