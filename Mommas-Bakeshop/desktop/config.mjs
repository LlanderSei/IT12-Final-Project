import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultProjectRoot = path.resolve(__dirname, "..");

const envPath = path.join(defaultProjectRoot, ".env");
if (existsSync(envPath)) {
	try {
		const fs = await import("node:fs/promises");
		const content = await fs.readFile(envPath, "utf-8");
		content.split(/\r?\n/).forEach((line) => {
			const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
			if (match) {
				const key = match[1];
				let value = match[2] || "";
				if (value.startsWith('"') && value.endsWith('"')) {
					value = value.substring(1, value.length - 1);
				}
				if (process.env[key] === undefined) {
					process.env[key] = value;
				}
			}
		});
	} catch (err) {
		console.error("Failed to load .env file:", err);
	}
}

const packagedProjectRoot = process.resourcesPath
	? path.join(process.resourcesPath, "app")
	: defaultProjectRoot;
const projectRoot =
	process.env.DESKTOP_APP_ROOT ||
	(existsSync(packagedProjectRoot) ? packagedProjectRoot : defaultProjectRoot);

export const getDesktopConfig = () => {
	const defaultHost = process.env.DESKTOP_HOST || "127.0.0.1";
	const defaultPort = Number.parseInt(process.env.DESKTOP_PORT || "8123", 10);
	const healthPath = process.env.DESKTOP_HEALTH_PATH || "/desktop/health";
	const localRuntimeRoot = path.join(projectRoot, "desktop", "runtime");
	const packagedRuntimeRoot = process.resourcesPath
		? path.join(process.resourcesPath, "runtime")
		: localRuntimeRoot;
	const runtimeRoot = existsSync(path.join(localRuntimeRoot, "php", "php.exe"))
		? localRuntimeRoot
		: packagedRuntimeRoot;

	return {
		projectRoot,
		host: defaultHost,
		port: Number.isFinite(defaultPort) ? defaultPort : 8123,
		healthPath,
		healthTimeoutMs:
			Number.parseInt(process.env.DESKTOP_HEALTH_TIMEOUT_MS || "90000", 10) ||
			90000,
		phpBinary:
			process.env.DESKTOP_PHP_BINARY ||
			(process.platform === "win32"
				? path.join(runtimeRoot, "php", "php.exe")
				: path.join(runtimeRoot, "php", "bin", "php")),
		allowSystemPhp:
			String(process.env.DESKTOP_ALLOW_SYSTEM_PHP || "false").toLowerCase() ===
			"true",
		managedMysql: {
			enabled:
				String(process.env.DESKTOP_MANAGED_MYSQL || "false").toLowerCase() ===
				"true",
			host: process.env.DESKTOP_MYSQL_HOST || "127.0.0.1",
			port: Number.parseInt(process.env.DESKTOP_MYSQL_PORT || "3307", 10) || 3307,
			database:
				process.env.DESKTOP_MYSQL_DATABASE || "mommas_bakeshop_desktop",
			username: process.env.DESKTOP_MYSQL_USERNAME || "root",
			password: process.env.DESKTOP_MYSQL_PASSWORD || "",
			dataDir:
				process.env.DESKTOP_MYSQL_DATA_DIR ||
				path.join(projectRoot, "storage", "app", "private", "desktop", "mysql", "data"),
			logDir:
				process.env.DESKTOP_MYSQL_LOG_DIR ||
				path.join(projectRoot, "storage", "app", "private", "desktop", "mysql", "logs"),
			pidFile:
				process.env.DESKTOP_MYSQL_PID_FILE ||
				path.join(projectRoot, "storage", "app", "private", "desktop", "mysql", "mysql.pid"),
			mysqlBinary:
				process.env.DESKTOP_MYSQL_BINARY ||
				(process.platform === "win32"
					? path.join(runtimeRoot, "mysql", "bin", "mysqld.exe")
					: path.join(runtimeRoot, "mysql", "bin", "mysqld")),
			allowSystemMysql:
				String(process.env.DESKTOP_ALLOW_SYSTEM_MYSQL || "false").toLowerCase() ===
				"true",
		},
	};
};

export const getServerUrl = () => {
	const config = getDesktopConfig();
	return `http://${config.host}:${config.port}`;
};

export const getHealthUrl = () => {
	const config = getDesktopConfig();
	return `${getServerUrl()}${config.healthPath}`;
};
