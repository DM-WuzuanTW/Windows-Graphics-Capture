const koffi = require('koffi');

// Windows 常數
const WDA_NONE = 0x00000000;
const WDA_EXCLUDEFROMCAPTURE = 0x00000011;
const PROCESS_QUERY_INFORMATION = 0x0400;
const PROCESS_VM_READ = 0x0010;

class WindowsAPI {
    constructor() {
        this.initialized = false;
        this.initializeAPI();
    }

    initializeAPI() {
        try {
            console.log('Initializing Windows API...');

            this.user32 = koffi.load('user32.dll');
            this.kernel32 = koffi.load('kernel32.dll');

            // 定義不依賴回調的函數
            this.GetWindowTextW = this.user32.func('int GetWindowTextW(long hWnd, uint16 *lpString, int nMaxCount)');
            this.GetWindowTextLengthW = this.user32.func('int GetWindowTextLengthW(long hWnd)');
            this.IsWindowVisible = this.user32.func('bool IsWindowVisible(long hWnd)');
            this.GetWindowThreadProcessId = this.user32.func('uint32 GetWindowThreadProcessId(long hWnd, uint32 *lpdwProcessId)');
            this.GetClassNameW = this.user32.func('int GetClassNameW(long hWnd, uint16 *lpClassName, int nMaxCount)');
            this.SetWindowDisplayAffinity = this.user32.func('bool SetWindowDisplayAffinity(long hWnd, uint32 dwAffinity)');
            this.GetWindowDisplayAffinity = this.user32.func('bool GetWindowDisplayAffinity(long hWnd, uint32 *pdwAffinity)');

            this.OpenProcess = this.kernel32.func('long OpenProcess(uint32 dwDesiredAccess, bool bInheritHandle, uint32 dwProcessId)');
            this.CloseHandle = this.kernel32.func('bool CloseHandle(long hObject)');
            this.K32GetModuleBaseNameW = this.kernel32.func('uint32 K32GetModuleBaseNameW(long hProcess, long hModule, uint16 *lpBaseName, uint32 nSize)');
            this.QueryFullProcessImageNameW = this.kernel32.func('bool QueryFullProcessImageNameW(long hProcess, uint32 dwFlags, uint16 *lpExeName, uint32 *lpdwSize)');
            this.GetLastError = this.kernel32.func('uint32 GetLastError()');

            // EnumWindows - 使用 void* 作為回調參數，避免類型定義問題
            // 我們會在調用時傳入註冊好的回調函數指針
            this.EnumWindows = this.user32.func('bool EnumWindows(void *lpEnumFunc, long lParam)');

            this.initialized = true;
            console.log('Windows API initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Windows API:', error);
            console.error('Error stack:', error.stack);
            this.initialized = false;
        }
    }
}

// 全域 API 實例
let apiInstance = null;

function getAPI() {
    if (!apiInstance) {
        apiInstance = new WindowsAPI();
    }
    return apiInstance;
}

module.exports = {
    getAPI,
    WDA_NONE,
    WDA_EXCLUDEFROMCAPTURE,
    PROCESS_QUERY_INFORMATION,
    PROCESS_VM_READ
};
