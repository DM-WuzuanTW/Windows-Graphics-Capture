# 🚀 下一步操作指南（更新版）

## 為什麼 `cl` 仍然找不到？
`cl.exe` 是 **Microsoft C/C++ 編譯器**，只有在 **Visual Studio Build Tools** 安裝完成且在 **Developer PowerShell/Command Prompt** 中才會自動加入 `PATH`。如果直接在普通的 PowerShell、cmd 或 Git‑Bash 中執行，系統找不到 `cl` 是正常的。

## 📦 安裝 Visual Studio Build Tools（一次性）
1. 前往官方下載頁面：
   ```
   https://visualstudio.microsoft.com/visual-cpp-build-tools/
   ```
2. 下載 **「Build Tools for Visual Studio 2022」**（或更新的版本）。
3. 執行安裝程式，**勾選**以下工作負載（必選）：
   - **Desktop development with C++**（會自動安裝 MSVC、Windows 10/11 SDK、C++ CMake tools）
   - （可選）「C++ ATL for v142 build tools」等額外元件（不必須）
4. 完成安裝後 **重新啟動** 電腦（或至少關閉所有終端機視窗再重新開啟）。

## � 確認 `cl` 已在 PATH 中
### 方法 A：使用 **Developer PowerShell for VS**（推薦）
1. 在「開始」選單搜尋 **「Developer PowerShell for VS 2022」**（或對應的 VS 版本）。
2. 開啟後，切換到專案根目錄：
   ```powershell
   cd "D:\開發\鑽石託管\隱藏直播"
   ```
3. 執行 `cl`，應看到類似以下輸出：
   ```
   Microsoft (R) C/C++ Optimizing Compiler Version 19.xx.x for x64
   ```
   若出現版本資訊，表示編譯器已正確設定。

### 方法 B：手動把 `cl.exe` 所在目錄加入環境變數
如果您希望在普通 PowerShell 或 cmd 中使用 `cl`，請將以下路徑加入系統 `PATH`（路徑會依安裝版本略有不同，請自行替換 `<version>`）：
```text
C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\<version>\bin\Hostx64\x64
```
**步驟**（以系統環境變數為例）：
1. 右鍵「此電腦」→「內容」→「進階系統設定」→「環境變數」
2. 在「系統變數」區找到 `Path`，點「編輯」→「新增」
3. 貼上上面的完整路徑，確定保存。
4. 重新開啟 PowerShell / cmd，執行 `cl` 應能看到版本資訊。

## 📂 確認 `cl.exe` 真正位置（安裝後）
在 **Developer PowerShell** 中執行：
```powershell
where cl
```
應回傳類似：
```
C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.38.33133\bin\Hostx64\x64\cl.exe
```
如果 `where` 找不到，表示 Build Tools 尚未正確安裝或路徑仍未加入。

## 🛠️ 編譯 DLL
在確保 `cl` 可用的環境下，執行以下指令：
```powershell
npm run build-dll
```
- **成功**：會看到 `✅ DLL compiled successfully`，`dll/window_hider.dll` 會被產生。
- **失敗**：若仍顯示 `cl` 找不到，請回到 **方法 B** 手動加入路徑，或重新開啟 **Developer PowerShell**。

## � 執行應用程式並測試注入
```powershell
npm start
```
- 在 UI 中嘗試排除 `cmd.exe`、`chrome.exe` 等非本程式視窗。
- 若 `SetWindowDisplayAffinity` 因 **Error 5** 失敗，程式會自動使用 **DLL 注入**。成功時 UI 會顯示「已使用 DLL 注入」或「已排除」；失敗則顯示 🔒 鎖定圖示與錯誤訊息。

## 📋 常見問題快速檢查表
| 症狀 | 檢查點 | 解決方式 |
|------|--------|----------|
| `cl` 找不到 | 是否在 Developer PowerShell？ | 重新開啟 Developer PowerShell，或手動加入 `cl.exe` 路徑至 PATH。 |
| `where cl` 沒有結果 | Build Tools 是否安裝？ | 重新執行安裝程式，確保勾選「Desktop development with C++」。 |
| `npm run build-dll` 仍失敗 | `cl` 是否能顯示版本資訊？ | 若不能，回到上一步確認 PATH。 |
| 注入失敗，顯示 `Failed to obtain remote module base address` | `dll/window_hider.dll` 是否存在且為 64‑bit？ | 確認編譯成功且檔案位於 `dll/` 資料夾。 |
| 仍顯示 **Error 5** 且無 DLL 注入 | 目標程式權限比 Electron 更高（系統服務） | 以 **系統管理員** 執行 `npm start`，或選擇權限較低的目標程式測試。 |

## 📌 小結
1. **安裝 Visual Studio Build Tools**（一次性）
2. **使用 Developer PowerShell**（或手動加入 `cl.exe` 路徑）
3. **npm run build-dll** → 產生 `dll/window_hider.dll`
4. **npm start** → 測試排除功能，若失敗會自動使用 DLL 注入

完成以上步驟後，您就能在任何視窗（包括 `cmd.exe`、`chrome.exe`）上使用 **Window Exclusion** 功能，並在 UI 中即時看到成功或失敗的回饋。

如有任何步驟仍卡住，請把完整的錯誤訊息貼回，我會協助您進一步排查！
