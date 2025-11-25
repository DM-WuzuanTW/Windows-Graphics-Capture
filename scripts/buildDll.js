const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Resolve paths relative to project root
const dllDir = path.resolve(__dirname, '../dll');
const cppFile = path.join(dllDir, 'window_hider.cpp');
const outDll = path.join(dllDir, 'window_hider_v3.dll');

// Try to find vcvarsall.bat to set up Visual Studio environment
const possiblePaths = [
    'C:\\Program Files\\Microsoft Visual Studio\\18\\Insiders\\VC\\Auxiliary\\Build\\vcvarsall.bat',
    'C:\\Program Files\\Microsoft Visual Studio\\2025\\Preview\\VC\\Auxiliary\\Build\\vcvarsall.bat',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvarsall.bat',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvarsall.bat',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\VC\\Auxiliary\\Build\\vcvarsall.bat',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Auxiliary\\Build\\vcvarsall.bat',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\VC\\Auxiliary\\Build\\vcvarsall.bat',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\VC\\Auxiliary\\Build\\vcvarsall.bat',
];

let vcvarsall = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        vcvarsall = p;
        console.log(`Found vcvarsall.bat at: ${p}`);
        break;
    }
}

try {
    console.log('Compiling window_hider.dll...');

    if (vcvarsall) {
        // Use vcvarsall.bat to set up environment, then compile
        // Changed /MD to /MT to statically link the runtime library
        // This reduces dependencies and potential conflicts in the target process
        const cmd = `"${vcvarsall}" x64 && cl /LD /EHsc /MT "${cppFile}" /link /OUT:"${outDll}" user32.lib`;
        execSync(cmd, { stdio: 'inherit', shell: 'cmd.exe' });
    } else {
        // Try direct compilation (assumes environment is already set up in Developer PowerShell)
        console.log('vcvarsall.bat not found. Attempting direct compilation...');
        console.log('If this fails, please run from "Developer PowerShell for VS 2022"');
        execSync(`cl /LD /EHsc /MT "${cppFile}" /link /OUT:"${outDll}" user32.lib`, { stdio: 'inherit' });
    }

    console.log('✅ DLL compiled successfully');
    console.log(`Output: ${outDll}`);
} catch (e) {
    console.error('❌ DLL compilation failed.');
    console.error('');
    console.error('Please ensure one of the following:');
    console.error('  1. Run this command in "Developer PowerShell for VS 2022" (recommended)');
    console.error('  2. Install Visual Studio Build Tools with "Desktop development with C++" workload');
    console.error('  3. Ensure Windows SDK is installed (included with the above workload)');
    process.exit(1);
}
