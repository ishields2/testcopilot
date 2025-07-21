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
        const actionNodes: { line: number; command: string; hasChainedAssertion: boolean }[] = [];
        const assertionLines = new Set<number>();
        const actionCommands = ['click', 'type', 'select', 'check', 'uncheck', 'trigger'];
        const assertionMethods = ['should', 'contains', 'expect'];

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
                            message: `Hardcoded delay of ${arg.value}ms — using fixed waits causes flakiness and unreliable tests.`,
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

                // Track cy.get(...).click(), cy.get(...).type(), etc. and check for chained assertions
                if (
                    callee.type === 'MemberExpression' &&
                    callee.object.type === 'CallExpression' &&
                    callee.object.callee.type === 'MemberExpression' &&
                    callee.object.callee.object.type === 'Identifier' &&
                    callee.object.callee.object.name === 'cy' &&
                    callee.property.type === 'Identifier' &&
                    actionCommands.includes(callee.property.name)
                ) {
                    const actionLine = node.loc?.start?.line;
                    let hasChainedAssertion = false;
                    let parent: typeof path.parentPath | null = path.parentPath;

                    // Traverse up the chain to see if an assertion is present
                    while (parent !== null && parent.node.type === 'MemberExpression') {
                        if (
                            parent.node.property.type === 'Identifier' &&
                            assertionMethods.includes(parent.node.property.name)
                        ) {
                            hasChainedAssertion = true;
                            break;
                        }
                        parent = parent.parentPath;
                    }

                    // Only add if parent is not another action command (i.e., last in chain)
                    const parentIsAction =
                        path.parentPath &&
                        path.parentPath.node.type === 'MemberExpression' &&
                        path.parentPath.node.property.type === 'Identifier' &&
                        actionCommands.includes(path.parentPath.node.property.name);

                    if (!parentIsAction && typeof actionLine === 'number') {
                        actionNodes.push({
                            line: actionLine,
                            command: callee.property.name,
                            hasChainedAssertion
                        });
                    }
                }

                // Track assertion lines (should, contains, expect)
                if (
                    callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier' &&
                    assertionMethods.includes(callee.property.name)
                ) {
                    const line = node.loc?.start?.line;
                    if (typeof line === 'number') assertionLines.add(line);
                }

                // Track expect() assertions
                if (
                    callee.type === 'Identifier' &&
                    callee.name === 'expect'
                ) {
                    const line = node.loc?.start?.line;
                    if (typeof line === 'number') assertionLines.add(line);
                }
            },
        });

        // Add issues for actions with no assertion within the next 2 lines and not chained
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

        const fileScore =
            issues.length >= 4 ? 'Very Poor'
                : issues.length === 3 ? 'Poor'
                    : issues.length === 2 ? 'Average'
                        : issues.length === 1 ? 'Good'
                            : 'Very Good';

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
    },
};