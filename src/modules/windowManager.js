const koffi = require('koffi');
const { getAPI } = require('./windowsAPI');
const { app } = require('electron');

const EnumWindowsProc = koffi.proto('bool __stdcall EnumWindowsProc(long hwnd, long lParam)');

class WindowManager {
    constructor() {
        this.windows = [];
        this.monitoringInterval = null;
        this.updateInterval = 2000;
        this.api = getAPI();
        this.iconCache = new Map();
    }

    enumerateWindows() {
        if (!this.api.initialized) return [];
        const windows = [];
        const self = this;
        try {
            const callback = koffi.register((hwnd, lParam) => {
                try {
                    if (!self.api.IsWindowVisible(hwnd)) return true;
                    const len = self.api.GetWindowTextLengthW(hwnd);
                    if (len === 0) return true;
                    const buf = Buffer.alloc((len + 1) * 2);
                    self.api.GetWindowTextW(hwnd, buf, len + 1);
                    const title = buf.toString('utf16le').replace(/\0/g, '');
                    if (!title || title.trim() === '') return true;

                    const pidBuf = Buffer.alloc(4);
                    self.api.GetWindowThreadProcessId(hwnd, pidBuf);
                    const pid = pidBuf.readUInt32LE(0);
                    const procName = self.getProcessName(pid);
                    const procPath = self.getProcessPath(pid);

                    const clsBuf = Buffer.alloc(512);
                    self.api.GetClassNameW(hwnd, clsBuf, 256);
                    const clsName = clsBuf.toString('utf16le').replace(/\0/g, '');

                    if (self.shouldFilterWindow(title, clsName, procName)) return true;

                    windows.push({
                        hwnd: Number(hwnd),
                        title,
                        processName: procName,
                        processPath: procPath,
                        pid,
                        className: clsName,
                        timestamp: Date.now()
                    });
                } catch (e) { }
                return true;
            }, koffi.pointer(EnumWindowsProc));

            this.api.EnumWindows(callback, 0);
            koffi.unregister(callback);
        } catch (e) {
            console.error('EnumWindows failed:', e);
        }
        return windows;
    }

    getProcessName(pid) {
        if (!this.api.initialized) return 'Unknown';
        try {
            const hProcess = this.api.OpenProcess(0x0410, false, pid);
            if (!hProcess) return 'Unknown';
            const buf = Buffer.alloc(512);
            const res = this.api.K32GetModuleBaseNameW(hProcess, 0, buf, 256);
            this.api.CloseHandle(hProcess);
            return res > 0 ? buf.toString('utf16le').replace(/\0/g, '') : 'Unknown';
        } catch (e) { return 'Unknown'; }
    }

    getProcessPath(pid) {
        if (!this.api.initialized) return '';
        try {
            const hProcess = this.api.OpenProcess(0x0410, false, pid);
            if (!hProcess) return '';

            const size = 1024;
            const buf = Buffer.alloc(size * 2);
            const sizeBuf = Buffer.alloc(4);
            sizeBuf.writeUInt32LE(size, 0);

            const res = this.api.QueryFullProcessImageNameW(hProcess, 0, buf, sizeBuf);
            this.api.CloseHandle(hProcess);

            return res ? buf.toString('utf16le').replace(/\0/g, '') : '';
        } catch (e) { return ''; }
    }

    shouldFilterWindow(title, cls, proc) {
        const clsList = ['Shell_TrayWnd', 'DV2ControlHost', 'MsgrIMEWindowClass', 'SysShadow', 'Button', 'Windows.UI.Core.CoreWindow', 'ApplicationFrameWindow'];
        const procList = ['ApplicationFrameHost.exe', 'TextInputHost.exe', 'ShellExperienceHost.exe', 'StartMenuExperienceHost.exe', 'SearchHost.exe'];
        return clsList.includes(cls) || procList.includes(proc);
    }

    async getWindowList() {
        const rawWindows = this.enumerateWindows();

        const enrichedWindows = await Promise.all(rawWindows.map(async (win) => {
            if (this.iconCache.has(win.processPath)) {
                win.icon = this.iconCache.get(win.processPath);
            } else if (win.processPath) {
                try {
                    const nativeImage = await app.getFileIcon(win.processPath);
                    const iconData = nativeImage.toDataURL();
                    this.iconCache.set(win.processPath, iconData);
                    win.icon = iconData;
                } catch (e) {
                    win.icon = null;
                }
            }
            return win;
        }));

        this.windows = enrichedWindows;
        console.log(`Found ${this.windows.length} windows`);
        return this.windows;
    }

    startMonitoring() {
        if (!this.api.initialized) {
            console.error('Cannot start monitoring: API not initialized');
            return;
        }
        this.getWindowList();
        this.monitoringInterval = setInterval(() => this.getWindowList(), this.updateInterval);
        console.log('Window monitoring started');
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('Window monitoring stopped');
        }
    }

    findWindowByHwnd(hwnd) { return this.windows.find(w => w.hwnd === hwnd); }
    findWindowsByTitle(title) { return this.windows.filter(w => w.title.toLowerCase().includes(title.toLowerCase())); }
}

module.exports = WindowManager;
