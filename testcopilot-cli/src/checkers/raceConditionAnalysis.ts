import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { TestCopilotChecker, CheckerResult, CheckerOutput } from '../types/sharedTypes';
import { calculateScore, gradeScore } from '../core/scoreUtils';
import {
    getTestBlocks,
    mapIssuesToTestBlocks,
    getAssertionLines,
    getActionNodes
} from '../core/checkerUtils';

/**
 * The raceConditionAnalysis checker detects flaky async patterns in Cypress tests.
 * It flags hardcoded waits, missing intercepts, and user actions not followed by assertions.
 * This helps teams write more reliable, maintainable, and trustworthy tests.
 */
export const raceConditionAnalysis: TestCopilotChecker = {
    key: 'raceConditionAnalysis',
    description: `Detects flaky wait patterns (cy.wait, .wait('@')) and async actions missing follow-up assertions.
Helps catch timing issues that lead to flaky or misleading test results.`,

    /**
     * Analyzes a test file for async reliability issues.
     * Flags hardcoded waits, missing intercepts, and actions without follow-up assertions.
     * @param input - Object containing file path, content, and optional AST.
     * @returns Analysis results including issues, score, and summary.
     */
    analyze({ path, content, ast }: { path: string; content: string; ast?: any }): CheckerOutput {
        if (!ast) {
            ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });
        }

        // Use shared utilities for AST analysis
        const aliasMap = new Set<string>();
        const issues: CheckerResult[] = [];

        // Custom logic for cy.wait and intercept alias detection
        traverse(ast, {
            CallExpression(path) {
                const { node } = path;
                const callee = node.callee;
                if (
                    callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier' &&
                    callee.property.name === 'as' &&
                    node.arguments.length === 1 &&
                    node.arguments[0].type === 'StringLiteral'
                ) {
                    const alias = node.arguments[0].value;
                    aliasMap.add(`@${alias}`);
                }
                if (
                    callee.type === 'MemberExpression' &&
                    callee.object.type === 'Identifier' &&
                    callee.object.name === 'cy' &&
                    callee.property.type === 'Identifier' &&
                    callee.property.name === 'wait' &&
                    node.arguments.length === 1
                ) {
                    const arg = node.arguments[0];
                    const loc = node.loc?.start;
                    if (arg.type === 'NumericLiteral' && arg.value >= 500) {
                        issues.push({
                            message: `Hardcoded delay of ${arg.value}ms — using fixed waits causes flakiness and unreliable tests.`,
                            location: loc && { line: loc.line, column: loc.column },
                            severity: 'high',
                            contextCode: loc ? content.split('\n')[loc.line - 1]?.trim() : undefined,
                            plainExplanation: `Using fixed delays like this can cause flakiness. If the app responds faster or slower than expected, the test may pass or fail unpredictably.`,
                            fix: `Replace with a condition-based wait like cy.get(...).should(...) or use cy.intercept() to wait for a specific network call.`,
                        });
                    }
                    if (arg.type === 'StringLiteral' && arg.value.startsWith('@')) {
                        const alias = arg.value;
                        const hasIntercept = aliasMap.has(alias);
                        issues.push({
                            message: hasIntercept
                                ? `cy.wait('${alias}') used — alias is defined, but should be followed by a UI assertion to confirm the app reacted as expected.`
                                : `cy.wait('${alias}') used without cy.intercept() — this wait is fragile and may break if the request doesn't fire.`,
                            location: loc && { line: loc.line, column: loc.column },
                            severity: hasIntercept ? 'medium' : 'high',
                            contextCode: loc ? content.split('\n')[loc.line - 1]?.trim() : undefined,
                            plainExplanation: hasIntercept
                                ? `This wait relies on a declared alias, which helps, but doesn't confirm the app actually responded correctly.`
                                : `Waiting on an alias that isn't defined with cy.intercept() makes your test fragile. If the request never happens, the test may hang or fail unpredictably.`,
                            fix: hasIntercept
                                ? `Add a UI assertion after this wait to verify the app reacted correctly — e.g. cy.get(...).should(...).`
                                : `Add cy.intercept(...) before this line to declare the alias properly, or switch to a UI-based wait like cy.get(...).should(...).`,
                        });
                    }
                }
            },
        });

        // Use shared utilities for action/assertion detection
        const actionNodes = getActionNodes(ast);
        const assertionLines = getAssertionLines(ast);

        // Check for missing follow-up assertions after actions
        for (const action of actionNodes) {
            const hasFollowUp =
                action.hasChainedAssertion ||
                [...assertionLines].some(line => line > action.line && line <= action.line + 2);
            if (!hasFollowUp) {
                issues.push({
                    message: `User action "cy.${action.command}()" is not followed by a check to confirm the app responded.`,
                    location: { line: action.line },
                    severity: 'medium',
                    contextCode: content.split('\n')[action.line - 1]?.trim(),
                    plainExplanation: `The test simulates a user interaction using "cy.${action.command}()", but it doesn't verify whether the app responded correctly. Without a follow-up check, the test might pass even if the application fails to react — leading to false confidence in test results.`,
                    fix: `After calling "cy.${action.command}()", add a UI assertion such as "cy.get(...).should(...)" to confirm the expected change happened. This helps ensure the app responded as intended.`,
                });
            }
        }

        // Use shared utility to get test blocks
        const testBlocks = getTestBlocks(ast);
        // Map issues to test blocks
        const testIssueMap = mapIssuesToTestBlocks(issues, testBlocks);
        const testCount = testBlocks.length;
        const failingTestCount = Math.min([...testIssueMap.keys()].length, testCount);

        // Calculate score
        const numericScore = calculateScore(issues, testCount, failingTestCount, testIssueMap);
        const fileScore = gradeScore(numericScore);

        // Build summary using checker method
        const plainSummary = raceConditionAnalysis.buildSummary(issues, fileScore, numericScore);

        return {
            checkerName: 'raceConditionAnalysis',
            issues,
            fileScore,
            plainSummary,
        };
    },

    /**
     * Builds a plain English summary of async reliability for the test file.
     * @param issues - List of issues found in the file.
     * @param fileScore - The grade or rating for the file.
     * @param numericScore - The numeric score for the file.
     * @returns A readable summary for CLI and documentation.
     */
    buildSummary(issues: CheckerResult[], fileScore: string, numericScore: number): string {
        const lines = [];
        lines.push(`This test file was rated ${fileScore} for async reliability (score: ${numericScore}).`);
        lines.push('');
        if (issues.length === 0) {
            lines.push('✅ It shows strong async practices — using retryable assertions or intercepts instead of fixed waits.');
        } else {
            lines.push('⚠️ It contains patterns that may cause flakiness, such as hardcoded waits, missing intercepts, or UI actions without follow-up checks.');
            lines.push('');
            lines.push('These issues mean the tests might pass even when the app is broken, or fail when the app is actually working — leading to wasted time debugging false results.');
            lines.push('');
            lines.push('Improving these tests will make them more stable, trustworthy, and maintainable for both developers and QA teams.');
        }
        return lines.join('\n');
    },
};
