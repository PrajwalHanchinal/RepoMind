import { NextRequest, NextResponse } from 'next/server';
import { analyseRepo } from '@/lib/analyser';
import { createSession, updateSession } from '@/lib/store';
import { DEMO_REPO_PATH } from '@/lib/config';

// ---------------------------------------------------------------------------
// POST /api/analyse
//
// Accepts:  { changeRequest: string }
// Returns:  { sessionId, repoPath, analysis, changeRequest }
//
// Creates a new RepoMind session, runs the real repository analysis against
// the controlled task-api repo, persists the result, and returns it.
//
// The repoPath is NEVER taken from the request — it is always DEMO_REPO_PATH.
// ---------------------------------------------------------------------------

export interface AnalyseRequest {
  changeRequest: string;
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

  const { changeRequest } = body as Partial<AnalyseRequest>;

  if (!changeRequest || typeof changeRequest !== 'string' || changeRequest.trim() === '') {
    return NextResponse.json(
      { error: 'changeRequest is required and must be a non-empty string' },
      { status: 400 },
    );
  }

  let analysis;
  try {
    analysis = analyseRepo(DEMO_REPO_PATH);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Repository analysis failed: ${message}` },
      { status: 500 },
    );
  }

  // Create a session with status 'analysed' and embed the analysis
  let session;
  try {
    session = createSession(DEMO_REPO_PATH, changeRequest.trim());
    session = updateSession(session.id, { analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Session creation failed: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    repoPath: DEMO_REPO_PATH,
    changeRequest: session.changeRequest,
    analysis,
  });
}
