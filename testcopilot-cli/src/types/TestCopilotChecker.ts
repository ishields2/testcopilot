import { File } from '@babel/types';
import { CheckerOutput } from './CheckerOutput';

/**
 * Contract that all TestCopilot checkers must follow.
 * Each checker analyzes a single file and returns results in a standard format.
 */
export interface TestCopilotChecker {
    /** Unique key for the checker (e.g. 'deepNestingAnalysis') */
    key: string;

    /** Rich description shown in CLI, docs, or setup prompts */
    description: string;

    /**
     * Main function to analyze a file.
     * Accepts file content + path (and optional AST), and returns analysis results.
     */
    analyze(input: {
        path: string;
        content: string;
        ast?: File; // Babel AST, optional for regex-based checkers
    }): CheckerOutput;
}
