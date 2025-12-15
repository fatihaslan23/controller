// src/index.js
import { h, render } from 'preact';
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import ConnectModal from './ConnectModal';
import MoveControl from './MoveControl';
import StreamManager from './StreamManager';
import GCodeEditor from './GCodeEditor';
import PreparePanel from './PreparePanel';

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
    panel: {
        backgroundColor: '#ffffff', borderRadius: THEME.BORDER_RADIUS, boxShadow: THEME.SHADOW,
        height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)',
    },
    panelHeader: {
        padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '15px', fontWeight: '700',
        color: '#1c1c1e', backgroundColor: 'rgba(255,255,255,0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }
};

if (typeof document !== 'undefined') Object.assign(document.body.style, globalStyle.body);

// --- TERMINAL PANELİ ---
const TerminalPanel = ({ logs, onSendCommand }) => {
    const [command, setCommand] = useState('');
    const logsEndRef = useRef(null);

    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleSend = () => {
        if (!command.trim()) return;
        onSendCommand(command);
        setCommand('');
    };

    return (
        <div style={globalStyle.panel}>
            <div style={globalStyle.panelHeader}><span>_ Terminal</span></div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', fontSize: '12px', fontFamily: "'Menlo', monospace", backgroundColor: '#f8f9fa' }}>
                {logs.map((line, i) => (
                    <div key={i} style={{ 
                        borderBottom: '1px solid #eee', padding: '4px 0', whiteSpace: 'pre-wrap',
                        color: line.startsWith('>') ? '#007aff' : (line.includes('error') || line.includes('Error') ? '#ff3b30' : '#333')
                    }}>
                        {line}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
            <div style={{ padding: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', backgroundColor: '#fff' }}>
                <input 
                    type="text" value={command} onInput={e => setCommand(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="G-code gönder..."
                    style={{ flex: 1, padding: '10px', border: '1px solid #e5e5ea', borderRadius: '8px', outline: 'none', backgroundColor:'#f2f2f7' }}
                />
                <button onClick={handleSend} style={{ marginLeft: '10px', padding: '0 20px', backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Send</button>
            </div>
        </div>
    );
};

// --- ANA UYGULAMA ---
const App = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState([]);
    const [connectionInfo, setConnectionInfo] = useState({ portPath: '', baudRate: '' });
    const [gcodeContent, setGcodeContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentLine, setCurrentLine] = useState(0);

    // Sadece gelen veriyi loglar
    const logMessage = useCallback((msg) => {
        if (!msg) return;
        setConsoleOutput(prev => [...prev.slice(-299), msg]);
    }, []);

    const handleConnect = (info) => {
        setConnectionInfo(info);
        setIsConnected(true);
    };

    useEffect(() => {
        if (isConnected && window.electronAPI) {
            const removeData = window.electronAPI.onData((data) => {
                if(data) logMessage(data.toString());
            });
            const removeProgress = window.electronAPI.onProgress(setCurrentLine);
            return () => { if(removeData) removeData(); if(removeProgress) removeProgress(); };
        }
    }, [isConnected, logMessage]);

    // Komutu sadece gönderir, loglamaz (Loglama işi Backend Echo ile yapılır)
    const sendGcodeCommand = (cmd) => {
        if (window.electronAPI) {
            window.electronAPI.sendGcode(cmd);
        }
    };

    if (!isConnected) return <ConnectModal onConnect={handleConnect} />;

    const totalLines = gcodeContent ? gcodeContent.split('\n').length : 0;
    const currentProgress = totalLines > 0 ? Math.floor((currentLine / totalLines) * 100) : 0;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* HEADER */}
            <div style={{ background: THEME.HEADER_BG, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '20px' }}>ROOTCLAY <span style={{ opacity: 0.8, fontSize: '12px' }}>CONTROLLER</span></div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight:'500' }}>{connectionInfo.portPath}</span>
                    <button style={{ backgroundColor: '#ff3b30', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>STOP</button>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div style={{ flex: 1, padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', minHeight: 0, backgroundColor: '#f0f2f5' }}>
                <div style={globalStyle.panel}>
                    <div style={globalStyle.panelHeader}><span>Files</span> <span style={{fontSize:'12px', color:'#007aff'}}>{currentProgress}%</span></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px', gap: '15px', overflow: 'hidden' }}>
                        <StreamManager 
                            onMessage={logMessage} onGcodeLoaded={setGcodeContent} 
                            gcodeContent={gcodeContent} isStreaming={isStreaming} 
                            setIsStreaming={setIsStreaming} currentProgress={currentProgress} currentLine={currentLine}
                        />
                        <div style={{ flex: 1, border: '1px solid #e5e5ea', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1e1e1e' }}>
                            <GCodeEditor content={gcodeContent} startLine={currentLine} totalLines={totalLines} isStreaming={isStreaming} />
                        </div>
                    </div>
                </div>

                <div style={globalStyle.panel}>
                    <div style={globalStyle.panelHeader}><span>TUNE & MOVE</span></div>
                    <MoveControl onMessage={logMessage} />
                </div>

                <TerminalPanel logs={consoleOutput} onSendCommand={sendGcodeCommand} />

                <div style={globalStyle.panel}>
                    <div style={globalStyle.panelHeader}><span>Prepare For Printing</span></div>
                    <PreparePanel onSendCommand={sendGcodeCommand} />
                </div>
            </div>
        </div>
    );
};

render(<App />, document.getElementById('app'));