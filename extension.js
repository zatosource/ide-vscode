const path = require('path')
const vscode = require('vscode');
const ZatoClient = require('./zato_client');

const MSG = {
    NO_CONFIG: "Please configure your Zato server settings.",
    NO_DOC: "Please select a text editor window with your Zato service source prior to executing the Publish command.",
    EMPTY_DOC: "Cannot deploy: the Python module you selected contains nothing.",
    NOT_PYTHON: "The selected document does not appear to be a Python module. Please select a Python module.",
    PING_OK: "Zato server connection pinged OK.",
    REQUEST_ERROR: "Zato request error: ",
    NETWORK_ERROR: "A network error occurred. Please verify your connection settings and ensure the Zato server is running."
};

const COMMANDS = {
    'extension.zatoHotDeploy': onZatoPublish,
    'extension.zatoTestConnection': onZatoTestConnection
};

const UPLOAD_MARKER_RE = /#\s+zato:\s+ide-deploy=True/;


/**
 * Create a ZatoClient instance using ConfigurationModel keys, returning
 * null if any required keys are absent.
 */
function getZatoClient()
{
    var model = vscode.workspace.getConfiguration('zato');
    var url = 'http://localhost:17010/ide-deploy' || model.get('address', '') || model.get('url', '');
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
    if(!client) {
        vscode.commands.executeCommand("workbench.action.openGlobalSettings");
        vscode.window.showInformationMessage(MSG.NO_CONFIG);
    }
    return client;
}


function onZatoPingSuccess()
{
    console.log("onZatoPingSuccess: ");
    vscode.window.showInformationMessage(MSG.PING_OK);
}


function onZatoPingFailure(err)
{
    console.log("onZatoPingFailure: " + err);
    vscode.window.showErrorMessage(MSG.REQUEST_ERROR + err);
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
    //if(typeof msg == 'object') {
    //    msg = MSG.NETWORK_ERROR;
    //}
    vscode.window.showErrorMessage(MSG.REQUEST_ERROR + msg);
}


function onZatoPublish()
{
    var client = getZatoClientOrOpenConfig();
    if(! client) {
        return;
    }

    // Give up if there is no active document.
    if(!vscode.window.activeTextEditor) {
        vscode.window.showInformationMessage(MSG.NO_DOC);
        return;
    }

    // Ensure the document is a Python module.
    var doc = vscode.window.activeTextEditor.document;
    if(!(doc && doc.fileName.endsWith('.py'))) {
        vscode.window.showInformationMessage(MSG.NOT_PYTHON);
        return;
    }

    var filename = path.basename(doc.fileName);
    var data = doc.getText();
    if(!data.length) {
        vscode.window.showErrorMessage(MSG.EMPTY_DOC);
        return;
    }

    client.deploy(filename, data, onDeploySuccess, onDeployError);
}


/**
 * Respond to vscode.onDidSaveTextDocument() by checking if the currently
 * loaded file is a Python script, and if it is, if it contains
 * AUTODEPLOY_MARKER, automatically trigger onZatoPublish().
 *
 * @param {vscode.TextDocument} doc
 */
function onTextDocumentSaved(doc)
{
    if(!doc.fileName.endsWith('.py')) {
        return;
    }

    var text = doc.getText() || '';
    if(!text.match(UPLOAD_MARKER_RE)) {
        return;
    }

    console.log('onTextDocumentSaved: triggering onZatoPublish()')
    onZatoPublish();
}

function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "abc456-testing" is now active!');

    const disposable = vscode.commands.registerCommand('abc456-testing.helloWorld', function () {
        vscode.window.showInformationMessage('Hello World from abc456-testing!');
        vscode.window.showInformationMessage('ABC3!');
    });
    context.subscriptions.push(disposable);

    for(let [commandId, func] of Object.entries(COMMANDS)) {
        let disposable = vscode.commands.registerCommand(commandId, func);
        context.subscriptions.push(disposable);
    }
    vscode.workspace.onDidSaveTextDocument(onTextDocumentSaved);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
