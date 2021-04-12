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

const languageDefinition: LanguageDefinition = languageDefinitionFile;
let languageKeywordList: KeywordObject[];

function getKeywordObject(key: string): KeywordObject | undefined {
	return languageKeywordList.find(
		(keyword: KeywordObject) => keyword.key === key
	);
}

function parseIfExpression(activeHoverLineText: string, position: vscode.Position): string | undefined {
	let ifKeywordRegex: RegExp = /IF(?: #? ?)?/;
	let ifConditionRegex: RegExp = /(?:A(?:\d+)?(?:[^\d]?(?<=,)(?:\d+))?|E|S)?(?:[ ]?(?:<|>|=|#|\[|\])(?:[ ]?(?:\(?[^\s]+\)?)))?\s?/;
	let ifExpressionRegex: RegExp = new RegExp(ifKeywordRegex.source + ifConditionRegex.source);

	let ifKeywordMatch: RegExpMatchArray | null = activeHoverLineText.match(ifKeywordRegex);

	if (ifKeywordMatch === null) {
		return undefined;
	}

	let ifKeywordText: string = ifKeywordMatch[0];
	let ifConditionCharacterPosition: number = ifKeywordText.length;

	if (ifConditionCharacterPosition === position.character) {
		let ifConditionCharacterText: string = activeHoverLineText[ifConditionCharacterPosition];

		console.log(ifConditionCharacterText);

		if (ifConditionCharacterText === "E") {
			return "IF E Condition";
		}

		if (ifConditionCharacterText === "S") {
			return "IF S Condition";
		}

		if (ifConditionCharacterText === "A") {
			return "IF A Condition";
		}
	}

	let ifExpressionMatch: RegExpMatchArray | null = activeHoverLineText.match(ifExpressionRegex);
	
	if (ifExpressionMatch === null) {
		return undefined;
	}

	let ifExpressionText: string = ifExpressionMatch[0];

	return activeHoverLineText.substring(ifExpressionText.length).split(" ")[0];
}

function parseTextLineForMatch(activeHoverTokenText: string, activeHoverLineText: string, position: vscode.Position): KeywordObject | undefined {

	let tokenizedText: string[] = activeHoverLineText.split(" ");
	let matchedKeywordIndex: number = 0;
	let firstTokenText: string = tokenizedText[0];
	let firstTokenIsLabel: boolean = /^\d+$/.test(firstTokenText);
	let firstTokenIsFlowControlKeyword: boolean = /^(?:IF|GOTO|GO|G)$/.test(firstTokenText);

	let labelKeywordObject: KeywordObject | undefined = getKeywordObject("Statement Label");
	let ifConditionEKeywordObject: KeywordObject | undefined = getKeywordObject("IF E Condition");
	let ifConditionSKeywordObject: KeywordObject | undefined = getKeywordObject("IF S Condition");

	// matchTokenText is a temp processing value
	// it represents not the literal first token, but what we interpret as the first token while processing
	let matchTokenText: string = firstTokenText;

	if (firstTokenIsLabel || firstTokenIsFlowControlKeyword) {
		
		// Test if first token is a Label and if first token matches active token
		if (/^\d+$/.test(matchTokenText) && matchTokenText === activeHoverTokenText) {
			
			return labelKeywordObject;
		}

		// Test if first token is a Label and if first token does not match active token
		if (/^\d+$/.test(matchTokenText) && matchTokenText !== activeHoverTokenText) {
			// Remove the matchTokenText from the activeHoverLineText, + 1 char to deal with whitespace
			activeHoverLineText = activeHoverLineText.substring(matchTokenText.length + 1);
			matchTokenText = tokenizedText[1];
		}

		// Test if first token is a IF Keyword and that it does not match the active token
		if (/^(?:IF)$/.test(matchTokenText) && matchTokenText !== activeHoverTokenText) {
			let ifExpressionParseResult: string | undefined = parseIfExpression(activeHoverLineText, position);

			console.log(ifExpressionParseResult);

			if (ifExpressionParseResult === undefined) {
				return undefined;
			}

			if (ifExpressionParseResult === "IF E Condition") {
				return ifConditionEKeywordObject;
			}

			if (ifExpressionParseResult === "IF S Condition") {
				return ifConditionSKeywordObject;
			}

			if (ifExpressionParseResult === "IF A Condition") {
				return getKeywordObject("A");
			}

			matchTokenText = ifExpressionParseResult;
		}

		// TODO - Add logic to handle other flow control keywords (GO|G|GOTO)
		// TODO - Add logic to handle Call and Link Commands
	}

	if (matchTokenText === activeHoverTokenText) {
		matchedKeywordIndex = languageKeywordList.findIndex(
			(keyword: KeywordObject) => activeHoverTokenText.match(`^${keyword.key}`) !== null
		);

		return languageKeywordList[matchedKeywordIndex];
	}

	return undefined;
		
}

export function activate(context: vscode.ExtensionContext) {
	
	// Get our cached Language Keyword List
	let cachedLanguageKeywordList: KeywordObject[] | undefined = context.globalState.get("cachedLanguageKeywordList");

	// Create a cached keyword list if it doesn't exist or update it if it's different than what's in the file
	// TODO - Figure out how to only update if current cache doesn't match language file
	if (cachedLanguageKeywordList === undefined) {
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
		provideHover(document: vscode.TextDocument, currentPosition: vscode.Position) {
			let activeHoverTokenRange: vscode.Range | undefined = document.getWordRangeAtPosition(currentPosition, /\S+/);

			if (activeHoverTokenRange === undefined) {
				return undefined;
			}

			let activeHoverTokenText: string = document.getText(activeHoverTokenRange);
			let activeHoverLineText: string = document.lineAt(currentPosition).text;

			let parseMatchResult: KeywordObject | undefined = parseTextLineForMatch(activeHoverTokenText, activeHoverLineText, currentPosition);
			
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
