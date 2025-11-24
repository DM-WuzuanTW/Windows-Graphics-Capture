const koffi = require('koffi');

try {
    console.log('Testing koffi...');
    const user32 = koffi.load('user32.dll');
    const MessageBoxW = user32.func('int MessageBoxW(void *hWnd, str16 lpText, str16 lpCaption, uint uType)');
    console.log('K offi loaded successfully!');
    console.log('Type:', typeof MessageBoxW);
} catch (error) {
    console.error('Error:', error);
}
