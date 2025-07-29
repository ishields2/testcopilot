const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
import type { CodebaseOutput } from '../../core/codebaseUtils';
import * as fs from 'fs';
pdfMake.vfs = pdfFonts.vfs;

function buildTable(issues: any[]) {
    const body = [
        [
            { text: 'Issue', style: 'tableHeader' },
            { text: 'Severity', style: 'tableHeader' },
            { text: 'Description', style: 'tableHeader' },
            { text: 'Line', style: 'tableHeader' },
            { text: 'Suggested Fix', style: 'tableHeader' }
        ]
    ];
    for (const issue of issues) {
        body.push([
            issue.message,
            issue.severity,
            issue.plainExplanation,
            issue.location?.line?.toString() || '',
            issue.fix || ''
        ]);
    }
    return {
        table: {
            headerRows: 1,
            widths: ['*', 'auto', '*', 'auto', '*'],
            body
        },
        layout: 'lightHorizontalLines',
        style: 'table'
    };
}

export async function printPdfMakeReport(codebaseReport: CodebaseOutput, outputPath: string = 'testcopilot-report.pdf') {
    const docDefinition: any = {
        content: [
            {
                text: 'TestCopilot Codebase Analysis',
                style: 'header',
                margin: [0, 0, 0, 12]
            },
            {
                text: codebaseReport.plainSummary,
                style: 'summary',
                margin: [0, 0, 0, 16]
            },
            ...codebaseReport.fileResults.map((fileResult: any) => ([
                { text: `File: ${fileResult.checkerName}`, style: 'fileHeader', margin: [0, 8, 0, 2] },
                { text: `Score: ${fileResult.numericScore} (${fileResult.fileScore})`, style: 'fileScore', margin: [0, 0, 0, 4] },
                buildTable(fileResult.issues),
                fileResult.plainSummary ? { text: fileResult.plainSummary, style: 'fileSummary', margin: [0, 0, 0, 8] } : null
            ])).flat()
        ],
        styles: {
            header: { fontSize: 20, bold: true, color: '#2a4d8f', alignment: 'center' },
            summary: { fontSize: 12, color: '#333' },
            fileHeader: { fontSize: 14, bold: true, color: '#2a4d8f' },
            fileScore: { fontSize: 11, color: '#444' },
            fileSummary: { fontSize: 10, color: '#2a4d8f', italics: true },
            table: { margin: [0, 4, 0, 8] },
            tableHeader: { bold: true, fillColor: '#eaf2fb', color: '#222' }
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
