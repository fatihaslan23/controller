// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,

    // Serial Port Fonksiyonları (Renderer'dan Main'e)
    listPorts: () => ipcRenderer.invoke('serial:listPorts'),
    connectSerial: (portPath, baudRate) => ipcRenderer.invoke('serial:connect', portPath, baudRate),
    sendGcode: (data) => ipcRenderer.invoke('serial:sendGcode', data),
    
    // Akış Başlatma/Durdurma
    startStream: (gcodeContent) => ipcRenderer.invoke('serial:startStream', gcodeContent),
    stopStream: () => ipcRenderer.invoke('serial:stopStream'),

    // 4. Veri Alma Olayı (Main'den Renderer'a)
    onData: (callback) => {
        ipcRenderer.on('serial:data', (event, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('serial:data');
    },

    // 5. Akış Durumu Olayları
    onProgress: (callback) => {
        ipcRenderer.on('stream:progress', (event, progress) => callback(progress));
        return () => ipcRenderer.removeAllListeners('stream:progress');
    },
    onStreamComplete: (callback) => {
        ipcRenderer.on('stream:completed', () => callback());
        return () => ipcRenderer.removeAllListeners('stream:completed');
    },
});