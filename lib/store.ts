import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import type { Session, SessionStatus, RunResult } from '@/types/index';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/**
 * Root of the .repomind state directory.
 * Resolved relative to the RepoMind project root (process.cwd()), not the
 * demo repository.
 */
function repomindRoot(): string {
  return resolve(process.cwd(), '.repomind');
}

function sessionsDir(): string {
  return join(repomindRoot(), 'sessions');
}

function resultsDir(): string {
  return join(repomindRoot(), 'results');
}

function sessionPath(sessionId: string): string {
  return join(sessionsDir(), `${sessionId}.json`);
}

function resultPath(runId: string): string {
  return join(resultsDir(), `${runId}.json`);
}

/** Ensure a directory exists, creating it (and parents) if necessary. */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * Create a new session and persist it to disk.
 * Returns the created Session.
 */
export function createSession(
  repoPath: string,
  changeRequest: string,
): Session {
  ensureDir(sessionsDir());

  const now = new Date().toISOString();
  const session: Session = {
    id: randomUUID(),
    repoPath,
    changeRequest,
    status: 'analysed',
    createdAt: now,
    updatedAt: now,
  };

  writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf8');
  return session;
}

/**
 * Load a session by id.
 * Throws if the session file does not exist.
 */
export function getSession(sessionId: string): Session {
  const path = sessionPath(sessionId);
  if (!existsSync(path)) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as Session;
}

/**
 * Merge partial updates into an existing session and persist.
 * Always bumps updatedAt.
 */
export function updateSession(
  sessionId: string,
  updates: Partial<Omit<Session, 'id' | 'createdAt'>>,
): Session {
  const existing = getSession(sessionId);
  const updated: Session = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(sessionPath(sessionId), JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

/**
 * Convenience wrapper: advance a session's status field.
 */
export function advanceSessionStatus(
  sessionId: string,
  status: SessionStatus,
): Session {
  return updateSession(sessionId, { status });
}

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

/**
 * Persist a RunResult to disk.
 */
export function saveResult(result: RunResult): void {
  ensureDir(resultsDir());
  writeFileSync(resultPath(result.runId), JSON.stringify(result, null, 2), 'utf8');
}

/**
 * Load a RunResult by runId.
 * Throws if the result file does not exist.
 */
export function getResult(runId: string): RunResult {
  const path = resultPath(runId);
  if (!existsSync(path)) {
    throw new Error(`Run result not found: ${runId}`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as RunResult;
}
