/**
 * Severity level for individual issues found by checkers.
 * Ranges from low priority (info) to critical (very high).
 */
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'very high';

/**
 * Represents a single issue detected by a checker.
 * Includes the message, severity, code location, and any fix suggestion.
 */
export interface CheckerResult {
    /** Description of the issue */
    message: string;

    /** Location in the file (line and optional column) */
    location?: {
        line: number;
        column?: number;
    };

    /** Optional fix or recommendation */
    suggestion?: string;

    /** Severity level of the issue */
    severity: Severity;

    /** Snippet of the affected code (optional) */
    contextCode?: string;

    /** Plain text explanation of the issue */
    plainExplanation?: string;

    /** Optional fix code snippet */
    fix?: string;

}
