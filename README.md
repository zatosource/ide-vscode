# ide-vs-code README

This is a Visual Studio Code extension that enables one-keypress (or one-click)
publishing of the active source file to a Zato cluster specified in your
workspace or global configuration.

It relies on Zato 3.0's ide-deploy endpoint, which is additionally available as
an add-on for older Zato releases. For older releases, please consult
<a href="https://github.com/zatosource/zato-labs">the zato-labs repository</a>.



# Development prerequisites

* Visual Studio Code
* Git
* Node.js >= 8.4.0; older minor releases should also work


# Preparing for development

From the `ide-vs-code` directory, simply type `npm install`. This arranges for
the `node_modules` directory to be populated with dependencies taken from
`package.json`.

This step is also necessary prior to publishing the plug-in, as plug-ins are
distributed entirely self contained in the plug-in marketplace.


# Publishing a new version

<a href="https://code.visualstudio.com/docs/extensions/publish-extension">See here</a>.

1. Generate a Visual Studio Team Services access key for the `zatosource` account:
    1. Visit https://zatosource.visualstudio.com/
    1. From the top-right My Account icon, visit Security.
    1. Under "Personal access tokens", click "Add".
        1. In description, enter something like "VSCE Publisher Token".
        1. Update "Expiry" to 1 year.
        1. Update "Accounts" to read "all accessible accounts", even if only
           one account is otherwise listed.
        1. Leave remaining fields at their default and submit the form.
    1. Make a copy of the token displayed on the following page.
1. Install vsce: `npm install vsce`. Microsoft docs suggest `-g` for global
   install, but it's not necessary.
1. Type `vsce publish`.



## Features



Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/publish_icon.jpg\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

-----------------------------------------------------------------------------------------------------------

## Working with Markdown

**Note:** You can author your README using Visual Studio Code.  Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on OSX or `Ctrl+\` on Windows and Linux)
* Toggle preview (`Shift+CMD+V` on OSX or `Shift+Ctrl+V` on Windows and Linux)
* Press `Ctrl+Space` (Windows, Linux) or `Cmd+Space` (OSX) to see a list of Markdown snippets

### For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
