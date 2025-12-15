// electron/SerialAdapter.js
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { BrowserWindow } = require('electron');
const fs = require('fs');
const readline = require('readline');

let currentPort = null;
let parser = null;

// --- AKIŞ KONTROL DEĞİŞKENLERİ ---
let isStreamingActive = false;
let isPaused = false;
let fileStream = null;      // Dosya okuma akışı
let lineReader = null;      // Satır okuyucu arayüzü
let lineIterator = null;    // Satırları tek tek çekmek için
let currentLineCount = 0;   // Gönderilen satır sayısı
let totalLinesInFile = 0;   // Toplam satır sayısı

// UI Penceresini Bulma
const getMainWindow = () => {
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
        return global.mainWindow;
    }
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) return wins[0];
    return null;
};

// UI'ya Veri Gönderme
const sendToUI = (channel, data) => {
    const win = getMainWindow();
    if (win) {
        win.webContents.send(channel, data);
    }
};

// --- Yardımcı: Toplam Satır Sayısını Hızlıca Bul (Progress Bar İçin) ---
const countFileLines = async (filePath) => {
    return new Promise((resolve, reject) => {
        let lineCount = 0;
        const stream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
        rl.on('line', () => { lineCount++; });
        rl.on('close', () => { resolve(lineCount); });
        rl.on('error', (err) => { reject(err); });
    });
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

    // UI İçin Dosya Önizleme (TÜM DOSYAYI OKUR - SINIRSIZ)
    async getGcodePreview(filePath) {
        return new Promise((resolve, reject) => {
            // fs.readFile tüm dosyayı bir kerede okur. Büyük dosyalar için bellek tüketir ama istenilen budur.
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },

    // BAĞLANTI FONKSİYONU
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
                rtscts: false,
                dtr: true,
                rts: true
            });

            // Parser Kurulumu
            parser = currentPort.pipe(new ReadlineParser({ delimiter: '\n' }));

            parser.on('data', (data) => {
                const line = data.trim();
                
                // Akış Mantığı (Ping-Pong)
                if (isStreamingActive && !isPaused) {
                    // "ok" yanıtını daha sıkı kontrol et (Regex)
                    if (/^ok\b/.test(line)) { 
                        serialAdapter.processNextLine();
                    } else if (line.toLowerCase().includes('error')) {
                        console.error('[YAZICI HATA]', line);
                        sendToUI('serial:data', `[KRİTİK HATA] ${line}`);
                    }
                } else {
                    sendToUI('serial:data', line);
                }
            });

            currentPort.open((err) => {
                if (err) {
                    console.error('[HATA] Açılış hatası:', err.message);
                    sendToUI('serial:data', `[HATA] ${err.message}`);
                    return reject(err);
                }
                console.log('[BAĞLANTI] Başarılı.');
                sendToUI('serial:data', `[Sistem] Bağlantı kuruldu: ${portPath}`);
                
                setTimeout(() => {
                    if (currentPort && currentPort.isOpen) currentPort.write('\n');
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
        sendToUI('serial:data', `> ${data}`);
        currentPort.write(data + '\n');
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

    // --- AKIŞ MANTIĞI (STREAMING) ---
    async startStream(filePath) {
        if (!currentPort || !currentPort.isOpen) throw new Error("Port kapalı. Lütfen önce bağlanın.");

        try {
            sendToUI('serial:data', '[Sistem] Dosya analiz ediliyor...');
            
            totalLinesInFile = await countFileLines(filePath);
            sendToUI('serial:data', `[Sistem] Analiz tamam. Toplam ${totalLinesInFile} satır basılacak.`);

            fileStream = fs.createReadStream(filePath);
            lineReader = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            lineIterator = lineReader[Symbol.asyncIterator]();
            
            isStreamingActive = true;
            isPaused = false;
            currentLineCount = 0;

            console.log(`[AKIŞ] Başlatıldı: ${filePath}`);
            sendToUI('serial:data', `[Sistem] Baskı başlatılıyor...`);
            
            await this.processNextLine();
            return true;
        } catch (error) {
            console.error('Akış başlatma hatası:', error);
            sendToUI('serial:data', `[Sistem Hata] ${error.message}`);
            throw error;
        }
    },

    async processNextLine() {
        if (!isStreamingActive || isPaused) return;

        const result = await lineIterator.next();

        if (result.done) {
            this.finishStream();
            return;
        }

        let line = result.value.trim();
        currentLineCount++;

        if (line.length === 0 || line.startsWith(';')) {
            return this.processNextLine();
        }

        const commentIndex = line.indexOf(';');
        if (commentIndex !== -1) {
            line = line.substring(0, commentIndex).trim();
        }

        if (currentPort && currentPort.isOpen) {
            currentPort.write(line + '\n');
            if (totalLinesInFile > 0 && currentLineCount % 10 === 0) {
                const progress = Math.floor((currentLineCount / totalLinesInFile) * 100);
                sendToUI('stream:progress', progress);
            }
        } else {
            this.stopStream();
        }
    },

    finishStream() {
        console.log('[AKIŞ] Bitti.');
        isStreamingActive = false;
        sendToUI('serial:data', '[Sistem] Baskı Başarıyla Tamamlandı.');
        sendToUI('stream:completed');
        this.cleanupStreams();
    },

    stopStream() {
        if (!isStreamingActive) return;
        isStreamingActive = false;
        console.log('[AKIŞ] Durduruldu.');
        sendToUI('serial:data', `[Sistem] Baskı durduruldu.`);
        this.cleanupStreams();
        return true;
    },

    cleanupStreams() {
        if (lineReader) lineReader.close();
        if (fileStream) fileStream.destroy();
        lineIterator = null;
        lineReader = null;
        fileStream = null;
    }
};

module.exports = serialAdapter;