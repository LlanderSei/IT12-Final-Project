import { app, BrowserWindow, dialog, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { DesktopProcessManager } from "./process-manager.mjs";
import { getDesktopConfig } from "./config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let splashWindow = null;
const processManager = new DesktopProcessManager();
const isRemoteMode = () =>
	String(process.env.DESKTOP_MODE || "").toLowerCase() === "remote" ||
	Boolean(process.env.DESKTOP_APP_URL);

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
	app.quit();
}

const createWindow = async () => {
	if (!process.env.DESKTOP_CONFIG_PATH) {
		process.env.DESKTOP_CONFIG_PATH = path.join(
			app.getPath("userData"),
			"desktop-config.json",
		);
	}

	if (process.env.DESKTOP_ALLOW_SYSTEM_PHP === undefined) {
		process.env.DESKTOP_ALLOW_SYSTEM_PHP = app.isPackaged ? "false" : "true";
	}
	if (process.env.DESKTOP_ALLOW_SYSTEM_MYSQL === undefined) {
		process.env.DESKTOP_ALLOW_SYSTEM_MYSQL = app.isPackaged ? "false" : "true";
	}
	if (process.env.DESKTOP_MANAGED_MYSQL === undefined) {
		process.env.DESKTOP_MANAGED_MYSQL = app.isPackaged ? "true" : "false";
	}

	await ensureRemoteConfigReady(app.isPackaged);

	if (app.isPackaged && !isRemoteMode()) {
		throw new Error(
			"Remote mode is required in packaged builds. Set DESKTOP_APP_URL or DESKTOP_MODE=remote.",
		);
	}

	const config = getDesktopConfig();
	if (!isRemoteMode() && existsSync(config.projectRoot) && process.cwd() !== config.projectRoot) {
		process.chdir(config.projectRoot);
	}

	splashWindow = await createSplashWindow();
	splashWindow.focus();

	processManager.setProgressCallback((message, percent) => {
		if (splashWindow && !splashWindow.isDestroyed()) {
			splashWindow.webContents.send("startup-progress", message, percent);
		}
	});

	let serverUrl = "";
	if (!isRemoteMode()) {
		await processManager.prepareRuntime();
		serverUrl = await processManager.startBackend();
	} else {
		serverUrl = process.env.DESKTOP_APP_URL || "";
		processManager.onProgress("Connecting to server...", 40);
	}
	if (!serverUrl) {
		throw new Error("DESKTOP_APP_URL is required in remote mode.");
	}

	const shouldSkipHealth =
		String(process.env.DESKTOP_SKIP_HEALTH_CHECK || "false").toLowerCase() ===
		"true";
	const health = shouldSkipHealth ? { ready: true } : await processManager.waitForHealth();

	if (!health?.ready) {
		const failureSummary = Array.isArray(health?.errors) ? health.errors.join("\n") : "Desktop health endpoint did not report a ready application.";
		throw new Error(failureSummary);
	}

	processManager.onProgress("Ready!", 100);
	await sleep(500); // Visual polish: show 100% briefly

	mainWindow = new BrowserWindow({
		width: 1440,
		height: 920,
		minWidth: 1200,
		minHeight: 760,
		show: false,
		backgroundColor: "#0b1220",
		autoHideMenuBar: true,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			preload: path.join(__dirname, "preload.cjs"),
		},
	});

	mainWindow.once("ready-to-show", () => {
		setTimeout(() => {
			splashWindow?.destroy();
			splashWindow = null;
			mainWindow?.show();
			mainWindow?.focus();
		}, 200);
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	await mainWindow.loadURL(serverUrl);
};

app.on("second-instance", () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		mainWindow.focus();
	}
});

app.whenReady().then(async () => {
	try {
		await createWindow();
	} catch (error) {
		if (splashWindow) {
			splashWindow.destroy();
			splashWindow = null;
		}
		const detail = error instanceof Error ? error.stack || error.message : String(error);
		await dialog.showMessageBox({
			type: "error",
			title: "Desktop Startup Failed",
			message: "Momma's Bakeshop desktop could not start.",
			detail,
		});
		await processManager.stopBackend();
		await processManager.stopManagedMysql();
		app.quit();
	}

	app.on("activate", async () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			try {
				await createWindow();
			} catch (error) {
				const detail = error instanceof Error ? error.stack || error.message : String(error);
				await dialog.showMessageBox({
					type: "error",
					title: "Desktop Startup Failed",
					message: "Momma's Bakeshop desktop could not reopen.",
					detail,
				});
			}
		}
	});
});

app.on("window-all-closed", async () => {
	await processManager.stopBackend();
	await processManager.stopManagedMysql();
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("before-quit", async () => {
	await processManager.stopBackend();
	await processManager.stopManagedMysql();
});

const createSplashWindow = async () => {
	const win = new BrowserWindow({
		width: 500,
		height: 350,
		frame: false,
		resizable: false,
		alwaysOnTop: true,
		resizable: false,
		alwaysOnTop: true,
		show: true,
		center: true,
		backgroundColor: "#0b1220",
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			preload: path.join(__dirname, "preload.cjs"),
		},
	});

	await win.loadFile(path.join(__dirname, "splash.html"));

	win.once("ready-to-show", () => {
		win.show();
	});

	win.webContents.on('did-fail-load', (e, code, desc) => {
		console.error(`[desktop-main] Splash load failed: ${desc} (${code})`);
	});

	return win;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureRemoteConfigReady = async (forcePrompt = false) => {
	if (!forcePrompt && !isRemoteMode()) {
		return;
	}

	const configPath = process.env.DESKTOP_CONFIG_PATH;
	if (!configPath) {
		return;
	}

	await ensureConfigFile(configPath);

	getDesktopConfig(); // Ensure JSON/env config is loaded before we check.
	if (process.env.DESKTOP_APP_URL) {
		return;
	}

	const choice = await dialog.showMessageBox({
		type: "warning",
		title: "Server Configuration Required",
		message: "Momma's Bakeshop needs a server address to continue.",
		detail: "Set DESKTOP_APP_URL in the desktop-config.json file.",
		buttons: ["Open Config Folder", "Quit"],
		defaultId: 0,
		cancelId: 1,
	});

	if (choice.response === 0) {
		shell.showItemInFolder(configPath);
	}

	throw new Error("Missing DESKTOP_APP_URL in desktop-config.json.");
};

const ensureConfigFile = async (configPath) => {
	if (existsSync(configPath)) {
		return;
	}

	const folder = path.dirname(configPath);
	await mkdir(folder, { recursive: true });
	const template = {
		DESKTOP_APP_URL: "https://your-server.example.com",
		DESKTOP_SKIP_HEALTH_CHECK: "false",
	};
	await writeFile(configPath, JSON.stringify(template, null, 2) + "\n", "utf8");
};
