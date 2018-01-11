# Zato for Visual Studio Code

This is a Visual Studio Code extension that enables single keypress and single
click hot deployment of the active Python source file to a Zato cluster
specified in your workspace or global configuration.

It relies on Zato 3.0's `ide-deploy` endpoint, which is additionally available
as an add-on for older Zato releases. For older releases, please consult
<a href="https://github.com/zatosource/zato-labs">the zato-labs repository</a>.


## Setup

* Once you have installed the extension, visit the **Security -> HTTP Basic
  Auth** section of the administration UI for your cluster:

  ![HTTP Basic Auth](images/basic_auth.png)

* Select the **Change password** option for the pre-installed **ide_publisher**
  account:

  ![Change password](images/change_password.png)

* Set the password to something meaningful, and choose **OK**.

* Open **User Settings** in Visual Studio Code, and filter the file by using
  the string "zato".

* Update the `url` key to point to the base URL of either your one of your Zato
  cluster servers, or its load balancer address. For example,
  `http://zato:17010/`.

* Update the `password` to match the password you entered above.

* Open the Visual Studio command palette (cmd-shift-P or ctrl-shift-P) and
  search for "zato".

* Select the **Test Zato Connection** command. A message should appear
  indicating communication with the cluster was successful.



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


# Publishing a new release

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
1. Update `package.json` to reflect the new version number, and `CHANGELOG.md` to
   reflect the high level changes made.
1. Type `vsce publish`.
