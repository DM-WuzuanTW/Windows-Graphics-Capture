const koffi = require('koffi');

const kernel32 = koffi.load('kernel32.dll');
const OpenProcess = kernel32.func('uintptr_t OpenProcess(uint32 dwDesiredAccess, bool bInheritHandle, uint32 dwProcessId)');
const VirtualAllocEx = kernel32.func('uintptr_t VirtualAllocEx(uintptr_t hProcess, uintptr_t lpAddress, size_t dwSize, uint32 flAllocationType, uint32 flProtect)');
const VirtualFreeEx = kernel32.func('bool VirtualFreeEx(uintptr_t hProcess, uintptr_t lpAddress, size_t dwSize, uint32 dwFreeType)');
const WriteProcessMemory = kernel32.func('bool WriteProcessMemory(uintptr_t hProcess, uintptr_t lpBaseAddress, const void* lpBuffer, size_t nSize, size_t* lpNumberOfBytesWritten)');
const GetModuleHandleA = kernel32.func('uintptr_t GetModuleHandleA(const char* lpModuleName)');
const GetProcAddress = kernel32.func('uintptr_t GetProcAddress(uintptr_t hModule, const char* lpProcName)');
const CreateRemoteThread = kernel32.func('uintptr_t CreateRemoteThread(uintptr_t hProcess, uintptr_t lpThreadAttributes, size_t dwStackSize, uintptr_t lpStartAddress, uintptr_t lpParameter, uint32 dwCreationFlags, uint32* lpThreadId)');
const WaitForSingleObject = kernel32.func('uint32 WaitForSingleObject(uintptr_t hHandle, uint32 dwMilliseconds)');
const GetExitCodeThread = kernel32.func('bool GetExitCodeThread(uintptr_t hThread, uint32* lpExitCode)');
const CloseHandle = kernel32.func('bool CloseHandle(uintptr_t hObject)');

const PROCESS_CREATE_THREAD = 0x0002;
const PROCESS_QUERY_INFORMATION = 0x0400;
const PROCESS_VM_OPERATION = 0x0008;
const PROCESS_VM_WRITE = 0x0020;
const PROCESS_VM_READ = 0x0010;
const MINIMAL_ACCESS = PROCESS_CREATE_THREAD | PROCESS_QUERY_INFORMATION | PROCESS_VM_OPERATION | PROCESS_VM_WRITE | PROCESS_VM_READ;

const MEM_COMMIT = 0x1000;
const MEM_RESERVE = 0x2000;
const MEM_RELEASE = 0x8000;
const PAGE_EXECUTE_READWRITE = 0x40;
const INFINITE = 0xFFFFFFFF;

const WDA_NONE = 0x00000000;
const WDA_EXCLUDEFROMCAPTURE = 0x00000011;

function injectAndSetAffinity(hwnd, pid, exclude = true) {
    let hProcess = 0;
    let remoteCode = 0;
    let hThread = 0;

    try {
        const hUser32 = GetModuleHandleA('user32.dll');
        if (!hUser32) {
            console.error('Failed to get user32.dll handle');
            return false;
        }

        const pSetWindowDisplayAffinity = GetProcAddress(hUser32, 'SetWindowDisplayAffinity');
        if (!pSetWindowDisplayAffinity) {
            console.error('Failed to get SetWindowDisplayAffinity address');
            return false;
        }

        console.log(`SetWindowDisplayAffinity address: 0x${pSetWindowDisplayAffinity.toString(16)}`);

        hProcess = OpenProcess(MINIMAL_ACCESS, false, pid);
        if (!hProcess) {
            console.error(`OpenProcess failed for pid ${pid}`);
            return false;
        }

        const affinity = exclude ? WDA_EXCLUDEFROMCAPTURE : WDA_NONE;

        const shellcode = Buffer.alloc(64);
        let offset = 0;

        shellcode.writeUInt8(0x48, offset++);
        shellcode.writeUInt8(0x83, offset++);
        shellcode.writeUInt8(0xEC, offset++);
        shellcode.writeUInt8(0x28, offset++);

        shellcode.writeUInt8(0x48, offset++);
        shellcode.writeUInt8(0xB9, offset++);
        shellcode.writeBigUInt64LE(BigInt(hwnd), offset);
        offset += 8;

        shellcode.writeUInt8(0x48, offset++);
        shellcode.writeUInt8(0xBA, offset++);
        shellcode.writeBigUInt64LE(BigInt(affinity), offset);
        offset += 8;

        shellcode.writeUInt8(0x48, offset++);
        shellcode.writeUInt8(0xB8, offset++);
        shellcode.writeBigUInt64LE(BigInt(pSetWindowDisplayAffinity), offset);
        offset += 8;

        shellcode.writeUInt8(0xFF, offset++);
        shellcode.writeUInt8(0xD0, offset++);

        shellcode.writeUInt8(0x48, offset++);
        shellcode.writeUInt8(0x83, offset++);
        shellcode.writeUInt8(0xC4, offset++);
        shellcode.writeUInt8(0x28, offset++);

        shellcode.writeUInt8(0xC3, offset++);

        remoteCode = VirtualAllocEx(hProcess, 0, shellcode.length, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
        if (!remoteCode) {
            console.error('VirtualAllocEx failed');
            return false;
        }

        if (!WriteProcessMemory(hProcess, remoteCode, shellcode, shellcode.length, null)) {
            console.error('WriteProcessMemory failed');
            return false;
        }

        console.log(`Shellcode written to 0x${remoteCode.toString(16)}`);

        hThread = CreateRemoteThread(hProcess, 0, 0, Number(remoteCode), 0, 0, null);
        if (!hThread) {
            console.error('CreateRemoteThread failed');
            return false;
        }

        WaitForSingleObject(hThread, 5000);

        console.log('Shellcode executed successfully');
        return true;

    } catch (error) {
        console.error('Injection error:', error);
        return false;
    } finally {
        if (hProcess) {
            if (remoteCode) VirtualFreeEx(hProcess, remoteCode, 0, MEM_RELEASE);
            if (hThread) CloseHandle(hThread);
            CloseHandle(hProcess);
        }
    }
}

module.exports = { injectAndSetAffinity };
