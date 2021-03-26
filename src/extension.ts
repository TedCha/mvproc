import * as vscode from 'vscode';
import * as languageDefinition from '../syntaxes/mvprocLanguage.json';

export function activate(context: vscode.ExtensionContext) {

	let languageKeywordList = languageDefinition.Keywords;

	let disposable: vscode.Disposable = vscode.languages.registerHoverProvider('mvproc', {
		provideHover(document, position) {
			let validKeywordIndex: number = languageKeywordList.findIndex(
				keyword => document.getWordRangeAtPosition(
					position, new RegExp(keyword.regexMatch)) !== undefined
			);

			let matchedKeyword = languageKeywordList[validKeywordIndex];

			let keywordHeader: string = `**${matchedKeyword.key}**\n***\n`;
			let keywordDocumentation: string = matchedKeyword.documentation;
			let keywordDetail: string = `\n***\n${matchedKeyword.detail}`;
			
			const contents = new vscode.MarkdownString;
			
			contents.appendMarkdown(keywordHeader);
			contents.appendMarkdown(keywordDocumentation);
			contents.appendMarkdown(keywordDetail);
			
			return new vscode.Hover(contents);
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
