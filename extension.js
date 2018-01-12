const path = require('path');
const request = require('request');
const vscode = require('vscode');
const ZatoClient = require('./zato_client');


const MSG = {
    NO_CONFIG: "Please configure your Zato cluster settings.",
    NO_DOC: "Please select a text editor window with your Zato service source prior to executing the Publish command.",
    EMPTY_DOC: "Cannot deploy: the Python module you selected contains nothing.",
    NOT_PYTHON: "The selected document does not appear to be a Python module. Please select a Python module.",
    PING_OK: "Your Zato cluster connection appears to be operating correctly."
};

const COMMANDS = {
    'extension.zatoHotDeploy': onZatoPublish,
    'extension.zatoTestConnection': onZatoTestConnection
};


/**
 * Create a ZatoClient instance using ConfigurationModel keys, returning
 * null if any required keys are absent.
 */
function getZatoClient()
{
    var model = vscode.workspace.getConfiguration('zato');
    var url = model.get('url', '');
    var username = model.get('username', '');
    var password = model.get('password', '');

    if(url && username && password) {
        return new ZatoClient(url, username, password);
    }

    return null;
}


function getZatoClientOrOpenConfig()
{
    var client = getZatoClient();
    if(! client) {
        vscode.commands.executeCommand("workbench.action.openGlobalSettings");
        vscode.window.showInformationMessage(MSG.NO_CONFIG);
    }
    return client;
}


function onZatoPingSuccess()
{
    vscode.window.showInformationMessage(MSG.PING_OK);
}


function onZatoPingFailure(err)
{
    console.log("onZatoPingFailure: " + err);
    vscode.window.showErrorMessage("PING FAILED");
}


function onZatoTestConnection()
{
    var client = getZatoClientOrOpenConfig();
    if(client) {
        client.ping(onZatoPingSuccess, onZatoPingFailure);
    }
}


function onDeploySuccess(msg)
{
    vscode.window.showInformationMessage(msg);
}


function onDeployError(msg)
{
    vscode.window.showErrorMessage(msg);
}


function onZatoPublish()
{
    var client = getZatoClientOrOpenConfig();
    if(! client) {
        return;
    }

    // Give up if there is no active document.
    if(! vscode.window.activeTextEditor) {
        vscode.window.showInformationMessage(MSG.NO_DOC);
        return;
    }

    // Ensure the document is a Python module.
    var doc = vscode.window.activeTextEditor.document;
    if(! (doc && doc.fileName.endsWith('.py'))) {
        vscode.window.showInformationMessage(MSG.NOT_PYTHON);
        return;
    }

    var filename = path.basename(doc.fileName);
    var data = doc.getText();
    if(! data.length) {
        vscode.window.showErrorMessage(MSG.EMPTY_DOC);
        return;
    }

    client.deploy(filename, data, onDeploySuccess, onDeployError);
}


exports.activate = function(context) {
    for(let [commandId, func] of Object.entries(COMMANDS)) {
        let disposable = vscode.commands.registerCommand(commandId, func);
        context.subscriptions.push(disposable);
    }
};


exports.deactivate = function() {
};
