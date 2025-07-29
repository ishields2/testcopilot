/**
 * This file defines the types for checker output in TestCopilot.
 * CheckerOutput describes the result of analyzing a single test file, including issues, score, and summary.
 * Used by all checkers to keep feedback and reporting consistent and easy to understand for everyone.
 */
import { CheckerResult } from './CheckerResult';

/**
 * Overall rating for a single test file.
 * Used to give feedback like "Good", "Poor", etc.
 */
export type FileScore =
    | 'A - Excellent'
    | 'B - Good'
    | 'C - Fair'
    | 'D - Moderate Risk'
    | 'E - High Risk';

/**
 * Result returned by a checker for a single test file.
 * Contains all issues, a file-level score, and an optional plain-English summary.
 */
export interface CheckerOutput {
    /** The checker that produced this result (e.g. 'raceConditionAnalysis') */
    checkerName: string;

    /** List of issues detected in the file */
    issues: CheckerResult[];

    /** Overall score for the file based on severity of issues */
    fileScore: FileScore;

    /** Optional non-technical summary of the findings */
    plainSummary?: string;
}
