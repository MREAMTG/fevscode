// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const { execSync } = require('child_process');

let feTerminal;

function checkCommandExists(command) {
	try {
        // 'command -v' returns the command's path if it exists
        execSync(`command -v ${command}`, { stdio: 'ignore' });
        return true;  // Command exists
    } catch (error) {
        return false;  // Command does not exist
    }
}

const appMeta = (folder) => {
	const filePath = path.join(folder.uri.path, ".fe", 'app.yaml');
	try {
		const file = fs.readFileSync(filePath, 'utf8');
		return yaml.load(file);
	} catch (e) {
		console.error(e);
		return null;
	}
}

const isApp = (folder) => {
	return appMeta(folder) !== null;
}

const setup_status_bar = (context) => {
	const buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildButton.text = "$(wrench)  fe build (full)";
    buildButton.tooltip = "Build your Factory Engine App Project";
    buildButton.command = 'factory-engine.BuildApp';
    buildButton.show();
	
    let disposable = vscode.commands.registerCommand('factory-engine.BuildApp', () => {
		if (!feTerminal)
            feTerminal = vscode.window.createTerminal('FE App Build');
        feTerminal.show();
		feTerminal.sendText('fe build');
    });
	context.subscriptions.push(buildButton, disposable);

	const buildDeviceButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildDeviceButton.text = "$(device-desktop) fe build (device)";
    buildDeviceButton.tooltip = "Build your Factory Engine App Project (device features only)";
    buildDeviceButton.command = 'factory-engine.BuildAppDevice';
    buildDeviceButton.show();

    disposable = vscode.commands.registerCommand('factory-engine.BuildAppDevice', () => {
        if (!feTerminal)
            feTerminal = vscode.window.createTerminal('FE App Build');
        feTerminal.show();
		feTerminal.sendText('fe build --no-server');
    });
	context.subscriptions.push(buildDeviceButton, disposable);

	const buildServerButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildServerButton.text = "$(server) fe build (server)";
    buildServerButton.tooltip = "Build your Factory Engine App Project (server features only)";
    buildServerButton.command = 'factory-engine.BuildAppServer';
    buildServerButton.show();

    disposable = vscode.commands.registerCommand('factory-engine.BuildAppServer', () => {
        if (!feTerminal)
            feTerminal = vscode.window.createTerminal('FE App Build');
        feTerminal.show();
		feTerminal.sendText('fe build --no-device');
    });

    context.subscriptions.push(buildServerButton, disposable);

    const quickPickButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    quickPickButton.text = "$(list-ordered) App Actions";
    quickPickButton.tooltip = "Click to choose an action";
    quickPickButton.command = 'factory-engine.showAppActions';
    quickPickButton.show();

    // Register the command to show the Quick Pick menu
    const quickPickCommand = vscode.commands.registerCommand('factory-engine.showAppActions', () => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.items = [
            { label: 'Clean build files', description: 'Cleans all app build files and docker images' },
            { label: 'Build app docs', description: 'Build auto-docs for your app and launch it' },
        ];

        // Handle selection
        quickPick.onDidChangeSelection(selection => {
            const choice = selection[0].label;
			if(choice === "Clean build files") {
				if (!feTerminal)
					feTerminal = vscode.window.createTerminal('FE App Build');
				feTerminal.show();
				feTerminal.sendText('fe build --clean');
			} else if(choice === "Build app docs") {
				if (!feTerminal)
					feTerminal = vscode.window.createTerminal('FE App Build');
				feTerminal.show();
				feTerminal.sendText('fe build --docs --no-server');
			}
            quickPick.hide();
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
        });

        quickPick.show(); // Show the Quick Pick menu
    });

    context.subscriptions.push(quickPickButton, quickPickCommand);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Factory Engine extension is active');

	if(!checkCommandExists("fe")) {
		vscode.window.showErrorMessage()
		const err = "Factory Engine CLI is not installed (fe command is missing.)";
		const btn = "Installation Guide";
		vscode.window.showErrorMessage(err, btn).then(selection => {
			if (selection === btn) {
				vscode.env.openExternal(vscode.Uri.parse('https://fe.martinrea.tech/docs/build/install-fe/'));
			}
		});
		return;
	}

	const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        workspaceFolders.forEach(folder => {
            if(isApp(folder)) {
				const meta = appMeta(folder);
				vscode.window.showInformationMessage(`Discovered Factory Engine app: ${meta.slug}`);
			}
		});
	}

	setup_status_bar(context);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
