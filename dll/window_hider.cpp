#include <windows.h>

struct Params {
    HWND hwnd;
    BOOL exclude;
};

// Standard thread procedure signature
extern "C" __declspec(dllexport) DWORD WINAPI SetWindowAffinity(LPVOID lpParameter) {
    if (!lpParameter) return FALSE;
    
    Params* p = (Params*)lpParameter;
    DWORD affinity = p->exclude ? WDA_EXCLUDEFROMCAPTURE : WDA_NONE;
    
    // Call the API
    BOOL result = SetWindowDisplayAffinity(p->hwnd, affinity);
    
    return result;
}

// DllMain to disable thread library calls
BOOL APIENTRY DllMain(HMODULE hModule, DWORD  ul_reason_for_call, LPVOID lpReserved) {
    if (ul_reason_for_call == DLL_PROCESS_ATTACH) {
        // Prevents DLL_THREAD_ATTACH and DLL_THREAD_DETACH notifications
        // This improves stability and performance in the target process
        DisableThreadLibraryCalls(hModule);
    }
    return TRUE;
}
