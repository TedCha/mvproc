import * as vscode from 'vscode';
import * as languageDefinitionFile from '../syntaxes/mvprocLanguage.json';

interface KeywordObject {
	key: string;
	regexMatch: string;
	documentation: string;
	detail: string;
}

interface LanguageDefinition {
	language: string;
	keywords: KeywordObject[];
}

function parseTextLineForMatch(tokenizedText: string[], languageKeywordList: KeywordObject[]): KeywordObject {

	let matchedKeywordIndex: number = 0;
	let firstToken: string = tokenizedText[0];
	let tokenIsNumeric: boolean = /^\d+$/.test(firstToken);
	let tokenIsFlowControlCommand: boolean = /^(?:IF|GOTO|GO|G)$/.test(firstToken);

	if (tokenIsNumeric || tokenIsFlowControlCommand) {
		// TODO - Numeric Label Processing and Flow Control Command Processing
	} else {
		matchedKeywordIndex = languageKeywordList.findIndex(
			(keyword: KeywordObject) => firstToken.match(`^${keyword.key}`) !== null
		);
	}

	let matchedKeyword = languageKeywordList[matchedKeywordIndex];

	return matchedKeyword;
}

export function activate(context: vscode.ExtensionContext) {
	
	let languageDefinition: LanguageDefinition;
	let languageKeywordList: KeywordObject[];

	// Get our cached Language Keyword List
	let cachedLanguageKeywordList: KeywordObject[] | undefined = context.globalState.get("cachedLanguageKeywordList");

	// If the cached Language Keyword List doesn't exist, we need to make it and then cache it
	if (cachedLanguageKeywordList === undefined) {
		languageDefinition = languageDefinitionFile;
		languageKeywordList = languageDefinition.keywords;

		languageKeywordList.sort((a, b) => {
			return b.key.length - a.key.length;
		});

		context.globalState.update("cachedLanguageKeywordList", languageKeywordList);

		cachedLanguageKeywordList = languageKeywordList;
	}

	languageKeywordList = cachedLanguageKeywordList;

	let disposable: vscode.Disposable = vscode.languages.registerHoverProvider('mvproc', {
		provideHover(document: vscode.TextDocument, position : vscode.Position) {
			let activeHoverLine: vscode.TextLine = document.lineAt(position);
			let activeHoverLineText: string = activeHoverLine.text;

			let tokenizedTextLine: string[] = activeHoverLineText.split(" ");

			let matchedKeyword: KeywordObject = parseTextLineForMatch(tokenizedTextLine, languageKeywordList);

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
