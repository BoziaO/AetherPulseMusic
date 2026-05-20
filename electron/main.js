const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const getPort = require('get-port');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');

let mainWindow;
let backendProcess;
let backendPort = 3001;

/**
 * Uruchom Python backend (FastAPI)
 */
async function startBackend() {
  const backendPath = path.join(__dirname, '../backend/main.py');
  
  // Jeśli backend nie istnieje, aplikacja po prostu zadziała w trybie lokalnym
  if (!fs.existsSync(backendPath)) {
    console.log('[Backend] Brak plików backendu. Aplikacja uruchamia się w trybie Standalone.');
    return;
  }

  try {
    backendPort = await getPort({ port: 3001 });
    console.log(`[Backend] Uruchamianie na porcie ${backendPort}`);

    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';

    backendProcess = spawn(pythonPath, [backendPath], {
      env: {
        ...process.env,
        BACKEND_PORT: String(backendPort),
        CORS_ORIGINS: 'http://localhost:5000,http://127.0.0.1:5000',
      },
      stdio: isDev ? 'inherit' : 'ignore',
    });

    backendProcess.on('error', (err) => {
      console.error('[Backend] Błąd:', err.message);
    });

    // Czekaj aż backend się uruchomi
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('[Backend] Uruchomiony pomyślnie');
  } catch (error) {
    console.error('[Backend] Nie udało się uruchomić:', error.message);
  }
}

/**
 * Stwórz główne okno aplikacji
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icons/icon.png'),
  });

  const startURL = isDev
    ? 'http://localhost:5000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startURL);

  // Otwórz DevTools w development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * IPC handlers — komunikacja między Electron a frontend
 */
ipcMain.handle('get-config', async () => {
  const isBackendActive = !!backendProcess;

  return {
    isDev,
    backendPort: isBackendActive ? backendPort : null,
    backendUrl: isBackendActive ? `http://localhost:${backendPort}` : null,
    isStandalone: !isBackendActive,
    appVersion: app.getVersion(),
    platform: process.platform,
    userDataPath: app.getPath('userData'),
  };
});

ipcMain.handle('get-user-data-path', async () => {
  return app.getPath('userData');
});

ipcMain.handle('get-downloads-path', async () => {
  return app.getPath('downloads');
});

ipcMain.handle('app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('restart-app', async () => {
  app.relaunch();
  app.exit(0);
});

/**
 * App lifecycle
 */
app.on('ready', async () => {
  // Uruchom backend jeśli nie jest to dev mode (dev mode uruchamia backend ręcznie)
  // Próbuj uruchomić backend automatycznie. Jeśli go nie ma, aplikacja i tak zadziała lokalnie.
  await startBackend();
  createWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  // Zamknij backend przy zamknięciu okna
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Utwórz menu aplikacji
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // Można dodać about dialog
          },
        },
      ],
    },
  ];

  if (isDev) {
    template.push({
      label: 'Dev',
      submenu: [
        { role: 'toggleDevTools' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Handle squirrel for Windows installer
 */
if (require('electron-squirrel-startup')) {
  app.quit();
}

/**
 * Obsługa uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
