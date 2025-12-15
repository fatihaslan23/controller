// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,

    // Serial Port
    listPorts: () => ipcRenderer.invoke('serial:listPorts'),
    connectSerial: (portPath, baudRate) => ipcRenderer.invoke('serial:connect', portPath, baudRate),
    sendGcode: (data) => ipcRenderer.invoke('serial:sendGcode', data),
    disconnectSerial: () => ipcRenderer.invoke('serial:disconnect'),
    startStream: (filePath) => ipcRenderer.invoke('serial:startStream', filePath),
    stopStream: () => ipcRenderer.invoke('serial:stopStream'),
    readGcodePreview: (filePath) => ipcRenderer.invoke('serial:getGcodePreview', filePath),

    // --- WI-FI FONKSİYONLARI ---
    getWifiSSID: () => ipcRenderer.invoke('wifi:get-ssid'),
    // SSID ve Password'u obje olarak gönderiyoruz, main.js de öyle bekliyor
    connectWifi: (ssid, password) => ipcRenderer.invoke('wifi:connect', { ssid, password }), 
    loadUrl: (url) => ipcRenderer.invoke('app:load-url', url),

    // Olaylar
    onData: (callback) => {
        ipcRenderer.on('serial:data', (event, data) => callback(data));
        return () => ipcRenderer.removeAllListeners('serial:data');
    },
    onProgress: (callback) => {
        ipcRenderer.on('stream:progress', (event, progress) => callback(progress));
        return () => ipcRenderer.removeAllListeners('stream:progress');
    },
    onStreamComplete: (callback) => {
        ipcRenderer.on('stream:completed', () => callback());
        return () => ipcRenderer.removeAllListeners('stream:completed');
    },
});