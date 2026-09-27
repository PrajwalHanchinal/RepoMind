'use client';

import { useState } from 'react';
import type { ImpactReport, TaskSpec, RunResult, Feedback } from '@/types/index';

// ---------------------------------------------------------------------------
// UI-only state types
// ---------------------------------------------------------------------------

type WorkflowStep = 'idle' | 'analysing' | 'impact' | 'task' | 'ready_to_verify' | 'verifying' | 'done';

interface SessionState {
  sessionId: string;
  changeRequest: string;
  impact: ImpactReport | null;
  task: TaskSpec | null;
  verification: RunResult | null;
  feedback: Feedback | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse Jest summary line to get passed/total counts.
 *  Jest prints: "Tests: 12 passed, 12 total" in stdout or stderr. */
function parseTestCounts(output: string): { passed: number; total: number } | null {
  const m = /Tests:\s+(?:\d+ \w+,\s+)*?(\d+) passed(?:,\s+(\d+) total)?/.exec(output);
  if (!m) return null;
  const passed = parseInt(m[1], 10);
  const total = m[2] ? parseInt(m[2], 10) : passed;
  return { passed, total };
}

/** Find the CommandResult for npm run build and npm test from a RunResult. */
function findCommand(run: RunResult, keyword: string) {
  return run.commands.find((c) => c.command.toLowerCase().includes(keyword)) ?? null;
}

/** Capitalise first letter. */
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components (plain JSX — no extra files to keep implementation minimal)
// ---------------------------------------------------------------------------

function CheckCircleIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7.25" stroke={color} strokeWidth="1.5" />
      <path d="M4.5 8l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7.25" stroke={color} strokeWidth="1.5" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.05-3.39L10 6.5h5V1.5l-1.35.85z" fill="currentColor" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor" />
      <rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5L1 14.5h14L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.75" fill="currentColor" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden style={{ animation: 'rm-spin 0.8s linear infinite' }}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <style>{`@keyframes rm-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

type StepId = 'analyze' | 'impact' | 'task' | 'verify' | 'result';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'analyze', label: 'Analyze' },
  { id: 'impact',  label: 'Impact'  },
  { id: 'task',    label: 'Task'    },
  { id: 'verify',  label: 'Verify'  },
  { id: 'result',  label: 'Result'  },
];

function stepIndex(step: WorkflowStep): number {
  switch (step) {
    case 'idle':             return -1;
    case 'analysing':        return 0;
    case 'impact':           return 0;
    case 'task':             return 1;
    case 'ready_to_verify':  return 2;
    case 'verifying':        return 3;
    case 'done':             return 4;
  }
}

function Stepper({ step }: { step: WorkflowStep }) {
  const current = stepIndex(step);
  // steps 0=analyze,1=impact,2=task,3=verify,4=result
  // "done" index at which a step is considered complete:
  const completedAt: Record<StepId, number> = {
    analyze: 0,
    impact:  1,
    task:    2,
    verify:  3,
    result:  4,
  };
  const activeAt: Record<StepId, number> = {
    analyze: -1, // becomes active while current=0 (analyzing) — special case
    impact:  0,
    task:    1,
    verify:  2,
    result:  3,
  };

  return (
    <div className="rm-card" style={{ padding: '10px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 0 }}>
        {STEPS.map((s, i) => {
          const stepDone  = current > completedAt[s.id];
          const stepActive = !stepDone && current === activeAt[s.id] + 1;
          // special: 'analysing' makes analyze active but not done yet
          const isAnalyzeActive = s.id === 'analyze' && (step === 'analysing' || step === 'impact' || step === 'task' || step === 'ready_to_verify' || step === 'verifying' || step === 'done');
          const isAnalyzeDone   = s.id === 'analyze' && (step === 'impact' || step === 'task' || step === 'ready_to_verify' || step === 'verifying' || step === 'done');

          const isDone   = s.id === 'analyze' ? isAnalyzeDone   : stepDone;
          const isActive = s.id === 'analyze' ? (step === 'analysing') :
                           s.id === 'impact'  ? (step === 'impact') :
                           s.id === 'task'    ? (step === 'task') :
                           s.id === 'verify'  ? (step === 'ready_to_verify' || step === 'verifying') :
                           s.id === 'result'  ? (step === 'done') :
                           false;

          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: isActive ? '4px 10px' : undefined,
                  borderRadius: isActive ? 6 : undefined,
                  background: isActive ? 'var(--surface-container)' : undefined,
                  border: isActive ? '1px solid var(--border)' : undefined,
                  flexShrink: 0,
                }}
              >
                {isDone ? (
                  <CheckCircleIcon color="var(--success-icon)" />
                ) : isActive ? (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'inline-block',
                    animation: (step === 'analysing' || step === 'verifying' || step === 'impact' || step === 'task') ? 'rm-pulse 1.5s ease-in-out infinite' : undefined,
                  }} />
                ) : (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    border: '1.5px solid var(--text-muted)',
                    display: 'inline-block',
                    opacity: 0.5,
                  }} />
                )}
                <span
                  className="rm-mono"
                  style={{
                    fontWeight: isDone || isActive ? 600 : 400,
                    color: isDone ? 'var(--text-primary)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    opacity: (!isDone && !isActive) ? 0.6 : 1,
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 12px', minWidth: 20 }} />
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes rm-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Impact card
// ---------------------------------------------------------------------------

function ImpactCard({ impact }: { impact: ImpactReport }) {
  const riskColor =
    impact.riskLevel === 'high'   ? { badge: 'rm-badge rm-badge-error',   icon: <XCircleIcon color="var(--error-text)" /> } :
    impact.riskLevel === 'medium' ? { badge: 'rm-badge rm-badge-warning', icon: <WarningIcon /> } :
                                    { badge: 'rm-badge rm-badge-success',  icon: <CheckCircleIcon color="var(--success-text)" /> };
  return (
    <div className="rm-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="rm-card-header" style={{ marginBottom: 0 }}>
        <h2 className="rm-card-title">Impact</h2>
        <span className="rm-badge rm-badge-neutral">
          {impact.affectedFiles.length} {impact.affectedFiles.length === 1 ? 'file' : 'files'} affected
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {impact.affectedFiles.map((file) => {
          const isTest = /tests?\//.test(file);
          const isSrc  = file.startsWith('src/');
          const label  = isTest ? 'Integration' : isSrc ? 'Core logic' : 'Config';
          return (
            <div
              key={file}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="rm-mono" style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{file}</div>
              </div>
              <span className="rm-badge rm-badge-neutral" style={{ flexShrink: 0 }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Risk level</span>
        <span className={riskColor.badge} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {riskColor.icon}
          {cap(impact.riskLevel)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Implementation Task card
// ---------------------------------------------------------------------------

function TaskCard({ task }: { task: TaskSpec }) {
  return (
    <div className="rm-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="rm-card-header" style={{ marginBottom: 0 }}>
        <h2 className="rm-card-title">Implementation task</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="rm-label" style={{ marginBottom: 4 }}>Change</div>
          <div style={{ fontSize: 13, color: 'var(--text-body)' }}>{task.changeRequest}</div>
        </div>

        <div>
          <div className="rm-label" style={{ marginBottom: 6 }}>Files</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {task.affectedFiles.map((f) => (
              <code
                key={f}
                className="rm-mono"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '2px 8px',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  display: 'inline-block',
                }}
              >
                {f}
              </code>
            ))}
          </div>
        </div>

        <div>
          <div className="rm-label" style={{ marginBottom: 8 }}>Acceptance criteria</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {task.acceptanceCriteria.map((criterion, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-body)' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>
                  <CheckCircleIcon color="var(--success-icon)" />
                </span>
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verification Checks card
// ---------------------------------------------------------------------------

function VerificationChecks({ run }: { run: RunResult }) {
  const buildCmd = findCommand(run, 'build');
  const testCmd  = findCommand(run, 'test');

  const buildPassed = buildCmd ? buildCmd.exitCode === 0 : null;
  const testPassed  = testCmd  ? testCmd.exitCode  === 0 : null;

  const testOutput  = testCmd ? [testCmd.stdout, testCmd.stderr].filter(Boolean).join('\n') : '';
  const testCounts  = testPassed ? parseTestCounts(testOutput) : null;

  function CheckRow({
    label,
    command,
    passed,
    badge,
  }: { label: string; command: string; passed: boolean | null; badge: React.ReactNode }) {
    const iconColor = passed === true ? 'var(--success-icon)' : passed === false ? 'var(--error-text)' : 'var(--text-muted)';
    const Icon = passed === false ? XCircleIcon : CheckCircleIcon;
    return (
      <div style={{
        padding: '10px 0',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon color={iconColor} />
          <div>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
            <code className="rm-mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{command}</code>
          </div>
        </div>
        {badge}
      </div>
    );
  }

  return (
    <div className="rm-card">
      <div className="rm-card-header">
        <h2 className="rm-card-title">Verification checks</h2>
        <span className="rm-mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>2 checks executed</span>
      </div>

      <div>
        <CheckRow
          label="Build"
          command="npm run build"
          passed={buildPassed}
          badge={
            buildPassed === true  ? <span className="rm-badge rm-badge-success">Passed</span> :
            buildPassed === false ? <span className="rm-badge rm-badge-error">Failed</span> :
                                    <span className="rm-badge rm-badge-neutral">—</span>
          }
        />
        <CheckRow
          label="Test suite"
          command="npm test"
          passed={testPassed}
          badge={
            testPassed === true && testCounts
              ? <span className="rm-badge rm-badge-success">{testCounts.passed} / {testCounts.total} passed</span>
              : testPassed === true
              ? <span className="rm-badge rm-badge-success">Passed</span>
              : testPassed === false
              ? <span className="rm-badge rm-badge-error">Failed</span>
              : <span className="rm-badge rm-badge-neutral">—</span>
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result section
// ---------------------------------------------------------------------------

function ResultSection({
  run,
  feedback,
  feedbackLoading,
  feedbackError,
  onRerun,
  onFeedback,
  rerunLoading,
}: {
  run: RunResult | null;
  feedback: Feedback | null;
  feedbackLoading: boolean;
  feedbackError: string | null;
  onRerun: () => void;
  onFeedback: () => void;
  rerunLoading: boolean;
}) {
  const passed = run?.verdict === 'pass';
  const failed = run?.verdict === 'fail' || run?.verdict === 'error';

  const testCmd    = run ? findCommand(run, 'test')  : null;
  const buildCmd   = run ? findCommand(run, 'build') : null;
  const testOutput = testCmd ? [testCmd.stdout, testCmd.stderr].filter(Boolean).join('\n') : '';
  const testCounts = passed && testCmd ? parseTestCounts(testOutput) : null;

  const buildPassed = buildCmd ? buildCmd.exitCode === 0 : null;

  let resultSummary = '';
  if (passed) {
    const parts: string[] = [];
    if (testCounts) parts.push(`${testCounts.passed} tests passed`);
    else if (testCmd?.exitCode === 0) parts.push('Tests passed');
    if (buildPassed) parts.push('Build passed');
    resultSummary = parts.join(' · ');
  }

  return (
    <div className="rm-card">
      <div className="rm-card-header">
        <h2 className="rm-card-title">Result</h2>
        <button
          className="rm-btn-secondary"
          onClick={onRerun}
          disabled={rerunLoading}
        >
          {rerunLoading ? <SpinnerIcon /> : <RefreshIcon />}
          {rerunLoading ? 'Running…' : run ? 'Re-run verification' : 'Run verification'}
        </button>
      </div>

      {!run && !rerunLoading && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Run verification to see results.
        </div>
      )}

      {rerunLoading && (
        <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          <SpinnerIcon /> Running verification…
        </div>
      )}

      {run && !rerunLoading && (
        <div style={{
          padding: '14px',
          borderRadius: 'var(--radius)',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            {passed ? (
              <>
                <span className="rm-badge rm-badge-success" style={{ fontSize: 12, padding: '4px 12px' }}>
                  <CheckCircleIcon color="var(--success-text)" />
                  ✓ Change verified
                </span>
                {resultSummary && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{resultSummary}</span>
                )}
              </>
            ) : (
              <>
                <span className="rm-badge rm-badge-error" style={{ fontSize: 12, padding: '4px 12px' }}>
                  <XCircleIcon color="var(--error-text)" />
                  Change not verified
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {run.verdict === 'error' ? 'Verification error' : 'Build or tests failed'}
                </span>
              </>
            )}
          </div>

          {/* Failure details */}
          {failed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!feedback && !feedbackLoading && (
                <button
                  className="rm-btn-secondary"
                  onClick={onFeedback}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Generate feedback for Bob
                </button>
              )}
              {feedbackLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <SpinnerIcon /> Generating feedback…
                </div>
              )}
              {feedbackError && (
                <div className="rm-error-banner">{feedbackError}</div>
              )}
              {feedback && (
                <FeedbackPanel feedback={feedback} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback panel
// ---------------------------------------------------------------------------

function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  return (
    <div style={{
      background: 'var(--error-bg)',
      border: '1px solid var(--error-border)',
      borderRadius: 'var(--radius)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--error-dark)' }}>
        Feedback written to FEEDBACK.md
      </div>

      {feedback.issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="rm-label" style={{ color: 'var(--error-dark)' }}>Issues</div>
          {feedback.issues.map((issue, i) => (
            <div key={i} style={{
              background: 'var(--surface)',
              border: '1px solid var(--error-border)',
              borderRadius: 'var(--radius)',
              padding: '8px 10px',
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{issue.testName}</div>
              {issue.expected && <div style={{ color: 'var(--text-muted)' }}>Expected: <code className="rm-mono">{issue.expected}</code></div>}
              {issue.received && <div style={{ color: 'var(--text-muted)' }}>Received: <code className="rm-mono">{issue.received}</code></div>}
              {issue.location && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}><code className="rm-mono" style={{ fontSize: 11 }}>{issue.location}</code></div>}
            </div>
          ))}
        </div>
      )}

      {feedback.suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="rm-label" style={{ color: 'var(--error-dark)' }}>Suggestions</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {feedback.suggestions.map((s, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-body)', paddingLeft: 12, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--error-text)' }}>·</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function VerificationPageClient() {
  const [changeRequest, setChangeRequest] = useState('');
  const [session, setSession] = useState<SessionState | null>(null);
  const [step, setStep] = useState<WorkflowStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // -------------------------------------------------------------------------
  // API helpers
  // -------------------------------------------------------------------------

  async function apiPost<T>(path: string, body: Record<string, string>): Promise<T> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? `${path} failed (${res.status})`);
    }
    return data as T;
  }

  // -------------------------------------------------------------------------
  // Analyze → Impact → Task chain
  // -------------------------------------------------------------------------

  async function handleAnalyse() {
    const req = changeRequest.trim();
    if (!req) return;

    setError(null);
    setFeedbackError(null);
    setSession(null);
    setStep('analysing');

    // 1. Analyse
    let analyseData: { sessionId: string; changeRequest: string };
    try {
      analyseData = await apiPost<{ sessionId: string; changeRequest: string }>(
        '/api/analyse',
        { changeRequest: req },
      );
    } catch (e) {
      setError((e as Error).message);
      setStep('idle');
      return;
    }

    const { sessionId } = analyseData;

    // 2. Impact
    setStep('impact');
    let impactData: { impactReport: ImpactReport };
    try {
      impactData = await apiPost<{ impactReport: ImpactReport }>(
        '/api/impact',
        { sessionId },
      );
    } catch (e) {
      setError((e as Error).message);
      setStep('idle');
      return;
    }

    // 3. Task
    setStep('task');
    let taskData: { taskSpec: TaskSpec };
    try {
      taskData = await apiPost<{ taskSpec: TaskSpec }>(
        '/api/task',
        { sessionId },
      );
    } catch (e) {
      setError((e as Error).message);
      setStep('idle');
      return;
    }

    setSession({
      sessionId,
      changeRequest: analyseData.changeRequest,
      impact: impactData.impactReport,
      task: taskData.taskSpec,
      verification: null,
      feedback: null,
    });
    setStep('ready_to_verify');
  }

  // -------------------------------------------------------------------------
  // Verify
  // -------------------------------------------------------------------------

  async function handleVerify() {
    if (!session) return;
    setVerifyLoading(true);
    setStep('verifying');
    setFeedbackError(null);
    // Clear previous feedback when re-running
    setSession((prev) => prev ? { ...prev, feedback: null } : prev);

    let runResult: RunResult;
    try {
      runResult = await apiPost<RunResult>('/api/verify', { sessionId: session.sessionId });
    } catch (e) {
      setError((e as Error).message);
      setStep('ready_to_verify');
      setVerifyLoading(false);
      return;
    }

    setSession((prev) => prev ? { ...prev, verification: runResult, feedback: null } : prev);
    setStep('done');
    setVerifyLoading(false);
  }

  // -------------------------------------------------------------------------
  // Feedback
  // -------------------------------------------------------------------------

  async function handleFeedback() {
    if (!session) return;
    setFeedbackLoading(true);
    setFeedbackError(null);

    try {
      const data = await apiPost<{ feedback: Feedback }>(
        '/api/feedback',
        { sessionId: session.sessionId },
      );
      setSession((prev) => prev ? { ...prev, feedback: data.feedback } : prev);
    } catch (e) {
      setFeedbackError((e as Error).message);
    } finally {
      setFeedbackLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isAnalysing = step === 'analysing' || step === 'impact' || step === 'task';
  const canAnalyse  = changeRequest.trim().length > 0 && !isAnalysing;

  return (
    <div className="rm-shell">
      {/* Sidebar */}
      <aside className="rm-sidebar">
        <div>
          <div className="rm-brand">RepoMind</div>
          <div className="rm-divider" />
          <nav>
            <div className="rm-nav-item">
              <span className="rm-nav-dot" />
              Verification
            </div>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="rm-main">
        {/* Page header */}
        <section className="rm-page-header">
          <div>
            <h1 className="rm-page-title">Verification</h1>
            <p className="rm-page-subtitle">Validate the proposed change against the repository and its tests.</p>
          </div>
          <div className="rm-context-pills">
            <span className="rm-pill">
              <span className="rm-pill-dot" />
              task-api · TypeScript
            </span>
            <span className="rm-pill">main</span>
          </div>
        </section>

        {/* Proposed change */}
        <section className="rm-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="rm-label" style={{ marginBottom: 6 }}>Proposed Change</div>
            <textarea
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              placeholder="Describe the change you want to implement…"
              rows={2}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 15,
                fontWeight: 500,
                lineHeight: 1.5,
                color: 'var(--text-primary)',
                padding: 0,
              }}
              disabled={isAnalysing}
            />
          </div>
          <button
            className="rm-btn-primary"
            onClick={handleAnalyse}
            disabled={!canAnalyse}
          >
            {isAnalysing ? <SpinnerIcon /> : <AnalyticsIcon />}
            {isAnalysing ? 'Analysing…' : 'Analyze change'}
          </button>
        </section>

        {/* Error banner */}
        {error && (
          <div className="rm-error-banner">{error}</div>
        )}

        {/* Stepper — shown once analysis starts */}
        {step !== 'idle' && <Stepper step={step} />}

        {/* Two-column: Impact + Task */}
        {session?.impact && session?.task && (
          <div className="rm-two-col">
            <ImpactCard impact={session.impact} />
            <TaskCard task={session.task} />
          </div>
        )}

        {/* Verification checks — shown once verification has run */}
        {session?.verification && (
          <VerificationChecks run={session.verification} />
        )}

        {/* Result — shown once we reach ready_to_verify step */}
        {(step === 'ready_to_verify' || step === 'verifying' || step === 'done') && (
          <ResultSection
            run={session?.verification ?? null}
            feedback={session?.feedback ?? null}
            feedbackLoading={feedbackLoading}
            feedbackError={feedbackError}
            onRerun={handleVerify}
            onFeedback={handleFeedback}
            rerunLoading={verifyLoading}
          />
        )}

        {/* Footer */}
        <footer className="rm-footer">
          © RepoMind. All rights reserved. 2026
        </footer>
      </main>
    </div>
  );
}
