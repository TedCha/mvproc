import * as vscode from 'vscode';
import * as languageDefinitionFile from '../syntaxes/mvprocLanguage.json';

interface KeywordObject {
	key: string;
	documentation: string;
	detail: string;
}

interface LanguageDefinition {
	language: string;
	keywords: KeywordObject[];
}

function parseTextLineForMatch(
	activeHoverTokenText: string,
	activeHoverLineText: string,
	languageKeywordList: KeywordObject[],
	currentPosition: vscode.Position): KeywordObject | undefined {

		let tokenizedText: string[] = activeHoverLineText.split(" ");

		let matchedKeywordIndex: number = 0;
		let firstTokenText: string = tokenizedText[0];

		let firstTokenIsNumericLabel: boolean = /^\d+$/.test(firstTokenText);
		let activeTokenIsNumericLabel: boolean = /^\d+$/.test(activeHoverTokenText);

		let firstTokenIsFlowControlKeyword: boolean = /^(?:IF|GOTO|GO|G)$/.test(firstTokenText);
		let activeTokenIsFlowControlKeyword: boolean = /^(?:IF|GOTO|GO|G)$/.test(activeHoverTokenText);

		let ifExpressionRegex = /IF(?: #? ?)?(?:A(?:\d+)?(?:[^\d]?(?<=,)(?:\d+))?|E|S)?(?:[ ]?(?:<|>|=|#|\[|\])(?:[ ]?(?:\(?[^\s]+\)?)))?\s?/;

		if (firstTokenIsNumericLabel || firstTokenIsFlowControlKeyword) {
			
			// Test if first token is a Label and if first token matches active token
			if (/^\d+$/.test(firstTokenText) && firstTokenText === activeHoverTokenText) {
				let labelKeywordObject: KeywordObject = {
					key: "Label",
					documentation: "A number specifying a labelled PROC statement.",
					detail: "*number*"
				};

				return labelKeywordObject;
			}

			// Test if first token is a Label and if first token does not match active token
			if (/^\d+$/.test(firstTokenText) && firstTokenText !== activeHoverTokenText) {
				firstTokenText = tokenizedText[1];
				console.log(`New firstTokenText = ${firstTokenText}`);
			}

			// Test if first token is a IF Keyword and that it does not match the active token
			if (/^(?:IF)$/.test(firstTokenText) && firstTokenText !== activeHoverTokenText) {
				let ifExpressionText: RegExpMatchArray | null = activeHoverLineText.match(ifExpressionRegex);
				console.log(ifExpressionText);
				// TODO - Add logic to switch the firstTokenText to the first keyword of the non-match text
			}

			// TODO - Add logic to handle other flow control keywords (GO|G|GOTO)
		}

		if (firstTokenText === activeHoverTokenText) {
			matchedKeywordIndex = languageKeywordList.findIndex(
				(keyword: KeywordObject) => activeHoverTokenText.match(`^${keyword.key}`) !== null
			);

			return languageKeywordList[matchedKeywordIndex];
		}

		return undefined;
		
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

		// Sort the Language Keyword List by keyword length (Descending)
		languageKeywordList.sort((a, b) => {
			return b.key.length - a.key.length;
		});

		context.globalState.update("cachedLanguageKeywordList", languageKeywordList);

		cachedLanguageKeywordList = languageKeywordList;
	}

	languageKeywordList = cachedLanguageKeywordList;

	let disposable: vscode.Disposable = vscode.languages.registerHoverProvider('mvproc', {
		provideHover(document: vscode.TextDocument, currentPosition : vscode.Position) {
			let activeHoverTokenRange: vscode.Range | undefined = document.getWordRangeAtPosition(currentPosition, /\S+/);

			if (activeHoverTokenRange === undefined) {
				return undefined;
			}

			let activeHoverTokenText: string = document.getText(activeHoverTokenRange);

			let activeHoverLine: vscode.TextLine = document.lineAt(currentPosition);
			let activeHoverLineText: string = activeHoverLine.text;

			// let startTokenCharPosition: number = activeHoverLineText.indexOf(activeHoverTokenText);
			// let startTokenPosition: vscode.Position = new vscode.Position(currentPosition.line, startTokenCharPosition);

			// let endTokenCharPosition: number = startTokenCharPosition + activeHoverTokenText.length;
			// let endTokenPosition: vscode.Position = new vscode.Position(currentPosition.line, endTokenCharPosition);

			// let tokenRange: vscode.Range = new vscode.Range(startTokenPosition, endTokenPosition);

			// let tokenText: string = document.getText(tokenRange);

			// console.log(tokenText);

			let parseMatchResult: KeywordObject | undefined = parseTextLineForMatch(
				activeHoverTokenText,
				activeHoverLineText,
				languageKeywordList,
				currentPosition
				);
			
			if (parseMatchResult === undefined) {
				return undefined;
			}

			let matchedKeyword: KeywordObject = parseMatchResult;

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
