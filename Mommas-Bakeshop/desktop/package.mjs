import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const mode = process.argv[2] === 'dir' ? 'dir' : 'package';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join('dist-electron', `${mode}-${timestamp}`);

const args = [
	'--config.directories.output=' + outputDir,
];

if (mode === 'dir') {
	args.unshift('--dir');
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
