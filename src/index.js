// src/index.js
import { h, render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import ConnectModal from './ConnectModal';
import MoveControl from './MoveControl'; 
import StreamManager from './StreamManager'; 
import GCodeEditor from './GCodeEditor'; 
import GCodePreview3D from './GCodePreview3D'; // 3D alanı bu düzenlemede şimdilik kaldırıldı/yer değiştirildi

// Tema Renkleri
const COLOR_PRIMARY_BG = '#2c3e50'; 
const COLOR_PANEL_BG = '#3a4d61'; 
const COLOR_LIGHT_TEXT = '#ecf0f1';
const COLOR_SECONDARY_TEXT = '#bdc3c7'; 
const COLOR_INPUT_BG = '#2c3e50'; 

// Global stil iyileştirmesi
const globalStyle = { 
    body: {
        margin: 0,
        padding: 0,
        fontFamily: 'Arial, sans-serif',
        // KRİTİK: Gradyan Arkaplan
        background: `linear-gradient(135deg, ${COLOR_PRIMARY_BG} 0%, #40506e 100%)`, 
        color: COLOR_LIGHT_TEXT,
        height: '100vh',
        overflow: 'hidden'
    },
    '#app': {
        height: '100%',
    },
    // Tüm paneller için ortak stil
    panel: {
        backgroundColor: COLOR_PANEL_BG, 
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
        padding: '15px',
        color: COLOR_LIGHT_TEXT,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
    }
};

if (typeof document !== 'undefined') {
    Object.keys(globalStyle).forEach(selector => {
        if (selector === 'body') {
            Object.assign(document.body.style, globalStyle.body);
        } else if (selector === '#app') {
            const app = document.getElementById('app');
            if(app) Object.assign(app.style, globalStyle['#app']);
        }
    });
}


const App = () => {
    // ... (State Tanımlamaları ve Bağlantı Mantıkları Aynı Kalır)
    const [isConnected, setIsConnected] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState([]);
    const [connectionInfo, setConnectionInfo] = useState({ portPath: 'Bilinmiyor', baudRate: 'Bilinmiyor' }); 
    const [gcodeContent, setGcodeContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false); 
    const [currentLine, setCurrentLine] = useState(0); 

    const logMessage = useCallback((message) => {
        setConsoleOutput(prev => [...prev.slice(-199), message]);
    }, []);

    const handleConnect = (info) => {
        setConnectionInfo(info);
        setIsConnected(true);
        // ... (Diğer Bağlantı Mantıkları)
        if (window.electronAPI && window.electronAPI.onData) {
            window.electronAPI.onData(logMessage);
        }
        if (window.electronAPI && window.electronAPI.onProgress) {
             window.electronAPI.onProgress(setCurrentLine); 
        }
    }
    
    const handleDisconnect = async () => {
        // ... (Aynı Kalır)
        if (!window.electronAPI || !window.electronAPI.disconnectSerial) {
             logMessage('[HATA] Bağlantı kesme API\'ı eksik.');
             return;
        }
        try {
            if (isStreaming) {
                await window.electronAPI.stopStream();
                setIsStreaming(false);
            }
            await window.electronAPI.disconnectSerial();
            setIsConnected(false);
            setConnectionInfo({ portPath: 'Bilinmiyor', baudRate: 'Bilinmiyor' });
            setGcodeContent(''); 
            setConsoleOutput(prev => [...prev, '[Sistem] Bağlantı başarıyla kesildi.']);
        } catch (error) {
            logMessage(`[HATA] Bağlantı kesilemedi: ${error.message}`);
        }
    }


    // Terminal Bileşeni (Panel 3)
    const TerminalPanel = () => {
        const [command, setCommand] = useState('M115');
        
        const sendCommand = async () => {
            if (!window.electronAPI || !window.electronAPI.sendGcode) return;
            logMessage(`[GÖNDERİLİYOR] ${command}`);
            try {
                await window.electronAPI.sendGcode(command);
            } catch (error) {
                logMessage(`[HATA] Komut gönderilemedi: ${error.message}`);
            }
            setCommand('');
        };
        
        return (
            <div style={{ ...globalStyle.panel, padding: '10px' }}>
                <h3 style={{ margin: '0', padding: '0 0 10px 0', borderBottom: '1px solid #4a637d', fontWeight: '500', fontSize: '16px' }}>_Terminal</h3>
                
                <div style={{ flexGrow: 1, overflowY: 'scroll', padding: '5px', marginBottom: '10px', fontSize: '12px', whiteSpace: 'pre-wrap', backgroundColor: globalStyle.INPUT_BG, borderRadius: '4px' }}>
                    {consoleOutput.map((line, i) => <div key={i}>{line}</div>)}
                </div>

                <div style={{ display: 'flex', marginTop: 'auto' }}>
                    <input 
                        type="text" 
                        value={command} 
                        onInput={(e) => setCommand(e.target.value)} 
                        onKeyDown={(e) => { if (e.key === 'Enter') sendCommand(); }}
                        placeholder="Enter command" 
                        disabled={isStreaming}
                        style={{ flex: 1, padding: '8px', border: '1px solid #4a637d', borderRadius: '4px', backgroundColor: globalStyle.LIGHT_TEXT, color: '#333' }}
                    />
                    <button onClick={sendCommand} disabled={isStreaming} style={{ padding: '8px 15px', marginLeft: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Gönder</button>
                </div>
            </div>
        );
    };

    // Prepare Panel Yer Tutucu (Panel 4 Alt Kısım)
    const PreparePanel = () => (
         <div style={{ ...globalStyle.panel, padding: '15px' }}>
             <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #4a637d', paddingBottom: '10px', fontWeight: '500' }}>Prepare For Printing</h3>
             {/* İçerik akışı kilit alanları (Görseldeki gibi) */}
             <div style={{ padding: '10px', backgroundColor: globalStyle.INPUT_BG, borderRadius: '4px', color: globalStyle.SECONDARY_TEXT, fontSize: '14px' }}>
                 <p style={{ margin: 0 }}>MIXE RATIO</p>
                 <p style={{ margin: '5px 0 0 0' }}>RAM EXTRUDER (DEPO-ÇAMUR HAZNESİ)</p>
                 <p style={{ margin: '5px 0 0 0' }}>CLAY EXTRUDER (KİL EKSTRUDER-BASKI KAFASI)</p>
             </div>
         </div>
    );
    
    // Ana Panel Yapısı (Görseldeki 4 Eşit Sütunlu Düzen)
    const ControlPanel = () => {
        const totalLines = gcodeContent ? gcodeContent.split('\n').length : 0;
        const currentProgress = isStreaming && totalLines > 0 ? Math.floor((currentLine / totalLines) * 100) : 0;
        
        return (
            <div style={{ padding: '15px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                
                {/* HEADER (Üst Menü Çubuğu) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #34495e' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h1 style={{ margin: '0 20px 0 0', fontSize: '24px', color: globalStyle.LIGHT_TEXT }}>ROOTCLAY CONTROLLER</h1>
                        <button style={{ padding: '8px 15px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Emergency Stop</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: globalStyle.SECONDARY_TEXT }}>
                        <p style={{ margin: '0 20px 0 0' }}>Port: {connectionInfo.portPath}</p>
                        <button 
                            onClick={handleDisconnect} 
                            disabled={!isConnected}
                            style={{ padding: '8px 15px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                        >
                            Bağlantıyı Kes
                        </button>
                    </div>
                </div>

                {/* MAIN CONTENT (4 Eşit Dikey Panel) */}
                <div style={{ flexGrow: 1, display: 'flex', gap: '15px', minHeight: '0' }}>
                    
                    {/* PANEL 1: FILES (Görseldeki gibi) */}
                    <div style={{ flex: 1, ...globalStyle.panel }}>
                        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #4a637d', paddingBottom: '10px', fontWeight: '500' }}>_Files</h3>
                        <StreamManager 
                            onMessage={logMessage} 
                            onGcodeLoaded={setGcodeContent} 
                            gcodeContent={gcodeContent}
                            isStreaming={isStreaming}
                            setIsStreaming={setIsStreaming}
                            currentProgress={currentProgress}
                            currentLine={currentLine}
                        />
                         {/* GCode Editörü (Liste Görünümü) */}
                        <div style={{ flexGrow: 1, marginTop: '10px', minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ margin: '5px 0', fontSize: '14px', color: globalStyle.SECONDARY_TEXT }}>G-code İçeriği (Satır: {totalLines})</h4>
                            <GCodeEditor 
                                content={gcodeContent}
                                onContentChange={setGcodeContent}
                                startLine={currentLine}
                                totalLines={totalLines}
                                isStreaming={isStreaming}
                            />
                        </div>
                    </div>

                    {/* PANEL 2: TUNE & MOVE (Görseldeki gibi) */}
                    <div style={{ flex: 1, ...globalStyle.panel }}>
                        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #4a637d', paddingBottom: '10px', fontWeight: '500' }}>_TUNE & MOVE</h3>
                        <MoveControl onMessage={logMessage} />
                    </div>
                    
                    {/* PANEL 3: TERMINAL (Görseldeki gibi) */}
                    <div style={{ flex: 1, minHeight: '30%' }}>
                        <TerminalPanel />
                    </div>

                    {/* PANEL 4: PREPARE FOR PRINTING (Görseldeki gibi) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* Üst Kısım Prepare */}
                        <div style={{ flex: 1 }}>
                            <PreparePanel />
                        </div>
                        
                         {/* Alt Kısım 3D Preview (Bu görselde 3D alt kısımdadır, o yüzden buraya yerleştirildi) */}
                        <div style={{ flex: 1, ...globalStyle.panel }}>
                            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #4a637d', paddingBottom: '10px', fontWeight: '500' }}>3D Preview</h3>
                            <GCodePreview3D gcodeContent={gcodeContent} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (!isConnected) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: globalStyle.MAIN_BG }}>
                <ConnectModal onConnect={handleConnect} />
            </div>
        );
    }

    return <ControlPanel />;
};

render(<App />, document.getElementById('app'));