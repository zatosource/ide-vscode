# Development tips


# Making Changes

## Development prerequisites

* Visual Studio Code
* Git
* Node.js >= 8.4.0; older minor releases should also work.

Installing using `apt install nodejs` should work, and verify the installed
version with `node --version`. If there is a mismatch, refer to the web to
figure out how to get a recent release for your OS.

## Preparing for development

From the `ide-vscode` directory, simply type `npm install`. This arranges for
the `node_modules` directory to be populated with dependencies taken from
`package.json`.

This step is also necessary prior to publishing the plug-in, as plug-ins are
distributed entirely self contained in the plug-in marketplace.


## Development process

Refer to the Visual Studio Code docs. To test the extension during development:

* Ensure your copy of Visual Studio Code does not have a release version of the
  extension installed (not strictly necessary but will avoid immediate
  confusion!).
* Ensure you have symlinked (or copied) the `code` tool to somewhere in your `PATH`.
* Run `code .` from the plug-in's directory.
* Edit the plug-in as desired.
* Press F5 to launch a new copy of Visual Studio Code with the in-development plug-in
  loaded.
* Rinse and repeat.

## Running the tests

`make test` needs Node and Python 3 and nothing else. It starts `test/live/dummy_zato_server.py`,
a standard-library HTTP server that answers the way a Zato server's `/ide-deploy` channel does -
it checks Basic Auth, base64-decodes the uploaded file, replies with `zato_ide_deploy_create_response`
and records every request it receives. The runner, `test/live/run-live-test.js`, then loads
`extension.js` with a stand-in for the `vscode` module whose `zato.address` points at that server,
drives the registered commands and the save handler the way VS Code does, and asserts both on the
messages the extension shows and on what the server recorded.

The cases cover deployment by command and on save, the deployment marker, the connection test against
a server that answers an empty body and against one that rejects it, wrong credentials, a deployment the
server reports as failed, a refused connection and missing configuration. The test never connects to
port 17010.

Note that the Marketplace's documentation for how to upload the plugin changes from time
to time and may be at times incorrect. As of today (January 2021), the steps are:

* Create a personal access token in the Marketplace
* Give it access to everything in every scope and organisation (really required) for as little time as needed
* Locally, run :

  * sudo npm install -g vsce
  * vsce package
  * vsce login zatosource (this will ask for the personal token)
  * vsce publish (this will upload the plugin)

* Now, go to the Marketplace and delete (revoke) the token used

## Publishing for VSCodium

VSCodium does not use the Visual Studio Marketplace, it installs extensions from
[Open VSX](https://open-vsx.org). The extension itself needs no changes, it is the same
`.vsix` published to a second registry.

Tokens come from Open VSX, one-time setup:

* Sign in at https://open-vsx.org with an Eclipse account (create one at https://accounts.eclipse.org
  if needed, and link your GitHub account to it there)
* Open https://open-vsx.org/user-settings/profile and sign the Publisher Agreement
* Open https://open-vsx.org/user-settings/tokens and generate an access token, this is `OVSX_PAT`
* Create the namespace once: `OVSX_PAT=<token> make create-namespace-openvsx`. This creates the
  `zatosource` namespace, which must match the `publisher` in `package.json`.
* To have the namespace marked as verified, open an issue at https://github.com/EclipseFdn/open-vsx.org/issues
  asking for ownership of `zatosource`. Publishing works without it, the extension page shows a note
  about the unverified namespace until it is granted.

Then, for every release, `VSCE_PAT=<token> OVSX_PAT=<token> make publish` publishes to both
registries in one go.

To install the packaged `.vsix` straight into a local VSCodium instead of through a registry:

* `make local-install EDITOR_BIN=codium`
