import { execSync } from 'child_process';
import { join } from 'path';
import type { CommitSummary } from '@/types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run a git command inside the given repository directory.
 * Returns trimmed stdout as a string.
 * Throws with the stderr message if the command fails.
 */
function git(repoPath: string, args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    throw new Error(`git ${args.split(' ')[0]} failed in ${repoPath}: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List all tracked files in the repository, excluding the .git directory.
 * Returns paths relative to the repository root.
 */
export function getFileTree(repoPath: string): string[] {
  const output = git(repoPath, 'ls-files');
  return output.length === 0 ? [] : output.split('\n');
}

/**
 * Return the last `n` commits as structured summaries.
 * Defaults to the last 10 commits.
 */
export function getLog(repoPath: string, n = 10): CommitSummary[] {
  // Format: hash<SEP>author<SEP>date<SEP>message
  const SEP = '\x1F'; // ASCII Unit Separator — unlikely to appear in commit messages
  const format = `%H${SEP}%an${SEP}%ai${SEP}%s`;
  const output = git(repoPath, `log -${n} --format=${format}`);

  if (output.length === 0) return [];

  return output.split('\n').map((line) => {
    const parts = line.split(SEP);
    return {
      hash: parts[0] ?? '',
      author: parts[1] ?? '',
      date: parts[2] ?? '',
      message: parts[3] ?? '',
    };
  });
}

/**
 * Return the unified diff between two Git refs.
 * Omit `head` to diff `base` against the working tree.
 */
export function getDiff(repoPath: string, base: string, head?: string): string {
  const range = head ? `${base} ${head}` : base;
  return git(repoPath, `diff ${range}`);
}

/**
 * Return the current working-tree status (equivalent to `git status --short`).
 * Returns an empty string if the tree is clean.
 */
export function getStatus(repoPath: string): string {
  return git(repoPath, 'status --short');
}

/**
 * Stage the given files and create a commit with `message`.
 * Only modifies the repository when explicitly called.
 *
 * @param repoPath  Absolute path to the repository.
 * @param files     Paths relative to the repository root to stage.
 * @param message   Commit message.
 * @returns         The full SHA of the new commit.
 */
export function commitFiles(
  repoPath: string,
  files: string[],
  message: string,
): string {
  if (files.length === 0) {
    throw new Error('commitFiles: no files provided to stage');
  }

  // Stage each file individually to avoid command-length limits on Windows
  for (const file of files) {
    const absolutePath = join(repoPath, file);
    git(repoPath, `add "${absolutePath.replace(/\\/g, '/')}"`);
  }

  git(repoPath, `commit -m "${message.replace(/"/g, '\\"')}"`);

  // Return the SHA of HEAD after the commit
  return git(repoPath, 'rev-parse HEAD');
}
