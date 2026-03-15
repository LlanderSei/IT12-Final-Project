const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	onUpdate: (callback) => {
		const { ipcRenderer } = require("electron");
		ipcRenderer.on("startup-progress", (event, ...args) => callback(...args));
	},
});

contextBridge.exposeInMainWorld("desktopRuntime", {
	isElectron: true,
});
