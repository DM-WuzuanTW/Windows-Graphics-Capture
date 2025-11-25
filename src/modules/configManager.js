const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
    constructor() {
        this.configPath = null;
        this._initialized = false;

        this.defaultConfig = {
            version: '1.2.0',
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

    initialize() {
        if (this._initialized) return;

        const userDataPath = app.getPath('userData');
        this.configPath = path.join(userDataPath, 'config.json');
        this._initialized = true;

        this.ensureConfigExists();
    }

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

    loadConfig() {
        if (!this._initialized) this.initialize();

        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                const config = JSON.parse(data);

                return this.mergeWithDefault(config);
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }

        return this.defaultConfig;
    }

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

    reset() {
        return this.saveConfig(this.defaultConfig);
    }

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

    getConfigPath() {
        if (!this._initialized) this.initialize();
        return this.configPath;
    }
}

module.exports = ConfigManager;
