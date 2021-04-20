"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const languageDefinitionFile = require("../syntaxes/mvprocLanguage.json");
const languageDefinition = languageDefinitionFile;
let languageKeywordList;
function getKeywordObject(key) {
    return languageKeywordList.find((keyword) => keyword.key === key);
}
function parseIfExpression(activeHoverLineText, activeCharPosition) {
    let ifKeywordRegex = /IF(?: #? ?)?/;
    let ifConditionRegex = /(?:A(?:\d+)?(?:[^\d]?(?<=,)(?:\d+))?|E|S)?(?:[ ]?(?:<|>|=|#|\[|\])(?:[ ]?(?:\(?[^\s]+\)?)))?\s?/;
    let ifExpressionRegex = new RegExp(ifKeywordRegex.source + ifConditionRegex.source);
    let ifKeywordMatch = activeHoverLineText.match(ifKeywordRegex);
    if (ifKeywordMatch === null) {
        return undefined;
    }
    let ifKeywordText = ifKeywordMatch[0];
    let ifConditionCharacterPosition = ifKeywordText.length;
    // Check if the hover position is over an IF condition expression
    if (ifConditionCharacterPosition === activeCharPosition) {
        let ifConditionCharacterText = activeHoverLineText[ifConditionCharacterPosition];
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
    let ifExpressionMatch = activeHoverLineText.match(ifExpressionRegex);
    if (ifExpressionMatch === null) {
        return undefined;
    }
    let ifExpressionText = ifExpressionMatch[0];
    return activeHoverLineText.substring(ifExpressionText.length);
}
function parseTextLineForMatch(activeHoverTokenText, activeHoverLineText, position) {
    let tokenizedText = activeHoverLineText.split(" ");
    let matchedKeywordIndex = 0;
    let firstTokenText = tokenizedText[0];
    let firstTokenIsLabel = /^\d+$/.test(firstTokenText);
    let firstTokenIsFlowControlKeyword = /^(?:IF|GOTO|GO|G)$/.test(firstTokenText);
    // Temp Processing Values
    // represents interpreted first token while processing
    let matchTokenText = firstTokenText;
    // represents interpreted active hover line while processing
    let matchHoverLineText = activeHoverLineText;
    // represents interpreted hover character position while processing
    let activeCharPosition = position.character;
    if (/^PQ$/.test(activeHoverLineText)) {
        return getKeywordObject("PROC Bang");
    }
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
            let ifExpressionParseResult = parseIfExpression(matchHoverLineText, activeCharPosition);
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
        matchedKeywordIndex = languageKeywordList.findIndex((keyword) => activeHoverTokenText.match(`^${keyword.key}`) !== null);
        return languageKeywordList[matchedKeywordIndex];
    }
    return undefined;
}
function activate(context) {
    // Get our cached Language Keyword List
    let cachedLanguageKeywordList = context.globalState.get("cachedLanguageKeywordList");
    let sortedLanguageKeywordList = context.globalState.get("sortedLanguageKeywordList");
    let cachedLanguageString = JSON.stringify(cachedLanguageKeywordList);
    let currentLanguageString = JSON.stringify(languageDefinition.keywords);
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
    let disposable = vscode.languages.registerHoverProvider('mvproc', {
        provideHover(document, currentPosition) {
            let activeHoverTokenRange = document.getWordRangeAtPosition(currentPosition, /\S+/);
            if (activeHoverTokenRange === undefined) {
                return undefined;
            }
            let activeHoverTokenText = document.getText(activeHoverTokenRange);
            let activeHoverLineText = document.lineAt(currentPosition).text;
            let parseMatchResult = parseTextLineForMatch(activeHoverTokenText, activeHoverLineText, currentPosition);
            if (parseMatchResult === undefined) {
                return undefined;
            }
            let matchedKeyword = parseMatchResult;
            let keywordHeader = `**${matchedKeyword.key}**\n***\n`;
            let keywordDocumentation = matchedKeyword.documentation;
            let keywordDetail = `\n***\n${matchedKeyword.detail}`;
            const contents = new vscode.MarkdownString;
            contents.appendMarkdown(keywordHeader);
            contents.appendMarkdown(keywordDocumentation);
            contents.appendMarkdown(keywordDetail);
            return new vscode.Hover(contents);
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map