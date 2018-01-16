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


## Deployment

While editing a Python source file, simply tap ctrl-shift-L (or cmd-shift-L on
Mac) to start deployment of the current file. The file's basename is used as
its module filename on the server.

The hot-deploy feature is additionally available from the command palette
(ctrl-shift-p) and as an editor toolbar option.

![Hot-deploy button](images/hot_deploy_button.png)


## Limitations

The source file is always assumed to be in UTF-8. This matches the expectation
that Zato modules are always written in UTF-8.


# Making Changes

## Development prerequisites

* Visual Studio Code
* Git
* Node.js >= 8.4.0; older minor releases should also work.

Installing using `apt install nodejs` should work, and verify the installed
version with `node --version`. If there is a mismatch, refer to the web to
figure out how to get a recent release for your OS.
