const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
import type { CodebaseOutput } from '../../core/codebaseUtils';

export interface PdfReportFlags {
    issueExplain: boolean;
    fileSummary: boolean;
    codebaseAnalysis: boolean;
}
import * as fs from 'fs';
pdfMake.vfs = pdfFonts.vfs;

function buildTable(issues: any[], flags: PdfReportFlags) {
    // Table columns depend on issueExplain/fileSummary flags
    const columns = [
        { text: 'Issue', style: 'tableHeader' },
        { text: 'Severity', style: 'tableHeader' },
        { text: 'Line', style: 'tableHeader' }
    ];
    // Only add contextCode if present in any issue
    const hasContext = issues.some(i => i.contextCode);
    if (hasContext) columns.push({ text: 'Context', style: 'tableHeader' });
    // Add explanation/fix columns if issueExplain is true
    if (flags.issueExplain) columns.push({ text: 'Explanation', style: 'tableHeader' });
    if (flags.issueExplain) columns.push({ text: 'Suggested Fix', style: 'tableHeader' });
    const body = [columns];
    for (const issue of issues) {
        const row = [
            { text: issue.message, style: 'tableCell', noWrap: false },
            { text: issue.severity, style: 'tableCell', noWrap: true },
            { text: issue.location?.line?.toString() || '', style: 'tableCell', noWrap: true }
        ];
        if (hasContext) row.push({ text: issue.contextCode || '', style: 'tableCell', noWrap: false });
        if (flags.issueExplain) row.push({ text: issue.plainExplanation || '', style: 'tableCell', noWrap: false });
        if (flags.issueExplain) row.push({ text: issue.fix || '', style: 'tableCell', noWrap: false });
        body.push(row);
    }
    // Dynamic column widths: explanation/fix get more space if present
    let widths;
    if (flags.issueExplain) {
        widths = [];
        widths.push('20%'); // Issue
        widths.push('10%'); // Severity
        widths.push('8%');  // Line
        if (hasContext) widths.push('15%'); // Context
        widths.push('23%'); // Explanation
        widths.push('24%'); // Suggested Fix
    } else {
        widths = [];
        widths.push('35%'); // Issue
        widths.push('15%'); // Severity
        widths.push('10%'); // Line
        if (hasContext) widths.push('40%'); // Context
    }
    return {
        table: {
            headerRows: 1,
            widths,
            body
        },
        layout: 'lightHorizontalLines',
        style: 'table'
    };
}

export async function printPdfMakeReport(codebaseReport: CodebaseOutput, outputPath: string = 'testcopilot-report.pdf', flags: PdfReportFlags) {
    const content: any[] = [];
    // Only show codebase summary if codebaseAnalysis is true
    if (flags.codebaseAnalysis && codebaseReport.plainSummary) {
        content.push({
            text: 'TestCopilot Codebase Analysis',
            style: 'header',
            margin: [0, 0, 0, 12]
        });
        content.push({
            text: codebaseReport.plainSummary,
            style: 'summary',
            margin: [0, 0, 0, 16]
        });
    }
    // File-by-file output
    for (const fileResult of codebaseReport.fileResults) {
        // File path is always present in CheckerOutput
        content.push({ text: `File: ${fileResult.filePath}`, style: 'fileHeader', margin: [0, 8, 0, 2] });
        content.push({ text: `Checker: ${fileResult.checkerName}`, style: 'fileScore', margin: [0, 0, 0, 2] });
        content.push({ text: `Score: ${fileResult.numericScore} (${fileResult.fileScore})`, style: 'fileScore', margin: [0, 0, 0, 4] });
        content.push(buildTable(fileResult.issues, flags));
        // Only show file summary if fileSummary is true
        if (flags.fileSummary && fileResult.plainSummary) {
            content.push({ text: fileResult.plainSummary, style: 'fileSummary', margin: [0, 0, 0, 8] });
        }
    }
    const docDefinition: any = {
        content,
        styles: {
            header: { fontSize: 20, bold: true, color: '#2a4d8f', alignment: 'center' },
            summary: { fontSize: 12, color: '#333' },
            fileHeader: { fontSize: 14, bold: true, color: '#2a4d8f' },
            fileScore: { fontSize: 11, color: '#444' },
            fileSummary: { fontSize: 10, color: '#2a4d8f', italics: true },
            table: { margin: [0, 4, 0, 8] },
            tableHeader: { bold: true, fillColor: '#eaf2fb', color: '#222' },
            tableCell: { fontSize: 9, color: '#222', alignment: 'left' }
        },
        defaultStyle: {
            fontSize: 10
        }
    };

    return new Promise<void>((resolve, reject) => {
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        pdfDocGenerator.getBuffer((buffer: Buffer) => {
            fs.writeFileSync(outputPath, buffer);
            resolve();
        });
    });
}
