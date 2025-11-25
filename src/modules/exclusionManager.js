const { getAPI, WDA_NONE, WDA_EXCLUDEFROMCAPTURE } = require('./windowsAPI');
const { injectAndSetAffinity } = require('./dllInjector');

class ExclusionManager {
    constructor(configManager) {
        this.configManager = configManager;
        this.excludedWindows = new Map();
        this.api = getAPI();
        this.loadExcludedWindows();
    }

    loadExcludedWindows() {
        try {
            const config = this.configManager.loadConfig();
            if (config && config.excludedWindows) {
                config.excludedWindows.forEach(window => {
                    if (window.hwnd) {
                        this.excludedWindows.set(window.hwnd, window);
                    }
                });
                console.log(`Loaded ${this.excludedWindows.size} excluded windows from config`);
            }
        } catch (error) {
            console.error('Error loading excluded windows:', error);
        }
    }

    saveExcludedWindows() {
        try {
            const config = this.configManager.loadConfig();
            config.excludedWindows = Array.from(this.excludedWindows.values());
            this.configManager.saveConfig(config);
        } catch (error) {
            console.error('Error saving excluded windows:', error);
        }
    }

    addExclusion(windowInfo) {
        if (!this.api.initialized) {
            return {
                success: false,
                message: 'Windows API 未初始化'
            };
        }

        try {
            const hwnd = windowInfo.hwnd;

            if (this.excludedWindows.has(hwnd)) {
                return {
                    success: true,
                    message: '此視窗已經在排除列表中'
                };
            }

            let result = this.api.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
            let usedDllInjection = false;

            if (!result) {
                const errorCode = this.api.GetLastError();
                console.error(`Failed to exclude window: ${windowInfo.title}, Error Code: ${errorCode}`);

                if (errorCode === 5) {
                    console.log('Attempting DLL injection for cross-process exclusion...');
                    try {
                        const dllResult = injectAndSetAffinity(hwnd, windowInfo.pid, true);
                        if (dllResult) {
                            console.log('✅ DLL injection succeeded!');
                            result = true;
                            usedDllInjection = true;
                        } else {
                            console.error('❌ DLL injection failed');
                        }
                    } catch (injectionError) {
                        console.error('DLL injection error:', injectionError);
                    }
                }

                if (!result) {
                    let message = '無法設定視窗排除屬性';
                    if (errorCode === 5) {
                        message = usedDllInjection
                            ? 'DLL 注入失敗：可能是權限不足或目標程式受保護'
                            : '權限不足：SetWindowDisplayAffinity 只能在同一進程內呼叫。';
                    } else if (errorCode === 1400) {
                        message = '視窗無效或已關閉';
                    }
                    return { success: false, message };
                }
            }

            this.excludedWindows.set(hwnd, {
                ...windowInfo,
                excludedAt: new Date().toISOString()
            });

            this.saveExcludedWindows();

            console.log(`Window excluded successfully: ${windowInfo.title}`);
            return {
                success: true,
                message: '視窗已成功加入排除列表'
            };
        } catch (error) {
            console.error('Error adding exclusion:', error);
            return {
                success: false,
                message: `發生錯誤: ${error.message}`
            };
        }
    }

    removeExclusion(windowInfo) {
        if (!this.api.initialized) {
            return {
                success: false,
                message: 'Windows API 未初始化'
            };
        }

        try {
            const hwnd = windowInfo.hwnd;

            if (!this.excludedWindows.has(hwnd)) {
                return {
                    success: true,
                    message: '此視窗不在排除列表中'
                };
            }

            let result = this.api.SetWindowDisplayAffinity(hwnd, WDA_NONE);
            let usedDllInjection = false;

            if (!result) {
                const errorCode = this.api.GetLastError();
                console.error(`Failed to restore window: ${windowInfo.title}, Error Code: ${errorCode}`);

                if (errorCode === 5) {
                    console.log('Attempting DLL injection for cross-process restoration...');
                    try {
                        const dllResult = injectAndSetAffinity(hwnd, windowInfo.pid, false);
                        if (dllResult) {
                            console.log('✅ DLL injection succeeded!');
                            result = true;
                            usedDllInjection = true;
                        } else {
                            console.error('❌ DLL injection failed');
                        }
                    } catch (injectionError) {
                        console.error('DLL injection error:', injectionError);
                    }
                }

                if (!result) {
                    let message = '無法恢復視窗屬性';
                    if (errorCode === 5) {
                        message = usedDllInjection
                            ? 'DLL 注入失敗：可能是權限不足或目標程式受保護'
                            : '權限不足：SetWindowDisplayAffinity 只能在同一進程內呼叫。';
                    } else if (errorCode === 1400) {
                        message = '視窗無效或已關閉';
                    }

                    this.excludedWindows.delete(hwnd);
                    this.saveExcludedWindows();

                    return { success: false, message };
                }
            }

            this.excludedWindows.delete(hwnd);
            this.saveExcludedWindows();

            console.log(`Window restored successfully: ${windowInfo.title}`);
            return {
                success: true,
                message: '視窗已成功從排除列表移除'
            };
        } catch (error) {
            console.error('Error removing exclusion:', error);
            return {
                success: false,
                message: `發生錯誤: ${error.message}`
            };
        }
    }

    getExcludedWindows() {
        return Array.from(this.excludedWindows.values());
    }

    reapplyExclusions() {
        if (!this.api.initialized) return;

        console.log('Reapplying exclusions...');
        this.excludedWindows.forEach(window => {
            if (this.api.IsWindowVisible(window.hwnd)) {
                this.addExclusion(window);
            }
        });
    }
}

module.exports = ExclusionManager;
