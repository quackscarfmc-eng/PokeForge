// PokeForge — Electron main process
// Creates a desktop window and loads the Next.js app.
// In dev: loads http://localhost:3000 (the dev server must be running).
// In prod: spawns the Next.js standalone server then loads it.

import { app, BrowserWindow, Menu, dialog } from "electron";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import * as http from "http";

const isDev = !app.isPackaged;
let nextServer: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

const DEV_URL = "http://localhost:3000";
const PROD_PORT = 3000;

// ---------------------------------------------------------------------------
// Wait for a URL to respond (used to wait for the Next.js server to start)
// ---------------------------------------------------------------------------
function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve();
          } else {
            retry();
          }
        })
        .on("error", () => retry());
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Server did not start in time"));
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Start the Next.js standalone server in production
// ---------------------------------------------------------------------------
function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(process.resourcesPath, "app", ".next", "standalone", "server.js");
    nextServer = spawn("node", [serverPath], {
      env: {
        ...process.env,
        PORT: String(PROD_PORT),
        NODE_ENV: "production",
        ELECTRON_RUN_AS_NODE: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    nextServer.stdout?.on("data", (data: Buffer) => {
      console.log(`[next] ${data.toString().trim()}`);
    });
    nextServer.stderr?.on("data", (data: Buffer) => {
      console.error(`[next] ${data.toString().trim()}`);
    });
    nextServer.on("error", (err) => reject(err));

    // Wait for the server to be ready
    waitForServer(`http://localhost:${PROD_PORT}`)
      .then(resolve)
      .catch(reject);
  });
}

// ---------------------------------------------------------------------------
// Create the main browser window
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "PokeForge",
    backgroundColor: "#0e1119",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "..", "public", "logo.svg"),
  });

  // Build the application menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "New Project…",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.send("menu-new-project"),
        },
        {
          label: "Import Existing Project…",
          accelerator: "CmdOrCtrl+I",
          click: () => mainWindow?.webContents.send("menu-import-project"),
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Dashboard",
          accelerator: "CmdOrCtrl+1",
          click: () => mainWindow?.webContents.send("menu-navigate", "dashboard"),
        },
        {
          label: "Pokémon",
          accelerator: "CmdOrCtrl+2",
          click: () => mainWindow?.webContents.send("menu-navigate", "species"),
        },
        {
          label: "Moves",
          accelerator: "CmdOrCtrl+3",
          click: () => mainWindow?.webContents.send("menu-navigate", "moves"),
        },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Safety",
      submenu: [
        {
          label: "Run Build Check",
          accelerator: "CmdOrCtrl+B",
          click: () => mainWindow?.webContents.send("menu-build-check"),
        },
        {
          label: "Create Backup",
          accelerator: "CmdOrCtrl+Shift+B",
          click: () => mainWindow?.webContents.send("menu-backup"),
        },
        { type: "separator" },
        {
          label: "Safety Center",
          click: () => mainWindow?.webContents.send("menu-navigate", "safety"),
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About PokeForge",
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: "info",
              title: "About PokeForge",
              message: "PokeForge",
              detail: `Custom Pokémon editor for pokeemerald-expansion\nVersion ${app.getVersion()}\n\nBuilt with Next.js + Electron`,
              buttons: ["OK"],
            });
          },
        },
        {
          label: "Documentation",
          click: () => {
            require("electron").shell.openExternal("https://github.com/rh-hideout/pokeemerald-expansion");
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Load the app
  const loadUrl = isDev ? DEV_URL : `http://localhost:${PROD_PORT}`;
  mainWindow.loadURL(loadUrl);

  // Open DevTools in dev
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  if (!isDev) {
    // In production, start the Next.js server
    try {
      await startNextServer();
    } catch (err) {
      dialog.showErrorBox(
        "Failed to start server",
        `Could not start the PokeForge server: ${err}\n\nPlease make sure the app is not corrupted.`,
      );
      app.quit();
      return;
    }
  } else {
    // In dev, check if the dev server is running
    try {
      await waitForServer(DEV_URL, 5000);
    } catch {
      dialog.showErrorBox(
        "Dev server not running",
        `Please start the dev server first:\n\n  bun run dev\n\nThen restart PokeForge.`,
      );
      app.quit();
      return;
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill();
  }
});
