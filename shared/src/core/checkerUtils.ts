/**
 * This file provides utility functions for analyzing Cypress test files using AST.
 * These helpers let checkers find test blocks, map issues, and detect actions/assertions.
 * All functions are designed to be easy to use and understand for both developers and QA.
 * Used by all checkers to keep analysis logic consistent and simple.
 */

import traverse from '@babel/traverse';
import type { CheckerResult } from '../types/sharedTypes';

/**
 * Finds all test blocks ("it" functions) in the AST and returns their line ranges.
 * @param ast - The Babel AST of the test file.
 * @returns An array of objects with index, start line, and end line for each test block.
 */

export function getTestBlocks(ast: any): { idx: number; start: number; end: number }[] {
    const testBlocks: { idx: number; start: number; end: number }[] = [];
    let testIdx = 0;
    traverse(ast, {
        CallExpression(path) {
            const { node } = path;
            if (
                node.callee.type === 'Identifier' &&
                node.callee.name === 'it' &&
                node.arguments.length >= 2 &&
                (node.arguments[1].type === 'FunctionExpression' || node.arguments[1].type === 'ArrowFunctionExpression')
            ) {
                const fn = node.arguments[1];
                if (fn.body && fn.body.type === 'BlockStatement' && fn.body.loc) {
                    testBlocks.push({ idx: testIdx++, start: fn.body.loc.start.line, end: fn.body.loc.end.line });
                }
            }
        }
    });
    return testBlocks;
}
/**
 * Maps each issue to the test block whose body contains the issue's line.
 * @param issues - The list of issues found in the file.
 * @param testBlocks - The array of test block line ranges.
 * @returns A map from test block index to the issues found in that block.
 */

export function mapIssuesToTestBlocks(issues: CheckerResult[], testBlocks: { idx: number; start: number; end: number }[]): Map<number, CheckerResult[]> {
    const testIssueMap = new Map<number, CheckerResult[]>();
    for (const issue of issues) {
        if (issue.location && typeof issue.location.line === 'number') {
            const line = issue.location.line;
            for (const block of testBlocks) {
                if (line >= block.start && line <= block.end) {
                    if (!testIssueMap.has(block.idx)) testIssueMap.set(block.idx, []);
                    testIssueMap.get(block.idx)!.push(issue);
                    break;
                }
            }
        }
    }
    return testIssueMap;
}
/**
 * Finds all lines in the AST that contain assertion-like calls (should, expect, etc).
 * @param ast - The Babel AST of the test file.
 * @returns A set of line numbers where assertions are found.
 */

export function getAssertionLines(ast: any): Set<number> {
    const assertionLines = new Set<number>();
    const assertionMethods = ['should', 'contains', 'expect', 'and', 'assert'];
    traverse(ast, {
        CallExpression(path) {
            const { node } = path;
            const callee = node.callee;
            if (
                callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier' &&
                assertionMethods.includes(callee.property.name)
            ) {
                const line = node.loc?.start?.line;
                if (typeof line === 'number') assertionLines.add(line);
            }
            if (callee.type === 'Identifier' && callee.name === 'expect') {
                const line = node.loc?.start?.line;
                if (typeof line === 'number') assertionLines.add(line);
            }
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
        }
    });
    return assertionLines;
}
/**
 * Finds all user action commands (click, type, etc) in the AST and checks for chained assertions.
 * @param ast - The Babel AST of the test file.
 * @returns An array of objects with line, command, and whether an assertion is chained.
 */

export function getActionNodes(ast: any): Array<{ line: number; command: string; hasChainedAssertion: boolean }> {
    const actionNodes: { line: number; command: string; hasChainedAssertion: boolean }[] = [];
    const actionCommands = [
        'click', 'type', 'clear', 'check', 'uncheck', 'select', 'dblclick',
        'rightclick', 'focus', 'blur', 'submit', 'trigger', 'scrollIntoView', 'scrollTo'
    ];
    const assertionMethods = ['should', 'contains', 'expect', 'and', 'assert'];
    traverse(ast, {
        CallExpression(path) {
            const { node } = path;
            const callee = node.callee;
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
        }
    });
    return actionNodes;
}
