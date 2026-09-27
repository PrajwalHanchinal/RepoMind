import { NextRequest, NextResponse } from 'next/server';
import { writeTask } from '@/lib/taskWriter';
import { getSession, updateSession } from '@/lib/store';
import { DEMO_REPO_PATH } from '@/lib/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// POST /api/task
//
// Accepts:  { sessionId: string }
// Returns:  { sessionId, taskSpec, taskMdContent, taskMdPath, taskJsonPath, commitSha }
//
// Loads the session (which must already contain an ImpactReport from
// /api/impact), generates TASK.md and task.json in the controlled demo repo,
// commits them, and advances the session status to 'task_written'.
//
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET /api/task?sessionId=<id>
//
// Returns the current TASK.md content from the demo repository.
// Used by the UI to display what Bob will read.
//
// ---------------------------------------------------------------------------

export interface TaskPostRequest {
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

  const { sessionId } = body as Partial<TaskPostRequest>;

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

  if (!session.impactReport) {
    return NextResponse.json(
      { error: 'Session has no impact report yet. Call /api/impact first.' },
      { status: 422 },
    );
  }

  let writeResult;
  try {
    writeResult = writeTask(
      DEMO_REPO_PATH,
      session.changeRequest,
      session.impactReport,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Task writing failed: ${message}` },
      { status: 500 },
    );
  }

  let updatedSession;
  try {
    updatedSession = updateSession(session.id, {
      taskSpec: writeResult.taskSpec,
      status: 'task_written',
      lastRunId: undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Session update failed: ${message}` },
      { status: 500 },
    );
  }

  // Read back the written TASK.md content to return in the response
  const taskMdContent = readFileSync(writeResult.taskMdPath, 'utf8');

  return NextResponse.json({
    sessionId: updatedSession.id,
    taskSpec: writeResult.taskSpec,
    taskMdContent,
    taskMdPath: writeResult.taskMdPath,
    taskJsonPath: writeResult.taskJsonPath,
    commitSha: writeResult.commitSha,
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  if (!sessionId || sessionId.trim() === '') {
    return NextResponse.json(
      { error: 'sessionId query parameter is required' },
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

  const taskMdPath = join(DEMO_REPO_PATH, 'TASK.md');
  if (!existsSync(taskMdPath)) {
    return NextResponse.json(
      { error: 'TASK.md has not been written yet for this repository.' },
      { status: 404 },
    );
  }

  const taskMdContent = readFileSync(taskMdPath, 'utf8');

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    taskMdContent,
    taskSpec: session.taskSpec ?? null,
  });
}
