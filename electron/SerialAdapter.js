// electron/SerialAdapter.js (DEBUG MODU)
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { BrowserWindow } = require('electron'); 

let currentPort = null;
let parser = null;

// State Değişkenleri
let gcodeLines = []; 
let totalLines = 0;
let currentLineIndex = 0;
let isStreamingActive = false;
let isPaused = false;

// UI Penceresini Bulma (Gelişmiş)
const getMainWindow = () => {
    // 1. Global değişkeni kontrol et
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        return global.mainWindow;
    }
    // 2. Açık pencereleri tara
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) return wins[0];
    
    console.error('[FATAL] Arayüz penceresi bulunamadı! Veri gönderilemiyor.');
    return null;
};

// UI'ya Veri Gönderme
const sendToUI = (channel, data) => {
    const win = getMainWindow();
    if (win) {
        win.webContents.send(channel, data);
    }
};

// --- G-Code Akış Mantığı ---
const sendProgress = () => {
    if (!totalLines) return;
    const progress = Math.floor((currentLineIndex / totalLines) * 100);
    sendToUI('stream:progress', progress);
};

const sendNextLine = () => {
    if (!isStreamingActive || isPaused || !currentPort || !currentPort.isOpen) {
        if (currentLineIndex >= totalLines && isStreamingActive) {
            console.log('[AKIŞ] Tamamlandı.');
            sendToUI('serial:data', '[Sistem] Baskı Tamamlandı.');
            isStreamingActive = false;
            currentLineIndex = 0;
            sendToUI('stream:completed');
        }
        return;
    }
    
    if (currentLineIndex >= totalLines) {
        isStreamingActive = false;
        sendToUI('stream:completed');
        return;
    }

    let line = gcodeLines[currentLineIndex].trim();
    while ((line.length === 0 || line.startsWith(';')) && currentLineIndex < totalLines - 1) {
        currentLineIndex++;
        line = gcodeLines[currentLineIndex].trim();
    }

    // Komutu gönder (Ekrana yazmaya gerek yok, zaten Raw Spy yazacak)
    currentPort.write(line + '\n');
};

const serialAdapter = {
    async listPorts() {
        try {
            return await SerialPort.list();
        } catch (error) {
            console.error('[HATA] Port listeleme:', error);
            return [];
        }
    },

    async connect(portPath, baudRate) {
        if (currentPort && currentPort.isOpen) {
            await serialAdapter.disconnect();
        }

        console.log(`[BAĞLANTI] ${portPath} @ ${baudRate} başlatılıyor...`);

        return new Promise((resolve, reject) => {
            currentPort = new SerialPort({
                path: portPath,
                baudRate: parseInt(baudRate),
                autoOpen: false,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                rtscts: false, // Yeni ekle
                dtr: true,     // KRİTİK: Bazı kartların uyanması için şart
                rts: true      // KRİTİK: Bazı kartlar için şart
            });

            // 1. RAW SPY (HAM VERİ AJANI) - SORUNU BU BULACAK
            // Parser'dan bağımsız olarak kablodan ne gelirse buraya düşer.
            currentPort.on('data', (chunk) => {
                // Buffer'ı string'e çevir ve görünmez karakterleri görünür yap
                const rawStr = chunk.toString();
                const debugStr = rawStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                
                console.log(`[RAW RX] Gelen Ham Veri: "${debugStr}"`); // VS Code Terminaline Yazar
            });

            // 2. PARSER KURULUMU (GÜVENLİ LİMAN)
            // Çoğu yazıcı \n kullanır. Marlin bazen \r\n gönderir.
            parser = currentPort.pipe(new ReadlineParser({ delimiter: '\n' }));

            parser.on('data', (data) => {
                const line = data.trim();
                console.log(`[PARSER] İşlenen Satır: "${line}"`); // VS Code Terminaline Yazar
                
                // UI'ya gönder
                sendToUI('serial:data', line);

                // Akış kontrolü (ok yanıtı)
                if (isStreamingActive && !isPaused) {
                    if (line.startsWith('ok') || line.includes('ok')) {
                        currentLineIndex++;
                        sendProgress();
                        sendNextLine();
                    } else if (line.toLowerCase().includes('error')) {
                        console.error('[YAZICI HATA]', line);
                    }
                }
            });

            currentPort.open((err) => {
                if (err) {
                    console.error('[HATA] Açılış hatası:', err.message);
                    sendToUI('serial:data', `[HATA] ${err.message}`);
                    return reject(err);
                }

                currentPort.on('error', (err) => {
                    console.error('[PORT HATA]', err.message);
                    sendToUI('serial:data', `[PORT HATA] ${err.message}`);
                });

                console.log('[BAĞLANTI] Başarılı.');
                sendToUI('serial:data', `[Sistem] Bağlantı kuruldu: ${portPath}`);
                
                // Cihazı dürtmek için boş komut
                setTimeout(() => {
                    if (currentPort && currentPort.isOpen) {
                        console.log('[BAĞLANTI] Uyandırma sinyali gönderiliyor...');
                        currentPort.write('\n');
                    }
                }, 1000);

                resolve(true);
            });
        });
    },

    async sendData(data) {
        if (!currentPort || !currentPort.isOpen) {
            sendToUI('serial:data', '[HATA] Port kapalı.');
            throw new Error("Port kapalı");
        }
        
        console.log(`[TX] Gönderiliyor: ${data}`); // Backend Log
        sendToUI('serial:data', `> ${data}`);      // UI Log (Kullanıcı görsün)
        
        currentPort.write(data + '\n', (err) => {
            if (err) console.error('[TX HATA]', err.message);
        });
    },

    async disconnect() {
        if (currentPort && currentPort.isOpen) {
            return new Promise((resolve) => {
                currentPort.close(() => {
                    console.log('[BAĞLANTI] Kapatıldı.');
                    currentPort = null;
                    parser = null;
                    resolve();
                });
            });
        }
    },

    startStream(gcodeContent) {
        if (!currentPort || !currentPort.isOpen) throw new Error("Port kapalı");
        gcodeLines = gcodeContent.split('\n');
        totalLines = gcodeLines.length;
        currentLineIndex = 0;
        isStreamingActive = true;
        isPaused = false;
        
        console.log(`[AKIŞ] Başlatıldı. Toplam: ${totalLines}`);
        sendToUI('serial:data', `[Sistem] Baskı başlatıldı.`);
        sendNextLine();
        return true;
    },

    stopStream() {
        isStreamingActive = false;
        console.log('[AKIŞ] Durduruldu.');
        sendToUI('serial:data', `[Sistem] Baskı durduruldu.`);
        return true;
    }
};

module.exports = serialAdapter;