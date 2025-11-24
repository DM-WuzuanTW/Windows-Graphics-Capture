# Window Exclusion Tool

Windows Graphics Capture 視窗排除工具 - 保護您的隱私內容不被螢幕擷取

## 功能特色

- ✅ 偵測並列出系統中所有執行中的視窗
- ✅ 一鍵排除視窗，防止被螢幕擷取工具捕捉
- ✅ 現代化深色主題介面
- ✅ 即時視窗監控與更新
- ✅ 支援搜尋和篩選視窗
- ✅ 永久儲存排除設定

## 系統需求

- Windows 10 (1903+) / Windows 11
- Node.js v16.x 或更高版本

## 安裝

```bash
# 安裝依賴
npm install

# 啟動應用程式
npm start

# 開發模式（開啟 DevTools）
npm run dev
```

## 使用方法

1. 啟動應用程式
2. 在左側面板瀏覽所有執行中的視窗
3. 選擇要排除的視窗
4. 點擊中央的「新增排除」按鈕（+）
5. 被排除的視窗將不會被螢幕擷取工具捕捉

### 移除排除

1. 在右側面板選擇已排除的視窗
2. 點擊中央的「移除排除」按鈕（-）
3. 視窗將恢復為可被擷取狀態

## 技術架構

- **框架**: Electron
- **後端**: Node.js + FFI-NAPI
- **Windows API**: SetWindowDisplayAffinity
- **介面**: HTML5 + CSS3 + JavaScript

## 注意事項

⚠️ **權限限制**: 由於 Windows 安全機制，某些系統視窗（如 UAC 提示）可能無法被排除

⚠️ **視窗關閉**: 如果被排除的視窗關閉後重新開啟，需要重新套用排除設定

## 開發

```bash
# 安裝開發依賴
npm install

# 啟動開發模式
npm run dev

# 建置應用程式
npm run build
```

## 授權

MIT License

## 相關資源

- [Windows Graphics Capture API 文件](https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity)
- [Electron 文件](https://www.electronjs.org/docs)
