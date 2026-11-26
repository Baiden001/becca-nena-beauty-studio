// Becca Nena POS: desktop app for the shop counter.
//
// It opens the live till (https://<site>/admin/walk-in) in its own window, so
// every change to the website shows up here straight away, and adds the
// things a browser can't do:
//   • receipts print straight to the receipt printer, no print dialog
//   • the cash drawer (plugged into the receipt printer) opens on cash sales
//   • the customer screen opens full screen on the second monitor by itself
//   • the till can start with Windows
//
// Settings live in settings.json in the app's data folder and are changed from
// the "Till" menu → Settings.

const { app, BrowserWindow, Menu, dialog, ipcMain, screen, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFile } = require("node:child_process");

const DEFAULTS = {
  siteUrl: "https://beccanenabeautystudio.com",
  /** Receipt printer name as Windows/macOS knows it. Empty = the default printer. */
  printer: "",
  drawerOnCash: true,
  /** Which drawer connector pin the printer kicks: 0 = pin 2 (most drawers), 1 = pin 5. */
  drawerPin: 0,
  customerScreenAtStart: true,
  startWithComputer: false,
};

const TILL_PATH = "/admin/walk-in";
const DISPLAY_PATH = "/admin/customer-display";

let settings = { ...DEFAULTS };
let tillWindow = null;
let customerWindow = null;
let settingsWindow = null;

// ───────────────────────── settings ─────────────────────────

const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

function loadSettings() {
  try {
    settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), "utf8")) };
  } catch {
    settings = { ...DEFAULTS };
  }
}

function saveSettings(next) {
  settings = { ...settings, ...next };
  settings.siteUrl = normaliseUrl(settings.siteUrl) || DEFAULTS.siteUrl;
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  if (process.platform === "win32" || process.platform === "darwin") {
    app.setLoginItemSettings({ openAtLogin: Boolean(settings.startWithComputer) });
  }
}

function normaliseUrl(value) {
  try {
    const raw = String(value || "").trim();
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.origin;
  } catch {
    return "";
  }
}

const siteOrigin = () => normaliseUrl(settings.siteUrl);

// Addresses the shop's own site has redirected the till to (e.g. the main
// domain sending visitors on to www.). Trusted for this run of the app.
const redirectedOrigins = new Set();

const bareHost = (host) => host.replace(/^www\./, "");

function isOurs(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const ours = new URL(siteOrigin());
    // beccanenabeautystudio.com and www.beccanenabeautystudio.com are the same shop.
    if (u.protocol === ours.protocol && u.port === ours.port && bareHost(u.hostname) === bareHost(ours.hostname)) {
      return true;
    }
    return redirectedOrigins.has(u.origin);
  } catch {
    return false;
  }
}

/** Trust where the shop's own site redirects to (server redirects only). */
function followSiteRedirects(win) {
  win.webContents.on("will-redirect", (_e, url) => {
    try {
      const target = new URL(url);
      const from = win.webContents.getURL();
      // Only redirects that start on our site (or the first load of it) count.
      if (target.protocol === new URL(siteOrigin()).protocol && (!from || from.startsWith("file:") || isOurs(from))) {
        redirectedOrigins.add(target.origin);
      }
    } catch {
      /* ignore malformed */
    }
  });
}

// ───────────────────────── windows ─────────────────────────

function otherDisplay() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().find((d) => d.id !== primary.id) || null;
}

function customerWindowOptions() {
  const d = otherDisplay();
  const base = {
    title: "Becca Nena Beauty Studio",
    backgroundColor: "#F8F4EF",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  };
  if (!d) return { ...base, width: 1100, height: 760 };
  return { ...base, ...d.bounds, fullscreen: true, frame: false };
}

function openCustomerScreen() {
  if (customerWindow && !customerWindow.isDestroyed()) {
    customerWindow.show();
    return;
  }
  customerWindow = new BrowserWindow(customerWindowOptions());
  customerWindow.setMenu(null);
  customerWindow.loadURL(siteOrigin() + DISPLAY_PATH).catch(() => {});
  customerWindow.on("closed", () => (customerWindow = null));
}

function lockDownNavigation(win) {
  // Anything outside the shop's own site opens in the normal web browser.
  win.webContents.on("will-navigate", (e, url) => {
    if (!isOurs(url)) {
      e.preventDefault();
      void shell.openExternal(url);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isOurs(url) && new URL(url).pathname.startsWith(DISPLAY_PATH)) {
      // The till's "Customer screen" button: put it on the second monitor.
      if (customerWindow && !customerWindow.isDestroyed()) {
        customerWindow.show();
        return { action: "deny" };
      }
      return { action: "allow", overrideBrowserWindowOptions: customerWindowOptions() };
    }
    if (isOurs(url)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("did-create-window", (child, { url }) => {
    if (isOurs(url) && new URL(url).pathname.startsWith(DISPLAY_PATH)) {
      customerWindow = child;
      child.setMenu(null);
      child.on("closed", () => (customerWindow = null));
    }
  });
}

function createTillWindow() {
  tillWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Becca Nena POS",
    backgroundColor: "#302827",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  tillWindow.maximize();
  tillWindow.once("ready-to-show", () => tillWindow.show());
  followSiteRedirects(tillWindow);
  lockDownNavigation(tillWindow);

  // No connection: show a friendly page that retries by itself.
  tillWindow.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = navigation replaced, not a failure
    void tillWindow.loadFile(path.join(__dirname, "offline.html"), {
      query: { retry: url || siteOrigin() + TILL_PATH },
    });
  });

  tillWindow.loadURL(siteOrigin() + TILL_PATH).catch(() => {});
  tillWindow.on("closed", () => {
    tillWindow = null;
    if (customerWindow && !customerWindow.isDestroyed()) customerWindow.close();
  });

  if (settings.customerScreenAtStart && otherDisplay()) {
    tillWindow.webContents.once("did-finish-load", () => openCustomerScreen());
  }
}

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 580,
    height: 760,
    minWidth: 480,
    minimizable: false,
    parent: tillWindow || undefined,
    title: "Till settings",
    backgroundColor: "#F8F4EF",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "settings-preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.setMenu(null);
  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
  settingsWindow.on("closed", () => (settingsWindow = null));
}

// ───────────────────────── printing & cash drawer ─────────────────────────

function printContents(contents) {
  return new Promise((resolve) => {
    contents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: settings.printer || undefined,
        margins: { marginType: "none" },
      },
      (ok, reason) => resolve(ok ? { ok: true } : { ok: false, error: reason || "Printing failed" })
    );
  });
}

async function receiptPrinterName(contents) {
  if (settings.printer) return settings.printer;
  const printers = await contents.getPrintersAsync();
  return (printers.find((p) => p.isDefault) || printers[0] || {}).name || "";
}

// Sends bytes straight to the printer, bypassing the driver's page layout.
// Windows: through the print spooler from PowerShell (no extra software).
// macOS/Linux: through CUPS ("lp -o raw").
const RAW_PRINT_PS1 = `
param([string]$Printer, [string]$Hex)
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class BnRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string name, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr h, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] public static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int written);
  public static void Send(string printer, byte[] bytes) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Exception("Printer not found: " + printer);
    try {
      var di = new DOCINFO { pDocName = "Cash drawer", pDataType = "RAW" };
      if (!StartDocPrinter(h, 1, di)) throw new Exception("The printer refused the job");
      StartPagePrinter(h);
      int written;
      WritePrinter(h, bytes, bytes.Length, out written);
      EndPagePrinter(h);
      EndDocPrinter(h);
    } finally { ClosePrinter(h); }
  }
}
"@
$bytes = New-Object byte[] ($Hex.Length / 2)
for ($i = 0; $i -lt $bytes.Length; $i++) { $bytes[$i] = [Convert]::ToByte($Hex.Substring($i * 2, 2), 16) }
[BnRawPrinter]::Send($Printer, $bytes)
`;

function sendRaw(printer, bytes) {
  const hex = Buffer.from(bytes).toString("hex");
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      const script = path.join(os.tmpdir(), "bn-pos-raw-print.ps1");
      fs.writeFileSync(script, RAW_PRINT_PS1);
      execFile(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-Printer", printer, "-Hex", hex],
        { windowsHide: true, timeout: 15000 },
        (err, _out, stderr) =>
          resolve(err ? { ok: false, error: (stderr || err.message).trim().split("\n")[0] } : { ok: true })
      );
    } else {
      const file = path.join(os.tmpdir(), "bn-pos-drawer.bin");
      fs.writeFileSync(file, Buffer.from(bytes));
      execFile("lp", ["-d", printer, "-o", "raw", file], { timeout: 15000 }, (err, _out, stderr) =>
        resolve(err ? { ok: false, error: (stderr || err.message).trim() } : { ok: true })
      );
    }
  });
}

async function openDrawer(contents) {
  const printer = await receiptPrinterName(contents);
  if (!printer) return { ok: false, error: "No printer is set up on this computer." };
  // ESC/POS "generate pulse": ESC p m t1 t2 (pin, on-time, off-time).
  const pin = Number(settings.drawerPin) === 1 ? 1 : 0;
  return sendRaw(printer, [0x1b, 0x70, pin, 0x19, 0xfa]);
}

// Only the shop's own pages (and the settings window) may use these.
function fromOurSite(event) {
  const url = event.senderFrame?.url || "";
  if (isOurs(url)) return true;
  console.warn(`[bn-pos] blocked printer/drawer request from ${url} (site is ${siteOrigin()})`);
  return false;
}

const notAllowed = (event) => {
  let host = "";
  try {
    host = new URL(event.senderFrame?.url || "").host;
  } catch {
    /* unknown */
  }
  return {
    ok: false,
    error: `this page (${host || "unknown address"}) isn't the till's website (${new URL(siteOrigin()).host}). Check Till → Settings → Website address.`,
  };
};

ipcMain.handle("bn:print", (event) => {
  if (!fromOurSite(event)) return notAllowed(event);
  return printContents(event.sender);
});
ipcMain.handle("bn:open-drawer", (event) => {
  if (!fromOurSite(event)) return notAllowed(event);
  return openDrawer(event.sender);
});
ipcMain.handle("bn:drawer-on-cash", (event) => fromOurSite(event) && Boolean(settings.drawerOnCash));

// Settings window
const fromSettings = (event) => settingsWindow && event.sender === settingsWindow.webContents;

ipcMain.handle("bn-settings:get", async (event) => {
  if (!fromSettings(event)) return null;
  const printers = await event.sender.getPrintersAsync();
  return {
    settings,
    printers: printers.map((p) => ({ name: p.name, label: p.displayName || p.name, isDefault: p.isDefault })),
    version: app.getVersion(),
    hasSecondScreen: Boolean(otherDisplay()),
  };
});

ipcMain.handle("bn-settings:save", (event, next) => {
  if (!fromSettings(event)) return { ok: false };
  const before = siteOrigin();
  saveSettings({
    siteUrl: String(next.siteUrl || ""),
    printer: String(next.printer || ""),
    drawerOnCash: Boolean(next.drawerOnCash),
    drawerPin: Number(next.drawerPin) === 1 ? 1 : 0,
    customerScreenAtStart: Boolean(next.customerScreenAtStart),
    startWithComputer: Boolean(next.startWithComputer),
  });
  if (siteOrigin() !== before && tillWindow) tillWindow.loadURL(siteOrigin() + TILL_PATH).catch(() => {});
  return { ok: true, settings };
});

ipcMain.handle("bn-settings:test-print", async (event, printer) => {
  if (!fromSettings(event)) return { ok: false };
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  const html = `<html><body style="font-family:Arial;width:66mm;margin:0 auto;text-align:center;font-size:12px">
    <h2 style="margin:4mm 0 2mm">Becca Nena POS</h2><p>Test receipt</p><p>${new Date().toLocaleString("en-GH")}</p>
    <p>If you can read this, receipts are set up.</p><p>&nbsp;</p></body></html>`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const saved = settings.printer;
  settings.printer = String(printer || "");
  const res = await printContents(win.webContents);
  settings.printer = saved;
  win.close();
  return res;
});

ipcMain.handle("bn-settings:test-drawer", async (event, printer, pin) => {
  if (!fromSettings(event)) return { ok: false };
  const saved = { printer: settings.printer, drawerPin: settings.drawerPin };
  settings.printer = String(printer || "");
  settings.drawerPin = Number(pin) === 1 ? 1 : 0;
  const res = await openDrawer(event.sender);
  Object.assign(settings, saved);
  return res;
});

ipcMain.handle("bn-settings:open-customer-screen", (event) => {
  if (!fromSettings(event)) return;
  openCustomerScreen();
});

// ───────────────────────── menu & start-up ─────────────────────────

function buildMenu() {
  const till = () => tillWindow?.webContents;
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "Till",
      submenu: [
        { label: "New sale", accelerator: "CmdOrCtrl+N", click: () => till()?.loadURL(siteOrigin() + TILL_PATH).catch(() => {}) },
        { label: "Open cash drawer", accelerator: "CmdOrCtrl+D", click: async () => {
            if (!till()) return;
            const res = await openDrawer(till());
            if (!res.ok) dialog.showErrorBox("Cash drawer", `The drawer didn't open: ${res.error}`);
          } },
        { label: "Customer screen", click: () => openCustomerScreen() },
        { type: "separator" },
        { label: "Settings…", accelerator: "CmdOrCtrl+,", click: () => openSettings() },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit", label: "Close the till" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "toggleDevTools", label: "Developer tools" },
      ],
    },
    { role: "editMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (tillWindow) {
      if (tillWindow.isMinimized()) tillWindow.restore();
      tillWindow.focus();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("com.beccanena.pos");
    loadSettings();
    buildMenu();
    const firstRun = !fs.existsSync(settingsFile());
    if (firstRun) saveSettings({});
    createTillWindow();
    // First run: ask for the printer straight away, on top of the till.
    if (firstRun) tillWindow.once("show", () => setTimeout(openSettings, 300));
  });

  app.on("window-all-closed", () => app.quit());
  app.on("activate", () => {
    if (!tillWindow) createTillWindow();
  });
}
