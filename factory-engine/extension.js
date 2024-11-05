const vscode = require('vscode');
const { checkCommandExists, getCorePath, appMeta, isApp } = require('./utils.js');
const { setup_venv, clear_venv, setup_venv_watcher, setup_pythonpath } = require('./py.js');
const { execSync } = require('child_process');
const { setup_status_bar } = require('./status.js');

let feTerminal;
let appCreateCommand;

const BUILD_TERMINAL_NAME = 'FE Build Terminal';

function delete_terminals() {
    const terminals = vscode.window.terminals;

    terminals.forEach((terminal) => {
        if (terminal.name === BUILD_TERMINAL_NAME) {
            terminal.dispose();
        }
    });
}

function open_build_terminal() {
    let exists = true;
    if (!feTerminal) {
        feTerminal = vscode.window.createTerminal(BUILD_TERMINAL_NAME);
        exists = false;
    }
    feTerminal.show();
    return new Promise(resolve => setTimeout(() => resolve(feTerminal), exists ? 0 : 1000));
}

function run_setup(context) {
    const apps = [];
    const appdirs = [];

    vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === feTerminal) {
            console.log("Factory Engine build terminal was closed");
            feTerminal = null;
        }
    });

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

    delete_terminals();
	setup_status_bar(context, apps, appdirs, open_build_terminal);
    // setup_venv(appdirs);
    setup_pythonpath(appdirs);
    setup_venv_watcher(context, appdirs);

    return [apps, appdirs];
}

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

    const [apps, appdirs] = run_setup(context);

    try{
        appCreateCommand = vscode.commands.registerCommand('factory-engine.InitApp', async () => {
            if(apps.length > 0) {
                await vscode.window.showErrorMessage("You are already in a Factory Engine app project folder!");
                return;
            }
    
            const result = await vscode.window.showInputBox({ placeHolder: 'Enter app project slug' });
                if(result) {
                    try {
                        execSync(`fe init ${result}`, { encoding: 'utf-8', cwd: vscode.workspace.workspaceFolders[0].uri.path });
                        run_setup(context);
                    } catch (error) {
                        console.error(error);
                        await vscode.window.showErrorMessage("Failed to initialize Factory Engine app");
                    }
                }
            
        });
        context.subscriptions.push(appCreateCommand);
    } catch (error) {
        console.log(error);
    }
}

function deactivate() {
	console.log('Factory Engine extension is de-active');
}

module.exports = {
	activate,
	deactivate
}
