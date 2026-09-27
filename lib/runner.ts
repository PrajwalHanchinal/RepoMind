import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import type { CommandResult, RunResult, RunVerdict } from '@/types/index';

/**
 * The default commands RepoMind runs against the demo repository.
 * Build is run first; if it fails we still run tests to capture all feedback.
 */
export const DEFAULT_COMMANDS = ['npm run build', 'npm test'];

/**
 * Run a single shell command inside the given directory.
 * Uses spawnSync with shell:true so npm scripts resolve correctly on Windows.
 */
function runCommand(command: string, cwd: string): CommandResult {
  const start = Date.now();

  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: 'utf8',
    // Give each command up to 5 minutes — Jest can be slow on first run
    timeout: 300_000,
    maxBuffer: 10 * 1024 * 1024, // 10 MB
  });

  const durationMs = Date.now() - start;

  return {
    command,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
    durationMs,
  };
}

/**
 * Run all verification commands against the repository at `repoPath`.
 * Runs every command regardless of prior failures so the full picture is
 * captured in a single result.
 *
 * @param repoPath  Absolute path to the repository to verify.
 * @param sessionId The session this verification belongs to.
 * @param commands  Ordered list of shell commands to run. Defaults to
 *                  DEFAULT_COMMANDS.
 */
export function runChecks(
  repoPath: string,
  sessionId: string,
  commands: string[] = DEFAULT_COMMANDS,
): RunResult {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const start = Date.now();

  const commandResults: CommandResult[] = commands.map((cmd) =>
    runCommand(cmd, repoPath),
  );

  const completedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - start;

  const anyFailed = commandResults.some((r) => r.exitCode !== 0);
  const anyError = commandResults.some((r) => r.exitCode === null);

  let verdict: RunVerdict;
  if (anyError) {
    verdict = 'error';
  } else if (anyFailed) {
    verdict = 'fail';
  } else {
    verdict = 'pass';
  }

  return {
    runId,
    sessionId,
    repoPath,
    verdict,
    commands: commandResults,
    startedAt,
    completedAt,
    totalDurationMs,
  };
}
