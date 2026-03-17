import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const mode = process.argv[2] === 'dir' ? 'dir' : 'package';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join('dist-electron', `${mode}-${timestamp}`);

const runtimeRoot = path.join(projectRoot, 'desktop', 'runtime');
const phpBinary = path.join(runtimeRoot, 'php', 'php.exe');
const mysqlBinary = path.join(runtimeRoot, 'mysql', 'bin', 'mysqld.exe');
const isRemoteMode =
	String(process.env.DESKTOP_MODE || '').toLowerCase() === 'remote' ||
	Boolean(process.env.DESKTOP_APP_URL);

const verifyRuntime = async () => {
    if (String(process.env.DESKTOP_SKIP_RUNTIME_CHECK || 'false').toLowerCase() === 'true') {
        return;
    }
	if (isRemoteMode) {
		return;
	}

    try {
        await access(phpBinary, fsConstants.X_OK);
    } catch {
        throw new Error(`Bundled PHP runtime not found at ${phpBinary}.`);
    }

    try {
        await access(mysqlBinary, fsConstants.X_OK);
    } catch {
        throw new Error(`Bundled MySQL runtime not found at ${mysqlBinary}.`);
    }
};

const args = [
    '--config.directories.output=' + outputDir,
];

if (mode === 'dir') {
    args.unshift('--dir');
    args.push('--config.win.signAndEditExecutable=false');
}

try {
    await verifyRuntime();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}

const child =
    process.platform === 'win32'
        ? spawn(path.join(projectRoot, 'node_modules', '.bin', 'electron-builder.cmd'), args, {
			cwd: projectRoot,
			stdio: 'inherit',
			shell: true,
		})
		: spawn(path.join(projectRoot, 'node_modules', '.bin', 'electron-builder'), args, {
			cwd: projectRoot,
			stdio: 'inherit',
			shell: false,
		});

child.on('exit', (code) => {
	process.exit(code ?? 1);
});

child.on('error', (error) => {
	console.error(error);
	process.exit(1);
});
