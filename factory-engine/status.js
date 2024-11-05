const vscode = require('vscode');
const { execSync } = require('child_process');

const setup_status_bar = (context, apps, appdirs, open_build_terminal) => {
    if(apps.length == 0) return;

    const selectedApp = apps[0];

    const appLabel = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    appLabel.text = "$(info) FE App: " + selectedApp.slug;
    appLabel.tooltip = "View Factory Engine app project details";
    appLabel.command = 'factory-engine.AppInfo';
    appLabel.show();

    let disposable = vscode.commands.registerCommand('factory-engine.AppInfo', () => {
		open_build_terminal().then((t) => {
            t.sendText('fe info');
        });
    });
	context.subscriptions.push(appLabel, disposable);

	const buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildButton.text = "$(wrench)  fe build (full)";
    buildButton.tooltip = "Build your Factory Engine App Project";
    buildButton.command = 'factory-engine.BuildApp';
    buildButton.show();
	
    disposable = vscode.commands.registerCommand('factory-engine.BuildApp', () => {
        open_build_terminal().then((t) => {
            t.sendText('fe build');
        });
    });
	context.subscriptions.push(buildButton, disposable);

	const buildDeviceButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildDeviceButton.text = "$(device-desktop) fe build (device)";
    buildDeviceButton.tooltip = "Build your Factory Engine App Project (device features only)";
    buildDeviceButton.command = 'factory-engine.BuildAppDevice';
    buildDeviceButton.show();

    disposable = vscode.commands.registerCommand('factory-engine.BuildAppDevice', () => {
        open_build_terminal().then((t) => {
            t.sendText('fe build --no-server');
        });
    });
	context.subscriptions.push(buildDeviceButton, disposable);

	const buildServerButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    buildServerButton.text = "$(server) fe build (server)";
    buildServerButton.tooltip = "Build your Factory Engine App Project (server features only)";
    buildServerButton.command = 'factory-engine.BuildAppServer';
    buildServerButton.show();

    disposable = vscode.commands.registerCommand('factory-engine.BuildAppServer', () => {
        open_build_terminal().then((t) => {
            t.sendText('fe build --no-device');
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
                open_build_terminal().then((t) => {
                    t.sendText('fe build --clean');
                });
			} else if(choice === "Build app docs") {
                open_build_terminal().then((t) => {
                    t.sendText('fe build --docs --no-server');
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

module.exports = {setup_status_bar};