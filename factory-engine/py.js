const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { PythonExtension } = require('@vscode/python-extension');
const { getCorePath } = require('./utils.js');

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
    if(appdirs.length === 0) return;

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

module.exports = {setup_venv, clear_venv, setup_venv_watcher, setup_pythonpath};