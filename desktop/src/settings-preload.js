const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bnSettings", {
  get: () => ipcRenderer.invoke("bn-settings:get"),
  save: (s) => ipcRenderer.invoke("bn-settings:save", s),
  testPrint: (printer) => ipcRenderer.invoke("bn-settings:test-print", printer),
  testDrawer: (printer, pin) => ipcRenderer.invoke("bn-settings:test-drawer", printer, pin),
  openCustomerScreen: () => ipcRenderer.invoke("bn-settings:open-customer-screen"),
});
