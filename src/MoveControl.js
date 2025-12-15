// src/MoveControl.js
import { h } from 'preact';
import { useState } from 'preact/hooks';

// --- SABİT STİLLER ---
const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #e5e5ea',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
};

const labelStyle = {
    fontSize: '11px', fontWeight: '700', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block'
};

const inputStyle = {
    width: '80px',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #d1d1d6',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '16px',
    color: '#1c1c1e',
    backgroundColor: '#f2f2f7',
    outline: 'none',
    transition: 'all 0.2s'
};

const btnStyle = {
    border: 'none',
    borderRadius: '8px',
    padding: '0 20px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    backgroundColor: '#007aff',
    color: 'white',
    height: '42px', 
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 6px rgba(0,122,255,0.25)',
    marginLeft: '10px'
};

const actionBtn = {
    border: '1px solid #e5e5ea',
    borderRadius: '12px',
    padding: '14px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    backgroundColor: '#fff',
    color: '#1c1c1e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s',
    userSelect: 'none',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

// Alt Bileşen - Geliştirilmiş Input
const SettingRow = ({ title, value, onValueChange, onCommit }) => {
    const sliderVal = value === '' ? 100 : parseInt(value);

    // Enter tuşu ve Focus yönetimi
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onCommit(); // Değeri gönder
            e.target.select(); // Metni seçili hale getir
        }
    };

    const handleFocus = (e) => {
        e.target.style.backgroundColor = '#fff';
        e.target.select(); // Tıklandığında da seçsin (Opsiyonel, kullanıcı dostu)
    };

    return (
        <div style={cardStyle}>
            <span style={labelStyle}>{title}</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="number" 
                        value={value}
                        onInput={(e) => onValueChange(e.target.value)}
                        onKeyDown={handleKeyDown} // Enter Dinleyici
                        onFocus={handleFocus}     // Focus Stili ve Seçim
                        onBlur={(e) => e.target.style.backgroundColor = '#f2f2f7'}
                        style={inputStyle}
                        placeholder="100"
                    />
                    <span style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#8e8e93', fontWeight:'bold', pointerEvents:'none' }}>%</span>
                </div>
                <input 
                    type="range" min="10" max="200" step="1"
                    value={isNaN(sliderVal) ? 100 : sliderVal}
                    onInput={(e) => onValueChange(e.target.value)}
                    onMouseUp={onCommit} 
                    onTouchEnd={onCommit}
                    style={{ flex: 1, cursor: 'pointer', accentColor: '#007aff', height: '6px', marginLeft: '15px', marginRight: '5px' }}
                />
                <button onClick={onCommit} style={btnStyle}>SET</button>
            </div>
        </div>
    );
};

// --- ANA BİLEŞEN ---
const MoveControl = ({ onMessage }) => {
    const [flowRate, setFlowRate] = useState('100');
    const [printSpeed, setPrintSpeed] = useState('100');
    const [zStep, setZStep] = useState(1);

    const executeGcode = (cmd) => {
        if (window.electronAPI) {
            window.electronAPI.sendGcode(cmd);
            if (onMessage) onMessage(`> ${cmd}`);
        }
    };

    const sendValueCommand = (type) => {
        let val;
        let cmdPrefix;

        if (type === 'FLOW') {
            val = parseInt(flowRate);
            cmdPrefix = 'M221 S';
        } else { 
            val = parseInt(printSpeed);
            cmdPrefix = 'M220 S';
        }

        if (isNaN(val)) val = 100;
        const safeVal = Math.max(10, Math.min(1000, val));
        
        if (type === 'FLOW') setFlowRate(String(safeVal));
        else setPrintSpeed(String(safeVal));

        executeGcode(`${cmdPrefix}${safeVal}`);
    };

    return (
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, minHeight: 0, boxSizing: 'border-box' }}>
            
            <SettingRow 
                title="Flow Rate" value={flowRate} onValueChange={setFlowRate} 
                onCommit={() => sendValueCommand('FLOW')} 
            />
            
            <SettingRow 
                title="Print Speed" value={printSpeed} onValueChange={setPrintSpeed} 
                onCommit={() => sendValueCommand('SPEED')} 
            />

            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                <button onClick={() => executeGcode('G28')} 
                    style={{ ...actionBtn, flex: 1, backgroundColor: '#e8f5e9', color: '#2e7d32', borderColor: '#c8e6c9', boxShadow: '0 4px 10px rgba(46, 125, 50, 0.1)' }}>
                    <span style={{ marginRight:'8px', fontSize:'18px' }}>⌂</span> HOME ALL
                </button>
                <button onClick={() => executeGcode('M84')} 
                    style={{ ...actionBtn, flex: 1, backgroundColor: '#ffebee', color: '#c62828', borderColor: '#ffcdd2', boxShadow: '0 4px 10px rgba(198, 40, 40, 0.1)' }}>
                    <span style={{ marginRight:'8px', fontSize:'18px' }}>✕</span> MOTORS OFF
                </button>
            </div>

            {/* Z-AXIS */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                    <span style={labelStyle}>Z-AXIS MOVE</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#007aff', backgroundColor:'#f0f9ff', padding:'4px 10px', borderRadius:'8px' }}>{zStep} mm</span>
                </div>

                <div style={{ display: 'flex', backgroundColor: '#f2f2f7', borderRadius: '12px', padding: '4px', marginBottom: '15px' }}>
                    {[0.1, 0.5, 1.0, 5, 10].map(s => (
                        <div 
                            key={s} 
                            onClick={() => setZStep(s)}
                            style={{ 
                                flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: '10px', 
                                fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease',
                                backgroundColor: zStep === s ? '#fff' : 'transparent',
                                boxShadow: zStep === s ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                color: zStep === s ? '#000' : '#8e8e93',
                            }}
                        >{s}</div>
                    ))}
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={() => executeGcode(`G0 Z${zStep}`)} 
                        style={{ ...actionBtn, flex: 1, backgroundColor: '#007aff', color: '#fff', border:'none', height: '60px', fontSize: '24px', boxShadow:'0 4px 12px rgba(0,122,255,0.3)' }}>
                        ▲
                    </button>
                    <button onClick={() => executeGcode(`G0 Z-${zStep}`)} 
                        style={{ ...actionBtn, flex: 1, backgroundColor: '#007aff', color: '#fff', border:'none', height: '60px', fontSize: '24px', boxShadow:'0 4px 12px rgba(0,122,255,0.3)' }}>
                        ▼
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveControl;