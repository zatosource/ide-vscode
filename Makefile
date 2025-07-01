# Get package name and version from package.json
PUBLISHER := $(shell node -p "require('./package.json').publisher")
NAME := $(shell node -p "require('./package.json').name")
VERSION := $(shell node -p "require('./package.json').version")
VSIX_FILE := $(NAME)-$(VERSION).vsix
EXTENSION_ID := $(PUBLISHER).$(NAME)

.PHONY: all local-install package clean uninstall

all: local-install

# Uninstalls and reinstalls the extension locally.
local-install: uninstall package
	@echo "Installing $(VSIX_FILE) ..."
	@code --install-extension $(VSIX_FILE)
	@echo "Done."

# Uninstalls the extension.
uninstall:
	@echo "Uninstalling existing extension $(EXTENSION_ID)..."
	@code --uninstall-extension $(EXTENSION_ID) || true
	@echo "Done."

# Packages the extension into a .vsix file.
package:
	@echo "Running npm install..."
	@npm install --silent --no-progress
	@echo "Packaging with vsce..."
	@npx vsce package
	@echo "Created $(VSIX_FILE)"

# Removes generated files.
clean:
	@echo "Cleaning up..."
	@rm -f *.vsix
	@echo "Done."
