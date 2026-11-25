// Gives the shop's web pages a small, fixed set of till functions. Nothing
// else from the computer is reachable from the page.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bnDesktop", {
  isDesktop: true,
  print: () => ipcRenderer.invoke("bn:print"),
  openDrawer: () => ipcRenderer.invoke("bn:open-drawer"),
  drawerOnCash: () => ipcRenderer.invoke("bn:drawer-on-cash"),
});
