const { ipcRenderer } = require('electron');

let selectedWindow = null;
let selectedExcludedWindow = null;
let allWindows = [];
let excludedWindows = [];
let updateInterval = null;
let lastWindowsHash = null;
const failedWindows = new Set();

const elements = {
    minimizeBtn: document.getElementById('minimize-btn'),
    maximizeBtn: document.getElementById('maximize-btn'),
    closeBtn: document.getElementById('close-btn'),

    searchInput: document.getElementById('search-input'),
    windowList: document.getElementById('window-list'),
    excludedList: document.getElementById('excluded-list'),

    addBtn: document.getElementById('add-exclusion-btn'),
    removeBtn: document.getElementById('remove-exclusion-btn'),

    windowCount: document.getElementById('window-count'),
    excludedCount: document.getElementById('excluded-count'),

    statusText: document.getElementById('status-text'),
    statusIndicator: document.getElementById('status-indicator')
};

async function initialize() {
    console.log('Initializing application...');

    setupEventListeners();

    await loadWindows();
    await loadExcludedWindows();

    startAutoUpdate();

    updateStatus('就緒', 'success');
    console.log('Application initialized');
}

function setupEventListeners() {
    elements.minimizeBtn.addEventListener('click', () => {
        ipcRenderer.send('window-minimize');
    });

    elements.maximizeBtn.addEventListener('click', () => {
        ipcRenderer.send('window-maximize');
    });

    elements.closeBtn.addEventListener('click', () => {
        ipcRenderer.send('window-close');
    });

    elements.searchInput.addEventListener('input', (e) => {
        filterWindows(e.target.value);
    });

    elements.addBtn.addEventListener('click', handleAddExclusion);
    elements.removeBtn.addEventListener('click', handleRemoveExclusion);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault();
            loadWindows();
        }
    });
}

async function loadWindows() {
    try {
        updateStatus('正在載入視窗列表...', 'loading');

        allWindows = await ipcRenderer.invoke('get-windows');
        console.log(`Loaded ${allWindows.length} windows`);

        renderWindowList(allWindows);
        elements.windowCount.textContent = allWindows.length;

        updateStatus('就緒', 'success');
    } catch (error) {
        console.error('Error loading windows:', error);
        showNotification('載入視窗列表失敗', 'error');
        updateStatus('錯誤', 'error');
    }
}

async function loadExcludedWindows() {
    try {
        excludedWindows = await ipcRenderer.invoke('get-excluded-windows');
        console.log(`Loaded ${excludedWindows.length} excluded windows`);

        renderExcludedList(excludedWindows);
        elements.excludedCount.textContent = excludedWindows.length;
    } catch (error) {
        console.error('Error loading excluded windows:', error);
        showNotification('載入排除列表失敗', 'error');
    }
}

function renderWindowList(windows) {
    const failedState = Array.from(failedWindows).join(',');
    const currentHash = windows.map(w => w.hwnd + w.title + w.processName).join('|') + failedState;

    if (currentHash === lastWindowsHash) return;
    lastWindowsHash = currentHash;

    if (windows.length === 0) {
        elements.windowList.innerHTML = `
       <div class="empty-state">
         <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
           <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
           <line x1="9" y1="9" x2="15" y2="15"></line>
         </svg>
         <p>未找到任何視窗</p>
       </div>
     `;
        return;
    }

    const html = windows.map(window => {
        const isFailed = failedWindows.has(window.hwnd);
        const lockIcon = isFailed ? '<span class="status-icon" title="權限不足">🔒</span>' : '';
        const itemClass = isFailed ? 'window-item failed' : 'window-item';

        const iconHtml = window.icon
            ? `<img src="${window.icon}" class="window-icon-img" alt="icon" style="width: 20px; height: 20px;">`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
               </svg>`;

        return `
      <div class="${itemClass}" data-hwnd="${window.hwnd}">
        <div class="window-icon">
          ${iconHtml}
        </div>
        <div class="window-info">
          <div class="window-title" title="${escapeHtml(window.title)}">
            ${escapeHtml(window.title)} ${lockIcon}
          </div>
          <div class="window-process" title="${escapeHtml(window.processName)}">
            ${escapeHtml(window.processName)}
          </div>
        </div>
      </div>
    `}).join('');

    elements.windowList.innerHTML = html;

    document.querySelectorAll('#window-list .window-item').forEach(item => {
        item.addEventListener('click', () => {
            selectWindow(item);
        });
    });
}

function renderExcludedList(windows) {
    if (windows.length === 0) {
        elements.excludedList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"></path>
          </svg>
          <p>尚未排除任何視窗</p>
          <p class="hint">從左側選擇視窗並點擊新增按鈕</p>
        </div>
      `;
        return;
    }

    const html = windows.map(window => {
        const iconHtml = window.icon
            ? `<img src="${window.icon}" class="window-icon-img" alt="icon" style="width: 20px; height: 20px;">`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"></path>
               </svg>`;

        return `
      <div class="window-item" data-hwnd="${window.hwnd}">
        <div class="window-icon">
          ${iconHtml}
        </div>
        <div class="window-info">
          <div class="window-title" title="${escapeHtml(window.title)}">
            ${escapeHtml(window.title)}
          </div>
          <div class="window-process" title="${escapeHtml(window.processName)}">
            ${escapeHtml(window.processName)}
          </div>
        </div>
      </div>
    `}).join('');

    elements.excludedList.innerHTML = html;

    document.querySelectorAll('#excluded-list .window-item').forEach(item => {
        item.addEventListener('click', () => {
            selectExcludedWindow(item);
        });
    });
}

function selectWindow(item) {
    document.querySelectorAll('#window-list .window-item').forEach(i => {
        i.classList.remove('selected');
    });

    item.classList.add('selected');

    const hwnd = parseInt(item.dataset.hwnd);
    selectedWindow = allWindows.find(w => w.hwnd === hwnd);

    elements.addBtn.disabled = false;

    selectedExcludedWindow = null;
    document.querySelectorAll('#excluded-list .window-item').forEach(i => {
        i.classList.remove('selected');
    });
    elements.removeBtn.disabled = true;
}

function selectExcludedWindow(item) {
    document.querySelectorAll('#excluded-list .window-item').forEach(i => {
        i.classList.remove('selected');
    });

    item.classList.add('selected');

    const hwnd = parseInt(item.dataset.hwnd);
    selectedExcludedWindow = excludedWindows.find(w => w.hwnd === hwnd);

    elements.removeBtn.disabled = false;

    selectedWindow = null;
    document.querySelectorAll('#window-list .window-item').forEach(i => {
        i.classList.remove('selected');
    });
    elements.addBtn.disabled = true;
}

async function handleAddExclusion() {
    if (!selectedWindow) return;

    try {
        updateStatus('正在新增排除...', 'loading');

        const result = await ipcRenderer.invoke('add-exclusion', selectedWindow);

        if (result.success) {
            showNotification(`已排除視窗: ${selectedWindow.title}`, 'success');

            if (failedWindows.has(selectedWindow.hwnd)) {
                failedWindows.delete(selectedWindow.hwnd);
            }

            await loadExcludedWindows();

            selectedWindow = null;
            elements.addBtn.disabled = true;
            document.querySelectorAll('#window-list .window-item').forEach(i => {
                i.classList.remove('selected');
            });

            updateStatus('就緒', 'success');
        } else {
            showNotification(result.message, 'error');

            if (result.message.includes('權限不足') || result.message.includes('Error Code: 5')) {
                failedWindows.add(selectedWindow.hwnd);
                lastWindowsHash = '';
                renderWindowList(allWindows);
            }

            updateStatus('就緒', 'success');
        }
    } catch (error) {
        console.error('Error adding exclusion:', error);
        showNotification('新增排除失敗', 'error');
        updateStatus('錯誤', 'error');
    }
}

async function handleRemoveExclusion() {
    if (!selectedExcludedWindow) return;

    try {
        updateStatus('正在移除排除...', 'loading');

        const result = await ipcRenderer.invoke('remove-exclusion', selectedExcludedWindow);

        if (result.success) {
            showNotification(`已恢復視窗: ${selectedExcludedWindow.title}`, 'success');

            await loadExcludedWindows();

            selectedExcludedWindow = null;
            elements.removeBtn.disabled = true;
            document.querySelectorAll('#excluded-list .window-item').forEach(i => {
                i.classList.remove('selected');
            });

            updateStatus('就緒', 'success');
        } else {
            showNotification(result.message, 'error');
            updateStatus('就緒', 'success');
        }
    } catch (error) {
        console.error('Error removing exclusion:', error);
        showNotification('移除排除失敗', 'error');
        updateStatus('錯誤', 'error');
    }
}

function filterWindows(query) {
    if (!query) {
        renderWindowList(allWindows);
        return;
    }

    const filtered = allWindows.filter(window =>
        window.title.toLowerCase().includes(query.toLowerCase()) ||
        window.processName.toLowerCase().includes(query.toLowerCase())
    );

    renderWindowList(filtered);
}

function startAutoUpdate() {
    updateInterval = setInterval(async () => {
        await loadWindows();
    }, 2000);
}

function updateStatus(text, type = 'success') {
    elements.statusText.textContent = text;

    const indicator = elements.statusIndicator;
    indicator.className = 'status-indicator';

    if (type === 'success') {
        indicator.style.backgroundColor = 'var(--accent-green)';
    } else if (type === 'error') {
        indicator.style.backgroundColor = 'var(--accent-red)';
    } else if (type === 'loading') {
        indicator.style.backgroundColor = 'var(--accent-blue)';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    notification.innerHTML = `
    <div class="notification-icon">${icons[type]}</div>
    <div class="notification-message">${escapeHtml(message)}</div>
  `;

    const container = document.getElementById('notification-container');
    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

initialize();
