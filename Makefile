# Get package name and version from package.json
PUBLISHER := $(shell node -p "require('./package.json').publisher")
NAME := $(shell node -p "require('./package.json').name")
VERSION := $(shell node -p "require('./package.json').version")
VSIX_FILE := $(NAME)-$(VERSION).vsix
EXTENSION_ID := $(PUBLISHER).$(NAME)

# The editor binary to install into - "code" for VS Code, "codium" for VSCodium,
# e.g. make local-install EDITOR_BIN=codium
EDITOR_BIN ?= code

.PHONY: all local-install package clean uninstall publish create-namespace-openvsx test

all: local-install

# Uninstalls and reinstalls the extension locally.
local-install: uninstall package
	@echo "Installing $(VSIX_FILE) into $(EDITOR_BIN) ..."
	@$(EDITOR_BIN) --install-extension $(VSIX_FILE)
	@echo "Done."

# Uninstalls the extension.
uninstall:
	@echo "Uninstalling existing extension $(EXTENSION_ID) from $(EDITOR_BIN)..."
	@$(EDITOR_BIN) --uninstall-extension $(EXTENSION_ID) || true
	@echo "Done."

# Packages the extension into a .vsix file.
package:
	@echo "Running npm install..."
	@npm install --silent --no-progress
	@echo "Packaging with vsce..."
	@npx vsce package
	@echo "Created $(VSIX_FILE)"

# Publishes to the Visual Studio Marketplace, which VS Code installs from,
# and to Open VSX, which VSCodium installs from.
publish: package
	@if [ -z "$(VSCE_PAT)" ]; then \
		echo "Error: The VSCE_PAT environment variable is not set."; \
		echo "Usage: VSCE_PAT=<your_token> OVSX_PAT=<your_token> make publish"; \
		exit 1; \
	fi
	@if [ -z "$(OVSX_PAT)" ]; then \
		echo "Error: The OVSX_PAT environment variable is not set."; \
		echo "Usage: VSCE_PAT=<your_token> OVSX_PAT=<your_token> make publish"; \
		exit 1; \
	fi
	@echo "Publishing $(VSIX_FILE) to the Marketplace..."
	@npx vsce publish --pat $(VSCE_PAT)
	@echo "Publishing $(VSIX_FILE) to Open VSX..."
	@npx ovsx publish $(VSIX_FILE) --pat $(OVSX_PAT)
	@echo "Done."

# Creates the publisher's namespace on Open VSX, needed once before the first publish.
create-namespace-openvsx:
	@if [ -z "$(OVSX_PAT)" ]; then \
		echo "Error: The OVSX_PAT environment variable is not set."; \
		echo "Usage: OVSX_PAT=<your_token> make create-namespace-openvsx"; \
		exit 1; \
	fi
	@npx ovsx create-namespace $(PUBLISHER) --pat $(OVSX_PAT)

# Drives the extension against a dummy Zato server and asserts what arrives.
test:
	@npm install --silent --no-progress
	@node test/live/run-live-test.js

# Removes generated files.
clean:
	@echo "Cleaning up..."
	@rm -f *.vsix
	@echo "Done."
