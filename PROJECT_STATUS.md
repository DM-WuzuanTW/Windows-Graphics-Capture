# Project Status: Window Exclusion Tool

## Current State
✅ **Fully Functional** - The application can successfully exclude windows from Windows Graphics Capture (WGC) / OBS Studio.

### Key Achievements
1. **Cross-Process Exclusion**: Successfully implemented a method to exclude windows belonging to other processes (e.g., Chrome, Discord, Instagram UWP).
2. **Shellcode Injection**: Replaced unstable DLL injection with direct x64 Shellcode injection.
   - **No DLLs required**: Eliminates file locking and loader lock issues.
   - **UWP Compatible**: Works with modern Windows apps (UWP) like Instagram without crashing them.
   - **Stealthy**: Minimal memory footprint (approx. 64 bytes) and immediate cleanup.
3. **Robust Error Handling**:
   - Automatic fallback from standard API to Shellcode injection for "Access Denied" (Error 5) cases.
   - Proper memory cleanup (VirtualFreeEx) to prevent leaks in target processes.
4. **Modern UI**: Dark mode interface with real-time window monitoring and status feedback.

## Technical Architecture

### Core Components
- **Electron Frontend**: React-like interface (Vanilla JS) for listing and selecting windows.
- **ExclusionManager**: Handles the logic for applying exclusion settings.
- **DllInjector (Shellcode)**: The heart of the cross-process capability.
  - Uses `koffi` to call `kernel32.dll` functions.
  - Allocates memory in the target process.
  - Writes x64 assembly code to call `SetWindowDisplayAffinity`.
  - Executes the code via `CreateRemoteThread`.

### How it Works
1. **Standard API**: First tries `SetWindowDisplayAffinity` directly.
2. **Fallback**: If it fails with `ERROR_ACCESS_DENIED` (5):
   - Opens the target process with minimal permissions.
   - Injects a small shellcode stub.
   - The shellcode calls `SetWindowDisplayAffinity` *inside* the target process.
   - This bypasses UIPI (User Interface Privilege Isolation) restrictions.

## Known Limitations
- **Administrator Privileges**: The application must be run as Administrator to inject into elevated processes.
- **Anti-Cheat**: Some games with kernel-level anti-cheat (e.g., Valorant, Apex) may block the injection.

## Next Steps
- [ ] Add "Run as Administrator" check on startup.
- [ ] Implement a whitelist/blacklist for auto-exclusion.
- [ ] Add tray icon support for background operation.
