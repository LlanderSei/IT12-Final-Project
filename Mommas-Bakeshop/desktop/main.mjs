import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DesktopProcessManager } from "./process-manager.mjs";
import { getDesktopConfig } from "./config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let splashWindow = null;
const processManager = new DesktopProcessManager();

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
	app.quit();
}

const createWindow = async () => {
	if (process.env.DESKTOP_ALLOW_SYSTEM_PHP === undefined) {
		process.env.DESKTOP_ALLOW_SYSTEM_PHP = app.isPackaged ? "false" : "true";
	}
	if (process.env.DESKTOP_ALLOW_SYSTEM_MYSQL === undefined) {
		process.env.DESKTOP_ALLOW_SYSTEM_MYSQL = app.isPackaged ? "false" : "true";
	}
	if (process.env.DESKTOP_MANAGED_MYSQL === undefined) {
		process.env.DESKTOP_MANAGED_MYSQL = app.isPackaged ? "true" : "false";
	}

	const config = getDesktopConfig();
	if (process.cwd() !== config.projectRoot) {
		process.chdir(config.projectRoot);
	}

	splashWindow = await createSplashWindow();
	splashWindow.focus();

	processManager.setProgressCallback((message, percent) => {
		if (splashWindow && !splashWindow.isDestroyed()) {
			splashWindow.webContents.send("startup-progress", message, percent);
		}
	});

	await processManager.prepareRuntime();
	const serverUrl = await processManager.startBackend();
	const health = await processManager.waitForHealth();

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
