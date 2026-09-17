'use strict';

const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const net = require('net');
const path = require('path');
const childProcess = require('child_process');

const fakeVscodeModule = require('./fake-vscode');

const CONFIG = {
    host: '127.0.0.1',
    username: 'ide_publisher',
    wrongPassword: 'not-the-configured-password',
    deployPath: '/ide-deploy',
    requestsPath: '/requests',
    pythonBinary: 'python3',
    serverScript: path.join(__dirname, 'dummy_zato_server.py'),
    rejectEmptyBodyFlag: '--reject-empty-body',
    listeningPattern: /^listening 127\.0\.0\.1:(\d+)$/m,
    serverStartTimeoutMs: 10000,
    extensionPath: path.join(__dirname, '..', '..', 'extension'),
    commandDeploy: 'extension.zatoHotDeploy',
    commandTestConnection: 'extension.zatoTestConnection',
    commandOpenSettings: 'workbench.action.openGlobalSettings',
    messageDeployed: 'OK, deployed to server',
    messageServerReached: 'OK, server reached',
    messagePingOK: 'Zato server connection pinged OK.',
    messageNoConfig: 'Please configure your Zato server settings.',
    messageServerFailure: 'Server indicated failure: Simulated failure',
    messageBadCredentials: 'rejected the username or password',
    messageUnauthorizedStatus: '401',
    messageConnectionRefused: 'ECONNREFUSED',
    failingPayloadName: 'fail_me.py'
};

const SOURCES = {
    crm: [
        'from zato.server.service import Service',
        '',
        'class GetCustomer(Service):',
        '    name = \'crm.customer.get\'',
        '',
        '    def handle(self):',
        '        self.response.payload = {\'customer_id\': self.request.input.customer_id}',
        ''
    ].join('\n'),
    billing: [
        '# -*- coding: utf-8 -*-',
        '# zato: ide-deploy=True',
        '',
        'from zato.server.service import Service',
        '',
        'class CreateInvoice(Service):',
        '    name = \'billing.invoice.create\'',
        '',
        '    def handle(self):',
        '        pass',
        ''
    ].join('\n'),
    inventory: [
        '# -*- coding: utf-8 -*-',
        '',
        'from zato.server.service import Service',
        '',
        'class GetStock(Service):',
        '    name = \'inventory.stock.get\'',
        '',
        '    def handle(self):',
        '        pass',
        ''
    ].join('\n'),
    notes: [
        '# zato: ide-deploy=True',
        'Release notes for the billing module.',
        ''
    ].join('\n')
};

// ////////////////////////////////////////////////////////////////////////

function deployUrl(port) {
    var out = 'http://' + CONFIG.host + ':' + port + CONFIG.deployPath;
    return out;
}

// ////////////////////////////////////////////////////////////////////////

/**
 * Starts the dummy server on an ephemeral port and resolves with {process, port, stderr}
 * once it has printed the port it listens on.
 */
function startServer(password, extraArguments) {

    var scriptArguments = [CONFIG.serverScript, '0', CONFIG.username, password].concat(extraArguments);
    var server = childProcess.spawn(CONFIG.pythonBinary, scriptArguments);

    var out = new Promise(function(resolve, reject) {

        var stdout = '';
        var stderr = {text: ''};
        var settled = false;

        var timer = setTimeout(function() {
            if(!settled) {
                settled = true;
                server.kill();
                reject(new Error('The dummy server did not report its port in time. stderr: ' + stderr.text));
            }
        }, CONFIG.serverStartTimeoutMs);

        server.stdout.on('data', function(chunk) {
            stdout += chunk.toString();
            var match = stdout.match(CONFIG.listeningPattern);
            if(match) {
                if(!settled) {
                    settled = true;
                    clearTimeout(timer);
                    var port = parseInt(match[1]);
                    resolve({process: server, port: port, stderr: stderr});
                }
            }
        });

        server.stderr.on('data', function(chunk) {
            stderr.text += chunk.toString();
        });

        server.on('exit', function(code) {
            if(!settled) {
                settled = true;
                clearTimeout(timer);
                reject(new Error('The dummy server exited with code ' + code + ' before listening. stderr: ' + stderr.text));
            }
        });
    });

    return out;
}

// ////////////////////////////////////////////////////////////////////////

// Fetches everything the dummy server has received so far.
function getRequests(port) {
    var url = 'http://' + CONFIG.host + ':' + port + CONFIG.requestsPath;
    var out = new Promise(function(resolve, reject) {
        var request = http.get(url, function(response) {
            var body = '';
            response.on('data', function(chunk) {
                body += chunk.toString();
            });
            response.on('end', function() {
                var parsed = JSON.parse(body);
                resolve(parsed);
            });
        });
        request.on('error', reject);
    });
    return out;
}

// ////////////////////////////////////////////////////////////////////////

// Binds an ephemeral port, releases it and resolves with its number, so nothing listens there.
function closedPort() {
    var out = new Promise(function(resolve, reject) {
        var listener = net.createServer();
        listener.on('error', reject);
        listener.listen(0, CONFIG.host, function() {
            var port = listener.address().port;
            listener.close(function() {
                resolve(port);
            });
        });
    });
    return out;
}

// ////////////////////////////////////////////////////////////////////////

function lastOf(items) {
    var out = items[items.length - 1];
    return out;
}

// ////////////////////////////////////////////////////////////////////////

/**
 * Everything a case works with - the fake vscode, the command handlers the extension registered,
 * the running dummy server and the number of requests it is expected to have recorded so far.
 */
function buildContext(fake, server, password) {
    var out = {
        fake: fake,
        server: server,
        password: password,
        expectedRequestCount: 0,
        runDeploy: fake.registeredCommands[CONFIG.commandDeploy],
        runTestConnection: fake.registeredCommands[CONFIG.commandTestConnection]
    };
    return out;
}

// ////////////////////////////////////////////////////////////////////////

async function assertRequestCount(context, port) {
    var requests = await getRequests(port);
    assert.strictEqual(requests.length, context.expectedRequestCount, 'unexpected number of requests on the server');
    return requests;
}

// ////////////////////////////////////////////////////////////////////////

const CASES = [

    {
        name: 'hot deploy by command reaches the configured address with the exact file',
        run: async function(context) {
            var document = context.fake.makeDocument('/home/jane/crm/crm.py', SOURCES.crm);
            context.fake.setActiveDocument(document);

            context.runDeploy();
            var message = await context.fake.nextMessage();
            assert.strictEqual(message.kind, 'information');
            assert.strictEqual(message.text, CONFIG.messageDeployed);

            context.expectedRequestCount += 1;
            var requests = await assertRequestCount(context, context.server.port);
            var item = lastOf(requests);
            assert.strictEqual(item.path, CONFIG.deployPath);
            assert.strictEqual(item.auth_ok, true);
            assert.strictEqual(item.payload_name, 'crm.py');
            assert.strictEqual(item.source, SOURCES.crm);
        }
    },

    {
        name: 'saving a Python file with the marker deploys it',
        run: async function(context) {
            var document = context.fake.makeDocument('/home/jane/billing/billing.py', SOURCES.billing);
            context.fake.setActiveDocument(document);

            context.fake.savedHandler(document);
            var message = await context.fake.nextMessage();
            assert.strictEqual(message.kind, 'information');
            assert.strictEqual(message.text, CONFIG.messageDeployed);

            context.expectedRequestCount += 1;
            var requests = await assertRequestCount(context, context.server.port);
            var item = lastOf(requests);
            assert.strictEqual(item.payload_name, 'billing.py');
            assert.strictEqual(item.source, SOURCES.billing);
        }
    },

    {
        name: 'saving a Python file without the marker sends nothing',
        run: async function(context) {
            var document = context.fake.makeDocument('/home/jane/inventory/inventory.py', SOURCES.inventory);
            context.fake.setActiveDocument(document);

            var messagesBefore = context.fake.messages.length;
            context.fake.savedHandler(document);

            assert.strictEqual(context.fake.messages.length, messagesBefore);
            await assertRequestCount(context, context.server.port);
        }
    },

    {
        name: 'saving a text file with the marker sends nothing',
        run: async function(context) {
            var document = context.fake.makeDocument('/home/jane/billing/notes.txt', SOURCES.notes);
            context.fake.setActiveDocument(document);

            var messagesBefore = context.fake.messages.length;
            context.fake.savedHandler(document);

            assert.strictEqual(context.fake.messages.length, messagesBefore);
            await assertRequestCount(context, context.server.port);
        }
    },

    {
        name: 'test connection against a server that answers an empty body',
        run: async function(context) {
            context.runTestConnection();
            var message = await context.fake.nextMessage();
            assert.strictEqual(message.kind, 'information');
            assert.strictEqual(message.text, CONFIG.messageServerReached);

            context.expectedRequestCount += 1;
            var requests = await assertRequestCount(context, context.server.port);
            var item = lastOf(requests);
            assert.strictEqual(item.auth_ok, true);
            assert.strictEqual(item.payload_name, '');
        }
    },

    {
        name: 'test connection against a server that requires a payload',
        run: async function(context) {
            var server = await startServer(context.password, [CONFIG.rejectEmptyBodyFlag]);
            try {
                context.fake.settings.address = deployUrl(server.port);

                context.runTestConnection();
                var message = await context.fake.nextMessage();
                assert.strictEqual(message.kind, 'information');
                assert.strictEqual(message.text, CONFIG.messagePingOK);

                var requests = await getRequests(server.port);
                assert.strictEqual(requests.length, 1);
                var item = lastOf(requests);
                assert.strictEqual(item.auth_ok, true);
                assert.strictEqual(item.payload_name, '');
            } finally {
                server.process.kill();
                context.fake.settings.address = deployUrl(context.server.port);
            }
        }
    },

    {
        name: 'test connection with a wrong password reports the credentials',
        run: async function(context) {
            context.fake.settings.password = CONFIG.wrongPassword;
            try {
                context.runTestConnection();
                var message = await context.fake.nextMessage();
                assert.strictEqual(message.kind, 'error');
                assert.ok(message.text.includes(CONFIG.messageBadCredentials), message.text);

                context.expectedRequestCount += 1;
                var requests = await assertRequestCount(context, context.server.port);
                var item = lastOf(requests);
                assert.strictEqual(item.auth_ok, false);
            } finally {
                context.fake.settings.password = context.password;
            }
        }
    },

    {
        name: 'a deployment the server reports as failed is shown as an error',
        run: async function(context) {
            var document = context.fake.makeDocument('/home/jane/crm/' + CONFIG.failingPayloadName, SOURCES.crm);
            context.fake.setActiveDocument(document);

            context.runDeploy();
            var message = await context.fake.nextMessage();
            assert.strictEqual(message.kind, 'error');
            assert.ok(message.text.includes(CONFIG.messageServerFailure), message.text);

            context.expectedRequestCount += 1;
            await assertRequestCount(context, context.server.port);
        }
    },

    {
        name: 'hot deploy with a wrong password reports the HTTP status',
        run: async function(context) {
            var document = context.fake.makeDocument('/home/jane/crm/crm.py', SOURCES.crm);
            context.fake.setActiveDocument(document);
            context.fake.settings.password = CONFIG.wrongPassword;
            try {
                context.runDeploy();
                var message = await context.fake.nextMessage();
                assert.strictEqual(message.kind, 'error');
                assert.ok(message.text.includes(CONFIG.messageUnauthorizedStatus), message.text);

                context.expectedRequestCount += 1;
                var requests = await assertRequestCount(context, context.server.port);
                var item = lastOf(requests);
                assert.strictEqual(item.auth_ok, false);
            } finally {
                context.fake.settings.password = context.password;
            }
        }
    },

    {
        name: 'a refused connection names the code and the URL that was tried',
        run: async function(context) {
            var port = await closedPort();
            var url = deployUrl(port);
            var document = context.fake.makeDocument('/home/jane/crm/crm.py', SOURCES.crm);
            context.fake.setActiveDocument(document);
            context.fake.settings.address = url;
            try {
                context.runDeploy();
                var message = await context.fake.nextMessage();
                assert.strictEqual(message.kind, 'error');
                assert.ok(message.text.includes(CONFIG.messageConnectionRefused), message.text);
                assert.ok(message.text.includes(url), message.text);

                await assertRequestCount(context, context.server.port);
            } finally {
                context.fake.settings.address = deployUrl(context.server.port);
            }
        }
    },

    {
        name: 'missing configuration opens the settings and sends nothing',
        run: async function(context) {
            var document = context.fake.makeDocument('/home/jane/crm/crm.py', SOURCES.crm);
            context.fake.setActiveDocument(document);
            context.fake.settings.password = '';
            try {
                var executedBefore = context.fake.executedCommands.length;
                context.runDeploy();
                var message = await context.fake.nextMessage();
                assert.strictEqual(message.kind, 'information');
                assert.strictEqual(message.text, CONFIG.messageNoConfig);

                var executed = context.fake.executedCommands.slice(executedBefore);
                assert.deepStrictEqual(executed, [CONFIG.commandOpenSettings]);

                await assertRequestCount(context, context.server.port);
            } finally {
                context.fake.settings.password = context.password;
            }
        }
    }
];

// ////////////////////////////////////////////////////////////////////////

async function main() {

    var password = crypto.randomBytes(16).toString('hex');
    var server = await startServer(password, []);
    var exitCode = 0;

    try {
        var settings = {
            address: deployUrl(server.port),
            username: CONFIG.username,
            password: password
        };

        var fake = fakeVscodeModule.createFakeVscode(settings);
        fake.install();

        var extension = require(CONFIG.extensionPath);
        extension.activate({subscriptions: []});

        var context = buildContext(fake, server, password);

        for(var caseIdx = 0; caseIdx < CASES.length; caseIdx++) {
            var testCase = CASES[caseIdx];
            try {
                await testCase.run(context);
                console.log('ok - ' + testCase.name);
            } catch(error) {
                console.log('not ok - ' + testCase.name);
                console.log(error.stack);
                exitCode = 1;
                break;
            }
        }

        if(exitCode) {
            console.log('dummy server stderr:');
            console.log(server.stderr.text);
        }
    } finally {
        server.process.kill();
    }

    process.exit(exitCode);
}

main().catch(function(error) {
    console.log(error.stack);
    process.exit(1);
});
