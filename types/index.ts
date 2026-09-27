// ---------------------------------------------------------------------------
// Session
// A verification session is created when the developer submits a change
// request. It tracks the request through analysis → impact → task → verify.
// ---------------------------------------------------------------------------
export type SessionStatus =
  | 'analysed'
  | 'impact_assessed'
  | 'task_written'
  | 'verified';

export interface Session {
  id: string;
  repoPath: string;
  changeRequest: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  analysis?: RepoAnalysis;
  impactReport?: ImpactReport;
  taskSpec?: TaskSpec;
  lastRunId?: string;
}

// ---------------------------------------------------------------------------
// RepoAnalysis
// Output of the repository analysis step.
// ---------------------------------------------------------------------------
export interface RepoAnalysis {
  fileTree: string[];
  entryPoints: string[];
  recentCommits: CommitSummary[];
}

export interface CommitSummary {
  hash: string;
  author: string;
  date: string;
  message: string;
}

// ---------------------------------------------------------------------------
// ImpactReport
// Output of the impact analysis step.
// ---------------------------------------------------------------------------
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ImpactReport {
  affectedFiles: string[];
  riskLevel: RiskLevel;
  testScope: string[];
  rationale: string;
}

// ---------------------------------------------------------------------------
// TaskSpec
// The structured task written to the demo repo for Bob to read.
// ---------------------------------------------------------------------------
export interface TaskSpec {
  version: '1';
  changeRequest: string;
  affectedFiles: string[];
  riskLevel: RiskLevel;
  acceptanceCriteria: string[];
  verificationCommands: string[];
}

// ---------------------------------------------------------------------------
// RunResult
// The raw output of running build/test commands against the demo repo.
// ---------------------------------------------------------------------------
export type RunVerdict = 'pass' | 'fail' | 'error';

export interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface RunResult {
  runId: string;
  sessionId: string;
  repoPath: string;
  verdict: RunVerdict;
  commands: CommandResult[];
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Feedback
// Structured feedback derived from a failed RunResult, shown in the UI
// and written to FEEDBACK.md for Bob to read.
// ---------------------------------------------------------------------------
export interface FeedbackIssue {
  testName: string;
  expected: string;
  received: string;
  location: string;
}

export interface Feedback {
  runId: string;
  verdict: RunVerdict;
  issues: FeedbackIssue[];
  suggestions: string[];
  rawOutput: string;
}
