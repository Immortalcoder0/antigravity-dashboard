const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function isDev() {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Antigravity Dashboard',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In packaged app, web dist is in app.asar under apps/web/dist/
    const webPath = path.join(__dirname, '..', 'apps', 'web', 'dist', 'index.html');
    console.log('[Electron] Loading web from:', webPath);
    
    // Try the asar path, if fails try resources path
    mainWindow.loadFile(webPath).catch(() => {
      const fallbackPath = path.join(process.resourcesPath, 'app.asar', 'apps', 'web', 'dist', 'index.html');
      console.log('[Electron] Trying fallback:', fallbackPath);
      mainWindow.loadFile(fallbackPath);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
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
