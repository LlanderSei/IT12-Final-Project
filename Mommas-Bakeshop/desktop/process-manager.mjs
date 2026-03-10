import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { constants as fsConstants, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import net from "node:net";
import { getDesktopConfig, getHealthUrl, getServerUrl } from "./config.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DesktopProcessManager {
	constructor() {
		this.backendProcess = null;
		this.mysqlProcess = null;
		this.shuttingDown = false;
	}

	async prepareRuntime() {
		const desktopConfig = getDesktopConfig();
		if (desktopConfig.managedMysql.enabled) {
			await this.startManagedMysql();
		}

		await this.runBootstrap();
	}

	async startBackend() {
		if (process.env.DESKTOP_APP_URL) {
			return process.env.DESKTOP_APP_URL;
		}

		const desktopConfig = getDesktopConfig();
		const phpBinary = await this.resolvePhpBinary();
		const args = [
			"artisan",
			"serve",
			"--host",
			desktopConfig.host,
			"--port",
			String(desktopConfig.port),
		];

		this.backendProcess = spawn(phpBinary, args, {
			cwd: desktopConfig.projectRoot,
			stdio: "pipe",
			windowsHide: true,
			env: {
				...process.env,
				APP_ENV: process.env.APP_ENV || "production",
			},
		});

		this.backendProcess.stdout?.on("data", (chunk) => {
			process.stdout.write(`[desktop-backend] ${chunk}`);
		});
		this.backendProcess.stderr?.on("data", (chunk) => {
			process.stderr.write(`[desktop-backend] ${chunk}`);
		});
		this.backendProcess.on("exit", (code, signal) => {
			if (!this.shuttingDown) {
				process.stderr.write(
					`[desktop-backend] exited unexpectedly (code=${code}, signal=${signal})\n`,
				);
			}
			this.backendProcess = null;
		});

		return getServerUrl();
	}

	async waitForHealth() {
		const desktopConfig = getDesktopConfig();
		const deadline = Date.now() + desktopConfig.healthTimeoutMs;
		let lastError = null;

		while (Date.now() < deadline) {
			try {
				const response = await fetch(process.env.DESKTOP_APP_URL ? `${process.env.DESKTOP_APP_URL}${desktopConfig.healthPath}` : getHealthUrl(), {
					headers: {
						Accept: "application/json",
					},
				});
				if (response.ok) {
					return await response.json();
				}
				lastError = new Error(`Health endpoint returned ${response.status}.`);
			} catch (error) {
				lastError = error;
			}

			await sleep(1000);
		}

		throw lastError || new Error("Timed out waiting for the local desktop health endpoint.");
	}

	async stopBackend() {
		this.shuttingDown = true;

		if (!this.backendProcess) {
			return;
		}

		const processToStop = this.backendProcess;
		this.backendProcess = null;

		await new Promise((resolve) => {
			processToStop.once("exit", () => resolve());

			if (process.platform === "win32") {
				spawn("taskkill", ["/pid", String(processToStop.pid), "/f", "/t"], {
					windowsHide: true,
				});
			} else {
				processToStop.kill("SIGTERM");
			}

			setTimeout(() => resolve(), 5000);
		});
	}

	async stopManagedMysql() {
		if (!this.mysqlProcess) {
			return;
		}

		const processToStop = this.mysqlProcess;
		this.mysqlProcess = null;

		await new Promise((resolve) => {
			processToStop.once("exit", () => resolve());

			if (process.platform === "win32") {
				spawn("taskkill", ["/pid", String(processToStop.pid), "/f", "/t"], {
					windowsHide: true,
				});
			} else {
				processToStop.kill("SIGTERM");
			}

			setTimeout(() => resolve(), 5000);
		});
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
			return;
		}

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
		this.mysqlProcess.on("exit", (code, signal) => {
			if (!this.shuttingDown) {
				process.stderr.write(
					`[desktop-mysql] exited unexpectedly (code=${code}, signal=${signal})\n`,
				);
			}
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
			initProcess.once("error", reject);
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
		const bootstrapArgs = ["artisan", "desktop:bootstrap", "--force"];

		await new Promise((resolve, reject) => {
			const bootstrapProcess = spawn(phpBinary, bootstrapArgs, {
				cwd: desktopConfig.projectRoot,
				stdio: "pipe",
				windowsHide: true,
				env: {
					...process.env,
					APP_ENV: process.env.APP_ENV || "production",
				},
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
			bootstrapProcess.once("error", reject);
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
}
