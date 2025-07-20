import { FileScore } from './CheckerOutput';

/**
 * Summary stats when scanning an entire codebase (multiple files).
 * Includes overall score and per-checker issue breakdown.
 */
export interface CodebaseSummary {
    /** Total quality rating for the full codebase */
    overallScore: FileScore;

    /** Number of test files analyzed */
    filesAnalyzed: number;

    /** Total number of issues across all checkers */
    totalIssues: number;

    /** Breakdown of how many files/issues each checker contributed */
    perCheckerBreakdown: Record<
        string,
        {
            fileCount: number;
            issueCount: number;
        }
    >;
}
