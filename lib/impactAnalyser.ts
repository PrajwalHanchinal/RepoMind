import type { ImpactReport, RepoAnalysis, RiskLevel } from '@/types/index';

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

/**
 * Normalise a change request string into a set of lowercase tokens.
 *
 * Splits on whitespace and common punctuation, removes stop-words, and
 * keeps tokens of at least 3 characters.
 */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'into',
  'when', 'then', 'also', 'but', 'not', 'add', 'all', 'any',
  'are', 'was', 'has', 'have', 'its', 'our', 'can', 'will',
  'should', 'must', 'need', 'want', 'make', 'change', 'update',
  'modify', 'implement', 'fix', 'please', 'now',
]);

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,./:;()\[\]{}"'`!?=<>@#$%^&*+|\\-]+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

// ---------------------------------------------------------------------------
// File scoring
// ---------------------------------------------------------------------------

/**
 * Score a single file path against a set of query tokens.
 *
 * Scoring rules (deterministic, additive):
 * - +3 for each token that appears as a complete path segment
 * - +2 for each token that appears as a substring anywhere in the path
 * - ×1.5 multiplier for source files (src/)
 * - ×1.2 multiplier for test files (tests?/)
 * - ×0.5 penalty for config/lock files that are unlikely to need edits
 */
function scoreFile(filePath: string, tokens: string[]): number {
  const lowerPath = filePath.toLowerCase();
  const segments = lowerPath.replace(/\\/g, '/').split('/');
  const lastSegment = segments[segments.length - 1] ?? '';
  // Remove extension for segment matching
  const baseName = lastSegment.replace(/\.[^.]+$/, '');

  let score = 0;

  for (const token of tokens) {
    if (segments.includes(token) || baseName === token) {
      score += 3;
    } else if (lowerPath.includes(token)) {
      score += 2;
    }
  }

  if (score === 0) return 0;

  // Apply path-type multipliers
  if (/^src\//.test(lowerPath)) score *= 1.5;
  if (/^tests?\//.test(lowerPath)) score *= 1.2;
  if (/\.(lock|sum|mod)$/.test(lowerPath)) score *= 0.5;
  if (lowerPath === 'package-lock.json') score *= 0.1;

  return score;
}

// ---------------------------------------------------------------------------
// Risk level determination
// ---------------------------------------------------------------------------

/**
 * Determine risk level from the matched files and entry points.
 *
 * Rules (explicit, in priority order):
 * - high   if any entry point is directly in the affected list
 * - high   if more than 30 % of tracked source files are affected
 * - medium if any test file is affected
 * - medium if 2 or more source files are affected
 * - low    otherwise
 */
function determineRisk(
  affectedFiles: string[],
  entryPoints: string[],
  totalTrackedFiles: number,
): RiskLevel {
  const affectedSet = new Set(affectedFiles);

  const entryPointHit = entryPoints.some((ep) => affectedSet.has(ep));
  if (entryPointHit) return 'high';

  const srcFiles = affectedFiles.filter((f) => f.startsWith('src/'));
  const totalSrcFiles = Math.max(totalTrackedFiles, 1);
  if (srcFiles.length / totalSrcFiles > 0.3) return 'high';

  const testHit = affectedFiles.some((f) => /tests?\//.test(f));
  if (testHit) return 'medium';

  if (srcFiles.length >= 2) return 'medium';

  return 'low';
}

// ---------------------------------------------------------------------------
// Test scope determination
// ---------------------------------------------------------------------------

/**
 * Derive the suggested test scope from the affected files.
 *
 * Rules:
 * - Always include all test files tracked in the repository.
 * - Prefix each with "run: npm test" as the concrete action.
 * - If no test files are tracked, suggest running the full test suite.
 */
function deriveTestScope(
  affectedFiles: string[],
  fileTree: string[],
): string[] {
  const testFiles = fileTree.filter((f) => /tests?\/.*\.(test|spec)\.[tj]s$/.test(f));

  if (testFiles.length === 0) {
    return ['Run full test suite: npm test'];
  }

  // If a source file is affected, always run the full suite (no selective test runner configured)
  const srcAffected = affectedFiles.some((f) => f.startsWith('src/'));
  if (srcAffected) {
    return [`Run full test suite covering: ${testFiles.join(', ')}`];
  }

  return testFiles.map((f) => `Run tests in: ${f}`);
}

// ---------------------------------------------------------------------------
// Rationale builder
// ---------------------------------------------------------------------------

function buildRationale(
  tokens: string[],
  affectedFiles: string[],
  riskLevel: RiskLevel,
): string {
  const matchedTokens = tokens.slice(0, 5).join(', ');
  const fileCount = affectedFiles.length;

  const riskReason =
    riskLevel === 'high'
      ? 'one or more entry points or a large proportion of source files are affected'
      : riskLevel === 'medium'
        ? 'test files or multiple source files are involved'
        : 'only peripheral files are affected';

  return (
    `Keyword matching on tokens [${matchedTokens}] identified ${fileCount} ` +
    `file(s) as likely affected. Risk is ${riskLevel} because ${riskReason}.`
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Produce an `ImpactReport` for a given change request against the supplied
 * repository analysis.
 *
 * Analysis is entirely deterministic: keyword/path matching + explicit risk
 * rules. No AST, semantic, ML, or AI-powered reasoning is involved.
 *
 * @param changeRequest  The developer's natural-language change request.
 * @param analysis       The `RepoAnalysis` produced by `lib/analyser`.
 */
export function analyseImpact(
  changeRequest: string,
  analysis: RepoAnalysis,
): ImpactReport {
  const tokens = tokenise(changeRequest);

  // Score every tracked file and keep those that scored above zero
  const scored = analysis.fileTree
    .map((file) => ({ file, score: scoreFile(file, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const affectedFiles = scored.map(({ file }) => file);

  // Fall back: if nothing matched, flag the main source files as a safety net
  const finalAffected =
    affectedFiles.length > 0
      ? affectedFiles
      : analysis.fileTree.filter((f) => f.startsWith('src/'));

  const riskLevel = determineRisk(
    finalAffected,
    analysis.entryPoints,
    analysis.fileTree.length,
  );

  const testScope = deriveTestScope(finalAffected, analysis.fileTree);

  const rationale = buildRationale(tokens, finalAffected, riskLevel);

  return {
    affectedFiles: finalAffected,
    riskLevel,
    testScope,
    rationale,
  };
}
