import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { TestCopilotChecker, CheckerResult, CheckerOutput } from '../types/sharedTypes';

/**
 * Race Condition Checker.
 * Flags hard waits, alias-based waits, and async actions not followed by retry-based assertions.
 */
export const raceConditionAnalysis: TestCopilotChecker = {
    key: 'raceConditionAnalysis',
    description: `Detects flaky wait patterns (cy.wait, .wait('@')) and async actions missing follow-up assertions.
Helps catch timing issues that lead to flaky or misleading test results.`,

    analyze({ path, content, ast }: { path: string; content: string; ast?: any }) {
        const issues: CheckerResult[] = [];

        if (!ast) {
            ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });
        }

        // Track commands that typically require retry-able assertions
        const actionCommands = ['click', 'type', 'select', 'check', 'uncheck', 'trigger'];
        const visitedActionLines = new Set<number>();

        traverse(ast, {
            CallExpression(path) {
                const { node } = path;
                const callee = node.callee;

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
                            suggestion: 'Avoid hard waits. Use cy.intercept() or cy.get(...).should(...) instead.',
                            severity: 'high',
                            contextCode: typeof node.loc?.start?.line === 'number'
                                ? content.split('\n')[node.loc.start.line - 1]?.trim()
                                : undefined,
                        });
                    }

                    // Detect cy.wait('@alias') style waits
                    if (arg.type === 'StringLiteral' && arg.value.startsWith('@')) {
                        issues.push({
                            message: `Alias-based wait detected: cy.wait('${arg.value}')`,
                            location: node.loc?.start && {
                                line: node.loc.start.line,
                                column: node.loc.start.column,
                            },
                            suggestion: `Alias waits can be brittle. Prefer waiting for UI conditions or use cy.intercept().`,
                            severity: 'medium',
                            contextCode: typeof node.loc?.start?.line === 'number'
                                ? content.split('\n')[node.loc.start.line - 1]?.trim()
                                : undefined,
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

                // Look for retry-able assertions like .should(...) or .contains(...)
                if (
                    callee.type === 'MemberExpression' &&
                    ['should', 'contains'].includes(
                        callee.property.type === 'Identifier' ? callee.property.name : ''
                    )
                ) {
                    const maybeAssertionLine = node.loc?.start.line;
                    if (maybeAssertionLine && visitedActionLines.has(maybeAssertionLine - 1)) {
                        // Action immediately followed by assertion — remove from concern
                        visitedActionLines.delete(maybeAssertionLine - 1);
                    }
                }
            },
        });

        // Add issues for action commands missing retry assertions
        for (const line of visitedActionLines) {
            issues.push({
                message: `Action command without follow-up assertion (e.g. should(), contains())`,
                location: { line },
                suggestion: `Add a retry-able assertion to confirm the UI response.`,
                severity: 'medium',
                contextCode: content.split('\n')[line - 1]?.trim(),
            });
        }

        // Determine file score
        const fileScore =
            issues.length >= 4
                ? 'Very Poor'
                : issues.length === 3
                    ? 'Poor'
                    : issues.length === 2
                        ? 'Average'
                        : issues.length === 1
                            ? 'Good'
                            : 'Very Good';

        // Optional plain-English summary
        const plainSummary =
            issues.length > 0
                ? `This file may suffer from flaky test behavior due to hard waits or missing assertions after actions.`
                : `This file uses robust async handling with no obvious race condition risks.`;

        return {
            checkerName: 'raceConditionAnalysis',
            issues,
            fileScore,
            plainSummary,
        };
    },
};
