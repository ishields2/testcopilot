// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { raceConditionAnalysis } from 'testcopilot-shared/dist/checkers/cypress/raceConditionAnalysis';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
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

	const diagnostics: vscode.Diagnostic[] = [];
	try {
		const result = raceConditionAnalysis.analyze({
			path: document.uri.fsPath,
			content: document.getText(),
		});
		for (const issue of result.issues) {
			if (!issue.location || typeof issue.location.line !== 'number') { continue; }
			const line = issue.location.line - 1;
			const col = issue.location.column || 0;
			const range = new vscode.Range(line, col, line, col + 5);
			diagnostics.push(new vscode.Diagnostic(
				range,
				issue.message,
				issue.severity === 'high' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information
			));
		}
	} catch (err) {
		// If parsing fails, clear diagnostics and return
		collection.set(document.uri, []);
		return;
	}
	collection.set(document.uri, diagnostics);
}
