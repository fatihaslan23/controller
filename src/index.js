// src/index.js
import { h, render } from 'preact';
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import ConnectModal from './ConnectModal'; 
import MoveControl from './MoveControl';
import StreamManager from './StreamManager';
import GCodeEditor from './GCodeEditor';
import PreparePanel from './PreparePanel';
import GCodeViewer3D from './GCodeViewer3D';

const THEME = {
    HEADER_BG: 'linear-gradient(90deg, #4e54c8 0%, #8f94fb 100%)',
    BODY_BG: '#f0f2f5',
    PANEL_BG: 'rgba(255, 255, 255, 0.85)',
    TEXT_MAIN: '#1a1a1a', 
    BORDER_RADIUS: '12px',
    SHADOW: '0 4px 24px rgba(0,0,0,0.06)'
};

const globalStyle = {
    body: {
        margin: 0, padding: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: THEME.BODY_BG, color: THEME.TEXT_MAIN,
        height: '100vh', overflow: 'hidden', backdropFilter: 'blur(20px)',
    },
    '#app': { height: '100%' },
    // PANEL STİLİ: Beyaz kutu, gölgeli, köşeleri yuvarlak
    panel: {
        backgroundColor: '#ffffff', 
        borderRadius: THEME.BORDER_RADIUS, 
        boxShadow: THEME.SHADOW,
        height: '100%', 
        boxSizing: 'border-box', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden', 
        border: '1px solid rgba(0,0,0,0.05)',
        minHeight: 0, 
        minWidth: 0
    },
    // PANEL BAŞLIĞI: Gri şerit, içindeki elemanları (Başlık ve Tablar) hizalar
    panelHeader: {
        padding: '0 20px', // Yüksekliği height ile vereceğiz
        height: '50px',
        borderBottom: '1px solid rgba(0,0,0,0.08)', 
        fontSize: '14px', 
        fontWeight: '700',
        color: '#1c1c1e', 
        backgroundColor: '#f9f9f9', // Hafif gri
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexShrink: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    }
};

if (typeof document !== 'undefined') Object.assign(document.body.style, globalStyle.body);

// --- LOADING OVERLAY ---
const LoadingOverlay = () => (
    <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#333'
    }}>
        <div style={{
            width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #007aff',
            borderRadius: '50%', animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ marginTop: '20px', fontWeight: '700', fontSize: '18px', color: '#007aff' }}>Yükleniyor...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
);

// --- TERMINAL PANELİ (Header Dahil) ---
const TerminalPanel = ({ logs, onSendCommand }) => {
    const [command, setCommand] = useState('');
    const logsEndRef = useRef(null);
    useEffect(() => { if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
    const handleSend = () => { if (!command.trim()) return; onSendCommand(command); setCommand(''); };
    return (
        <div style={globalStyle.panel}>
            <div style={globalStyle.panelHeader}>
                <span>TERMINAL</span>
                <span style={{fontSize:'10px', color:'#999', textTransform:'none'}}>Serial Monitor</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative', backgroundColor: '#1e1e1e', color: '#00ff00' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflowY: 'auto', padding: '12px', fontSize: '12px', fontFamily: "'Menlo', monospace" }}>
                    {logs.map((line, i) => ( 
                        <div key={i} style={{ 
                            borderBottom: '1px solid #333', padding: '2px 0', whiteSpace: 'pre-wrap', 
                            color: line.startsWith('>') ? '#007aff' : (line.includes('error') ? '#ff3b30' : '#d4d4d4') 
                        }}>
                            {line}
                        </div> 
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
            <div style={{ padding: '10px', borderTop: '1px solid #ddd', display: 'flex', backgroundColor: '#fff', flexShrink: 0 }}>
                <input type="text" value={command} onInput={e => setCommand(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Komut gönder (Örn: G28)..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', outline: 'none', backgroundColor:'#f2f2f7' }} />
                <button onClick={handleSend} style={{ marginLeft: '10px', padding: '0 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>SEND</button>
            </div>
        </div>
    );
};

// --- ANA UYGULAMA ---
const App = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState([]);
    const [connectionInfo, setConnectionInfo] = useState({ portPath: '', baudRate: '', type: 'USB', targetUrl: '' });
    const [gcodeContent, setGcodeContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentLine, setCurrentLine] = useState(0);
    const [activeTab, setActiveTab] = useState('EDITOR'); 
    const [isLoading, setIsLoading] = useState(false);
    const webviewRef = useRef(null);

    const logMessage = useCallback((msg) => {
        if (!msg) return;
        setConsoleOutput(prev => [...prev.slice(-499), msg]);
    }, []);

    const handleConnect = (info) => {
        setConnectionInfo(info);
        setIsConnected(true);
    };

    const handleDisconnect = async () => {
        try {
            if (connectionInfo.type === 'USB' && window.electronAPI) {
                await window.electronAPI.disconnectSerial();
            }
            setIsConnected(false);
            setConnectionInfo({ portPath: '', baudRate: '', type: 'USB', targetUrl: '' });
            setConsoleOutput([]);
            setGcodeContent(''); 
            setCurrentLine(0);
            setIsStreaming(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRefresh = () => {
        if (webviewRef.current) webviewRef.current.reload();
    };

    useEffect(() => {
        if (isConnected && window.electronAPI) {
            const removeData = window.electronAPI.onData((data) => logMessage(data.toString()));
            const removeProgress = window.electronAPI.onProgress(setCurrentLine);
            return () => { if(removeData) removeData(); if(removeProgress) removeProgress(); };
        }
    }, [isConnected, logMessage]);

    const sendGcodeCommand = (cmd) => {
        if (window.electronAPI) window.electronAPI.sendGcode(cmd);
    };

    if (!isConnected) return <ConnectModal onConnect={handleConnect} />;

    const totalLines = gcodeContent ? gcodeContent.split('\n').length : 0;
    const currentProgress = totalLines > 0 ? Math.floor((currentLine / totalLines) * 100) : 0;

    // TAB BUTON STİLİ (Header içinde duran hap şeklindeki butonlar)
    const tabBtnStyle = (isActive) => ({
        padding: '6px 16px', 
        cursor: 'pointer', 
        fontWeight: '600', 
        fontSize: '12px', 
        border: 'none',
        backgroundColor: isActive ? '#007aff' : 'transparent', 
        color: isActive ? '#fff' : '#666',
        borderRadius: '6px', 
        marginLeft: '4px', 
        transition: 'all 0.2s'
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {isLoading && <LoadingOverlay />}

            {/* HEADER */}
            <div style={{ background: THEME.HEADER_BG, padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', flexShrink: 0, height: '60px', boxSizing: 'border-box' }}>
                <div style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing:'1px' }}>ROOTCLAY <span style={{ opacity: 0.7, fontSize:'14px', fontWeight:'400' }}>CONTROLLER</span></div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight:'500', marginRight: '10px', backgroundColor:'rgba(255,255,255,0.2)', padding:'5px 10px', borderRadius:'6px' }}>
                        {connectionInfo.type === 'WIFI' ? `WiFi: ${connectionInfo.portPath}` : connectionInfo.portPath}
                    </span>
                    {connectionInfo.type === 'WIFI' && (
                        <button onClick={handleRefresh} style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}> 🔄 YENİLE </button>
                    )}
                    <button onClick={handleDisconnect} style={{ backgroundColor: '#ff3b30', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>DISCONNECT</button>
                </div>
            </div>

            {/* İÇERİK ALANI */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                
                {connectionInfo.type === 'WIFI' ? (
                    // --- WI-FI MODU ---
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff', position: 'relative' }}>
                        <webview ref={webviewRef} src={connectionInfo.targetUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowpopups="true" onDidFailLoad={(e) => console.error("Webview Load Error:", e)}></webview>
                    </div>
                ) : (
                    // --- USB MODU (Panel Düzeni Eski Haline Getirildi) ---
                    <div style={{ flex: 1, padding: '20px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 0.8fr', gridTemplateRows: 'minmax(0, 1fr)', gap: '20px', minHeight: 0, backgroundColor: '#f0f2f5', overflow: 'hidden' }}>
                        
                        {/* PANEL 1: FILES & VIEWER */}
                        <div style={globalStyle.panel}>
                            {/* Header İÇİNE Tabları koyduk */}
                            <div style={globalStyle.panelHeader}>
                                <span>FILES</span>
                                <div style={{ display: 'flex', backgroundColor: '#e5e5ea', padding: '3px', borderRadius: '8px' }}>
                                    <button onClick={() => setActiveTab('EDITOR')} style={tabBtnStyle(activeTab === 'EDITOR')}>G-Code</button>
                                    <button onClick={() => setActiveTab('VIEWER')} style={tabBtnStyle(activeTab === 'VIEWER')}>3D View</button>
                                </div>
                            </div>

                            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '15px', gap: '15px', overflow: 'hidden' }}>
                                {/* Dosya Yükleme (Üstte) */}
                                <div style={{ flexShrink: 0 }}>
                                    <StreamManager 
                                        onMessage={logMessage} onGcodeLoaded={setGcodeContent} 
                                        gcodeContent={gcodeContent} isStreaming={isStreaming} 
                                        setIsStreaming={setIsStreaming} currentProgress={currentProgress} currentLine={currentLine}
                                        setIsLoading={setIsLoading} 
                                    />
                                </div>
                                
                                {/* Editör/Viewer (Altta Kalan Alanı Doldurur) */}
                                <div style={{ flex: 1, minHeight: 0, border: '1px solid #e5e5ea', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1e1e1e', position: 'relative' }}>
                                    <div style={{ width: '100%', height: '100%', display: activeTab === 'EDITOR' ? 'block' : 'none' }}>
                                        <GCodeEditor content={gcodeContent} startLine={currentLine} totalLines={totalLines} isStreaming={isStreaming} />
                                    </div>
                                    <div style={{ width: '100%', height: '100%', display: activeTab === 'VIEWER' ? 'block' : 'none' }}>
                                        <GCodeViewer3D gcodeContent={gcodeContent} isActive={activeTab === 'VIEWER'} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PANEL 2: MOVE CONTROL */}
                        <div style={globalStyle.panel}>
                            <div style={globalStyle.panelHeader}><span>TUNE & MOVE</span></div>
                            <MoveControl onMessage={logMessage} />
                        </div>

                        {/* PANEL 3: TERMINAL */}
                        <TerminalPanel logs={consoleOutput} onSendCommand={sendGcodeCommand} />

                        {/* PANEL 4: PREPARE */}
                        <div style={globalStyle.panel}>
                            <div style={globalStyle.panelHeader}><span>PREPARE</span></div>
                            <PreparePanel onSendCommand={sendGcodeCommand} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

render(<App />, document.getElementById('app'));