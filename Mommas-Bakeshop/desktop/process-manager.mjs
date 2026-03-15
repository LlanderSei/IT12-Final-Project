import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import {
	appendFileSync,
	constants as fsConstants,
	existsSync,
	readFileSync,
	readdirSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import net from "node:net";
import { getDesktopConfig, getHealthUrl, getServerUrl } from "./config.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatFetchError = (error) => {
	if (!error) {
		return "Unknown error.";
	}

	if (error instanceof Error) {
		const parts = [error.message || error.name];
		if (error.cause instanceof Error) {
			parts.push(`cause=${error.cause.message || error.cause.name}`);
		} else if (error.cause) {
			parts.push(`cause=${String(error.cause)}`);
		}
		return parts.join(" | ");
	}

	return String(error);
};

const logDesktop = (projectRoot, message) => {
	if (!projectRoot) {
		return;
	}

	try {
		const logPath = path.join(projectRoot, "storage", "logs", "desktop-startup.log");
		const line = `[${new Date().toISOString()}] ${message}\n`;
		appendFileSync(logPath, line, { encoding: "utf8" });
	} catch {
		// Best-effort logging only.
	}
};

export class DesktopProcessManager {
	constructor() {
		this.backendProcess = null;
		this.mysqlProcess = null;
		this.shuttingDown = false;
		this.onProgress = (message, percent) => {};
	}

	setProgressCallback(cb) {
		this.onProgress = cb;
	}

	async prepareRuntime() {
		this.onProgress("Preparing runtime...", 10);
		const desktopConfig = getDesktopConfig();
		if (desktopConfig.managedMysql.enabled) {
			await this.startManagedMysql();
		}

		this.onProgress("Bootstrapping application...", 40);
		await this.runBootstrap();

		this.onProgress("Configuring PHP runtime...", 50);
		await this.ensurePhpIniConfigured();
	}

	async startBackend() {
		this.onProgress("Starting backend server...", 70);
		if (process.env.DESKTOP_APP_URL) {
			return process.env.DESKTOP_APP_URL;
		}

		const desktopConfig = getDesktopConfig();

		// Proactively ensure the port is free.
		if (process.platform === "win32") {
			try {
				const { spawnSync } = await import("node:child_process");
				spawnSync("cmd", ["/c", `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${desktopConfig.port} ^| findstr LISTENING') do taskkill /f /pid %a /t`], {
					windowsHide: true,
				});
				await sleep(1000); // Give it a moment to release.
			} catch {
				// Ignore errors if port is already free.
			}
		}

		const phpBinary = await this.resolvePhpBinary();
		const tmpDir = path.join(desktopConfig.projectRoot, "storage", "tmp").replace(/\\/g, "/");
		
		// Use direct php -S for more reliable configuration inheritance via -d flags
		const args = [
			"-d", `upload_tmp_dir=${tmpDir}`,
			"-d", `sys_temp_dir=${tmpDir}`,
			"-d", "upload_max_filesize=10M",
			"-d", "post_max_size=10M",
			"-S", `${desktopConfig.host}:${desktopConfig.port}`,
			"-t", "public"
		];

		const env = this.buildPhpEnv(phpBinary, {
			APP_ENV: process.env.APP_ENV || "production",
			PHP_CLI_SERVER_WORKERS: "4", // Enable multi-threaded support
		});

		this.backendProcess = spawn(phpBinary, args, {
			cwd: desktopConfig.projectRoot,
			stdio: "pipe",
			windowsHide: true,
			env,
		});

		this.backendProcess.stdout?.on("data", (chunk) => {
			process.stdout.write(`[desktop-backend] ${chunk}`);
		});
		this.backendProcess.stderr?.on("data", (chunk) => {
			process.stderr.write(`[desktop-backend] ${chunk}`);
		});
		this.backendProcess.on("error", (error) => {
			logDesktop(desktopConfig.projectRoot, `Backend process error: ${formatFetchError(error)}`);
		});
		this.backendProcess.on("exit", (code, signal) => {
			if (!this.shuttingDown) {
				process.stderr.write(
					`[desktop-backend] exited unexpectedly (code=${code}, signal=${signal})\n`,
				);
				logDesktop(
					desktopConfig.projectRoot,
					`Backend process exited unexpectedly (code=${code}, signal=${signal}). Check logs for details.`,
				);
			} else {
				logDesktop(
					desktopConfig.projectRoot,
					`Backend process exited (code=${code}, signal=${signal}).`,
				);
			}
			this.backendProcess = null;
		});

		return getServerUrl();
	}

	async waitForHealth() {
		this.onProgress("Finalizing startup...", 90);
		const desktopConfig = getDesktopConfig();
		const deadline = Date.now() + desktopConfig.healthTimeoutMs;
		let lastError = null;
		const healthUrl = process.env.DESKTOP_APP_URL
			? `${process.env.DESKTOP_APP_URL}${desktopConfig.healthPath}`
			: getHealthUrl();

		while (Date.now() < deadline) {
			try {
				const response = await fetch(healthUrl, {
					headers: {
						Accept: "application/json",
					},
				});
				if (response.ok) {
					return await response.json();
				}
				lastError = new Error(
					`Health endpoint returned ${response.status} at ${healthUrl}.`,
				);
			} catch (error) {
				lastError = error;
			}

			await sleep(1000);
		}

		const details = formatFetchError(lastError);
		const message = `Failed to reach desktop health endpoint at ${healthUrl}. ${details}`;
		logDesktop(desktopConfig.projectRoot, message);
		throw new Error(message);
	}

	async stopBackend() {
		this.shuttingDown = true;

		if (!this.backendProcess) {
			return;
		}

		const processToStop = this.backendProcess;
		this.backendProcess = null;

		if (process.platform === "win32") {
			spawn("taskkill", ["/pid", String(processToStop.pid), "/f", "/t"], {
				windowsHide: true,
			});
		} else {
			processToStop.kill("SIGTERM");
			setTimeout(() => {
				if (!processToStop.killed) processToStop.kill("SIGKILL");
			}, 2000);
		}

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	async stopManagedMysql() {
		if (!this.mysqlProcess) {
			return;
		}

		const processToStop = this.mysqlProcess;
		this.mysqlProcess = null;

		if (process.platform === "win32") {
			spawn("taskkill", ["/pid", String(processToStop.pid), "/f", "/t"], {
				windowsHide: true,
			});
		} else {
			processToStop.kill("SIGTERM");
			setTimeout(() => {
				if (!processToStop.killed) processToStop.kill("SIGKILL");
			}, 2000);
		}

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	async resolvePhpBinary() {
		const desktopConfig = getDesktopConfig();
		try {
			await access(desktopConfig.phpBinary, fsConstants.X_OK);
			return desktopConfig.phpBinary;
		} catch {
			if (desktopConfig.allowSystemPhp) {
				return "php";
			}
			throw new Error(
				`Bundled PHP runtime not found at ${desktopConfig.phpBinary}. Place PHP under desktop/runtime/php or set DESKTOP_PHP_BINARY (or DESKTOP_ALLOW_SYSTEM_PHP=true for dev).`,
			);
		}
	}

	async startManagedMysql() {
		const desktopConfig = getDesktopConfig();
		const mysqlConfig = desktopConfig.managedMysql;
		if (!mysqlConfig.enabled) {
			return;
		}

		if (await this.isPortOpen(mysqlConfig.host, mysqlConfig.port)) {
			this.onProgress("Database already running...", 30);
			return;
		}

		this.onProgress("Starting database engine...", 20);

		const mysqlBinary = await this.resolveMysqlBinary();
		await mkdir(mysqlConfig.dataDir, { recursive: true });
		await mkdir(mysqlConfig.logDir, { recursive: true });

		await this.ensureMysqlInitialized(mysqlBinary, mysqlConfig);

		const args = [
			`--basedir=${this.resolveMysqlBaseDir(mysqlBinary)}`,
			`--datadir=${mysqlConfig.dataDir}`,
			`--port=${mysqlConfig.port}`,
			`--bind-address=${mysqlConfig.host}`,
			`--pid-file=${mysqlConfig.pidFile}`,
			"--console",
		];

		this.mysqlProcess = spawn(mysqlBinary, args, {
			cwd: desktopConfig.projectRoot,
			stdio: "pipe",
			windowsHide: true,
			env: process.env,
		});

		this.mysqlProcess.stdout?.on("data", (chunk) => {
			process.stdout.write(`[desktop-mysql] ${chunk}`);
		});
		this.mysqlProcess.stderr?.on("data", (chunk) => {
			process.stderr.write(`[desktop-mysql] ${chunk}`);
		});
		this.mysqlProcess.on("error", (error) => {
			logDesktop(
				desktopConfig.projectRoot,
				`MySQL process error: ${formatFetchError(error)}`,
			);
		});
		this.mysqlProcess.on("exit", (code, signal) => {
			if (!this.shuttingDown) {
				process.stderr.write(
					`[desktop-mysql] exited unexpectedly (code=${code}, signal=${signal})\n`,
				);
			}
			logDesktop(
				desktopConfig.projectRoot,
				`MySQL process exited (code=${code}, signal=${signal}).`,
			);
			this.mysqlProcess = null;
		});

		const ready = await this.waitForPort(mysqlConfig.host, mysqlConfig.port);
		if (!ready) {
			throw new Error("Timed out waiting for the managed MySQL runtime to accept connections.");
		}
	}

	resolveMysqlBaseDir(mysqlBinary) {
		return path.resolve(path.dirname(mysqlBinary), "..");
	}

	async ensureMysqlInitialized(mysqlBinary, mysqlConfig) {
		const desktopConfig = getDesktopConfig();
		const mysqlSystemDir = path.join(mysqlConfig.dataDir, "mysql");
		if (existsSync(mysqlSystemDir)) {
			return;
		}

		const contents = readdirSync(mysqlConfig.dataDir, { withFileTypes: true });
		if (contents.length > 0 && !existsSync(mysqlSystemDir)) {
			throw new Error(
				`MySQL data directory is not initialized but contains files: ${mysqlConfig.dataDir}.`,
			);
		}

		const initArgs = [
			`--basedir=${this.resolveMysqlBaseDir(mysqlBinary)}`,
			`--datadir=${mysqlConfig.dataDir}`,
			"--initialize-insecure",
			"--console",
		];

		await new Promise((resolve, reject) => {
			this.onProgress("Initializing database storage...", 25);
			const initProcess = spawn(mysqlBinary, initArgs, {
				cwd: desktopConfig.projectRoot,
				stdio: "pipe",
				windowsHide: true,
				env: process.env,
			});

			let stderr = "";
			let stdout = "";

			initProcess.stdout?.on("data", (chunk) => {
				stdout += chunk.toString();
				process.stdout.write(`[desktop-mysql-init] ${chunk}`);
			});
			initProcess.stderr?.on("data", (chunk) => {
				stderr += chunk.toString();
				process.stderr.write(`[desktop-mysql-init] ${chunk}`);
			});
			initProcess.once("error", (error) => {
				logDesktop(
					desktopConfig.projectRoot,
					`MySQL init error: ${formatFetchError(error)}`,
				);
				reject(error);
			});
			initProcess.once("exit", (code) => {
				if (code === 0) {
					resolve();
					return;
				}

				reject(
					new Error(
						`MySQL initialization failed with exit code ${code}.\n${stderr || stdout}`.trim(),
					),
				);
			});
		});
	}

	async resolveMysqlBinary() {
		const desktopConfig = getDesktopConfig();
		try {
			await access(desktopConfig.managedMysql.mysqlBinary, fsConstants.X_OK);
			return desktopConfig.managedMysql.mysqlBinary;
		} catch {
			if (desktopConfig.managedMysql.allowSystemMysql) {
				return process.platform === "win32" ? "mysqld" : "mysqld";
			}
			throw new Error(
				`Bundled MySQL runtime not found at ${desktopConfig.managedMysql.mysqlBinary}. Place MySQL under desktop/runtime/mysql or set DESKTOP_MYSQL_BINARY (or DESKTOP_ALLOW_SYSTEM_MYSQL=true for dev).`,
			);
		}
	}

	async runBootstrap() {
		const desktopConfig = getDesktopConfig();
		const phpBinary = await this.resolvePhpBinary();
		const tmpDir = path.join(desktopConfig.projectRoot, "storage", "tmp").replace(/\\/g, "/");
		const bootstrapArgs = [
			"-d", `upload_tmp_dir=${tmpDir}`,
			"-d", `sys_temp_dir=${tmpDir}`,
			"-d", "upload_max_filesize=10M",
			"-d", "post_max_size=10M",
			"artisan",
			"desktop:bootstrap",
			"--force",
		];

		await new Promise((resolve, reject) => {
			const bootstrapProcess = spawn(phpBinary, bootstrapArgs, {
				cwd: desktopConfig.projectRoot,
				stdio: "pipe",
				windowsHide: true,
				env: this.buildPhpEnv(phpBinary, {
					APP_ENV: process.env.APP_ENV || "production",
				}),
			});

			let stderr = "";
			let stdout = "";

			bootstrapProcess.stdout?.on("data", (chunk) => {
				stdout += chunk.toString();
				process.stdout.write(`[desktop-bootstrap] ${chunk}`);
			});
			bootstrapProcess.stderr?.on("data", (chunk) => {
				stderr += chunk.toString();
				process.stderr.write(`[desktop-bootstrap] ${chunk}`);
			});
			bootstrapProcess.once("error", (error) => {
				logDesktop(
					desktopConfig.projectRoot,
					`Bootstrap error: ${formatFetchError(error)}`,
				);
				reject(error);
			});
			bootstrapProcess.once("exit", (code) => {
				if (code === 0) {
					resolve();
					return;
				}

				reject(
					new Error(
						`Desktop bootstrap failed with exit code ${code}.\n${stderr || stdout}`.trim(),
					),
				);
			});
		});
	}

	async waitForPort(host, port) {
		const desktopConfig = getDesktopConfig();
		const deadline = Date.now() + desktopConfig.healthTimeoutMs;
		while (Date.now() < deadline) {
			if (await this.isPortOpen(host, port)) {
				return true;
			}
			await sleep(1000);
		}
		return false;
	}

	async isPortOpen(host, port) {
		return new Promise((resolve) => {
			const socket = net.createConnection({ host, port });
			socket.once("connect", () => {
				socket.destroy();
				resolve(true);
			});
			socket.once("error", () => {
				socket.destroy();
				resolve(false);
			});
		});
	}

	async ensurePhpIniConfigured() {
		const desktopConfig = getDesktopConfig();
		const phpBinary = await this.resolvePhpBinary();
		if (phpBinary === "php") {
			return; // Using system PHP, don't touch its config.
		}

		const phpDir = path.dirname(phpBinary);
		const iniPath = path.join(phpDir, "php.ini");
		if (!existsSync(iniPath)) {
			return;
		}

		try {
			let content = readFileSync(iniPath, "utf8");
			const projectRoot = desktopConfig.projectRoot;
			
			// Use forward slashes even on Windows for PHP config, and wrap in quotes
			const tmpDir = path.join(projectRoot, "storage", "tmp").replace(/\\/g, "/");

			// Ensure storage/tmp exists
			await mkdir(path.join(projectRoot, "storage", "tmp"), { recursive: true });

			const settings = {
				upload_tmp_dir: `"${tmpDir}"`,
				sys_temp_dir: `"${tmpDir}"`,
				upload_max_filesize: "5M",
				post_max_size: "8M",
			};

			let modified = false;
			for (const [key, value] of Object.entries(settings)) {
				const pattern = new RegExp(`^;?\\s*${key}\\s*=.*$`, "m");
				const newLine = `${key} = ${value}`;

				if (pattern.test(content)) {
					const match = content.match(pattern)[0];
					if (match !== newLine) {
						content = content.replace(pattern, newLine);
						modified = true;
					}
				} else {
					content = content.trimEnd() + `\n${newLine}\n`;
					modified = true;
				}
			}

			if (modified) {
				writeFileSync(iniPath, content, "utf8");
				logDesktop(desktopConfig.projectRoot, "Updated php.ini with dynamic paths and size limits.");
			}
		} catch (error) {
			logDesktop(
				desktopConfig.projectRoot,
				`Failed to configure php.ini: ${formatFetchError(error)}`,
			);
		}
	}

	buildPhpEnv(phpBinary, extraEnv = {}) {
		const desktopConfig = getDesktopConfig();
		const tmpDir = path.join(desktopConfig.projectRoot, "storage", "tmp");

		const env = {
			...process.env,
			...extraEnv,
			TMP: tmpDir,
			TEMP: tmpDir,
			TMPDIR: tmpDir,
		};
		const phpDir = path.dirname(phpBinary);
		if (phpBinary !== "php" && existsSync(path.join(phpDir, "php.ini"))) {
			env.PHPRC = phpDir;
			env.PHP_INI_SCAN_DIR = "";
			if (process.platform === "win32") {
				env.PATH = `${phpDir};${env.PATH || ""}`;
			}
		}

		return env;
	}
}
