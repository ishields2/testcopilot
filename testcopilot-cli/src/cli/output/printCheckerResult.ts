import chalk from 'chalk';
import type { CheckerOutput } from 'testcopilot-shared/dist/types/CheckerOutput';

export function printCheckerResult(result: CheckerOutput, filePath: string, issueExplain?: boolean): void {
    console.log(chalk.greenBright(`🔍 Checker: ${result.checkerName}`));
    // Output both numeric score and grade
    if (typeof result.numericScore === 'number') {
        console.log(chalk.bold(`Score: ${result.numericScore} (${result.fileScore})`));
    } else {
        console.log(chalk.bold(`Score: ${result.fileScore}`));
    }

    for (const issue of result.issues) {
        const sev = issue.severity?.toUpperCase() || 'INFO';
        const color =
            issue.severity === 'high' ? chalk.redBright :
                issue.severity === 'medium' ? chalk.yellow :
                    chalk.gray;

        const lineInfo = issue.location
            ? `Line ${issue.location.line}${issue.location.column !== undefined ? `, Col ${issue.location.column}` : ''}`
            : '';

        console.log(
            `• [${sev}] ${issue.message}`
        );
        if (lineInfo) console.log(`   ${lineInfo}`);

        if (issue.contextCode) {
            console.log(chalk.gray(`   > ${issue.contextCode}`));
        }

        if (issueExplain) {
            if (issue.plainExplanation) {
                console.log(chalk.blueBright(`   💡 ${issue.plainExplanation}`));
            }

            if (issue.fix) {
                console.log(chalk.green(`   🔧 Suggested fix: ${issue.fix}`));
            }
        }

        console.log();
    }

    if (issueExplain && result.plainSummary) {
        console.log(chalk.whiteBright(`📝 Summary: ${result.plainSummary}\n`));
    }
}
