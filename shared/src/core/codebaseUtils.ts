/**
 * This file provides utilities for codebase-level analysis in TestCopilot.
 * It aggregates results from all files and produces an overall score and summary for the whole test suite.
 * Used to give teams a clear, non-technical overview of test reliability across the codebase.
 */
import { CheckerOutput } from '../types/CheckerOutput';
import { averageScore, gradeScore } from './scoreUtils';

/**
 * Result of codebase-level analysis.
 */
export interface CodebaseOutput {
    overallScore: number;
    overallGrade: string;
    fileResults: CheckerOutput[];
    plainSummary: string;
}

/**
 * Aggregates results from all files and produces codebase-level score and summary.
 * @param fileResults - Array of CheckerOutput for each file.
 * @returns CodebaseOutput with overall score, grade, and summary.
 */
export function aggregateCheckerResults(fileResults: CheckerOutput[]): CodebaseOutput {
    // Use the average of all numericScore values for codebase score
    const scores = fileResults.map(f => typeof f.numericScore === 'number' ? f.numericScore : 100);
    const overallScore = averageScore(scores);
    const overallGrade = gradeScore(overallScore);

    const totalFiles = fileResults.length;
    const filesWithIssues = fileResults.filter(f => f.issues && f.issues.length > 0).length;

    const plainSummary = [
        `Codebase reliability rating: ${overallGrade} (score: ${overallScore.toFixed(1)})`,
        '',
        `Analyzed ${totalFiles} test files.`,
        filesWithIssues === 0
            ? '✅ All files show strong async practices and reliability.'
            : `⚠️ ${filesWithIssues} file(s) contain patterns that may cause flakiness or unreliable results.`,
        '',
        'Improving flagged files will make your test suite more stable and trustworthy for the whole team.'
    ].join('\n');

    return {
        overallScore,
        overallGrade,
        fileResults,
        plainSummary
    };
}
