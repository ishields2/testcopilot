// Playwright sample checker (proof of concept)
import type { TestCopilotChecker, CheckerOutput, CheckerResult } from '../../types/sharedTypes';

export const samplePlaywrightChecker: TestCopilotChecker = {
    key: 'samplePlaywrightChecker',
    framework: 'playwright',
    description: 'Sample Playwright checker for proof of concept.',
    analyze({ path, content, ast }): CheckerOutput {
        return {
            checkerName: 'samplePlaywrightChecker',
            filePath: path,
            issues: [{
                message: 'This is a sample Playwright checker output.',
                severity: 'info',
                location: { line: 1 },
            } as CheckerResult],
            fileScore: 'A - Excellent',
            numericScore: 100,
            plainSummary: 'Sample Playwright checker ran.'
        };
    },
    buildSummary(issues, fileScore, numericScore) {
        return `Playwright sample: ${issues.length} issues. Score: ${fileScore} (${numericScore})`;
    }
};
