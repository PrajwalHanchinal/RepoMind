import { NextRequest, NextResponse } from 'next/server';
import { analyseImpact } from '@/lib/impactAnalyser';
import { getSession, updateSession } from '@/lib/store';

// ---------------------------------------------------------------------------
// POST /api/impact
//
// Accepts:  { sessionId: string }
// Returns:  { sessionId, impactReport }
//
// Loads the session (which already contains the RepoAnalysis from /api/analyse),
// runs the impact analysis, persists the ImpactReport in the session, and
// returns it.
//
// No filesystem path is accepted from the client.
// ---------------------------------------------------------------------------

export interface ImpactRequest {
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

  const { sessionId } = body as Partial<ImpactRequest>;

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

  if (!session.analysis) {
    return NextResponse.json(
      { error: 'Session has no analysis yet. Call /api/analyse first.' },
      { status: 422 },
    );
  }

  let impactReport;
  try {
    impactReport = analyseImpact(session.changeRequest, session.analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Impact analysis failed: ${message}` },
      { status: 500 },
    );
  }

  let updatedSession;
  try {
    updatedSession = updateSession(session.id, {
      impactReport,
      status: 'impact_assessed',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Session update failed: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sessionId: updatedSession.id,
    impactReport,
  });
}
