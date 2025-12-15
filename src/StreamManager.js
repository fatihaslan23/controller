// src/StreamManager.js
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks'; 

const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

const uploadAreaStyle = {
    position: 'relative',
    backgroundColor: '#007aff',
    borderRadius: '8px',
    color: 'white',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,122,255,0.3)',
    transition: 'transform 0.1s',
    overflow: 'hidden'
};

const printBtnStyle = {
    padding: '0 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.2s'
};

const StreamManager = ({ onMessage, onGcodeLoaded, gcodeContent, isStreaming, setIsStreaming }) => {
    const [fileName, setFileName] = useState('');
    const [inputKey, setInputKey] = useState(0);

    // ... (useEffect: onStreamComplete aynı kalabilir) ...
    // KOD TEKRARINI ÖNLEMEK İÇİN SADECE RENDER KISMINI DEĞİŞTİRİYORUZ
    // handleFileChange fonksiyonunu mevcut dosyandan aynen alabilirsin.

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFileName(selectedFile.name);
        try {
            const content = await readFileAsText(selectedFile);
            onGcodeLoaded(content);
            onMessage(`Dosya yüklendi: ${selectedFile.name}`);
        } catch(e) { console.error(e); }
        setInputKey(k => k + 1);
    };

    const handleStart = async () => {
        if(!gcodeContent) return alert("Dosya yok!");
        await window.electronAPI.startStream(gcodeContent);
        setIsStreaming(true);
    };

    const handleStop = async () => {
        await window.electronAPI.stopStream();
        setIsStreaming(false);
    };

    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', height: '48px' }}>
            <div style={uploadAreaStyle}>
                <input 
                    key={inputKey} type="file" accept=".gcode,.gco" 
                    onChange={handleFileChange} disabled={isStreaming}
                    style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    OPEN G-CODE
                </span>
            </div>
            
            {isStreaming ? (
                <button onClick={handleStop} style={{ ...printBtnStyle, backgroundColor: '#ff3b30', color: 'white' }}>
                    STOP
                </button>
            ) : (
                <button onClick={handleStart} disabled={!gcodeContent} 
                    style={{ ...printBtnStyle, backgroundColor: gcodeContent ? '#34c759' : '#e5e5ea', color: gcodeContent ? 'white' : '#aeaeb2', cursor: gcodeContent ? 'pointer' : 'not-allowed' }}>
                    PRINT
                </button>
            )}
        </div>
        
        {/* Dosya ismi gösterimi biraz daha modern olsun */}
        {fileName && (
            <div style={{ padding: '10px 12px', backgroundColor: '#fff', border: '1px solid #e5e5ea', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ width: '32px', height: '32px', backgroundColor: '#f2f2f7', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📄</div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1c1c1e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
                    <span style={{ fontSize: '11px', color: '#8e8e93' }}>Ready to print</span>
                </div>
            </div>
        )}
    </div>
);
};

export default StreamManager;

