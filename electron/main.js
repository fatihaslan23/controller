// electron/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const serialAdapter = require('./SerialAdapter');
const wifi = require('node-wifi');

// Wi-Fi modülünü başlat
wifi.init({ iface: null });

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        webPreferences: {
            nodeIntegration: false, 
            contextIsolation: true, 
            // ------------------------------------------
            // !!! KRİTİK AYAR: BU SATIR EKLENMELİ !!!
            webviewTag: true, 
            // ------------------------------------------
            preload: path.join(__dirname, 'preload.js') 
        }
    });

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../src/index.html')}`;
    mainWindow.loadURL(startUrl);
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize(); 
        mainWindow.show();
    });

    global.mainWindow = mainWindow; 
}

function setupIpcListeners() {
    ipcMain.handle('serial:listPorts', async () => serialAdapter.listPorts());
    ipcMain.handle('serial:connect', async (event, port, baud) => serialAdapter.connect(port, baud));
    ipcMain.handle('serial:disconnect', async () => serialAdapter.disconnect());
    ipcMain.handle('serial:sendGcode', async (event, data) => serialAdapter.sendData(data));
    ipcMain.handle('serial:startStream', async (event, file) => serialAdapter.startStream(file));
    ipcMain.handle('serial:stopStream', async () => serialAdapter.stopStream());
    ipcMain.handle('serial:getGcodePreview', async (event, file) => serialAdapter.getGcodePreview(file));

    // Wi-Fi İşlemleri
    ipcMain.handle('wifi:get-ssid', async () => {
        try {
            const currentConnections = await wifi.getCurrentConnections();
            if (currentConnections.length > 0) return currentConnections[0].ssid;
            return null;
        } catch (error) {
            console.error("Wi-Fi SSID Hatası:", error);
            return null;
        }
    });

    ipcMain.handle('wifi:connect', async (event, { ssid, password }) => {
        try {
            console.log(`[WIFI] Tarama...`);
            await wifi.scan(); 
            console.log(`[WIFI] ${ssid} ağına bağlanılıyor...`);
            await wifi.connect({ ssid, password });
            return { success: true };
        } catch (error) {
            console.error("[WIFI] Hata:", error);
            return { success: false, error: error.message };
        }
    });
}

app.on('ready', () => {
    createWindow();
    setupIpcListeners(); 
    mainWindow.webContents.on('did-finish-load', () => {
         mainWindow.webContents.send('serial:data', 'RootClay Başlatıldı.');
    });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });