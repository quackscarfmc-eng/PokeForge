// PokeForge — Electron preload script
// Exposes a safe IPC bridge to the renderer (Next.js app)

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pokeforge", {
  // Listen for menu events from the main process
  onMenuNewProject: (callback: () => void) =>
    ipcRenderer.on("menu-new-project", callback),
  onMenuImportProject: (callback: () => void) =>
    ipcRenderer.on("menu-import-project", callback),
  onMenuNavigate: (callback: (view: string) => void) =>
    ipcRenderer.on("menu-navigate", (_event: unknown, view: string) => callback(view)),
  onMenuBuildCheck: (callback: () => void) =>
    ipcRenderer.on("menu-build-check", callback),
  onMenuBackup: (callback: () => void) =>
    ipcRenderer.on("menu-backup", callback),

  // App info
  getVersion: () => process.env.npm_package_version || "1.0.0",
  isElectron: true,
});
