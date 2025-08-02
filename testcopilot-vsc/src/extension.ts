// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { raceConditionAnalysis } from 'testcopilot-shared/dist/checkers/cypress/raceConditionAnalysis';
import type { CheckerResult } from 'testcopilot-shared/dist/types/CheckerResult';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('[TestCopilot] Extension activated!');
	// Create a DiagnosticCollection for TestCopilot
	const collection = vscode.languages.createDiagnosticCollection('testcopilot');
	context.subscriptions.push(collection);

	// Update diagnostics when a document is opened
	vscode.workspace.onDidOpenTextDocument(doc => updateDiagnostics(doc, collection), null, context.subscriptions);
	// Update diagnostics when a document is changed
	vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e.document, collection), null, context.subscriptions);
	// Update diagnostics when a document is saved
	vscode.workspace.onDidSaveTextDocument(doc => updateDiagnostics(doc, collection), null, context.subscriptions);

	// Initial run for all open documents
	vscode.workspace.textDocuments.forEach(doc => updateDiagnostics(doc, collection));
}

// This method is called when your extension is deactivated
export function deactivate() { }

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
	// Only run on JavaScript/TypeScript files for now
	if (document.languageId !== 'javascript' && document.languageId !== 'typescript') {
		collection.delete(document.uri);
		return;
	}

	console.log('[TestCopilot] updateDiagnostics called for:', document.uri.fsPath);
	const content = document.getText();
	console.log('[TestCopilot] Document content (first 200 chars):', content.slice(0, 200));

	const diagnostics: vscode.Diagnostic[] = [];
	try {
		const result = raceConditionAnalysis.analyze({
			path: document.uri.fsPath,
			content,
		});
		console.log('[TestCopilot] Checker result:', result);
		for (const issue of result.issues) {
			if (!issue.location || typeof issue.location.line !== 'number') { continue; }
			const loc = issue.location as CheckerResult['location'] & { endLine?: number; endColumn?: number };
			const startLine = loc.line - 1;
			const startCol = loc.column || 0;
			const endLine = (typeof loc.endLine === 'number' ? loc.endLine - 1 : startLine);
			const endCol = (typeof loc.endColumn === 'number') ? loc.endColumn : document.lineAt(endLine).text.length;

			// Create separate diagnostics for multi-line ranges to avoid highlighting leading whitespace
			if (startLine !== endLine && typeof loc.endLine === 'number') {
				// Multi-line: create one diagnostic per line to avoid highlighting indentation
				for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
					const lineText = document.lineAt(lineNum).text;
					let lineStartCol: number;
					let lineEndCol: number;

					if (lineNum === startLine) {
						// First line: use the exact start column
						lineStartCol = startCol;
						lineEndCol = lineText.length;
					} else if (lineNum === endLine) {
						// Last line: start from first non-whitespace, end at exact column
						lineStartCol = lineText.search(/\S/); // First non-whitespace character
						if (lineStartCol === -1) { lineStartCol = 0; } // If line is all whitespace
						lineEndCol = endCol;
					} else {
						// Middle lines: highlight from first non-whitespace to end of line
						lineStartCol = lineText.search(/\S/); // First non-whitespace character
						if (lineStartCol === -1) { lineStartCol = 0; } // If line is all whitespace
						lineEndCol = lineText.length;
					}

					const range = new vscode.Range(lineNum, lineStartCol, lineNum, lineEndCol);
					diagnostics.push(new vscode.Diagnostic(
						range,
						issue.message,
						issue.severity === 'high' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information
					));
				}
			} else {
				// Single line or fallback: use original logic
				let range: vscode.Range;
				if (typeof loc.endLine === 'number' || typeof loc.endColumn === 'number') {
					range = new vscode.Range(startLine, startCol, endLine, endCol);
				} else if (typeof loc.column === 'number') {
					range = new vscode.Range(startLine, startCol, startLine, document.lineAt(startLine).text.length);
				} else {
					range = new vscode.Range(startLine, 0, startLine, document.lineAt(startLine).text.length);
				}
				diagnostics.push(new vscode.Diagnostic(
					range,
					issue.message,
					issue.severity === 'high' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information
				));
			}
		}
	} catch (err) {
		console.error('[TestCopilot] Error in updateDiagnostics:', err);
		// If parsing fails, clear diagnostics and return
		collection.set(document.uri, []);
		return;
	}
	console.log('[TestCopilot] Diagnostics set:', diagnostics);
	collection.set(document.uri, diagnostics);
}
