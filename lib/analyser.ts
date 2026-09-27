import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getFileTree, getLog } from '@/lib/git';
import type { RepoAnalysis } from '@/types/index';

// ---------------------------------------------------------------------------
// Entry-point detection rules
// ---------------------------------------------------------------------------

/**
 * A rule is a function that accepts the file tree and the (optionally parsed)
 * package.json and returns zero or more entry-point paths.
 *
 * Rules are intentionally simple and deterministic — no heuristics beyond
 * file-path pattern matching and package.json field inspection.
 */
type EntryPointRule = (
  files: string[],
  pkg: Record<string, unknown> | null,
) => string[];

const ENTRY_POINT_RULES: EntryPointRule[] = [
  // 1. package.json `main` field (compiled output path)
  (_files, pkg) => {
    const main = pkg?.main;
    return typeof main === 'string' ? [main] : [];
  },

  // 2. package.json `scripts.start` — extract the path after "node "
  (_files, pkg) => {
    const start = (pkg as { scripts?: Record<string, string> } | null)
      ?.scripts?.start;
    if (!start) return [];
    const match = /node\s+(\S+)/.exec(start);
    return match ? [match[1]] : [];
  },

  // 3. Conventional source entry points
  (files) =>
    files.filter(
      (f) =>
        f === 'src/index.ts' ||
        f === 'src/index.js' ||
        f === 'index.ts' ||
        f === 'index.js',
    ),

  // 4. Test files — surfaces the test entry so Bob knows what to protect
  (files) => files.filter((f) => /tests?\/.*\.(test|spec)\.[tj]s$/.test(f)),
];

// ---------------------------------------------------------------------------
// Package.json loader
// ---------------------------------------------------------------------------

function loadPackageJson(repoPath: string): Record<string, unknown> | null {
  const pkgPath = join(repoPath, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse the repository at `repoPath` and return a `RepoAnalysis`.
 *
 * Uses real Git data via `getFileTree` and `getLog` from `lib/git`.
 * Entry points are detected by deterministic rules against the tracked file
 * list and the `package.json` fields — no AST or semantic analysis.
 *
 * @param repoPath  Absolute path to the repository to analyse.
 * @param logDepth  Number of recent commits to include (default 10).
 */
export function analyseRepo(repoPath: string, logDepth = 10): RepoAnalysis {
  const fileTree = getFileTree(repoPath);
  const recentCommits = getLog(repoPath, logDepth);
  const pkg = loadPackageJson(repoPath);

  // Collect entry points from all rules, then deduplicate
  const rawEntryPoints = ENTRY_POINT_RULES.flatMap((rule) =>
    rule(fileTree, pkg),
  );
  const entryPoints = [...new Set(rawEntryPoints)];

  return {
    fileTree,
    entryPoints,
    recentCommits,
  };
}
