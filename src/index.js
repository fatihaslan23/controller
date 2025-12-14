// src/index.js
import { h, render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import ConnectModal from './ConnectModal';
import MoveControl from './MoveControl'; 
import StreamManager from './StreamManager'; 

const App = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState([]);
    // BAŞLANGIÇ STATE'İ: Her zaman string içerecek şekilde ayarlandı
    const [connectionInfo, setConnectionInfo] = useState({ portPath: 'Bilinmiyor', baudRate: 'Bilinmiyor' }); 

    const logMessage = useCallback((message) => {
        setConsoleOutput(prev => [...prev, message]);
    }, []);

    // Bağlantı başarılı olduğunda tetiklenir
    const handleConnect = (info) => {
        // INFO'nun { portPath: "COM4", baudRate: "115200" } formatında olduğu varsayılıyor
        setConnectionInfo(info);
        setIsConnected(true);
        
        if (window.electronAPI && window.electronAPI.onData) {
            window.electronAPI.onData(logMessage);
        }
    }
    
    // Terminal Bileşeni
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
            <div style={{ flex: 1, minWidth: '300px', margin: '5px', padding: '10px', border: '1px solid #ccc' }}>
                <h3>Terminal</h3>
                <div style={{ height: '300px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', marginBottom: '10px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                    {consoleOutput.map((line, i) => <div key={i}>{line}</div>)}
                </div>
                <input 
                    type="text" 
                    value={command} 
                    onInput={(e) => setCommand(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') sendCommand(); }}
                    placeholder="Enter command (Örn: M115)" 
                    style={{ width: 'calc(100% - 70px)', padding: '5px' }}
                />
                <button onClick={sendCommand} style={{ width: '60px', padding: '5px', marginLeft: '5px' }}>Send</button>
            </div>
        );
    };

    // Ana Panel Yapısı
    const ControlPanel = () => (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>RootClay Controller</h1>
            <p>Bağlı Port: <strong>{connectionInfo.portPath}</strong> / {connectionInfo.baudRate}</p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                
                <div style={{ flex: 1, minWidth: '350px' }}>
                    <h3>Files & Streaming</h3>
                    <StreamManager onMessage={logMessage} />
                </div>

                <div style={{ flex: 1, minWidth: '350px' }}>
                    <MoveControl onMessage={logMessage} />
                </div>

                <TerminalPanel />
            </div>
        </div>
    );

    if (!isConnected) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f4f4' }}>
                <ConnectModal onConnect={handleConnect} />
            </div>
        );
    }

    return <ControlPanel />;
};

render(<App />, document.getElementById('app'));