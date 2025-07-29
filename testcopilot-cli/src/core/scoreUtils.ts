/**
 * This file provides scoring utilities for TestCopilot checkers.
 * Functions here calculate numeric scores and grades for test files based on issues found.
 * Used by all checkers to keep scoring logic consistent and easy to understand for both developers and QA.
 */
import type { CheckerResult } from '../types/CheckerResult';

export type Grade = 'A - Excellent' | 'B - Good' | 'C - Fair' | 'D - Moderate Risk' | 'E - High Risk';

/**
 * Calculates the numeric score for a test file based on issues found and number of tests.
 * The score combines pass rate and severity of issues for a fair rating.
 * @param issues - List of issues found in the file.
 * @param numTests - Total number of tests in the file.
 * @param _numTestsWithIssues - (Optional) Number of tests with issues (not used).
 * @param testIssueMap - (Optional) Map of test index to issues for each test.
 * @returns The numeric score for the file (0-100).
 */
export function calculateScore(
    issues: CheckerResult[],
    numTests: number,
    _numTestsWithIssues?: number,
    testIssueMap?: Map<number, CheckerResult[]>
): number {
    if (!numTests || numTests < 1) numTests = 1;

    // Each test starts at 100, deduct 20 for high, 10 for medium, 5 for low per issue
    const testScores: number[] = [];
    // New scoring logic: 70% pass ratio, 30% issue severity
    if (!numTests || numTests < 1) return 100;

    // Count number of tests with any issues
    let totalFailures = 0;
    if (testIssueMap) {
        for (let i = 0; i < numTests; i++) {
            const issuesArr = testIssueMap.get(i) || [];
            if (issuesArr.length > 0) totalFailures++;
        }
    } else {
        totalFailures = issues.length > 0 ? numTests : 0;
    }

    // Count severity
    let severe = 0, medium = 0, low = 0;
    for (const issue of issues) {
        if (issue.severity === 'high') severe++;
        else if (issue.severity === 'medium') medium++;
        else low++;
    }

    const passRatio = (numTests - totalFailures) / numTests;
    const passScore = 70 * passRatio;
    const issueScore = 30 - (severe * 6 + medium * 3 + low * 1.5);
    const finalScore = Math.max(0, Math.min(100, passScore + issueScore));
    return Math.round(finalScore * 10) / 10;
}

/**
 * Converts a numeric score into a grade label for easy feedback.
 * @param score - The numeric score for the file.
 * @returns The grade label (A, B, C, D, or E) with a description.
 */
export function gradeScore(score: number): Grade {
    if (score >= 90) return 'A - Excellent';
    if (score >= 75) return 'B - Good';
    if (score >= 60) return 'C - Fair';
    if (score >= 40) return 'D - Moderate Risk';
    return 'E - High Risk';
}

/**
 * Calculates the average score from a list of scores.
 * Used for codebase-level scoring and reporting.
 * @param scores - Array of numeric scores.
 * @returns The average score (0-100), or 100 if no scores are provided.
 */
export function averageScore(scores: number[]): number {
    if (!scores.length) return 100;
    return Math.max(0, Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10);
}
