import { spawnSync } from 'child_process';

const BOB_PROMPT =
  'Read @FEEDBACK.md. Fix the actual issue reported by RepoMind. ' +
  'Do not modify tests or unrelated functionality. ' +
  'Run the tests after the fix and report the result.';

const BOB_ARGS = [
  'run',
  '--accept-license',
  '--max-turns', '10',
  BOB_PROMPT,
];

/**
 * Invoke Bob against the given repository to action the current FEEDBACK.md.
 *
 * BOB_API_KEY must be present in the environment — it is passed through the
 * inherited process environment and is never logged.
 *
 * On Windows, npm-installed commands like `bob` are `.cmd` wrappers that only
 * resolve when the shell is involved. Using shell:true lets cmd.exe locate
 * `bob.cmd` on PATH without hardcoding any path or username.
 *
 * @param repoPath  Absolute path to the repository Bob should operate on.
 */
export async function runBobFeedback(
  repoPath: string,
): Promise<{ success: boolean; output: string }> {
  const apiKey = process.env.BOB_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      output: 'BOB_API_KEY environment variable is not set.',
    };
  }

  const result = spawnSync('bob', BOB_ARGS, {
    cwd: repoPath,
    // shell:true is required on Windows so that cmd.exe can resolve bob.cmd
    // from PATH. It is harmless on Unix where bob is a plain executable.
    shell: true,
    encoding: 'utf8',
    // Inherit the current environment so BOB_API_KEY reaches the subprocess.
    env: process.env as NodeJS.ProcessEnv,
    // Allow up to 10 minutes for Bob to complete its work.
    timeout: 600_000,
    maxBuffer: 10 * 1024 * 1024, // 10 MB
  });

  if (result.error) {
    return {
      success: false,
      output: `Failed to start Bob: ${result.error.message}`,
    };
  }

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const output = [stdout, stderr].filter(Boolean).join('\n');
  const exitCode = result.status ?? 1;

  return {
    success: exitCode === 0,
    output,
  };
}
