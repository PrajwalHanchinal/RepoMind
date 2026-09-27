import { NextRequest, NextResponse } from 'next/server';
import { generateFeedback } from '@/lib/feedback';
import { getSession } from '@/lib/store';
import { getResult } from '@/lib/store';
import { DEMO_REPO_PATH } from '@/lib/config';
import { runBobFeedback } from '@/lib/bob';

// ---------------------------------------------------------------------------
// POST /api/feedback
//
// Accepts:  { sessionId: string, runId?: string }
// Returns:  { feedback: Feedback, feedbackMdPath: string }
//
// Loads the stored RunResult (using runId if supplied, otherwise the session's
// lastRunId), generates structured feedback by parsing the real output, writes
// FEEDBACK.md to the controlled demo repo, and returns the Feedback object.
//
// repoPath is NEVER taken from the request — always DEMO_REPO_PATH.
// ---------------------------------------------------------------------------

export interface FeedbackRequest {
  sessionId: string;
  runId?: string;
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

  const { sessionId, runId } = body as Partial<FeedbackRequest>;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 },
    );
  }

  // Load the session to validate it exists and to resolve lastRunId
  let session;
  try {
    session = getSession(sessionId.trim());
  } catch {
    return NextResponse.json(
      { error: `Session not found: ${sessionId}` },
      { status: 404 },
    );
  }

  // Resolve which run to generate feedback for
  const resolvedRunId =
    (runId && typeof runId === 'string' && runId.trim()) ||
    session.lastRunId;

  if (!resolvedRunId) {
    return NextResponse.json(
      {
        error:
          'No runId provided and session has no lastRunId. ' +
          'Call /api/verify first.',
      },
      { status: 422 },
    );
  }

  // Load the stored RunResult
  let runResult;
  try {
    runResult = getResult(resolvedRunId);
  } catch {
    return NextResponse.json(
      { error: `Run result not found: ${resolvedRunId}` },
      { status: 404 },
    );
  }

  // Generate feedback from the actual stored result
  let result;
  try {
    result = generateFeedback(runResult, DEMO_REPO_PATH);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Feedback generation failed: ${message}` },
      { status: 500 },
    );
  }

  const bobResult = await runBobFeedback(DEMO_REPO_PATH);

  return NextResponse.json({
    feedback: result.feedback,
    feedbackMdPath: result.feedbackMdPath,
    bob: {
      success: bobResult.success,
      output: bobResult.output,
    },
  });
}
