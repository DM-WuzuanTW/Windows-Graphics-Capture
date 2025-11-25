const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const WindowManager = require('./modules/windowManager');
const ExclusionManager = require('./modules/exclusionManager');
const ConfigManager = require('./modules/configManager');

let mainWindow;
let windowManager;
let exclusionManager;
let configManager;
let tray = null;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        backgroundColor: '#1e1e1e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, '../icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

function createTray() {
    const iconPath = path.join(__dirname, '../icon.png');
    tray = new Tray(iconPath);
    tray.setToolTip('Invisibility Windows');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '顯示主視窗',
            click: () => mainWindow.show()
        },
        {
            label: '退出',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });
}

function initializeManagers() {
    configManager = new ConfigManager();
    configManager.initialize();
    windowManager = new WindowManager();
    exclusionManager = new ExclusionManager(configManager);

    windowManager.startMonitoring();
}

function setupIPC() {
    ipcMain.handle('get-windows', async () => {
        return windowManager.getWindowList();
    });

    ipcMain.handle('get-excluded-windows', async () => {
        return exclusionManager.getExcludedWindows();
    });

    ipcMain.handle('add-exclusion', async (event, windowInfo) => {
        return exclusionManager.addExclusion(windowInfo);
    });

    ipcMain.handle('remove-exclusion', async (event, windowInfo) => {
        return exclusionManager.removeExclusion(windowInfo);
    });

    ipcMain.on('window-minimize', () => {
        if (mainWindow) mainWindow.hide();
    });

    ipcMain.on('window-maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.on('window-close', () => {
        if (mainWindow) mainWindow.close();
    });

    ipcMain.handle('save-config', async (event, config) => {
        return configManager.saveConfig(config);
    });

    ipcMain.handle('load-config', async () => {
        return configManager.loadConfig();
    });
}

app.disableHardwareAcceleration();

app.whenReady().then(() => {
    createWindow();
    createTray();
    initializeManagers();
    setupIPC();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // app.quit();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
    if (windowManager) {
        windowManager.stopMonitoring();
    }
});
