import { app, BrowserWindow, ipcMain, Tray, Menu } from 'electron'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT!, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT!, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT!, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let tray: Tray | null = null
let isQuitting = false

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  originalConsoleLog(...args);
  if (win && !win.isDestroyed()) {
    const serializedArgs = args.map(a => {
      if (a instanceof Error) return a.stack || a.message;
      return typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : a;
    });
    win.webContents.send('main-console-log', ...serializedArgs);
  }
};

console.error = (...args) => {
  originalConsoleError(...args);
  if (win && !win.isDestroyed()) {
    const serializedArgs = args.map(a => {
      if (a instanceof Error) return a.stack || a.message;
      return typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : a;
    });
    win.webContents.send('main-console-error', ...serializedArgs);
  }
};

import { setupSupabaseRealtime } from './supabase'
import { testPrinter } from './printer'
import { store } from './store'

function createWindow() {
  const iconPath = path.join(process.env.VITE_PUBLIC!, 'icon.png')

  const startHidden = app.isPackaged && process.argv.includes('--hidden')

  win = new BrowserWindow({
    width: 600,
    height: 700,
    icon: iconPath,
    show: !startHidden,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Set up auto-launch on system startup
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
      args: ['--hidden']
    })
  } else {
    // Si estamos en desarrollo, nos aseguramos de que no esté activado
    // para limpiar cualquier registro previo
    app.setLoginItemSettings({
      openAtLogin: false,
      path: app.getPath('exe')
    })
  }

  // Prevent app from quitting when window is closed
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win?.hide()
    }
    return false
  })

  // Create System Tray
  tray = new Tray(iconPath)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir UPick Printer', click: () => win?.show() },
    { type: 'separator' },
    {
      label: 'Salir Completamente', click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setToolTip('UPick Printer Agent')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => {
    win?.show()
  })

  // Set up IPC Handlers
  ipcMain.handle('get-config', () => {
    return {
      restaurantId: store.get('restaurantId'),
      connectionType: store.get('connectionType') || 'network',
      printerIp: store.get('printerIp'),
      printerPort: store.get('printerPort'),
      printerVid: store.get('printerVid'),
      printerPid: store.get('printerPid'),
      printAdvanceMinutes: store.get('printAdvanceMinutes') || 0
    }
  })

  ipcMain.handle('save-config', async (_, config) => {
    store.set('restaurantId', config.restaurantId)
    store.set('connectionType', config.connectionType)
    store.set('printerIp', config.printerIp)
    store.set('printerPort', Number(config.printerPort) || 9100)
    store.set('printerVid', config.printerVid)
    store.set('printerPid', config.printerPid)
    store.set('printAdvanceMinutes', Number(config.printAdvanceMinutes) || 0)

    // Restart supabase listener with new ID
    setupSupabaseRealtime((status) => {
      win?.webContents.send('supabase-status', status)
    })

    return true
  })

  ipcMain.handle('test-printer', async (_, config) => {
    return await testPrinter(config)
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    // Initial setup
    setupSupabaseRealtime((status) => {
      win?.webContents.send('supabase-status', status)
    })
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
