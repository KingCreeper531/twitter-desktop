// Ranch web-app core: one website in its own window, with a tray icon, unread badge,
// desktop notifications, settings (also editable from the Ranch Launcher) and updates.
// What's specific to the site lives in site.js (main side) and preload.js (page side).
const {
  app, BrowserWindow, session, ipcMain, Tray, Menu, nativeImage, shell, net,
} = require('electron');
const path = require('path');
const fs = require('fs');
const site = require('./site');
const config = require('./config');
const updater = require('./updater');

const ENV = (k) => process.env[`${site.envPrefix}_${k}`];
app.setAppUserModelId(site.appId);
if (ENV('USER_DATA')) app.setPath('userData', ENV('USER_DATA')); // developer test copies
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const ICON = path.join(__dirname, '..', 'build', 'icon.png');
const BADGE = path.join(__dirname, '..', 'build', 'badge.png');
let win = null;
let settingsWin = null;
let tray = null;
let quitting = false;
let blocker = null;
let unread = 0;

const log = (m) => {
  const line = `[${new Date().toISOString()}] ${m}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'app.log'), line); } catch { /* ignore */ }
};

const isInternal = (url) => {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return site.hosts.some((d) => h === d || h.endsWith(`.${d}`));
  } catch { return false; }
};

/** Opens a link in the default browser, without the site's tracking when that's turned on. */
async function openOutside(url) {
  let target = url;
  if (config.get('skipLinkTracking') !== false) target = site.cleanOutbound ? site.cleanOutbound(url) : url;
  if (site.resolveRedirect) { try { target = await site.resolveRedirect(target, net); } catch { /* keep it */ } }
  if (/^https?:\/\//i.test(target)) shell.openExternal(target);
}

// ---------------------------------------------------------------- Start Menu shortcut
function ensureShortcuts() {
  if (process.platform !== 'win32' || !app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR) return;
  const opts = { target: process.execPath, cwd: path.dirname(process.execPath), description: site.name, icon: process.execPath, iconIndex: 0, appUserModelId: site.appId };
  const fix = (lnk) => {
    let current = null;
    try { current = shell.readShortcutLink(lnk); } catch { /* missing */ }
    const ok = current && path.resolve(current.target).toLowerCase() === path.resolve(process.execPath).toLowerCase() && current.appUserModelId === site.appId;
    if (!ok) {
      try { fs.mkdirSync(path.dirname(lnk), { recursive: true }); shell.writeShortcutLink(lnk, current ? 'replace' : 'create', opts); } catch (e) { log(`Shortcut failed: ${e.message}`); }
    }
  };
  fix(path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', `${site.name}.lnk`));
}

// ---------------------------------------------------------------- tracker blocking
async function setupNetworkBlocking(ses) {
  try {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron');
    blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(net.fetch.bind(net), {
      path: path.join(app.getPath('userData'), 'adblock-engine.bin'),
      read: fs.promises.readFile,
      write: fs.promises.writeFile,
    });
    if (config.get('networkBlocking')) blocker.enableBlockingInSession(ses);
    log('Tracker blocking ready');
  } catch (e) {
    log(`Tracker blocking unavailable: ${e.message}`);
  }
}

// ---------------------------------------------------------------- unread badge
function setUnread(n) {
  n = Math.max(0, Number(n) || 0);
  const grew = n > unread;
  unread = n;
  if (!win) return;
  if (process.platform === 'win32') {
    win.setOverlayIcon(n && config.get('unreadBadge') ? nativeImage.createFromPath(BADGE) : null, n ? `${n} unread` : '');
  }
  if (grew && config.get('unreadBadge') && !win.isFocused()) win.flashFrame(true);
  tray?.setToolTip(n ? `${site.name} (${n} new)` : site.name);
}

// ---------------------------------------------------------------- main window
function createWindow() {
  const cfg = config.load();
  const ses = session.fromPartition(site.partition);
  ses.setUserAgent(ses.getUserAgent().replace(/\s?Electron\/\S+/i, '').replace(new RegExp(`\\s?${app.getName()}\\/\\S+`, 'i'), ''));

  win = new BrowserWindow({
    ...cfg.bounds,
    minWidth: 420,
    minHeight: 360,
    title: site.name,
    icon: ICON,
    backgroundColor: site.background,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      partition: site.partition,
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  });
  win.setMenuBarVisibility(false);
  if (cfg.maximized) win.maximize();
  // Test copies stay hidden so they never pop up over what you're doing
  if (!ENV('HIDDEN')) win.once('ready-to-show', () => win.show());

  win.on('page-title-updated', (e, title) => {
    e.preventDefault();
    const m = /^\((\d+)\+?\)\s*/.exec(title || '');
    setUnread(m ? Number(m[1]) : 0);
    win.setTitle(site.name);
  });
  win.on('focus', () => win.flashFrame(false));

  const saveBounds = () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMaximized() || win.isMinimized() || win.isFullScreen()) config.set({ maximized: win.isMaximized() });
    else config.set({ bounds: win.getBounds(), maximized: false });
  };
  let t;
  win.on('resize', () => { clearTimeout(t); t = setTimeout(saveBounds, 500); });
  win.on('move', () => { clearTimeout(t); t = setTimeout(saveBounds, 500); });
  win.on('close', (e) => {
    saveBounds();
    if (!quitting && config.get('closeToTray')) {
      e.preventDefault();
      win.hide();
      if (!config.get('trayHintShown') && tray) {
        config.set({ trayHintShown: true });
        tray.displayBalloon({ iconType: 'info', title: `${site.name} is still running`, content: 'Notifications keep coming. Right-click the tray icon and choose Quit to close it completely.' });
      }
    }
  });
  win.on('closed', () => { win = null; });

  // The site's own link redirects (e.g. l.facebook.com) lead outside, even though they're on its domain
  const stays = (url) => isInternal(url) && !site.isRedirect?.(url);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (stays(url)) win.loadURL(url);
    else openOutside(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (stays(url)) return;
    e.preventDefault();
    openOutside(url);
  });

  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const k = input.key.toLowerCase();
    if (input.key === 'F5' || (input.control && !input.shift && k === 'r')) win.webContents.reload();
    else if (input.key === 'F12') win.webContents.toggleDevTools();
    else if (input.control && input.key === ',') { e.preventDefault(); openSettings(); }
    else if (input.control && (input.key === '=' || input.key === '+')) { e.preventDefault(); win.webContents.setZoomFactor(Math.min(3, win.webContents.getZoomFactor() + 0.1)); }
    else if (input.control && input.key === '-') { e.preventDefault(); win.webContents.setZoomFactor(Math.max(0.5, win.webContents.getZoomFactor() - 0.1)); }
    else if (input.control && input.key === '0') { e.preventDefault(); win.webContents.setZoomFactor(1); }
    else if (input.alt && input.key === 'ArrowLeft' && win.webContents.navigationHistory.canGoBack()) win.webContents.navigationHistory.goBack();
    else if (input.alt && input.key === 'ArrowRight' && win.webContents.navigationHistory.canGoForward()) win.webContents.navigationHistory.goForward();
  });

  if (ENV('MUTE')) win.webContents.setAudioMuted(true);
  win.loadURL(ENV('START_URL') || site.home);
}

function showWindow() {
  if (!win) createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// ---------------------------------------------------------------- settings window
function openSettings() {
  if (settingsWin) { settingsWin.show(); settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 540,
    height: 720,
    title: `${site.name} Settings`,
    icon: ICON,
    backgroundColor: '#121212',
    autoHideMenuBar: true,
    parent: win || undefined,
    show: !ENV('HIDDEN'),
    webPreferences: { preload: path.join(__dirname, 'settings-preload.js'), contextIsolation: true, sandbox: true },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(__dirname, 'settings.html'));
  settingsWin.webContents.on('before-input-event', (_e, input) => { if (input.type === 'keyDown' && input.key === 'Escape') settingsWin.close(); });
  settingsWin.on('closed', () => { settingsWin = null; });
}

// ---------------------------------------------------------------- tray
function updateTray() {
  if (!tray) return;
  const up = updater.getState();
  tray.setContextMenu(Menu.buildFromTemplate([
    ...(up.status === 'available' || up.status === 'ready' ? [{ label: `Update to v${up.version}`, click: () => updater.install() }, { type: 'separator' }] : []),
    { label: `Show ${site.name}`, click: showWindow },
    { label: 'Settings…', click: openSettings },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } },
  ]));
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip(site.name);
  tray.on('click', () => { if (win && win.isVisible() && win.isFocused()) win.hide(); else showWindow(); });
  updateTray();
}

// ---------------------------------------------------------------- IPC
const PAGE_KEYS = site.settings.filter((s) => s.key).map((s) => s.key);
const pageConfig = (cfg = config.load()) => Object.fromEntries(PAGE_KEYS.map((k) => [k, cfg[k]]));

ipcMain.on('rw:get-config', (e) => { e.returnValue = pageConfig(); });
ipcMain.on('rw:open-settings', () => openSettings());
ipcMain.on('rw:open-outside', (_e, url) => openOutside(String(url || '')));
ipcMain.on('rw:log', (_e, m) => log(String(m).slice(0, 300)));
ipcMain.handle('tb:settings-get', () => ({ config: config.load(), schema: site.settings, name: site.name, version: app.getVersion() }));
ipcMain.handle('tb:settings-set', (_e, patch) => {
  const allowed = new Set(PAGE_KEYS);
  config.set(Object.fromEntries(Object.entries(patch || {}).filter(([k]) => allowed.has(k))));
  return { config: config.load(), schema: site.settings, name: site.name };
});
ipcMain.handle('tb:update-get', () => updater.getState());
ipcMain.handle('tb:update-check', () => updater.check());
ipcMain.on('tb:update-install', () => updater.install());
ipcMain.handle('tb:clear-data', async () => {
  await session.fromPartition(site.partition).clearStorageData();
  win?.loadURL(site.home);
});

config.onChange((cfg, before) => {
  if (cfg.networkBlocking !== before.networkBlocking && blocker) {
    const ses = session.fromPartition(site.partition);
    if (cfg.networkBlocking && !blocker.isBlockingEnabled(ses)) blocker.enableBlockingInSession(ses);
    if (!cfg.networkBlocking && blocker.isBlockingEnabled(ses)) blocker.disableBlockingInSession(ses);
  }
  if (cfg.unreadBadge !== before.unreadBadge) setUnread(unread);
  if (PAGE_KEYS.some((k) => JSON.stringify(cfg[k]) !== JSON.stringify(before[k]))) win?.webContents.send('rw:config', pageConfig(cfg));
});

// ---------------------------------------------------------------- lifecycle
app.on('second-instance', showWindow);

app.whenReady().then(async () => {
  const ses = session.fromPartition(site.partition);
  ses.setPermissionRequestHandler((_wc, permission, cb) => {
    if (permission === 'notifications') return cb(!!config.get('notifications'));
    cb(['media', 'fullscreen', 'clipboard-sanitized-write'].includes(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => (permission === 'notifications' ? !!config.get('notifications') : true));
  await setupNetworkBlocking(ses);
  createWindow();
  if (!ENV('HIDDEN')) createTray(); // test copies stay out of the tray too
  ensureShortcuts();
  updater.init({
    logger: log,
    onChange: (s) => {
      win?.webContents.send('tb:update', s);
      settingsWin?.webContents.send('tb:update', s);
      updateTray();
    },
    beforeInstall: () => { quitting = true; },
  });
  log(`${site.name} ${app.getVersion()} started`);
});

app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { if (quitting || !config.get('closeToTray')) app.quit(); });
