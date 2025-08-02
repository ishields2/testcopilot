import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { TestCopilotChecker, CheckerResult, CheckerOutput } from '../../types/sharedTypes';
import { calculateScore, gradeScore } from '../../core/scoreUtils';
import {
    getTestBlocks,
    mapIssuesToTestBlocks,
    getAssertionLines,
    getActionNodes
} from '../../core/checkerUtils';

/**
 * Helper function to check if there's a related assertion for a given selector within a few lines after an action.
 * This handles cases where assertions are broken out from the main chain due to Cypress "unsafe to chain" warnings.
 */
function hasRelatedAssertion(ast: any, actionSelector: string, actionLine: number, content: string): boolean {
    let foundRelatedAssertion = false;

    traverse(ast, {
        CallExpression(path) {
            const { node } = path;
            const callee = node.callee;
            const nodeLine = node.loc?.start?.line;

            // Only check lines after the action (within 5 lines)
            if (!nodeLine || nodeLine <= actionLine || nodeLine > actionLine + 5) {
                return;
            }

            // Check if this is a cy.get() call with an assertion
            if (callee.type === 'MemberExpression' &&
                callee.object?.type === 'Identifier' &&
                callee.object.name === 'cy' &&
                callee.property?.type === 'Identifier' &&
                callee.property.name === 'get' &&
                node.arguments?.length > 0 &&
                node.arguments[0].type === 'StringLiteral') {

                const assertionSelector = node.arguments[0].value;

                // Check if this selector matches or is related to the action selector
                if (selectorsAreRelated(actionSelector, assertionSelector)) {
                    // Check if this cy.get() is followed by an assertion in the same chain
                    let parent: typeof path.parentPath | null = path.parentPath;
                    const assertionMethods = ['should', 'contains', 'and', 'expect'];

                    while (parent && parent.node.type === 'MemberExpression') {
                        if (parent.node.property?.type === 'Identifier' &&
                            assertionMethods.includes(parent.node.property.name)) {
                            foundRelatedAssertion = true;
                            return;
                        }
                        parent = parent.parentPath;
                        if (!parent) break;
                    }
                }
            }
        }
    });

    return foundRelatedAssertion;
}

/**
 * Helper function to determine if two CSS selectors are related.
 * This handles exact matches and common related patterns.
 */
function selectorsAreRelated(actionSelector: string, assertionSelector: string): boolean {
    // Exact match
    if (actionSelector === assertionSelector) {
        return true;
    }

    // Remove quotes and whitespace for comparison
    const cleanAction = actionSelector.trim().replace(/['"]/g, '');
    const cleanAssertion = assertionSelector.trim().replace(/['"]/g, '');

    // Exact match after cleaning
    if (cleanAction === cleanAssertion) {
        return true;
    }

    // Check if one is a subset of the other (common with child selectors)
    if (cleanAction.includes(cleanAssertion) || cleanAssertion.includes(cleanAction)) {
        return true;
    }

    // Check for same ID or class (basic heuristic)
    const actionId = cleanAction.match(/#([a-zA-Z0-9_-]+)/);
    const assertionId = cleanAssertion.match(/#([a-zA-Z0-9_-]+)/);
    if (actionId && assertionId && actionId[1] === assertionId[1]) {
        return true;
    }

    const actionClass = cleanAction.match(/\.([a-zA-Z0-9_-]+)/);
    const assertionClass = cleanAssertion.match(/\.([a-zA-Z0-9_-]+)/);
    if (actionClass && assertionClass && actionClass[1] === assertionClass[1]) {
        return true;
    }

    return false;
}

/**
 * Helper function to check if there are multiple consecutive cy.wait() calls around a given line.
 * This indicates a pattern where multiple requests are waited for before checking UI.
 */
function hasConsecutiveWaits(ast: any, currentLine: number): boolean {
    let waitLines: number[] = [];

    traverse(ast, {
        CallExpression(path) {
            const { node } = path;
            const callee = node.callee;
            const nodeLine = node.loc?.start?.line;

            // Find all cy.wait() calls
            if (nodeLine &&
                callee.type === 'MemberExpression' &&
                callee.object?.type === 'Identifier' &&
                callee.object.name === 'cy' &&
                callee.property?.type === 'Identifier' &&
                callee.property.name === 'wait' &&
                node.arguments?.length === 1 &&
                node.arguments[0].type === 'StringLiteral' &&
                node.arguments[0].value.startsWith('@')) {
                waitLines.push(nodeLine);
            }
        }
    });

    // Check if current line is part of a sequence of waits (within 3 lines of each other)
    waitLines.sort((a, b) => a - b);
    let consecutiveCount = 1;

    for (let i = 1; i < waitLines.length; i++) {
        if (waitLines[i] - waitLines[i - 1] <= 3) {
            consecutiveCount++;
        } else {
            consecutiveCount = 1;
        }

        // If we found the current line in a sequence of 2+ waits
        if (waitLines[i] === currentLine && consecutiveCount >= 2) {
            return true;
        }
        if (waitLines[i - 1] === currentLine && consecutiveCount >= 2) {
            return true;
        }
    }

    return false;
}

/**
 * Helper function to check if a cy.wait() call is part of a legitimate retry mechanism.
 * This includes patterns like cy.waitUntil(), custom retry functions, recursive helpers, etc.
 */
function isPartOfRetryMechanism(path: any, content: string): boolean {
    // Check if this wait is inside a retry-related function
    let currentPath = path;

    while (currentPath) {
        const node = currentPath.node;

        // Check for cy.waitUntil() - this is a legitimate retry mechanism
        if (node.type === 'CallExpression' &&
            node.callee?.type === 'MemberExpression' &&
            node.callee.object?.name === 'cy' &&
            node.callee.property?.name === 'waitUntil') {
            return true;
        }

        // Check for function names that suggest retry mechanisms (only direct parent functions)
        if (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') {

            let functionName = '';

            if (node.type === 'FunctionDeclaration' && node.id?.name) {
                functionName = node.id.name;
            } else if (currentPath.parent?.type === 'VariableDeclarator' && currentPath.parent.id?.name) {
                functionName = currentPath.parent.id.name;
            }

            // Common retry function naming patterns
            const retryPatterns = /(?:retry|wait|poll|until|repeat|attempt|check)(?:Until|For|With|While|Loop)?/i;
            if (retryPatterns.test(functionName)) {
                return true;
            }

            // Check if this function/callback is being passed to a retry function
            if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
                let parent = currentPath.parent;

                // Look for CallExpression where this function is an argument
                while (parent) {
                    if (parent.type === 'CallExpression' &&
                        parent.callee?.type === 'Identifier') {

                        const calledFunctionName = parent.callee.name;
                        if (retryPatterns.test(calledFunctionName)) {
                            return true; // This callback is being passed to a retry function
                        }
                        break; // Only check the immediate parent call, not further up
                    }
                    parent = parent.parent;
                }
            }
        }

        // Check for loops (for, while) - these often contain retry logic
        if (node.type === 'ForStatement' ||
            node.type === 'WhileStatement' ||
            node.type === 'DoWhileStatement') {
            return true;
        }

        // Check for recursive patterns - look for function calls within functions of the same name
        if (node.type === 'CallExpression' &&
            node.callee?.type === 'Identifier') {

            const callName = node.callee.name;

            // Look up the tree for a function with the same name (recursion)
            let parentPath = currentPath.parent;
            while (parentPath) {
                if ((parentPath.type === 'FunctionDeclaration' && parentPath.id?.name === callName) ||
                    (parentPath.type === 'VariableDeclarator' && parentPath.id?.name === callName)) {
                    return true; // Recursive call pattern
                }
                parentPath = parentPath.parent;
            }
        }

        currentPath = currentPath.parentPath;
    }

    return false;
}

/**
 * Helper function to determine if an action might be valid without an assertion.
 * Some actions are commonly used for setup or navigation and don't always need verification.
 */
function isLikelyValidWithoutAssertion(actionName: string, selector: string | null, content: string, actionLine: number): boolean {
    // Navigation/setup actions that often don't need assertions
    const setupActions = ['scrollIntoView', 'scrollTo', 'focus', 'blur'];
    if (setupActions.includes(actionName)) {
        return true;
    }

    // Form clearing often doesn't need assertion
    if (actionName === 'clear') {
        return true;
    }

    // Check if this is in a beforeEach or setup section
    const lines = content.split('\n');
    let inBeforeEach = false;
    let inSetupSection = false;

    for (let i = Math.max(0, actionLine - 10); i < Math.min(lines.length, actionLine + 5); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('beforeeach') || line.includes('before(')) {
            inBeforeEach = true;
        }
        if (line.includes('// setup') || line.includes('// navigate') || line.includes('// preparation')) {
            inSetupSection = true;
        }
    }

    // Actions in setup sections are often valid without assertions
    if (inBeforeEach || inSetupSection) {
        return true;
    }

    // Check if the selector suggests this is a navigation element
    if (selector) {
        const navigationPatterns = /(?:nav|menu|tab|link|button).*(?:close|cancel|back|next|prev|skip)/i;
        if (navigationPatterns.test(selector)) {
            return true;
        }
    }

    return false;
}

/**
 * Helper function to check if a block statement contains Cypress commands or calls that likely return Cypress chains
 */
function containsCypressCalls(blockStatement: any): boolean {
    let hasCypressCalls = false;

    // Create a visitor function for recursively checking nodes
    function visitNode(node: any) {
        if (!node || hasCypressCalls) return;

        if (node.type === 'CallExpression') {
            const callee = node.callee;

            // Check for direct cy.* calls
            if (callee?.type === 'MemberExpression' &&
                callee.object?.type === 'Identifier' &&
                callee.object.name === 'cy') {
                hasCypressCalls = true;
                return;
            }

            // Check for function calls that likely return Cypress chains
            // Look for calls to functions that are named like Cypress helpers
            if (callee?.type === 'Identifier') {
                const functionName = callee.name;
                // Common patterns: functions ending with specific suffixes or containing cypress-related words
                const likelyCypressFunction = /(?:login|fill|check|verify|validate|wait|click|type|select|submit|navigate|setup)(?:User|Form|Element|Page|Data|Field|Button|Modal|Correctly)?$/i.test(functionName) ||
                    /^(?:cy|cypress|should|expect|assert)/i.test(functionName);

                if (likelyCypressFunction) {
                    hasCypressCalls = true;
                    return;
                }
            }

            // Check for member expressions that might be Cypress-related
            if (callee?.type === 'MemberExpression' &&
                callee.object?.type === 'Identifier') {
                const objectName = callee.object.name;
                // Check for common test helper objects
                if (['page', 'helpers', 'utils', 'commands'].includes(objectName.toLowerCase())) {
                    hasCypressCalls = true;
                    return;
                }
            }
        }

        // Recursively visit child nodes
        if (Array.isArray(node)) {
            node.forEach(visitNode);
        } else if (node && typeof node === 'object') {
            Object.values(node).forEach(visitNode);
        }
    }

    visitNode(blockStatement);
    return hasCypressCalls;
}/**
 * Helper function to check if a callback function has return statements
 */
function hasReturnInCallback(blockStatement: any): boolean {
    let hasReturn = false;

    // Recursively search for return statements
    function visitNode(node: any) {
        if (!node || hasReturn) return;

        if (node.type === 'ReturnStatement') {
            hasReturn = true;
            return;
        }

        // Don't traverse into nested functions
        if (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') {
            return;
        }

        // Recursively visit child nodes
        if (Array.isArray(node)) {
            node.forEach(visitNode);
        } else if (node && typeof node === 'object') {
            Object.values(node).forEach(visitNode);
        }
    }

    visitNode(blockStatement);
    return hasReturn;
}

/**
 * Helper function to check if custom functions containing Cypress commands return properly
 */
function checkCustomFunctionReturns(path: any, content: string, issues: any[]): void {
    const { node } = path;

    // Skip if function is inside a test block (it, describe, etc.) - these are test functions
    let parent = path.parent;
    while (parent) {
        if (parent.type === 'CallExpression' &&
            parent.callee?.type === 'Identifier' &&
            ['it', 'test', 'describe', 'context', 'beforeEach', 'afterEach', 'before', 'after'].includes(parent.callee.name)) {
            return; // Don't check functions inside test blocks
        }
        parent = parent.parent;
    }

    if (node.body && node.body.type === 'BlockStatement') {
        const hasCypressCalls = containsCypressCalls(node.body);

        if (hasCypressCalls) {
            // Get function name
            let functionName = 'anonymous function';
            if (node.type === 'FunctionDeclaration' && node.id?.name) {
                functionName = node.id.name;
            } else if (path.parent?.type === 'VariableDeclarator' && path.parent.id?.name) {
                functionName = path.parent.id.name;
            }

            // Skip retry helper functions - they may not need to return Cypress chains
            const retryPatterns = /(?:retry|wait|poll|until|repeat|attempt|check)(?:Until|For|With|While|Loop|Success)?/i;
            if (retryPatterns.test(functionName)) {
                return; // Don't flag retry helper functions
            }

            // Check if the function has return statements with Cypress chains
            const hasProperReturn = hasReturnWithCypressChain(node.body);

            if (!hasProperReturn) {
                const loc = node.loc;

                issues.push({
                    message: `Function "${functionName}" contains Cypress commands but doesn't return them — this can break command chaining and cause race conditions.`,
                    location: loc ? {
                        line: loc.start.line,
                        column: loc.start.column,
                        endLine: loc.end.line,
                        endColumn: loc.end.column
                    } : undefined,
                    severity: 'medium',
                    contextCode: loc ? content.split('\n')[loc.start.line - 1]?.trim() : undefined,
                    plainExplanation: `Custom functions that contain Cypress commands should return the command chain so that calling code can properly wait for completion.`,
                    fix: `Add 'return' before the Cypress commands in this function, or wrap multiple commands in a .then() block and return it.`,
                });
            }
        }
    }
}

/**
 * Helper function to check if a function properly returns Cypress chains
 */
function hasReturnWithCypressChain(blockStatement: any): boolean {
    let hasValidReturn = false;

    // Recursively search for return statements with Cypress chains
    function visitNode(node: any) {
        if (!node || hasValidReturn) return;

        if (node.type === 'ReturnStatement' && node.argument) {
            // Check if the return statement returns a Cypress chain
            if (isLikelyCypressChain(node.argument)) {
                hasValidReturn = true;
                return;
            }
        }

        // Don't traverse into nested functions
        if (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression') {
            return;
        }

        // Recursively visit child nodes
        if (Array.isArray(node)) {
            node.forEach(visitNode);
        } else if (node && typeof node === 'object') {
            Object.values(node).forEach(visitNode);
        }
    }

    visitNode(blockStatement);
    return hasValidReturn;
}

/**
 * Helper function to determine if an expression is likely a Cypress chain
 */
function isLikelyCypressChain(node: any): boolean {
    // Check for cy.* calls
    if (node.type === 'CallExpression' &&
        node.callee?.type === 'MemberExpression' &&
        node.callee.object?.type === 'Identifier' &&
        node.callee.object.name === 'cy') {
        return true;
    }

    // Check for chained calls that might end with Cypress
    if (node.type === 'CallExpression' &&
        node.callee?.type === 'MemberExpression') {
        return isLikelyCypressChain(node.callee.object);
    }

    return false;
}


/**
 * The raceConditionAnalysis checker detects flaky async patterns in Cypress tests.
 * It flags hardcoded waits, missing intercepts, and user actions not followed by assertions.
 * This helps teams write more reliable, maintainable, and trustworthy tests.
 */
export const raceConditionAnalysis: TestCopilotChecker = {
    key: 'raceConditionAnalysis',
    framework: 'cypress',
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

        // Enhanced alias detection - look in beforeEach, before, and across all test blocks
        traverse(ast, {
            CallExpression(path) {
                const { node } = path;
                const callee = node.callee;

                // Detect intercept aliases anywhere in the file (not just current scope)
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

                // Also detect cy.route() aliases (Cypress v5 legacy)
                if (
                    callee.type === 'MemberExpression' &&
                    callee.object?.type === 'Identifier' &&
                    callee.object.name === 'cy' &&
                    callee.property?.type === 'Identifier' &&
                    callee.property.name === 'route' &&
                    node.arguments?.length >= 2
                ) {
                    // Look for .as() chained after cy.route()
                    let parent: typeof path.parentPath | null = path.parentPath;
                    while (parent && parent.node.type === 'MemberExpression') {
                        if (parent.node.property?.type === 'Identifier' && parent.node.property.name === 'as') {
                            // Find the alias argument
                            const callParent = parent.parentPath;
                            if (callParent?.node.type === 'CallExpression' &&
                                callParent.node.arguments?.length > 0 &&
                                callParent.node.arguments[0].type === 'StringLiteral') {
                                aliasMap.add(`@${callParent.node.arguments[0].value}`);
                            }
                            break;
                        }
                        parent = parent.parentPath;
                        if (!parent) break;
                    }
                }
            }
        });

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
                    const loc = node.loc;
                    if (arg.type === 'NumericLiteral' && arg.value >= 500) {
                        // Check for explicit disable comment
                        const lineContent = loc ? (content.split('\n')[loc.start.line - 1] || '') : '';
                        const hasDisableComment = /\/\/.*testcopilot-disable/i.test(lineContent);

                        if (hasDisableComment) {
                            return; // Skip flagging if explicitly disabled
                        }

                        // Check if there's a comment explaining the wait (common for animations)
                        const hasExplanatoryComment = /\/\/.*(?:animation|transition|loading|render|delay)/i.test(lineContent);

                        // Be more lenient with shorter waits that might be for animations
                        const isLikelyAnimation = arg.value <= 1000 && hasExplanatoryComment;

                        // Check if this wait is part of a legitimate retry mechanism
                        const isPartOfRetry = isPartOfRetryMechanism(path, content);

                        if (!isLikelyAnimation && !isPartOfRetry) {
                            issues.push({
                                message: `Hardcoded delay of ${arg.value}ms — using fixed waits causes flakiness and unreliable tests.`,
                                location: loc ? {
                                    line: loc.start.line,
                                    column: loc.start.column,
                                    endLine: loc.end.line,
                                    endColumn: loc.end.column
                                } : undefined,
                                severity: 'high',
                                contextCode: loc ? content.split('\n')[loc.start.line - 1]?.trim() : undefined,
                                plainExplanation: `Using fixed delays like this can cause flakiness. If the app responds faster or slower than expected, the test may pass or fail unpredictably.`,
                                fix: hasExplanatoryComment
                                    ? `Consider using cy.get(...).should(...) to wait for the animation/element state instead of a fixed delay.`
                                    : isPartOfRetry
                                        ? `This wait appears to be part of a retry mechanism, which is good practice.`
                                        : `Replace with a condition-based wait like cy.get(...).should(...) or use cy.intercept() to wait for a specific network call. Or add '// testcopilot-disable' to suppress this warning if the wait is intentional.`,
                            });
                        }
                    }
                    if (arg.type === 'StringLiteral' && arg.value.startsWith('@')) {
                        const alias = arg.value;
                        const hasIntercept = aliasMap.has(alias);

                        // Enhanced logic for alias waits
                        if (hasIntercept) {
                            // Check if this looks like a background/analytics request that might not need UI assertion
                            const isLikelyBackgroundRequest = /(?:analytic|track|log|beacon|metric|stat)/i.test(alias);

                            // Check if this is part of a multiple-wait pattern (common in real tests)
                            const currentLine = loc?.start?.line || 0;
                            const hasMultipleWaits = hasConsecutiveWaits(ast, currentLine);

                            // Only flag if it's not a background request and not part of multiple waits
                            if (!isLikelyBackgroundRequest && !hasMultipleWaits) {
                                issues.push({
                                    message: `cy.wait('${alias}') used — alias is defined, but should be followed by a UI assertion to confirm the app reacted as expected.`,
                                    location: loc ? {
                                        line: loc.start.line,
                                        column: loc.start.column,
                                        endLine: loc.end.line,
                                        endColumn: loc.end.column
                                    } : undefined,
                                    severity: 'medium',
                                    contextCode: loc ? content.split('\n')[loc.start.line - 1]?.trim() : undefined,
                                    plainExplanation: `This wait relies on a declared alias, which helps, but doesn't confirm the app actually responded correctly.`,
                                    fix: `Add a UI assertion after this wait to verify the app reacted correctly — e.g. cy.get(...).should(...).`,
                                });
                            }
                        } else {
                            // Undefined alias - always flag this
                            issues.push({
                                message: `cy.wait('${alias}') used without cy.intercept() — this wait is fragile and may break if the request doesn't fire.`,
                                location: loc ? {
                                    line: loc.start.line,
                                    column: loc.start.column,
                                    endLine: loc.end.line,
                                    endColumn: loc.end.column
                                } : undefined,
                                severity: 'high',
                                contextCode: loc ? content.split('\n')[loc.start.line - 1]?.trim() : undefined,
                                plainExplanation: `Waiting on an alias that isn't defined with cy.intercept() makes your test fragile. If the request never happens, the test may hang or fail unpredictably.`,
                                fix: `Add cy.intercept(...) before this line to declare the alias properly, or switch to a UI-based wait like cy.get(...).should(...).`,
                            });
                        }
                    }
                }
            },
        });

        // Use shared utilities for action/assertion detection
        const actionNodes = getActionNodes(ast);
        const assertionLines = getAssertionLines(ast);

        // Check for missing follow-up assertions after actions
        // We need to traverse the AST again to get precise location info for Cypress chains
        traverse(ast, {
            CallExpression(path) {
                const { node } = path;
                const callee = node.callee;

                // Check if this is a Cypress action command
                if (callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier') {

                    const actionCommands = [
                        'click', 'type', 'clear', 'check', 'uncheck', 'select', 'dblclick',
                        'rightclick', 'focus', 'blur', 'submit', 'trigger', 'scrollIntoView', 'scrollTo'
                    ];

                    if (actionCommands.includes(callee.property.name)) {
                        // Find the root of the Cypress chain (should be cy.get() or similar)
                        let chainRoot: any = node;
                        let current: any = callee.object;

                        while (current && current.type === 'CallExpression') {
                            chainRoot = current;
                            current = current.callee?.type === 'MemberExpression' ? current.callee.object : null;
                        }

                        // Check if this is actually a cy. chain
                        if (current?.type === 'Identifier' && current.name === 'cy') {
                            // Check if there's a chained assertion
                            let hasChainedAssertion = false;
                            let parent: typeof path.parentPath | null = path.parentPath;
                            const assertionMethods = ['should', 'contains', 'expect', 'and', 'assert'];

                            while (parent && parent.node.type === 'MemberExpression') {
                                if (parent.node.property.type === 'Identifier' &&
                                    assertionMethods.includes(parent.node.property.name)) {
                                    hasChainedAssertion = true;
                                    break;
                                }
                                parent = parent.parentPath;
                                if (!parent) break;
                            }

                            // Extract the selector from the chain root to look for related assertions
                            let chainSelector: string | null = null;
                            if (chainRoot.callee?.type === 'MemberExpression' &&
                                chainRoot.callee.property?.name === 'get' &&
                                chainRoot.arguments?.[0]?.type === 'StringLiteral') {
                                chainSelector = chainRoot.arguments[0].value;
                            }

                            // Check for nearby assertions (enhanced logic)
                            const actionLine = node.loc?.start?.line;
                            let hasFollowUpAssertion = false;

                            if (actionLine) {
                                // Increase search range for complex tests (up to 10 lines instead of 5)
                                hasFollowUpAssertion = [...assertionLines].some(line => line > actionLine && line <= actionLine + 10);

                                // If we have a selector, look for related assertions in nearby lines  
                                if (!hasFollowUpAssertion && chainSelector) {
                                    hasFollowUpAssertion = hasRelatedAssertion(ast, chainSelector, actionLine, content);
                                }

                                // Check for common patterns that might not need assertions
                                if (!hasFollowUpAssertion) {
                                    hasFollowUpAssertion = isLikelyValidWithoutAssertion(callee.property.name, chainSelector, content, actionLine);
                                }
                            }

                            if (!hasChainedAssertion && !hasFollowUpAssertion && chainRoot.loc && node.loc) {
                                issues.push({
                                    message: `User action "cy.${callee.property.name}()" is not followed by a check to confirm the app responded.`,
                                    location: {
                                        line: chainRoot.loc.start.line,
                                        column: chainRoot.loc.start.column,
                                        endLine: node.loc.end.line,
                                        endColumn: node.loc.end.column
                                    },
                                    severity: 'medium',
                                    contextCode: chainRoot.loc ? content.split('\n')[chainRoot.loc.start.line - 1]?.trim() : undefined,
                                    plainExplanation: `The test simulates a user interaction using "cy.${callee.property.name}()", but it doesn't verify whether the app responded correctly. Without a follow-up check, the test might pass even if the application fails to react — leading to false confidence in test results.`,
                                    fix: `After calling "cy.${callee.property.name}()", add a UI assertion such as "cy.get(...).should(...)" to confirm the expected change happened. This helps ensure the app responded as intended.`,
                                });
                            }
                        }
                    }
                }
            }
        });

        // Check for missing returns in .then() callbacks and custom functions
        traverse(ast, {
            CallExpression(path) {
                const { node } = path;
                const callee = node.callee;

                // Check for .then() calls that might be missing returns
                if (callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier' &&
                    callee.property.name === 'then' &&
                    node.arguments.length > 0) {

                    const callback = node.arguments[0];
                    if ((callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') &&
                        callback.body.type === 'BlockStatement') {

                        const hasCypressCallsInCallback = containsCypressCalls(callback.body);
                        const hasReturnStatement = hasReturnInCallback(callback.body);

                        if (hasCypressCallsInCallback && !hasReturnStatement) {
                            const loc = callback.loc || node.loc;
                            issues.push({
                                message: `Callback in .then() contains Cypress commands but doesn't return — this breaks the command chain and can cause race conditions.`,
                                location: loc ? {
                                    line: loc.start.line,
                                    column: loc.start.column,
                                    endLine: loc.end.line,
                                    endColumn: loc.end.column
                                } : undefined,
                                severity: 'medium',
                                contextCode: loc ? content.split('\n')[loc.start.line - 1]?.trim() : undefined,
                                plainExplanation: `When you use Cypress commands inside a .then() callback, you need to return them to maintain the command chain. Without return, subsequent commands might run before these complete.`,
                                fix: `Add 'return' before the Cypress commands in this .then() callback, or use .should() for assertions instead.`,
                            });
                        }
                    }
                }
            },

            // Check custom functions that contain Cypress commands but don't return
            FunctionDeclaration(path) {
                checkCustomFunctionReturns(path, content, issues);
            },

            FunctionExpression(path) {
                // Only check named function expressions or those assigned to variables
                const parent = path.parent;
                if (parent.type === 'VariableDeclarator' || parent.type === 'AssignmentExpression') {
                    checkCustomFunctionReturns(path, content, issues);
                }
            },

            ArrowFunctionExpression(path) {
                // Only check arrow functions assigned to variables
                const parent = path.parent;
                if (parent.type === 'VariableDeclarator' || parent.type === 'AssignmentExpression') {
                    checkCustomFunctionReturns(path, content, issues);
                }
            }
        });

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
            filePath: path,
            issues,
            fileScore,
            numericScore,
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
