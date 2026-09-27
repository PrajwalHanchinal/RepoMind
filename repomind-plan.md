# RepoMind MVP — Implementation Plan

## Top-Level Overview

RepoMind is a prototype verification layer that sits between a developer's change request and IBM Bob's implementation. It orchestrates the full loop: analyse a repository, prepare a structured task for Bob, run real build/test commands against Bob's output, and return pass/fail feedback that can drive re-verification.

**Scope:** A single Next.js application with API routes serving as the backend. A controlled demo repository ("Task API") acts as the subject codebase Bob modifies. Communication with Bob is file-based — RepoMind writes task files, Bob reads them; Bob writes code, RepoMind reads the results and runs checks.

**Approach:** Minimal, working, no infrastructure beyond Node.js and Git. All state is stored in JSON files on the local filesystem.

---

## Repository Structure

```
repomind/                        ← Next.js application
├── app/
│   ├── page.tsx                 ← Main dashboard UI
│   ├── layout.tsx
│   └── globals.css
├── app/api/
│   ├── analyse/route.ts         ← POST: repository analysis
│   ├── impact/route.ts          ← POST: impact analysis
│   ├── task/route.ts            ← POST/GET: task preparation and retrieval
│   ├── verify/route.ts          ← POST: run real build/test checks
│   └── feedback/route.ts        ← GET: retrieve last feedback
├── lib/
│   ├── git.ts                   ← Git operations (log, diff, status via child_process)
│   ├── analyser.ts              ← File tree + symbol extraction
│   ├── impactAnalyser.ts        ← Diff-based change scope detection
│   ├── taskWriter.ts            ← Writes TASK.md and task.json to demo repo
│   ├── runner.ts                ← Executes build/test commands, captures output
│   └── store.ts                 ← Read/write JSON state files (sessions, results)
├── types/
│   └── index.ts                 ← Shared TypeScript interfaces
├── .repomind/                   ← Runtime state (gitignored)
│   ├── sessions/                ← One JSON file per verification session
│   └── results/                 ← One JSON file per verification run
└── task-api/                    ← Controlled demo repository (separate Git repo)
```

---

## Controlled Demo Repository — task-api

```
task-api/
├── src/
│   └── index.ts                 ← Express HTTP server, CRUD routes for tasks
├── tests/
│   └── task.test.ts             ← Jest tests (intentionally breakable for demo)
├── package.json                 ← "test": "jest", "build": "tsc"
├── tsconfig.json
├── TASK.md                      ← Written by RepoMind; read by Bob
└── task.json                    ← Structured machine-readable version of TASK.md
```

`task-api` must be a real Git repository with at least one failing test scenario available as a named branch so that the pass/fail cycle can be demonstrated end-to-end.

---

## Core Modules

### `lib/git.ts`
Thin wrapper around `child_process.execSync`. Exposes:
- `getLog(repoPath, n)` — last N commits
- `getDiff(repoPath, base, head)` — unified diff between two refs
- `getStatus(repoPath)` — current working tree status
- `getFileTree(repoPath)` — list of tracked files

### `lib/analyser.ts`
Reads the file tree of the target repo. Extracts:
- Top-level directory structure
- File count by extension
- Entry points (package.json main/scripts)
No AST parsing — keep it file-system-level for speed.

### `lib/impactAnalyser.ts`
Given a natural-language change request and the file tree, produces a structured impact report:
- Likely files affected (by keyword matching against file names and paths)
- Risk level (low / medium / high) based on how central the affected files are
- Suggested test scope

### `lib/taskWriter.ts`
Writes two files into the demo repo root:
- `TASK.md` — human-readable Markdown task description for Bob
- `task.json` — machine-readable JSON with all fields structured

Both files are committed to the demo repo by RepoMind so Bob operates on a clean Git state.

### `lib/runner.ts`
Runs real shell commands (e.g. `npm test`, `npm run build`) inside the demo repo directory using `child_process.spawn`. Captures stdout, stderr, exit code, and duration. Returns a structured `RunResult` object.

### `lib/store.ts`
Read/write helpers for the `.repomind/` directory. Each verification session is a JSON file named by session ID (timestamp + short UUID). No database — plain `fs.readFileSync` / `fs.writeFileSync`.

---

## API Endpoints

| Method | Path | Input | Output |
|--------|------|-------|--------|
| POST | `/api/analyse` | `{ repoPath, changeRequest }` | `{ sessionId, fileTree, entryPoints, recentCommits }` |
| POST | `/api/impact` | `{ sessionId, changeRequest }` | `{ affectedFiles, riskLevel, testScope }` |
| POST | `/api/task` | `{ sessionId }` | `{ taskPath, taskMdContent }` (writes TASK.md + task.json) |
| GET | `/api/task?sessionId=` | — | current TASK.md content |
| POST | `/api/verify` | `{ sessionId }` | `{ runId, status, stdout, stderr, exitCode, duration }` |
| GET | `/api/feedback?runId=` | — | `{ verdict, issues[], suggestions[] }` |

All endpoints read/write session state from `.repomind/sessions/`. All responses are JSON.

---

## Verification Workflow

```
1. Developer submits change request (UI form → POST /api/analyse)
2. RepoMind reads the demo repo file tree and recent commits
3. Developer reviews analysis → POST /api/impact
4. RepoMind identifies affected files and risk level
5. Developer confirms → POST /api/task
6. RepoMind writes TASK.md + task.json to the demo repo root and commits them
7. Bob reads TASK.md, implements the change, commits to demo repo
8. Developer clicks "Verify" → POST /api/verify
9. RepoMind runs `npm run build` then `npm test` inside demo repo
10. Results (stdout, stderr, exit code) stored in .repomind/results/
11. If exit code 0 → PASS displayed in UI
12. If exit code non-zero → GET /api/feedback extracts failed test names,
    formats actionable feedback, displays in UI
13. Developer shares feedback with Bob; Bob fixes; loop returns to step 8
```

---

## How RepoMind Communicates with Bob

RepoMind uses **repository files as the communication channel**. There is no API between RepoMind and Bob.

**RepoMind → Bob:**
- Writes `TASK.md` to the demo repo root. This file contains:
  - The change request in plain language
  - The impact analysis (affected files, risk level)
  - Acceptance criteria (derived from existing test names)
  - The exact commands Bob must not break: `npm run build` and `npm test`
- Writes `task.json` alongside `TASK.md` for structured parsing if needed.
- Commits both files so Bob always starts from a clean Git state.

**Bob → RepoMind:**
- Bob implements the change and commits to the demo repo.
- RepoMind detects the new commit(s) via Git status/log before running verification.
- No explicit signal needed — the presence of new commits since the task commit is sufficient.

**Feedback loop:**
- When verification fails, RepoMind generates a `FEEDBACK.md` file in the demo repo root (in addition to the UI display). Bob can read this file directly as context for the fix.

---

## What to Implement First

Priority order for the 24-hour window:

1. **`task-api` demo repo** — must exist first; everything else depends on it being real and runnable.
2. **`lib/runner.ts`** — the core verification primitive; validate it runs real commands before building UI.
3. **`lib/store.ts`** + session schema in `types/index.ts` — defines data shapes for all other modules.
4. **`lib/git.ts`** — needed by analyse and impact endpoints.
5. **`/api/analyse` and `/api/impact` routes** + `lib/analyser.ts` + `lib/impactAnalyser.ts`.
6. **`lib/taskWriter.ts`** + **`/api/task` route** — write TASK.md and task.json.
7. **`/api/verify` route** — calls runner, stores result.
8. **`/api/feedback` route** — parses runner output, formats feedback, writes FEEDBACK.md.
9. **Next.js UI** — single-page dashboard wiring together the above steps with status display.

---

## What Must Be Excluded (24-hour constraint)

- **Authentication / authorisation** — not needed for a local prototype demo.
- **Multi-repository support** — demo repo path is a fixed config value.
- **AST / semantic code analysis** — file-tree + keyword matching is sufficient.
- **RAG / vector search / embeddings** — excluded by constraint.
- **Database** — all state in `.repomind/` JSON files.
- **Docker / containerisation** — commands run directly in the local Node.js process.
- **Webhook / CI integration** — verification is triggered manually from the UI.
- **User management / session auth** — single-user local tool.
- **Diff visualisation** — plain text output in the UI is sufficient.
- **Streaming logs** — capture full output then display; no real-time streaming.
- **Multiple concurrent sessions** — last-session-wins is acceptable.
- **Automatic Bob invocation** — Bob is invoked manually by the developer after reading TASK.md.

---

## Sub-Tasks

---

### Sub-Task 1 — Scaffold the controlled demo repository (task-api)

**Intent:** Create `task-api` as a real, self-contained TypeScript/Express project with Jest tests and deliberate breakability. This is the subject codebase Bob will modify and RepoMind will verify.

**Expected Outcomes:**
- `task-api/` is an initialised Git repository.
- `npm run build` compiles without errors on the main branch.
- `npm test` passes on the main branch.
- A `failing-branch` branch exists where at least one test fails, enabling the demo.
- `TASK.md` and `task.json` placeholders exist in the root.

**Todo List:**
1. Create `task-api/` directory with `package.json`, `tsconfig.json`.
2. Implement `src/index.ts`: Express server with GET /tasks, POST /tasks, GET /tasks/:id, DELETE /tasks/:id, in-memory store.
3. Implement `tests/task.test.ts`: Jest + supertest tests covering happy paths and one edge case.
4. Verify `npm run build` and `npm test` pass.
5. Create `TASK.md` and `task.json` as empty placeholder files.
6. `git init`, initial commit on `main`.
7. Create `failing-branch`: introduce a deliberate regression (wrong status code or missing field) to make one test fail.

**Relevant Context:** `task-api/` lives inside the `repomind/` workspace directory but is a separate Git repo (`task-api/.git`). RepoMind will reference it by absolute path in config.

**Status:** [ ] pending

---

### Sub-Task 2 — Core library modules: store, git, runner

**Intent:** Implement the three lowest-level utility modules that everything else depends on.

**Expected Outcomes:**
- `lib/store.ts` can create, read, and update session and result JSON files in `.repomind/`.
- `lib/git.ts` can return file tree, recent commits, and diff for a given repo path.
- `lib/runner.ts` can execute `npm run build` and `npm test` in a given directory and return structured output including stdout, stderr, exit code, and duration.
- All types defined in `types/index.ts`.

**Todo List:**
1. Define all shared TypeScript interfaces in `types/index.ts`: `Session`, `ImpactReport`, `TaskSpec`, `RunResult`, `Feedback`.
2. Implement `lib/store.ts`: `createSession`, `getSession`, `updateSession`, `saveResult`, `getResult`.
3. Implement `lib/git.ts`: `getFileTree`, `getLog`, `getDiff`, `getStatus`, `commitFiles`.
4. Implement `lib/runner.ts`: `runChecks(repoPath, commands)` → `RunResult`.

**Relevant Context:** `.repomind/` must be listed in `repomind/.gitignore`. `child_process` is Node built-in — no extra packages needed for git or runner.

**Status:** [ ] pending

---

### Sub-Task 3 — Analyser and impact modules

**Intent:** Implement the logic that inspects the demo repo and reasons about what a change request would affect.

**Expected Outcomes:**
- `lib/analyser.ts` returns a structured view of the demo repo: file list, extension counts, detected entry points.
- `lib/impactAnalyser.ts` takes a change request string and returns affected files, risk level, and suggested test scope via keyword matching against the file tree.

**Todo List:**
1. Implement `lib/analyser.ts`: walk the file tree using `fs`, skip `node_modules` and `.git`, extract entry points from `package.json`.
2. Implement `lib/impactAnalyser.ts`: tokenise the change request, match tokens against file paths, score by path depth and centrality, return `ImpactReport`.

**Relevant Context:** No AST parsing. Keep it to `fs` operations and string matching. The demo repo is small — performance is not a concern.

**Status:** [ ] pending

---

### Sub-Task 4 — Task writer module and API endpoints

**Intent:** Implement the module that generates and commits TASK.md / task.json, and wire up the API routes for the full analyse → impact → task pipeline.

**Expected Outcomes:**
- `lib/taskWriter.ts` generates well-structured TASK.md and task.json from session data and commits them to the demo repo.
- `/api/analyse`, `/api/impact`, and `/api/task` routes work end-to-end.
- A session JSON file is created and updated correctly at each step.

**Todo List:**
1. Implement `lib/taskWriter.ts`: build TASK.md content from `Session` + `ImpactReport`, write both files, call `git.commitFiles`.
2. Implement `app/api/analyse/route.ts`: call analyser, create session, return analysis.
3. Implement `app/api/impact/route.ts`: load session, call impactAnalyser, update session, return impact report.
4. Implement `app/api/task/route.ts` (POST): load session, call taskWriter, update session status to `task_written`.
5. Implement `app/api/task/route.ts` (GET): return current TASK.md content from demo repo.

**Relevant Context:** `taskWriter` must call `git.commitFiles` so Bob always starts from a committed state. TASK.md format must be readable standalone — Bob will open this file directly.

**Status:** [ ] pending

---

### Sub-Task 5 — Verify and feedback API endpoints

**Intent:** Implement the verification runner and feedback formatter that produce the pass/fail result and actionable output.

**Expected Outcomes:**
- POST `/api/verify` runs real `npm run build` and `npm test` commands and returns structured results.
- GET `/api/feedback` parses the test output, identifies failing tests by name, and returns a structured feedback object.
- On failure, `FEEDBACK.md` is written to the demo repo root so Bob can read it directly.

**Todo List:**
1. Implement `app/api/verify/route.ts`: load session, call `runner.runChecks`, save `RunResult`, return result.
2. Implement a `parseFeedback(runResult: RunResult): Feedback` function (inline in feedback route or in `lib/`): extract failing test names from Jest output using regex, produce `suggestions[]`.
3. Implement `app/api/feedback/route.ts`: load `RunResult`, call `parseFeedback`, write `FEEDBACK.md` to demo repo if failed, return `Feedback`.

**Relevant Context:** Jest outputs failing test names in the format `✕ <test name>` or `● <test name>`. A simple regex is sufficient. FEEDBACK.md should include: verdict, list of failing tests, and a plain-language suggestion per failure.

**Status:** [ ] pending

---

### Sub-Task 6 — Next.js dashboard UI

**Intent:** Build the single-page dashboard that walks the developer through the full workflow with clear status at each step.

**Expected Outcomes:**
- Developer can enter a change request and repo path, click "Analyse", and see the file tree and recent commits.
- Developer can click "Impact Analysis" and see affected files and risk level.
- Developer can click "Prepare Task" and see the generated TASK.md content.
- After Bob implements the change, developer clicks "Verify" and sees PASS or FAIL with full output.
- On FAIL, actionable feedback is displayed and a "Re-verify" button is available.

**Todo List:**
1. Implement `app/page.tsx` as a multi-step form: Step 1 Analyse, Step 2 Impact, Step 3 Task, Step 4 Verify, Step 5 Result.
2. Each step calls its corresponding API route and displays the response.
3. Use Tailwind CSS for layout — no component library needed.
4. Display raw stdout/stderr in a `<pre>` block on the result step.
5. Display structured feedback (failing test names + suggestions) below the raw output on failure.
6. "Re-verify" button resets to Step 4.

**Relevant Context:** No state management library needed — React `useState` is sufficient for a linear 5-step flow. Keep all API calls in the component using `fetch`.

**Status:** [ ] pending

---

### Sub-Task 7 — Integration smoke test and demo script

**Intent:** Validate the full end-to-end workflow manually and produce a short demo script that can be followed in the 24-hour presentation window.

**Expected Outcomes:**
- Full workflow completes without errors on the `main` branch of `task-api` (PASS result).
- Full workflow completes and produces meaningful failure feedback on `failing-branch` (FAIL result).
- A `DEMO.md` file in the repo root describes the exact steps to run the demo.

**Todo List:**
1. Run the full workflow against `task-api` main branch — confirm PASS.
2. Switch `task-api` to `failing-branch`, re-run verify — confirm FAIL with feedback.
3. Write `DEMO.md` with step-by-step instructions.
4. Verify FEEDBACK.md is written to `task-api` root on failure.
5. Fix any issues found during smoke test.

**Relevant Context:** The demo must show the pass case and the fail-then-fix-then-reVerify case. DEMO.md should be self-contained enough for a stakeholder to follow.

**Status:** [ ] pending
