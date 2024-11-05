const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

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
        // console.error("Expected error while opening app Meta file:");
		// console.error(e);
		return null;
	}
}

const isApp = (folder) => {
	return appMeta(folder) !== null;
}

module.exports = {isApp, appMeta, getCorePath, checkCommandExists};