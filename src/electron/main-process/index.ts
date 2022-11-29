import {app, BrowserWindow, screen, shell} from 'electron';
import path from 'path';
import {hydrateGlobalData} from './hydrate-data';
import {initIpc} from './ipc';
import {initLocales} from './locales';
import {initMenuBar} from './menu-bar';

let mainWindow: BrowserWindow | null;

async function createWindow() {
	const screenSize = screen.getPrimaryDisplay().workAreaSize;

	mainWindow = new BrowserWindow({
		height: Math.round(screenSize.height * 0.9),
		width: Math.round(screenSize.width * 0.9),
		show: false,
		webPreferences: {
			// See preload.ts for why context isolation is disabled.
			contextIsolation: false,
			enableRemoteModule: true,
			// Seems needed to prevent opening a window from blocking the UI. We force
			// them to open outside the app anyway.
			// See https://github.com/electron/electron/issues/29509
			nativeWindowOpen: true,
			nodeIntegration: false,
			preload: path.resolve(__dirname, './preload.js')
		}
	});
	mainWindow.loadURL(
		// Path is relative to this file in the electron-build/ directory that's
		// created during `npm run build:electron-main`.
		// app.isPackaged
		`file://${path.resolve(__dirname, '../../../../renderer/index.html')}`
	);

	mainWindow.once('ready-to-show', () => {
		mainWindow!.show();

		if (!app.isPackaged) {
			mainWindow!.webContents.openDevTools();
		}
	});
	mainWindow.on('closed', () => (mainWindow = null));

	// Load external links in the system browser.

	mainWindow.webContents.on('will-navigate', (event, url) => {
		shell.openExternal(url);
		event.preventDefault();
	});
	mainWindow.webContents.setWindowOpenHandler(({url}) => {
		shell.openExternal(url);
		return {action: 'deny'};
	});
}

app.on('ready', async () => {
	initLocales();
	initIpc();
	initMenuBar();
	await hydrateGlobalData();
	createWindow();
});

app.on('window-all-closed', () => app.quit());
