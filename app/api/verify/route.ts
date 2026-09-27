import { NextRequest, NextResponse } from 'next/server';
import { runChecks } from '@/lib/runner';
import { getSession, updateSession, saveResult } from '@/lib/store';
import { DEMO_REPO_PATH } from '@/lib/config';

// ---------------------------------------------------------------------------
// POST /api/verify
//
// Accepts:  { sessionId: string }
// Returns:  RunResult (runId, verdict, commands[], startedAt, completedAt, …)
//
// Loads the session, runs the real build + test commands against the fixed
// DEMO_REPO_PATH using runChecks(), persists the RunResult, updates the
// session status to 'verified', and returns the full RunResult.
//
// repoPath and commands are NEVER taken from client input.
// ---------------------------------------------------------------------------

export interface VerifyRequest {
  sessionId: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }

  const { sessionId } = body as Partial<VerifyRequest>;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 },
    );
  }

  let session;
  try {
    session = getSession(sessionId.trim());
  } catch {
    return NextResponse.json(
      { error: `Session not found: ${sessionId}` },
      { status: 404 },
    );
  }

  // Run the real verification commands — this is synchronous and may take
  // several seconds while Jest executes. Both commands always run so we
  // capture the full picture even when build fails.
  let runResult;
  try {
    runResult = runChecks(DEMO_REPO_PATH, session.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Verification execution failed: ${message}` },
      { status: 500 },
    );
  }

  // Persist the result and update the session
  try {
    saveResult(runResult);
    updateSession(session.id, {
      status: 'verified',
      lastRunId: runResult.runId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to persist verification result: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(runResult);
}
