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
        const actionCommands = [
            'click', 'type', 'clear', 'check', 'uncheck', 'select', 'dblclick',
            'rightclick', 'focus', 'blur', 'submit', 'trigger', 'scrollIntoView', 'scrollTo'
        ];
        const assertionMethods = ['should', 'contains', 'expect', 'and', 'assert'];

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

                // Detect cy.wait(1000) or cy.wait('@alias')
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

                // Detect actions
                if (
                    callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier' &&
                    actionCommands.includes(callee.property.name)
                ) {
                    let root: any = callee.object;
                    while (root && root.type === 'CallExpression') {
                        root = root.callee?.type === 'MemberExpression' ? root.callee.object : null;
                    }

                    if (root?.type === 'Identifier' && root.name === 'cy') {
                        const actionLine = node.loc?.start?.line;
                        let hasChainedAssertion = false;
                        let parent: typeof path.parentPath | null = path.parentPath;

                        while (parent && parent.node.type === 'MemberExpression') {
                            if (
                                parent.node.property.type === 'Identifier' &&
                                assertionMethods.includes(parent.node.property.name)
                            ) {
                                hasChainedAssertion = true;
                                break;
                            }
                            parent = parent.parentPath;
                        }

                        if (typeof actionLine === 'number') {
                            actionNodes.push({
                                line: actionLine,
                                command: callee.property.name,
                                hasChainedAssertion,
                            });
                        }
                    }
                }

                // Detect assertion-like lines
                if (
                    callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier' &&
                    assertionMethods.includes(callee.property.name)
                ) {
                    const line = node.loc?.start?.line;
                    if (typeof line === 'number') assertionLines.add(line);
                }

                // expect()
                if (callee.type === 'Identifier' && callee.name === 'expect') {
                    const line = node.loc?.start?.line;
                    if (typeof line === 'number') assertionLines.add(line);
                }

                // .then(...) with expect or should
                if (
                    callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier' &&
                    callee.property.name === 'then' &&
                    node.arguments.length > 0
                ) {
                    const callback = node.arguments[0];
                    if (
                        callback.type === 'ArrowFunctionExpression' ||
                        callback.type === 'FunctionExpression'
                    ) {
                        const body = callback.body;
                        const bodyStatements = body.type === 'BlockStatement' ? body.body : [body];

                        for (const stmt of bodyStatements) {
                            if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
                                const innerCall = stmt.expression;
                                const innerCallee = innerCall.callee;

                                if (
                                    innerCallee.type === 'MemberExpression' &&
                                    innerCallee.property.type === 'Identifier' &&
                                    assertionMethods.includes(innerCallee.property.name)
                                ) {
                                    const line = innerCall.loc?.start?.line;
                                    if (typeof line === 'number') assertionLines.add(line);
                                }
                                if (
                                    innerCallee.type === 'Identifier' &&
                                    innerCallee.name === 'expect'
                                ) {
                                    const line = innerCall.loc?.start?.line;
                                    if (typeof line === 'number') assertionLines.add(line);
                                }
                            }
                        }
                    }
                }
            },
        });

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

Improving these tests will make them more stable, trustworthy, and maintainable for both developers and QA teams.`
            }
`.trim();

        return {
            checkerName: 'raceConditionAnalysis',
            issues,
            fileScore,
            plainSummary,
        };
    },
};
