const path = require("node:path");
const { app, BrowserWindow, dialog } = require("electron");
const { startServer } = require("./server");

let mainWindow;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      const port = await startServer(41739, "127.0.0.1");
      mainWindow = new BrowserWindow({
        width: 1360,
        height: 960,
        minWidth: 900,
        minHeight: 680,
        autoHideMenuBar: true,
        icon: path.join(__dirname, "app-icon.ico"),
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
      });

      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } catch (error) {
      console.error("Could not start SAP Interview Practice", error);
      await dialog.showMessageBox({
        type: "error",
        title: "SAP Interview Practice",
        message: "The app could not start.",
        detail: error.message
      });
      app.quit();
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}
