import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { TestCopilotChecker, CheckerResult, CheckerOutput } from '../types/sharedTypes';

export const raceConditionAnalysis: TestCopilotChecker = {
    key: 'raceConditionAnalysis',
    description: `Detects flaky wait patterns (cy.wait, .wait('@')) and async actions missing follow-up assertions.
Helps catch timing issues that lead to flaky or misleading test results.`,

    analyze({ path, content, ast }: { path: string; content: string; ast?: any }): CheckerOutput {
        const issues: CheckerResult[] = [];
        const aliasMap = new Set<string>();
        const visitedActionLines = new Set<number>();
        const actionCommands = ['click', 'type', 'select', 'check', 'uncheck', 'trigger'];

        if (!ast) {
            ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });
        }

        traverse(ast, {
            CallExpression(path) {
                const { node } = path;
                const callee = node.callee;

                // Track aliases from cy.intercept(...).as('alias')
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

                // Detect cy.wait(1000)
                if (
                    callee.type === 'MemberExpression' &&
                    callee.object.type === 'Identifier' &&
                    callee.object.name === 'cy' &&
                    callee.property.type === 'Identifier' &&
                    callee.property.name === 'wait' &&
                    node.arguments.length === 1
                ) {
                    const arg = node.arguments[0];

                    if (arg.type === 'NumericLiteral' && arg.value >= 500) {
                        issues.push({
                            message: `Hardcoded wait detected: cy.wait(${arg.value})`,
                            location: node.loc?.start && {
                                line: node.loc.start.line,
                                column: node.loc.start.column,
                            },
                            severity: 'high',
                            contextCode: node.loc?.start ? content.split('\n')[node.loc.start.line - 1]?.trim() : undefined,
                            plainExplanation: `Using fixed delays like this can cause flakiness. If the app responds faster or slower than expected, the test may pass or fail unpredictably.`,
                            fix: `Replace with a condition-based wait like cy.get(...).should(...) or use cy.intercept() to wait for a specific network call.`,
                        });
                    }

                    // Detect cy.wait('@alias')
                    if (arg.type === 'StringLiteral' && arg.value.startsWith('@')) {
                        const alias = arg.value;
                        const hasIntercept = aliasMap.has(alias);
                        const loc = node.loc?.start;

                        issues.push({
                            message: `Alias-based wait detected: cy.wait('${alias}')`,
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

                // Track action commands like cy.click(), then look ahead for assertions
                if (
                    callee.type === 'MemberExpression' &&
                    callee.object.type === 'Identifier' &&
                    callee.object.name === 'cy' &&
                    callee.property.type === 'Identifier' &&
                    actionCommands.includes(callee.property.name)
                ) {
                    const actionLine = node.loc?.start.line;
                    if (actionLine) visitedActionLines.add(actionLine);
                }

                // Remove action lines that are followed by assertions
                if (
                    callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier' &&
                    ['should', 'contains'].includes(callee.property.name)
                ) {
                    const maybeAssertionLine = node.loc?.start.line;
                    if (maybeAssertionLine && visitedActionLines.has(maybeAssertionLine - 1)) {
                        visitedActionLines.delete(maybeAssertionLine - 1);
                    }
                }
            },
        });

        // Action commands missing follow-up assertions
        for (const line of visitedActionLines) {
            issues.push({
                message: `Action command without follow-up assertion (e.g. should(), contains())`,
                location: { line },
                severity: 'medium',
                contextCode: content.split('\n')[line - 1]?.trim(),
                plainExplanation: `This test performs a user action (e.g. click), but doesn't check whether the app responded as expected. This can lead to false positives.`,
                fix: `Add a UI assertion after the action — e.g. cy.get(...).should('contain', 'ExpectedText') — to confirm the app changed state.`,
            });
        }

        // File-level score
        const fileScore =
            issues.length >= 4 ? 'Very Poor' :
                issues.length === 3 ? 'Poor' :
                    issues.length === 2 ? 'Average' :
                        issues.length === 1 ? 'Good' :
                            'Very Good';

        const plainSummary = `
This test file was rated **${fileScore}** for async reliability.

${issues.length === 0
                ? '✅ It shows strong async practices — using retryable assertions or intercepts instead of fixed waits.'
                : `⚠️ It contains patterns that may cause flakiness, such as hardcoded waits, missing intercepts, or UI actions without follow-up checks.

These issues mean the tests might pass even when the app is broken, or fail when the app is actually working — leading to wasted time debugging false results.

Improving these tests will make them more stable, trustworthy, and maintainable for both developers and QA teams.`}
    `.trim();

        return {
            checkerName: 'raceConditionAnalysis',
            issues,
            fileScore,
            plainSummary,
        };
    }
};
