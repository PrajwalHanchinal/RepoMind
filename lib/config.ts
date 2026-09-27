import { resolve } from 'path';

/**
 * The absolute path to the controlled demo repository RepoMind verifies.
 *
 * This is the ONLY repository RepoMind is allowed to analyse or modify.
 * API routes must use this value — they must never accept a repoPath from
 * client input.
 *
 * Override via the REPOMIND_REPO_PATH environment variable when running
 * from a directory other than the project root.
 */
export const DEMO_REPO_PATH: string = process.env.REPOMIND_REPO_PATH
  ? resolve(process.env.REPOMIND_REPO_PATH)
  : resolve(process.cwd(), 'task-api');
