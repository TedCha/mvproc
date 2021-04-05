# VSCode MultiValue PROC Extension

## Features

### Syntax Highlighter

The syntax highlighter is one of the main features of the VSCode MultiValue PROC Extension. It provides developers who use the language a better way to update existing programs or develop new programs in any flavor of the MultiValue PROC language.

The VSCode MultiValue PROC Extension will highlight the following:
* Commands (A, H, RO, IF, STOFF, etc.)
* Command Parameters
* Labels
* Unquoted and Quoted Strings
* Comments
* Numeric Digits
* PROC Identifier (PQ)

### Keyword Documentation Hover Provider

To provide a better development experience, the VSCode MultiValue PROC Extension ships with a Hover Provider that allows developers to quickly get relevant keyword documentation just by hovering over it!

### Demo

Syntax Highlighter Demo:

<p float="left">
  <img src="./image_assets/syntax_highlighter_demo.jpg"/>
</p>

Keyword Documentation Hover Provider Demo:

[//]: # (TODO - Add demo image of the hover provider.)

### Use

The mvBase PROC Syntax Highlighter can be activated in two ways:

1. Changing the file extension to `.proc`. VSCode will automatically recognize that a file needs to be interpreted by the MultiValue PROC Syntax Highlighter if it has a `.proc` file extension.
2. Use the Command Palette (Ctrl+Shift+P) to select **Change Language Mode**. From there you can select MultiValue PROC as the language for the file.

### Notes

The theme works best with Monakai Dimmed or Dark+.

## Coming Soon

* Language Server Rework
  * Auto Completion
  * Linting

## Contributing

Please raise any existing issues with this extension through [GitHub](https://github.com/tcharts-boop/mvbase-proc-extension/issues).
