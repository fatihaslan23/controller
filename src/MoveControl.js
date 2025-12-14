// src/MoveControl.js
import { h } from 'preact';
import { useState } from 'preact/hooks'; 

const MoveControl = ({ onMessage }) => {
    const [step, setStep] = useState(10); 

    const sendCommand = async (command) => {
        if (!window.electronAPI || !window.electronAPI.sendGcode) {
            onMessage('[HATA] Bağlantı yok veya Electron API eksik.');
            return;
        }
        try {
            if (command.startsWith('G0') || command.startsWith('G1')) {
                await window.electronAPI.sendGcode('G91'); 
            }
            await window.electronAPI.sendGcode(command);
            onMessage(`[GÖNDERİLDİ] ${command}`);
        } catch (error) {
            onMessage(`[HATA] Komut gönderilemedi: ${error.message}`);
        }
    };

    const JogButton = ({ axis, direction, label, value }) => {
        const cmd = `G0 ${axis}${direction === 'up' ? value : -value}`;
        return (
            <button 
                onClick={() => sendCommand(cmd)}
                style={{ padding: '8px 12px', margin: '3px', minWidth: '70px' }}
            >
                {label || `${direction === 'up' ? '+' : '-'}${value}`}
            </button>
        );
    };

    return (
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
            <h3>TUNE & MOVE</h3>

            <p>Hareket Adımı (mm):</p>
            <div>
                {[0.1, 1, 5, 10, 50].map(val => (
                    <button 
                        key={val} 
                        onClick={() => setStep(val)} 
                        style={{ padding: '8px', marginRight: '5px', backgroundColor: step === val ? '#32b643' : '#f0f0f0' }}
                    >
                        {val}
                    </button>
                ))}
            </div>

            <h4 style={{ marginTop: '15px' }}>Z-Axis Move (Step: {step}mm)</h4>
            <JogButton axis="Z" direction="up" value={step} label={`Z +${step}`} />
            <JogButton axis="Z" direction="down" value={step} label={`Z -${step}`} />
            
            <h4 style={{ marginTop: '15px' }}>X/Y Eksenleri (Step: {step}mm)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', maxWidth: '250px' }}>
                <div/>
                <JogButton axis="Y" direction="up" value={step} label={`Y+`} />
                <div/>

                <JogButton axis="X" direction="down" value={step} label={`X-`} />
                <button onClick={() => sendCommand('G28')} style={{ backgroundColor: '#f9e79f' }}>HOME ALL</button>
                <JogButton axis="X" direction="up" value={step} label={`X+`} />

                <div/>
                <JogButton axis="Y" direction="down" value={step} label={`Y-`} />
                <div/>
            </div>
            
            <h4 style={{ marginTop: '15px' }}>Kil Ekstrüzyon (E-Ekseni)</h4>
            <JogButton axis="E" direction="up" value={10} label={`Extrude Kil`} />
            <JogButton axis="E" direction="down" value={10} label={`Retract Kil`} />
            <button onClick={() => sendCommand('M84')} style={{ marginLeft: '10px', backgroundColor: '#e74c3c', color: 'white' }}>MOTORS OFF</button>
        </div>
    );
};

export default MoveControl;