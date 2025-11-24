const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
    constructor() {
        // 設定檔路徑（延遲初始化）
        this.configPath = null;
        this._initialized = false;

        // 預設設定
        this.defaultConfig = {
            version: '1.0.0',
            excludedWindows: [],
            preferences: {
                startOnBoot: false,
                minimizeToTray: true,
                updateInterval: 2000,
                theme: 'dark',
                language: 'zh-TW',
                autoApplyRules: false
            },
            autoRules: []
        };
    }

    /**
     * 初始化設定管理器
     */
    initialize() {
        if (this._initialized) return;

        const userDataPath = app.getPath('userData');
        this.configPath = path.join(userDataPath, 'config.json');
        this._initialized = true;

        // 確保設定檔存在
        this.ensureConfigExists();
    }

    /**
     * 確保設定檔存在
     */
    ensureConfigExists() {
        if (!this._initialized) this.initialize();

        try {
            if (!fs.existsSync(this.configPath)) {
                this.saveConfig(this.defaultConfig);
                console.log('Created default config file');
            }
        } catch (error) {
            console.error('Error ensuring config exists:', error);
        }
    }

    /**
     * 載入設定
     */
    loadConfig() {
        if (!this._initialized) this.initialize();

        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const config = JSON.parse(data);

                // 合併預設設定（確保新增的設定項目有預設值）
                return this.mergeWithDefault(config);
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }

        return this.defaultConfig;
    }

    /**
     * 儲存設定
     */
    saveConfig(config) {
        if (!this._initialized) this.initialize();

        try {
            const data = JSON.stringify(config, null, 2);
            fs.writeFileSync(this.configPath, data, 'utf8');
            console.log('Config saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    /**
     * 合併設定與預設值
     */
    mergeWithDefault(config) {
        return {
            ...this.defaultConfig,
            ...config,
            preferences: {
                ...this.defaultConfig.preferences,
                ...(config.preferences || {})
            }
        };
    }

    /**
     * 取得特定設定值
     */
    get(key, defaultValue = null) {
        const config = this.loadConfig();
        const keys = key.split('.');
        let value = config;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * 設定特定值
     */
    set(key, value) {
        const config = this.loadConfig();
        const keys = key.split('.');
        let current = config;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }

        current[keys[keys.length - 1]] = value;
        return this.saveConfig(config);
    }

    /**
     * 重置設定為預設值
     */
    reset() {
        return this.saveConfig(this.defaultConfig);
    }

    /**
     * 匯出設定
     */
    exportConfig(exportPath) {
        try {
            const config = this.loadConfig();
            const data = JSON.stringify(config, null, 2);
            fs.writeFileSync(exportPath, data, 'utf8');
            console.log(`Config exported to ${exportPath}`);
            return true;
        } catch (error) {
            console.error('Error exporting config:', error);
            return false;
        }
    }

    /**
     * 匯入設定
     */
    importConfig(importPath) {
        try {
            if (fs.existsSync(importPath)) {
                const data = fs.readFileSync(importPath, 'utf8');
                const config = JSON.parse(data);
                this.saveConfig(config);
                console.log(`Config imported from ${importPath}`);
                return true;
            }
        } catch (error) {
            console.error('Error importing config:', error);
        }
        return false;
    }

    /**
     * 取得設定檔路徑
     */
    getConfigPath() {
        if (!this._initialized) this.initialize();
        return this.configPath;
    }
}

module.exports = ConfigManager;
