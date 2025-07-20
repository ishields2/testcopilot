import chalk from 'chalk';
import type { CheckerOutput } from '../../types/CheckerOutput';

/**
 * Prints the result of a single checker on a file, including issues, severity, and summary.
 * @param result - The result from the checker analysis
 * @param filePath - Path of the test file analyzed
 */
export function printCheckerResult(result: CheckerOutput, filePath: string, explain: boolean | undefined): void {
    console.log(chalk.magentaBright(`\n📄 File: ${filePath}`));
    console.log(chalk.cyan(`🔍 Checker: ${result.checkerName}`));
    console.log(chalk.white(`📊 Score: ${chalk.bold(getScoreColor(result.fileScore)(result.fileScore))}`));

    if (result.issues.length === 0) {
        console.log(chalk.greenBright(`✅ No issues found.\n`));
        return;
    }

    for (const issue of result.issues) {
        const severityColor = getSeverityColor(issue.severity);
        const location = issue.location
            ? `Line ${issue.location.line}${issue.location.column !== undefined ? `, Col ${issue.location.column}` : ''}`
            : 'Unknown location';

        console.log(
            `${severityColor(`• [${issue.severity?.toUpperCase() || 'INFO'}]`)} ${chalk.white(issue.message)}`
        );
        console.log(`   ${chalk.gray(location)}`);

        if (issue.contextCode) {
            console.log(`   ${chalk.dim('>')} ${chalk.italic(issue.contextCode.trim())}`);
        }

        if (issue.suggestion) {
            console.log(`   💡 ${chalk.yellow(issue.suggestion)}\n`);
        } else {
            console.log('');
        }
    }

    if (result.plainSummary) {
        console.log(chalk.blueBright(`📝 Summary: ${result.plainSummary}\n`));
    }
}

/**
 * Returns a chalk color function based on severity level.
 */
function getSeverityColor(severity?: string) {
    switch (severity) {
        case 'error':
            return chalk.redBright;
        case 'warning':
            return chalk.yellowBright;
        case 'info':
        default:
            return chalk.white;
    }
}

/**
 * Returns a chalk color function based on score rating.
 */
function getScoreColor(score: string) {
    switch (score) {
        case 'Very Poor':
            return chalk.bgRedBright.white.bold;
        case 'Poor':
            return chalk.redBright;
        case 'Average':
            return chalk.yellowBright;
        case 'Good':
            return chalk.green;
        case 'Very Good':
            return chalk.greenBright;
        default:
            return chalk.white;
    }
}
