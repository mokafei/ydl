const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');

const LICENSE_DIR = path.join(app.getPath('userData'), 'licenses');
const LICENSE_FILE = path.join(LICENSE_DIR, 'license.json');

const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 8000);
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

const isDev = !app.isPackaged;
let mainWindow = null;
let backendProcess = null;
let cachedLicense = null;
let isQuitting = false;

function resolveBackendExecutable() {
  if (isDev) {
    const pythonCmd = process.env.BACKEND_PYTHON || 'python';
    const backendCwd = path.resolve(__dirname, '..', '..', 'backend');
    const args = [
      '-c',
      [
        'import uvicorn',
        'import app.main',
        "uvicorn.run('app.main:app', host='" + BACKEND_HOST + "', port=" + String(BACKEND_PORT) + ")",
      ].join('; '),
    ];
    return { command: pythonCmd, args, options: { cwd: backendCwd } };
  }

  const exePath = path.join(process.resourcesPath, 'ydl_backend.exe');
  return { command: exePath, args: ['--host', BACKEND_HOST, '--port', String(BACKEND_PORT)], options: { cwd: process.resourcesPath } };
}

function startBackendProcess() {
  const { command, args, options } = resolveBackendExecutable();
  const spawnOptions = {
    ...options,
    stdio: isDev ? 'inherit' : 'ignore',
    shell: false,
  };
  backendProcess = spawn(command, args, spawnOptions);

  backendProcess.on('exit', (code, signal) => {
    console.log(`[backend] exit code=${code} signal=${signal}`);
    backendProcess = null;
    if (!isDev && app.isReady() && !isQuitting) {
      dialog.showErrorBox('后端已退出', '本地服务已停止，应用将关闭。');
      app.quit();
    }
  });

  backendProcess.on('error', (error) => {
    console.error('[backend] failed to start', error);
    dialog.showErrorBox('后端启动失败', error.message);
  });
}

function ensureLicenseDir() {
  if (!fs.existsSync(LICENSE_DIR)) {
    fs.mkdirSync(LICENSE_DIR, { recursive: true });
  }
}

function loadLicense() {
  ensureLicenseDir();
  if (!fs.existsSync(LICENSE_FILE)) {
    cachedLicense = null;
    return null;
  }
  try {
    const raw = fs.readFileSync(LICENSE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    cachedLicense = parsed;
    return parsed;
  } catch (error) {
    console.error('[license] load error', error);
    cachedLicense = null;
    return null;
  }
}

function saveLicense(envelope) {
  ensureLicenseDir();
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(envelope, null, 2), 'utf-8');
  cachedLicense = envelope;
}

function clearLicense() {
  if (fs.existsSync(LICENSE_FILE)) {
    fs.unlinkSync(LICENSE_FILE);
  }
  cachedLicense = null;
}

function resolveDeviceId() {
  const machineId = os.hostname();
  const user = os.userInfo().username || 'unknown';
  return crypto.createHash('sha256').update(`${machineId}-${user}`).digest('hex');
}

function getPayQrPath() {
  const resourceDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, 'resources');
  const file = path.join(resourceDir, 'pay_qr.png');
  if (fs.existsSync(file)) {
    return file;
  }
  return null;
}

async function waitForBackendReady(retries = 40, delay = 500) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), delay);
      const response = await fetch(`${BACKEND_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return false;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'build', 'index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function stopBackendProcess() {
  return new Promise((resolve) => {
    if (!backendProcess) {
      resolve();
      return;
    }
    
    const pid = backendProcess.pid;
    console.log(`[backend] stopping process PID=${pid}`);
    
    const cleanup = () => {
      backendProcess = null;
      console.log('[backend] process stopped');
      resolve();
    };
    
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
      });
      killer.on('close', () => {
        setTimeout(cleanup, 1000);
      });
      killer.on('error', (error) => {
        console.error('[backend] taskkill error', error);
        cleanup();
      });
    } else {
      try {
        backendProcess.kill();
        setTimeout(cleanup, 1000);
      } catch (error) {
        console.error('[backend] kill error', error);
        cleanup();
      }
    }
  });
}

app.whenReady().then(async () => {
  console.log('[electron] userData path:', app.getPath('userData'));
  startBackendProcess();
  const ready = await waitForBackendReady();
  if (!ready) {
    dialog.showErrorBox('后端启动超时', '请检查 ydl_backend 是否可以正常运行。');
    app.quit();
    return;
  }
  await createMainWindow();
  loadLicense();

  ipcMain.handle('license:get', () => ({
    license: cachedLicense,
    deviceId: resolveDeviceId(),
    payQrPath: getPayQrPath(),
    deviceName: os.hostname(),
    appVersion: app.getVersion(),
  }));

  ipcMain.handle('license:save', (_event, envelope) => {
    saveLicense(envelope);
    return { status: 'ok' };
  });

  ipcMain.handle('license:clear', () => {
    clearLicense();
    return { status: 'ok' };
  });

  ipcMain.handle('shell:openExternal', (_event, url) => {
    if (typeof url === 'string' && url.startsWith('http')) {
      shell.openExternal(url);
      return { status: 'ok' };
    }
    return { status: 'error', message: 'invalid url' };
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    console.log('[electron] before-quit: stopping backend...');
    await stopBackendProcess();
    console.log('[electron] before-quit: backend stopped, quitting app');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
