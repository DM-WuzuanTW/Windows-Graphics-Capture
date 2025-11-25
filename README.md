# Windows Graphics Capture - Window Exclusion Tool

一個基於 Electron 的應用程式，旨在管理和排除特定視窗，使其不被 Windows Graphics Capture API (如 OBS, Discord 直播) 擷取。

## ⚠️ 重要技術限制

**目前的版本僅支援隱藏應用程式自身的視窗。**

由於 Windows API `SetWindowDisplayAffinity` 的安全限制，**一個進程無法直接修改另一個進程的視窗擷取屬性**。這意味著：

- ✅ 您可以隱藏此工具本身的視窗。
- ❌ 您無法直接隱藏其他應用程式（如 Chrome, 遊戲, CMD）的視窗，即使使用系統管理員權限也會收到 `Access Denied (Error 5)`。

### 解決方案 (開發中)

要突破此限制，需要使用 **DLL 注入 (DLL Injection)** 技術：
1. 將一個特製的 DLL 注入到目標進程中。
2. 在目標進程內部調用 `SetWindowDisplayAffinity`。

這將是下一階段的開發重點。

## 功能

- **視窗列舉**: 列出當前所有可見的視窗。
- **視窗過濾**: 自動過濾系統視窗和無效視窗。
- **排除管理**: 
  - 標記視窗為 "Excluded" (不被擷取)。
  - 恢復視窗為正常狀態。
- **狀態保存**: 自動記住您的排除設定。

## 安裝與執行

1. 安裝依賴:
   ```bash
   npm install
   ```

2. 啟動應用程式:
   ```bash
   npm start
   ```

## 技術棧

- **Electron**: 桌面應用程式框架。
- **Koffi**: 高性能 Node.js FFI 庫，用於調用 Windows API。
- **Windows API**: User32.dll, Kernel32.dll。

## 錯誤代碼說明

- **Error 5 (Access Denied)**: 嘗試操作非本程式創建的視窗（需要 DLL 注入解決）。
- **Error 1400 (Invalid Window Handle)**: 目標視窗已關閉或不存在。
