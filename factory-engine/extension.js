const vscode = require('vscode');
const { checkCommandExists, getCorePath, appMeta, isApp } = require('./utils.js');
const { setup_venv, clear_venv, setup_venv_watcher, setup_pythonpath } = require('./py.js');
const { setup_status_bar } = require('./status.js');

let feTerminal;

function open_build_terminal() {
    let exists = true;
    if (!feTerminal) {
        feTerminal = vscode.window.createTerminal('FE Build Terminal');
        exists = false;
    }
    feTerminal.show();
    return new Promise(resolve => setTimeout(() => resolve(feTerminal), exists ? 0 : 1000));
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

	setup_status_bar(context, apps, appdirs, open_build_terminal);
    setup_venv(appdirs);
    setup_pythonpath(appdirs);
    setup_venv_watcher(context, appdirs);
}

function deactivate() {
	console.log('Factory Engine extension is de-active');
}

module.exports = {
	activate,
	deactivate
}
