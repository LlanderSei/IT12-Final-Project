import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultProjectRoot = path.resolve(__dirname, "..");
const packagedProjectRoot = process.resourcesPath
	? path.join(process.resourcesPath, "app")
	: defaultProjectRoot;
const isRemoteMode =
	String(process.env.DESKTOP_MODE || "").toLowerCase() === "remote" ||
	Boolean(process.env.DESKTOP_APP_URL);
const projectRoot = isRemoteMode
	? process.env.DESKTOP_APP_ROOT || process.cwd()
	: process.env.DESKTOP_APP_ROOT ||
		(existsSync(packagedProjectRoot) ? packagedProjectRoot : defaultProjectRoot);

const loadJsonConfig = () => {
	const configPath =
		process.env.DESKTOP_CONFIG_PATH ||
		path.join(projectRoot, "storage", "app", "private", "desktop-config.json");
	if (!existsSync(configPath)) {
		return;
	}

	try {
		const raw = readFileSync(configPath, "utf8");
		const data = JSON.parse(raw);
		if (data && typeof data === "object") {
			for (const [key, value] of Object.entries(data)) {
				if (
					value === undefined ||
					value === null ||
					Object.prototype.hasOwnProperty.call(process.env, key)
				) {
					continue;
				}
				process.env[key] = String(value);
			}
		}
	} catch {
		// Ignore invalid JSON; environment variables still take precedence.
	}
};

let envLoaded = false;

const loadDotEnv = () => {
	const envPath = path.join(projectRoot, ".env");
	const fallbackPath = path.join(projectRoot, ".env.example");
	const sourcePath = existsSync(envPath) ? envPath : existsSync(fallbackPath) ? fallbackPath : null;
	if (!sourcePath) {
		return;
	}

	const content = readFileSync(sourcePath, "utf8");
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line === "" || line.startsWith("#")) {
			continue;
		}

		const separatorIndex = line.indexOf("=");
		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
			continue;
		}

		let value = line.slice(separatorIndex + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		process.env[key] = value;
	}
};

const ensureEnvLoaded = () => {
	if (envLoaded) {
		return;
	}
	loadJsonConfig();
	loadDotEnv();
	envLoaded = true;
};

export const getDesktopConfig = () => {
	ensureEnvLoaded();
	const defaultHost = process.env.DESKTOP_HOST || "127.0.0.1";
	const defaultPort = Number.parseInt(process.env.DESKTOP_PORT || "8123", 10);
	const healthPath = process.env.DESKTOP_HEALTH_PATH || "/desktop/health";
	const healthTimeoutMsRaw =
		process.env.DESKTOP_HEALTH_TIMEOUT_MS ||
		(process.env.DESKTOP_HEALTH_TIMEOUT
			? String(Number.parseInt(process.env.DESKTOP_HEALTH_TIMEOUT, 10) * 1000)
			: undefined);
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
			Number.parseInt(healthTimeoutMsRaw || "90000", 10) || 90000,
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
	ensureEnvLoaded();
	const config = getDesktopConfig();
	return `http://${config.host}:${config.port}`;
};

export const getHealthUrl = () => {
	ensureEnvLoaded();
	const config = getDesktopConfig();
	return `${getServerUrl()}${config.healthPath}`;
};
