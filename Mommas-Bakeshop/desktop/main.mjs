import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DesktopProcessManager } from "./process-manager.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
const processManager = new DesktopProcessManager();

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
	app.quit();
}

const createWindow = async () => {
	await processManager.prepareRuntime();
	const serverUrl = await processManager.startBackend();
	const health = await processManager.waitForHealth();

	if (!health?.ready) {
		const failureSummary = Array.isArray(health?.errors) ? health.errors.join("\n") : "Desktop health endpoint did not report a ready application.";
		throw new Error(failureSummary);
	}

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
			preload: path.join(__dirname, "preload.mjs"),
		},
	});

	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
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
		await dialog.showMessageBox({
			type: "error",
			title: "Desktop Startup Failed",
			message: "Momma's Bakeshop desktop could not start.",
			detail: error instanceof Error ? error.message : String(error),
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
				await dialog.showMessageBox({
					type: "error",
					title: "Desktop Startup Failed",
					message: "Momma's Bakeshop desktop could not reopen.",
					detail: error instanceof Error ? error.message : String(error),
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
