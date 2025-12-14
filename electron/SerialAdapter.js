// electron/SerialAdapter.js
const { SerialPort } = require('serialport');
const { ipcMain, BrowserWindow } = require('electron'); 
const { ReadlineParser } = require('@serialport/parser-readline'); 

let currentPort = null;
let parser = null; 

// --- GCODE AKIŞ MANTIKLARI STATE'LERİ ---
let gcodeLines = []; 
let totalLines = 0;
let currentLineIndex = 0;
let isStreamingActive = false;
let isPaused = false;

const getMainWindow = () => global.mainWindow || BrowserWindow.getAllWindows()[0];

const sendProgress = () => {
    if (!totalLines || totalLines === 0) return;
    const progress = Math.floor((currentLineIndex / totalLines) * 100);
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.webContents.send('stream:progress', progress);
};

const sendNextLine = () => {
    if (!isStreamingActive || isPaused || !currentPort || !currentPort.isOpen) {
        if (currentLineIndex >= totalLines && isStreamingActive) {
            console.log('[Node.js Serial] G-code Akışı Tamamlandı.');
            isStreamingActive = false;
            currentLineIndex = 0;
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.webContents.send('stream:completed');
        }
        return;
    }
    
    if (currentLineIndex >= totalLines) {
        return;
    }

    const line = gcodeLines[currentLineIndex].trim();
    if (line.length === 0 || line.startsWith(';')) {
        // Boş veya yorum satırlarını atla
        currentLineIndex++;
        sendProgress();
        sendNextLine(); 
        return;
    }

    // YENİ LOG: Hangi satırı göndermeye çalıştığımızı görelim
    console.log(`[Node.js Serial] Gönderiliyor: Satır ${currentLineIndex + 1}/${totalLines}: ${line}`);

    currentPort.write(line + '\n', (err) => {
        if (err) {
            console.error('[Node.js Serial] KRİTİK YAZMA HATASI:', err.message);
            isStreamingActive = false;
        } else {
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.webContents.send('serial:data', `>> ${line}`);
        }
    });
};

const setupDataListener = () => {
    // 4. Veri Dinleme (G-code yanıtlarını alma)
    parser.removeAllListeners('data');
    
    parser.on('data', data => {
        const dataTrimmed = data.trim();
        const mainWindow = getMainWindow();
        
        // Cihazdan gelen tüm verileri renderer'a gönder
        if(mainWindow) mainWindow.webContents.send('serial:data', dataTrimmed);
        console.log(`[Node.js Serial] Cihazdan Gelen Yanıt: ${dataTrimmed}`); // YANIT LOGU

        // Akış aktifse ve "ok" onayı gelirse
        if (isStreamingActive && !isPaused) {
            if (dataTrimmed.startsWith('ok')) { 
                currentLineIndex++;
                sendProgress();
                sendNextLine();
            } 
        }
    });
}


const serialAdapter = {

    /**
     * Gerçek USB Portlarını listeler.
     */
    async listPorts() {
        console.log('[Node.js Serial] Portlar listeleniyor...');
        try {
            // Port listeleme mantığı geri geldi
            const ports = await SerialPort.list(); 
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer || 'Bilinmiyor'
            }));
        } catch (error) {
            console.error('[Node.js Serial] Port listeleme hatası:', error);
            // Hata durumunda boş liste döndür (electron-rebuild sorunu olabilir)
            return []; 
        }
    },

    /**
     * Gerçek bir seri porta bağlanır.
     */
    async connect(portPath, baudRate) {
        if (currentPort && currentPort.isOpen) {
            await serialAdapter.disconnect();
        }

        console.log(`[Node.js Serial] ${portPath} (Baud: ${baudRate}) bağlanılıyor...`);
        
        return new Promise((resolve, reject) => {
            
            // 1. Seri Port objesini oluştur
            currentPort = new SerialPort({
                path: portPath,
                baudRate: parseInt(baudRate),
                autoOpen: false, 
            });

            // 2. Parser (Veri Ayrıştırıcı) ayarla
            parser = currentPort.pipe(new ReadlineParser({ delimiter: '\n' }));

            // 3. Bağlantıyı Aç
            currentPort.open((err) => {
                if (err) {
                    console.error('[Node.js Serial] Bağlantı Hatası:', err.message);
                    currentPort = null;
                    return reject(new Error(`Port açılamadı: ${err.message}`));
                }
                
                // 4. Veri Dinleme
                setupDataListener();

                // 5. Bağlantı Başarılı
                console.log(`[Node.js Serial] ${portPath} bağlantısı başarılı.`);
                resolve(true);
            });
            
            // Hata Dinleyicisi
            currentPort.on('error', (err) => {
                console.error('[Node.js Serial] Port Hatası:', err.message);
                reject(err);
            });
        });
    },
    
    /**
     * G-code komutlarını seri port üzerinden gönderir.
     */
    async sendData(data) {
        if (!currentPort || !currentPort.isOpen) {
            throw new Error("Seri porta bağlı değil.");
        }
        
        return new Promise((resolve, reject) => {
            currentPort.write(data + '\n', (err) => {
                if (err) {
                    console.error('[Node.js Serial] Yazma Hatası:', err.message);
                    return reject(err);
                }
                console.log(`[Node.js Serial] Gönderilen G-code: ${data.trim()}`);
                resolve();
            });
        });
    },

    async disconnect() {
        if (currentPort && currentPort.isOpen) {
            console.log(`[Node.js Serial] ${currentPort.path} bağlantısı kesiliyor...`);
            return new Promise((resolve, reject) => {
                currentPort.close((err) => {
                    if (err) {
                        console.error('[Node.js Serial] Kapatma Hatası:', err.message);
                        return reject(err);
                    }
                    currentPort = null;
                    parser = null;
                    console.log('[Node.js Serial] Bağlantı kesildi.');
                    resolve();
                });
            });
        }
        return Promise.resolve();
    },
    
    // YENİ AKIŞ FONKSİYONLARI
    startStream: (gcodeContent) => {
        if (!currentPort || !currentPort.isOpen) {
            console.error("[Node.js Serial] HATA: startStream çalıştı, ancak port kapalı!");
            throw new Error("Seri porta bağlı değil.");
        }
        if (isStreamingActive) {
            throw new Error("Akış zaten devam ediyor.");
        }
        
        gcodeLines = gcodeContent.split('\n');
        totalLines = gcodeLines.length;
        currentLineIndex = 0;
        isStreamingActive = true;
        isPaused = false;

        setupDataListener(); 

        console.log(`[Node.js Serial] Akış Başlatıldı. Toplam satır: ${totalLines}`);
        
        sendNextLine();
        
        return true;
    },

    stopStream: () => {
        isStreamingActive = false;
        isPaused = false;
        console.log('[Node.js Serial] Akış Durduruldu.');
        return true;
    },
};

module.exports = serialAdapter;