/**
 * This file defines the TestCopilotChecker interface used by all checkers in TestCopilot.
 * The interface ensures every checker analyzes a test file and returns results in a standard format.
 * This makes CLI output, documentation, and reporting consistent and easy to use for everyone.
 */
import { File } from '@babel/types';
import { CheckerOutput } from './CheckerOutput';
import { CheckerResult } from './sharedTypes';

export interface TestCopilotChecker {
    /**
     * Unique key for the checker (e.g. 'deepNestingAnalysis').
     * Used to identify the checker in output and configuration.
     */
    key: string;
    /**
     * Framework supported by this checker (e.g. 'cypress', 'playwright', or 'shared').
     */
    framework: 'cypress' | 'playwright' | 'shared';

    /**
     * Description of what the checker does, shown in CLI, documentation, and setup prompts.
     * Should be clear and easy to understand for all users.
     */
    description: string;

    /**
     * Analyzes a single test file and returns the results.
     * @param input - An object containing the file path, file content, and optional AST.
     * @returns The results of the analysis, including issues and scores.
     * @throws May throw if the file cannot be parsed or analyzed.
     */
    analyze(input: {
        path: string;
        content: string;
        ast?: File;
    }): CheckerOutput;

    /**
     * Builds a human-readable summary of the issues found in the file.
     * Used for CLI output and documentation.
     * @param issues - The list of issues found in the file.
     * @param fileScore - The grade or rating for the file.
     * @param numericScore - The numeric score for the file.
     * @returns A plain English summary of the file's reliability and issues.
     */
    buildSummary(issues: CheckerResult[], fileScore: string, numericScore: number): string;
}
