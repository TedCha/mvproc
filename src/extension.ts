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

function parseIfExpression(activeHoverLineText: string, activeCharPosition: number): string | undefined {
	let ifKeywordRegex: RegExp = /IF(?: #? ?)?/;
	let ifConditionRegex: RegExp = /(?:A(?:\d+)?(?:[^\d]?(?<=,)(?:\d+))?|E|S)?(?:[ ]?(?:<|>|=|#|\[|\])(?:[ ]?(?:\(?[^\s]+\)?)))?\s?/;
	let ifExpressionRegex: RegExp = new RegExp(ifKeywordRegex.source + ifConditionRegex.source);

	let ifKeywordMatch: RegExpMatchArray | null = activeHoverLineText.match(ifKeywordRegex);

	if (ifKeywordMatch === null) {
		return undefined;
	}

	let ifKeywordText: string = ifKeywordMatch[0];
	let ifConditionCharacterPosition: number = ifKeywordText.length;

	// Check if the hover position is over an IF condition expression
	if (ifConditionCharacterPosition === activeCharPosition) {
		let ifConditionCharacterText: string = activeHoverLineText[ifConditionCharacterPosition];

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

	return activeHoverLineText.substring(ifExpressionText.length);
}

function parseTextLineForMatch(activeHoverTokenText: string, activeHoverLineText: string, position: vscode.Position): KeywordObject | undefined {

	let tokenizedText: string[] = activeHoverLineText.split(" ");
	let matchedKeywordIndex: number = 0;
	let firstTokenText: string = tokenizedText[0];
	let firstTokenIsLabel: boolean = /^\d+$/.test(firstTokenText);
	let firstTokenIsFlowControlKeyword: boolean = /^(?:IF|GOTO|GO|G)$/.test(firstTokenText);

	// Temp Processing Values
	// represents interpreted first token while processing
	let matchTokenText: string = firstTokenText;
	// represents interpreted active hover line while processing
	let matchHoverLineText: string = activeHoverLineText;
	// represents interpreted hover character position while processing
	let activeCharPosition: number = position.character;

	if (firstTokenIsLabel || firstTokenIsFlowControlKeyword) {
		
		// Test if first token is a Label and if first token matches active token
		if (/^\d+$/.test(matchTokenText) && matchTokenText === activeHoverTokenText) {
			return getKeywordObject("Statement Label");
		}

		// Test if first token is a Label and if first token does not match active token
		if (/^\d+$/.test(matchTokenText) && matchTokenText !== activeHoverTokenText) {
			// Remove the matchTokenText from the matchHoverLineText, + 1 char to deal with whitespace
			matchHoverLineText = matchHoverLineText.substring(matchTokenText.length + 1);
			// We no longer are considering the label as part of our match hover line, so we need to fix our position
			activeCharPosition -= matchTokenText.length + 1;
			// The second token in our tokenized active hover text has become the match token
			matchTokenText = tokenizedText[1];
		}

		// Test if first token is a IF Keyword and that it does not match the active token
		if (/^(?:IF)$/.test(matchTokenText) && matchTokenText !== activeHoverTokenText) {
			let ifExpressionParseResult: string | undefined = parseIfExpression(matchHoverLineText, activeCharPosition);

			if (ifExpressionParseResult === undefined) {
				return undefined;
			}

			if (ifExpressionParseResult === "IF E Condition") {
				return getKeywordObject("IF E Condition");
			}

			if (ifExpressionParseResult === "IF S Condition") {
				return getKeywordObject("IF S Condition");
			}

			if (ifExpressionParseResult === "IF A Condition") {
				return getKeywordObject("A");
			}

			matchHoverLineText = ifExpressionParseResult;
			matchTokenText = ifExpressionParseResult.split(" ")[0];
		}

		// Test if first token is a GO/G/GOTO Keyword and that it does not match the active token
		if (/^(?:GO|G|GOTO)$/.test(matchTokenText) && matchTokenText !== activeHoverTokenText) {
			
			let goKeywordArgument = matchHoverLineText.split(" ")[1];

			if (/^\d+$/.test(goKeywordArgument)) {
				return getKeywordObject("Statement Label");
			}

			matchTokenText = goKeywordArgument;

		}
	}

	if (/\B[(](?:DICT )?[^ ,]+(?: [^ ,]+)?[)](?: \d+)?/.test(matchHoverLineText)) {
		return getKeywordObject("() Link Command");
	}

	if (/\B[\[](?:DICT )?[^ ]+(?: [^ ]+)?[\]](?: \d+)?/.test(matchHoverLineText)) {
		return getKeywordObject("[] Call Command");
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
	let sortedLanguageKeywordList: KeywordObject[] | undefined = context.globalState.get("sortedLanguageKeywordList");
	let cachedLanguageString: string = JSON.stringify(cachedLanguageKeywordList);
	let currentLanguageString: string = JSON.stringify(languageDefinition.keywords);

	// Create a cached keyword list if it doesn't exist or update it if it's different than what's in the file
	if (cachedLanguageKeywordList === undefined || sortedLanguageKeywordList === undefined || cachedLanguageString !== currentLanguageString) {
		
		// Create a deep copy
		languageKeywordList = JSON.parse(currentLanguageString);

		// Sort the Language Keyword List by keyword length (Descending)
		languageKeywordList.sort((a, b) => {
			return b.key.length - a.key.length;
		});

		context.globalState.update("sortedLanguageKeywordList", languageKeywordList);
		context.globalState.update("cachedLanguageKeywordList", languageDefinition.keywords);

		sortedLanguageKeywordList = languageKeywordList;
	}

	languageKeywordList = sortedLanguageKeywordList;

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
