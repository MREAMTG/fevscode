const vscode = require('vscode');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const { execSync } = require('child_process');
const { PythonExtension } = require('@vscode/python-extension');

let feTerminal;

function open_build_terminal() {
    let exists = true;
    if (!feTerminal) {
        feTerminal = vscode.window.createTerminal('FE Build Terminal');
        exists = false;
    }
    feTerminal.show();
    return new Promise(resolve => setTimeout(resolve, exists ? 0 : 1000));
}

function checkCommandExists(command) {
	try {
        execSync(`command -v ${command}`, { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}

function getCorePath(appPath) {
    try {
        const output = execSync("fe info --core-path", { encoding: 'utf-8', cwd: appPath });
        return output.trim();
    } catch (error) {
        console.error(error);
        return null;
    }
}

const appMeta = (folder) => {
	const filePath = path.join(folder.uri.path, ".fe", 'app.yaml');
	try {
		const file = fs.readFileSync(filePath, 'utf8');
		return yaml.load(file);
	} catch (e) {
        console.error("Expected error while opening app Meta file:");
		console.error(e);
		return null;
	}
}

const isApp = (folder) => {
	return appMeta(folder) !== null;
}

function setup_pythonpath(appdirs) {
    if(appdirs.length == 0) return;

    const toolkit_path = path.join(getCorePath(appdirs[0]), "toolkit", "backend", "src");

    const pythonConfig = vscode.workspace.getConfiguration('python');
    const currentExtraPaths = pythonConfig.get('analysis.extraPaths') || [];
    if(!currentExtraPaths.includes(toolkit_path)) {
        const updatedPaths = [...currentExtraPaths, toolkit_path];
        pythonConfig.update('analysis.extraPaths', updatedPaths, vscode.ConfigurationTarget.Workspace).then(() => {
            console.log('Successfully updated extraPaths - added', toolkit_path);
        }, (err) => {
            console.error('Error updating extraPaths:', err);
        });
    }
}

async function setup_venv(appdirs) {
    if(appdirs.length == 0) return;

    const venv_path = path.join(appdirs[0], ".fe", "venv", "bin", "python");
    if(fs.existsSync(venv_path)) {
        const pythonApi = await PythonExtension.api();
        const environments = pythonApi.environments;
        await environments.updateActiveEnvironmentPath(venv_path);
        console.log("Activated venv")
    } else {
        console.log("No venv to activate")
    }
}

async function clear_venv() {
    const pythonApi = await PythonExtension.api();
    const environments = pythonApi.environments;
    const environments2 = environments.known;
    const pythonConfig = vscode.workspace.getConfiguration('python');
    const interpreterPath = pythonConfig.get('defaultInterpreterPath');
    await environments.updateActiveEnvironmentPath(interpreterPath);
    console.log("Cleared venv");
}

function setup_venv_watcher(context, appdirs) {
    const pattern = '**/*';
    const interp_path = path.join(appdirs[0], ".fe", "venv", "bin", "python");
    const env_path = path.join(appdirs[0], ".fe", "venv");

    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    watcher.onDidCreate((uri) => {
        // console.log(`File created: ${uri.fsPath}`);
        if(uri.fsPath === interp_path) {
            console.log("FE venv discovered. Activating...");
            setup_venv(appdirs);
        }
    });

    watcher.onDidDelete((uri) => {
        // console.log(`File delete: ${uri.fsPath}`);
        if(uri.fsPath === env_path || uri.fsPath === interp_path) {
            console.log("FE venv deleted. De-activating...");
            
            clear_venv();
        }
    });
  
    context.subscriptions.push(watcher);
}

const setup_status_bar = (context, apps) => {

    if(apps.length == 0) return;

    const selectedApp = apps[0];

    const appLabel = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    appLabel.text = "$(info) FE App: " + selectedApp.slug;
    appLabel.tooltip = "View Factory Engine app project details";
    appLabel.command = 'factory-engine.AppInfo';
    appLabel.show();

    let disposable = vscode.commands.registerCommand('factory-engine.AppInfo', () => {
		open_build_terminal().then(() => {
            feTerminal.sendText('fe info');
        });
    });
	context.subscriptions.push(appLabel, disposable);

	const buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildButton.text = "$(wrench)  fe build (full)";
    buildButton.tooltip = "Build your Factory Engine App Project";
    buildButton.command = 'factory-engine.BuildApp';
    buildButton.show();
	
    disposable = vscode.commands.registerCommand('factory-engine.BuildApp', () => {
        open_build_terminal().then(() => {
            feTerminal.sendText('fe build');
        });
    });
	context.subscriptions.push(buildButton, disposable);

    vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === feTerminal) {
            console.log("Factory Engine build terminal was closed");
            feTerminal = null;
        }
    });

	const buildDeviceButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildDeviceButton.text = "$(device-desktop) fe build (device)";
    buildDeviceButton.tooltip = "Build your Factory Engine App Project (device features only)";
    buildDeviceButton.command = 'factory-engine.BuildAppDevice';
    buildDeviceButton.show();

    disposable = vscode.commands.registerCommand('factory-engine.BuildAppDevice', () => {
        open_build_terminal().then(() => {
            feTerminal.sendText('fe build --no-server');
        });
    });
	context.subscriptions.push(buildDeviceButton, disposable);

	const buildServerButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildServerButton.text = "$(server) fe build (server)";
    buildServerButton.tooltip = "Build your Factory Engine App Project (server features only)";
    buildServerButton.command = 'factory-engine.BuildAppServer';
    buildServerButton.show();

    disposable = vscode.commands.registerCommand('factory-engine.BuildAppServer', () => {
        open_build_terminal().then(() => {
            feTerminal.sendText('fe build --no-device');
        });
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
                open_build_terminal().then(() => {
                    feTerminal.sendText('fe build --clean');
                });
			} else if(choice === "Build app docs") {
                open_build_terminal().then(() => {
                    feTerminal.sendText('fe build --docs --no-server');
                });
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

    const apps = [];
    const appdirs = [];

	const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        workspaceFolders.forEach(folder => {
            if(isApp(folder)) {
				const meta = appMeta(folder);
                apps.push(meta);
                appdirs.push(folder.uri.path);
			}
		});
	}

	setup_status_bar(context, apps);
    setup_venv(appdirs);
    setup_pythonpath(appdirs);
    setup_venv_watcher(context, appdirs);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
