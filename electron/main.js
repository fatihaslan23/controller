// electron/main.js (TAM KOD)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const serialAdapter = require('./SerialAdapter'); 

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false, 
            contextIsolation: true, 
            preload: path.join(__dirname, 'preload.js') 
        }
    });

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../src/index.html')}`;
    
    mainWindow.loadURL(startUrl);

    // Global olarak erişilebilir yap, böylece SerialAdapter veri gönderebilir
    global.mainWindow = mainWindow; 
}

function setupIpcListeners() {
    // Port Listeleme
    ipcMain.handle('serial:listPorts', async (event) => {
        return serialAdapter.listPorts();
    });

    // Bağlanma
    ipcMain.handle('serial:connect', async (event, portPath, baudRate) => {
        return serialAdapter.connect(portPath, baudRate);
    });

    // Veri Gönderme (Tek Komut)
    ipcMain.handle('serial:sendGcode', async (event, data) => {
        return serialAdapter.sendData(data);
    });
    
    // Bağlantıyı Kesme
    ipcMain.handle('serial:disconnect', async (event) => {
        return serialAdapter.disconnect();
    });

    // ----------------------------------------------------
    // G-CODE AKIŞ KONTROLÜ (KRİTİK BÖLÜM)
    // ----------------------------------------------------
    ipcMain.handle('serial:startStream', async (event, gcodeContent) => {
        // YENİ KRİTİK LOG: Bu kanalın tetiklendiğini teyit edelim
        console.log(`%c[main] IPC TETİKLENDİ: serial:startStream alındı. Gcode Uzunluğu: ${gcodeContent.length}`, 'color: yellow; font-weight: bold;');
        
        try {
            return serialAdapter.startStream(gcodeContent);
        } catch (error) {
            console.error('[main] startStream Hatası:', error.message);
            // Renderer sürecine hatayı geri iletir.
            throw error; 
        }
    });

    ipcMain.handle('serial:stopStream', async (event) => {
        return serialAdapter.stopStream();
    });
}


app.on('ready', () => {
    createWindow();
    setupIpcListeners(); 
    // Ana pencere hazır olduğunda başlangıç mesajını gönder
    mainWindow.webContents.on('did-finish-load', () => {
         mainWindow.webContents.send('serial:data', 'RootClay Serial Controller Başlatıldı.');
    });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});