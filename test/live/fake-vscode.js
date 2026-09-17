'use strict';

const Module = require('module');

const CONFIG = {
    moduleName: 'vscode',
    messageTimeoutMs: 10000,
    messageTimeoutText: 'No message was shown within the time limit'
};

const originalLoad = Module._load;
var installedFake = null;

// Every require('vscode') anywhere in the process receives the installed fake.
function hookedLoad(request) {
    var out;
    if(request === CONFIG.moduleName) {
        out = installedFake;
    } else {
        out = originalLoad.apply(this, arguments);
    }
    return out;
}

/**
 * Builds a stand-in for the vscode module that serves the given settings and records
 * what the extension shows and registers.
 *
 * @param {object} settings
 *      An object with address, username and password - the extension reads it live,
 *      so a test changes a field and the next command sees the new value.
 */
function createFakeVscode(settings) {

    var fake = {
        settings: settings,
        messages: [],
        registeredCommands: {},
        executedCommands: [],
        savedHandler: null
    };

    var unreadMessages = [];
    var waitingResolvers = [];

    function pushMessage(kind, text) {
        var entry = {kind: kind, text: text};
        fake.messages.push(entry);

        // Hand the message to whoever is already waiting, otherwise queue it for the next reader.
        if(waitingResolvers.length) {
            var resolve = waitingResolvers.shift();
            resolve(entry);
        } else {
            unreadMessages.push(entry);
        }
    }

    // Resolves with the next information or error message the extension shows.
    fake.nextMessage = function() {
        var out;
        if(unreadMessages.length) {
            var entry = unreadMessages.shift();
            out = Promise.resolve(entry);
        } else {
            out = new Promise(function(resolve, reject) {
                var timer = setTimeout(function() {
                    reject(new Error(CONFIG.messageTimeoutText));
                }, CONFIG.messageTimeoutMs);
                waitingResolvers.push(function(entry) {
                    clearTimeout(timer);
                    resolve(entry);
                });
            });
        }
        return out;
    };

    fake.makeDocument = function(fileName, text) {
        var out = {
            fileName: fileName,
            getText: function() {
                return text;
            }
        };
        return out;
    };

    fake.setActiveDocument = function(document) {
        fake.window.activeTextEditor = {document: document};
    };

    fake.workspace = {
        getConfiguration: function() {
            var out = {
                get: function(key) {
                    return fake.settings[key];
                }
            };
            return out;
        },
        onDidSaveTextDocument: function(handler) {
            fake.savedHandler = handler;
            var out = {dispose: function() {}};
            return out;
        }
    };

    fake.commands = {
        registerCommand: function(commandId, handler) {
            fake.registeredCommands[commandId] = handler;
            var out = {dispose: function() {}};
            return out;
        },
        executeCommand: function(commandId) {
            fake.executedCommands.push(commandId);
        }
    };

    fake.window = {
        activeTextEditor: null,
        showInformationMessage: function(text) {
            pushMessage('information', text);
        },
        showErrorMessage: function(text) {
            pushMessage('error', text);
        }
    };

    fake.install = function() {
        installedFake = fake;
        Module._load = hookedLoad;
    };

    return fake;
}

module.exports = {
    createFakeVscode: createFakeVscode
};
