const { getAPI, WDA_NONE, WDA_EXCLUDEFROMCAPTURE } = require('./windowsAPI');
const { injectAndSetAffinity } = require('./dllInjector');

class ExclusionManager {
    constructor(configManager) {
        this.configManager = configManager;
        this.excludedWindows = new Map(); // hwnd -> windowInfo
        this.api = getAPI();
        this.loadExcludedWindows();
    }

    /**
     * 載入已儲存的排除視窗
     */
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

    /**
     * 儲存排除視窗到設定檔
     */
    saveExcludedWindows() {
        try {
            const config = this.configManager.loadConfig();
            config.excludedWindows = Array.from(this.excludedWindows.values());
            this.configManager.saveConfig(config);
        } catch (error) {
            console.error('Error saving excluded windows:', error);
        }
    }

    /**
     * 新增視窗到排除列表
     */
    addExclusion(windowInfo) {
        if (!this.api.initialized) {
            return {
                success: false,
                message: 'Windows API 未初始化'
            };
        }

        try {
            const hwnd = windowInfo.hwnd;

            // 檢查視窗是否已經在排除列表中
            if (this.excludedWindows.has(hwnd)) {
                return {
                    success: true,
                    message: '此視窗已經在排除列表中'
                };
            }

            // 套用排除設定（先嘗試直接呼叫）
            let result = this.api.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
            let usedDllInjection = false;

            if (!result) {
                const errorCode = this.api.GetLastError();
                console.error(`Failed to exclude window: ${windowInfo.title}, Error Code: ${errorCode}`);

                // If Error 5 (Access Denied), try DLL injection
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

                // If still failed, return error
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

            // 加入排除列表
            this.excludedWindows.set(hwnd, {
                ...windowInfo,
                excludedAt: new Date().toISOString()
            });

            // 儲存到設定檔
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

    /**
     * 從排除列表移除視窗
     */
    removeExclusion(windowInfo) {
        if (!this.api.initialized) {
            return {
                success: false,
                message: 'Windows API 未初始化'
            };
        }

        try {
            const hwnd = windowInfo.hwnd;

            // 檢查視窗是否在排除列表中
            if (!this.excludedWindows.has(hwnd)) {
                return {
                    success: true,
                    message: '此視窗不在排除列表中'
                };
            }

            // 移除排除設定（先嘗試直接呼叫）
            let result = this.api.SetWindowDisplayAffinity(hwnd, WDA_NONE);
            let usedDllInjection = false;

            if (!result) {
                const errorCode = this.api.GetLastError();
                console.error(`Failed to restore window: ${windowInfo.title}, Error Code: ${errorCode}`);

                // 如果視窗無效 (1400)，我們應該從列表中移除它
                if (errorCode === 1400) {
                    this.excludedWindows.delete(hwnd);
                    this.saveExcludedWindows();
                    return { success: true, message: '視窗已關閉，已從列表中移除' };
                }

                // If Error 5 (Access Denied), try DLL injection
                if (errorCode === 5) {
                    console.log('Attempting DLL injection for cross-process restoration...');
                    try {
                        const dllResult = injectAndSetAffinity(hwnd, windowInfo.pid, false);
                        if (dllResult) {
                            console.log('✅ DLL injection succeeded for restoration!');
                            result = true;
                            usedDllInjection = true;
                        } else {
                            console.error('❌ DLL injection failed for restoration');
                        }
                    } catch (injectionError) {
                        console.error('DLL injection error:', injectionError);
                    }
                }

                // If still failed, return error
                if (!result) {
                    let message = '無法恢復視窗顯示';
                    if (errorCode === 5) {
                        message = usedDllInjection
                            ? 'DLL 注入失敗：可能是權限不足或目標程式受保護'
                            : '權限不足：SetWindowDisplayAffinity 只能在同一進程內呼叫。';
                    }
                    return { success: false, message };
                }
            }

            // 從排除列表移除
            this.excludedWindows.delete(hwnd);

            // 儲存到設定檔
            this.saveExcludedWindows();

            console.log(`Window restored successfully: ${windowInfo.title}`);
            return {
                success: true,
                message: '視窗已從排除列表移除'
            };
        } catch (error) {
            console.error('Error removing exclusion:', error);
            return {
                success: false,
                message: `發生錯誤: ${error.message}`
            };
        }
    }

    /**
     * 取得所有已排除的視窗
     */
    getExcludedWindows() {
        return Array.from(this.excludedWindows.values());
    }

    /**
     * 檢查視窗是否被排除
     */
    isWindowExcluded(hwnd) {
        return this.excludedWindows.has(hwnd);
    }

    /**
     * 清理所有排除設定
     */
    cleanup() {
        if (!this.api.initialized) {
            console.log('API not initialized, skipping cleanup');
            return;
        }

        console.log('Cleaning up exclusion settings...');

        // 恢復所有被排除的視窗
        this.excludedWindows.forEach((windowInfo, hwnd) => {
            try {
                this.api.SetWindowDisplayAffinity(hwnd, WDA_NONE);
            } catch (error) {
                console.error(`Error restoring window ${hwnd}:`, error);
            }
        });

        this.excludedWindows.clear();
        console.log('Cleanup completed');
    }

    /**
     * 重新套用所有排除設定（用於應用程式啟動時）
     */
    reapplyExclusions() {
        if (!this.api.initialized) {
            console.log('API not initialized, skipping reapply');
            return;
        }

        console.log('Reapplying exclusion settings...');

        const failedWindows = [];

        this.excludedWindows.forEach((windowInfo, hwnd) => {
            try {
                const result = this.api.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
                if (!result) {
                    const errorCode = this.api.GetLastError();
                    // 如果視窗無效，標記為失敗以便移除
                    if (errorCode === 1400) {
                        failedWindows.push(hwnd);
                    } else {
                        console.error(`Failed to reapply exclusion for ${windowInfo.title}, Error: ${errorCode}`);
                        // 其他錯誤（如權限），保留在列表中，但不移除
                    }
                }
            } catch (error) {
                console.error(`Error reapplying exclusion for window ${hwnd}:`, error);
            }
        });

        // 移除無效的視窗
        failedWindows.forEach(hwnd => {
            this.excludedWindows.delete(hwnd);
        });

        if (failedWindows.length > 0) {
            this.saveExcludedWindows();
        }

        console.log(`Reapplied exclusions. ${failedWindows.length} invalid windows removed.`);
    }
}

module.exports = ExclusionManager;
