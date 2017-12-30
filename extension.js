const vscode = require('vscode');
const request = require('request');


const MSG = {
    NO_DOC: "Please select a text editor window with your Zato service source prior to executing the Publish command.",
    NOT_PYTHON: "The selected document does not appear to be a Python module. Please select a Python module.",
};

const COMMANDS = {
    'extension.zatoPublish': onZatoPublish,
    'extension.zatoTestConnection': onZatoTestConnection
};


function onZatoTestConnection()
{
    vscode.window.showInformationMessage("Hi");
}


function onZatoPublish()
{
    // Give up if there is no active document.
    if(! vscode.window.activeTextEditor) {
        vscode.window.showInformationMessage(MSG.NO_DOC);
        return;
    }

    // Ensure the document is a Python module.
    var doc = vscode.window.activeTextEditor.document;
    if(! doc.fileName.endsWith('.py')) {
        vscode.window.showInformationMessage(MSG.NOT_PYTHON);
        return;
    }

    try {
        vscode.window.showInformationMessage(
            vscode.window.activeTextEditor.document.fileName
        );
    } catch(e) {
        vscode.window.showInformationMessage(e.toString());
    }
}


exports.activate = function(context) {
    for(const [commandId, func] of Object.entries(COMMANDS)) {
        console.error([commandId, func].toString());
        let disposable = vscode.commands.registerCommand(commandId, func);
        context.subscriptions.push(disposable);
    }
};


exports.deactivate = function() {
};
