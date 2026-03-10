import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const defaultHost = process.env.DESKTOP_HOST || "127.0.0.1";
const defaultPort = Number.parseInt(process.env.DESKTOP_PORT || "8123", 10);
const healthPath = process.env.DESKTOP_HEALTH_PATH || "/desktop/health";

export const desktopConfig = {
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
			? path.join(projectRoot, "desktop", "runtime", "php", "php.exe")
			: path.join(projectRoot, "desktop", "runtime", "php", "bin", "php")),
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
				? path.join(projectRoot, "desktop", "runtime", "mysql", "bin", "mysqld.exe")
				: path.join(projectRoot, "desktop", "runtime", "mysql", "bin", "mysqld")),
	},
};

export const serverUrl = `http://${desktopConfig.host}:${desktopConfig.port}`;
export const healthUrl = `${serverUrl}${desktopConfig.healthPath}`;
