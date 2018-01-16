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

From the `ide-vs-code` directory, simply type `npm install`. This arranges for
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
