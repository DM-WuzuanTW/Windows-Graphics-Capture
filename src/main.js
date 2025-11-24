const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WindowManager = require('./modules/windowManager');
const ExclusionManager = require('./modules/exclusionManager');
const ConfigManager = require('./modules/configManager');

let mainWindow;
let windowManager;
let exclusionManager;
let configManager;

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
        icon: path.join(__dirname, '../assets/icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));

    // 開發模式下開啟 DevTools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 初始化管理模組
function initializeManagers() {
    configManager = new ConfigManager();
    configManager.initialize(); // 初始化設定管理器
    windowManager = new WindowManager();
    exclusionManager = new ExclusionManager(configManager);

    // 啟動視窗偵測
    windowManager.startMonitoring();
}

// IPC 事件處理
function setupIPC() {
    // 取得所有視窗列表
    ipcMain.handle('get-windows', async () => {
        return windowManager.getWindowList();
    });

    // 取得已排除的視窗列表
    ipcMain.handle('get-excluded-windows', async () => {
        return exclusionManager.getExcludedWindows();
    });

    // 新增排除視窗
    ipcMain.handle('add-exclusion', async (event, windowInfo) => {
        return exclusionManager.addExclusion(windowInfo);
    });

    // 移除排除視窗
    ipcMain.handle('remove-exclusion', async (event, windowInfo) => {
        return exclusionManager.removeExclusion(windowInfo);
    });

    // 視窗控制
    ipcMain.on('window-minimize', () => {
        if (mainWindow) mainWindow.minimize();
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

    // 儲存設定
    ipcMain.handle('save-config', async (event, config) => {
        return configManager.saveConfig(config);
    });

    // 載入設定
    ipcMain.handle('load-config', async () => {
        return configManager.loadConfig();
    });
}

// 應用程式準備就緒
// 禁用硬體加速以解決 GPU 進程崩潰問題
app.disableHardwareAcceleration();

app.whenReady().then(() => {
    createWindow();
    initializeManagers();
    setupIPC();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有視窗關閉時退出
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (windowManager) {
            windowManager.stopMonitoring();
        }
        app.quit();
    }
});

// 應用程式退出前清理
app.on('before-quit', () => {
    if (exclusionManager) {
        exclusionManager.cleanup();
    }
});
