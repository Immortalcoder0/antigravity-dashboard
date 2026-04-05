const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

const store = new Store({
  name: 'antigravity-dashboard',
  defaults: {
    bounds: { width: 1400, height: 900 },
  },
});

let mainWindow;
let backendProcess;

function getDashboardPort() {
  const parsed = Number.parseInt(process.env.DASHBOARD_PORT || '3456', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3456;
}

function getDashboardOrigin() {
  return `http://127.0.0.1:${getDashboardPort()}`;
}

function isDev() {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

function registerIpcHandlers() {
  ipcMain.handle('electron:is-packaged', () => app.isPackaged);
  ipcMain.handle('electron:dashboard-retry', async () => {
    if (!mainWindow || isDev()) {
      return { ok: true };
    }
    await loadDashboardProduction();
    return { ok: true };
  });
}

function startBackend() {
  const backendPath = isDev()
    ? path.join(__dirname, '..', 'apps', 'backend', 'dist', 'server.js')
    : path.join(process.resourcesPath, 'backend', 'server.js');

  const envPath = isDev()
    ? path.join(__dirname, '..', '.env')
    : path.join(process.resourcesPath, '.env');

  console.log('[Electron] Backend path:', backendPath);
  console.log('[Electron] Env path:', envPath);

  backendProcess = spawn(process.execPath, [backendPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DOTENV_CONFIG_PATH: envPath,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });

  backendProcess.on('error', (err) => {
    console.error('[Backend] Failed to start:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`[Backend] Exited with code ${code}`);
  });
}

async function waitForDashboardReady(options = {}) {
  const port = getDashboardPort();
  const url = `http://127.0.0.1:${port}/api/stats`;
  const maxMs = options.maxMs ?? 90000;
  const intervalMs = options.intervalMs ?? 500;
  const start = Date.now();

  while (Date.now() - start < maxMs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status > 0) {
        return { ok: true };
      }
    } catch {
      /* port closed or network error — keep polling */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { ok: false, message: 'Timed out waiting for the local dashboard server.' };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadDashboardErrorPage(message) {
  if (!mainWindow) {
    return;
  }
  const port = getDashboardPort();
  const target = `http://127.0.0.1:${port}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dashboard unavailable</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: system-ui, Segoe UI, sans-serif; background: #0f172a; color: #e2e8f0;
      padding: 24px;
    }
    .card {
      max-width: 440px; background: #1e293b; border-radius: 12px; padding: 28px;
      border: 1px solid #334155;
    }
    h1 { margin: 0 0 12px; font-size: 1.25rem; font-weight: 600; }
    p { margin: 0 0 12px; line-height: 1.5; color: #94a3b8; font-size: 0.95rem; }
    p strong { color: #e2e8f0; }
    code { font-size: 0.85em; color: #cbd5e1; }
    button {
      margin-top: 8px; padding: 10px 20px; font-size: 0.95rem; font-weight: 500;
      border: none; border-radius: 8px; background: #3b82f6; color: #fff; cursor: pointer;
    }
    button:hover { background: #2563eb; }
    button:focus { outline: 2px solid #93c5fd; outline-offset: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Could not reach the local dashboard</h1>
    <p>The local Express server at <strong>${escapeHtml(target)}</strong> did not respond. The backend may still be starting, or <code>DASHBOARD_PORT</code> may not match this app.</p>
    <p>${escapeHtml(message)}</p>
    <button type="button" id="retry">Retry</button>
  </div>
  <script>
    document.getElementById('retry').addEventListener('click', function () {
      if (window.electronAPI && window.electronAPI.retryDashboardLoad) {
        window.electronAPI.retryDashboardLoad();
      }
    });
  </script>
</body>
</html>`;
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  mainWindow.loadURL(dataUrl);
}

async function loadDashboardProduction() {
  const result = await waitForDashboardReady();
  if (!mainWindow) {
    return;
  }
  if (!result.ok) {
    loadDashboardErrorPage(result.message || 'Unknown error');
    return;
  }
  const origin = getDashboardOrigin();
  try {
    await mainWindow.loadURL(`${origin}/`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    loadDashboardErrorPage(msg);
  }
}

function popupWebPreferences() {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    ...(isDev() ? { preload: path.join(__dirname, 'preload.js') } : {}),
  };
}

function setupWindowOpenHandler() {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    let target;
    try {
      target = new URL(details.url);
    } catch {
      return { action: 'deny' };
    }

    const isHttp = target.protocol === 'http:' || target.protocol === 'https:';
    if (!isHttp) {
      return { action: 'deny' };
    }

    if (isDev()) {
      const isLocal =
        target.hostname === 'localhost' ||
        target.hostname === '127.0.0.1' ||
        target.protocol === 'https:';
      if (isLocal) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            parent: mainWindow,
            show: true,
            webPreferences: popupWebPreferences(),
          },
        };
      }
      shell.openExternal(details.url);
      return { action: 'deny' };
    }

    const isLocalHttp =
      target.protocol === 'http:' &&
      (target.hostname === '127.0.0.1' || target.hostname === 'localhost');
    if (target.protocol === 'https:' || isLocalHttp) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: mainWindow,
          show: true,
          webPreferences: popupWebPreferences(),
        },
      };
    }

    shell.openExternal(details.url);
    return { action: 'deny' };
  });
}

function buildApplicationMenu() {
  const isMac = process.platform === 'darwin';
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  template.push({
    label: 'File',
    submenu: [isMac ? { role: 'close' } : { role: 'quit', label: 'Exit' }],
  });

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
          ]
        : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
    ],
  });

  /** @type {Electron.MenuItemConstructorOptions[]} */
  const viewSubmenu = [
    { role: 'reload', label: 'Reload dashboard' },
    { role: 'forceReload' },
  ];
  if (!app.isPackaged) {
    viewSubmenu.push({ type: 'separator' }, { role: 'toggleDevTools' });
  }
  viewSubmenu.push(
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  );

  template.push({
    label: 'View',
    submenu: viewSubmenu,
  });

  return template;
}

function createWindow() {
  const saved = store.get('bounds');
  /** @type {Electron.BrowserWindowConstructorOptions} */
  const winOpts = {
    minWidth: 1024,
    minHeight: 700,
    title: 'Antigravity Dashboard — Local',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      nativeWindowOpen: true,
    },
  };

  if (saved && typeof saved.width === 'number' && typeof saved.height === 'number') {
    winOpts.width = saved.width;
    winOpts.height = saved.height;
    if (typeof saved.x === 'number' && typeof saved.y === 'number') {
      winOpts.x = saved.x;
      winOpts.y = saved.y;
    }
  } else {
    winOpts.width = 1400;
    winOpts.height = 900;
  }

  mainWindow = new BrowserWindow(winOpts);

  setupWindowOpenHandler();

  mainWindow.on('close', () => {
    try {
      if (mainWindow) {
        store.set('bounds', mainWindow.getBounds());
      }
    } catch {
      /* ignore persistence errors */
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menu = Menu.buildFromTemplate(buildApplicationMenu());
  Menu.setApplicationMenu(menu);

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    loadDashboardProduction();
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
