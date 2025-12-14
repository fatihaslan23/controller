// src/MoveControl.js
import { h } from 'preact';
import { useState } from 'preact/hooks'; 

const MoveControl = ({ onMessage }) => {
    const [step, setStep] = useState(10); 
    
    // Görseldeki koyu temaya uyumlu palet
    const PANEL_BG = '#3a4d61';
    const BTN_NORMAL = '#4a637d'; // Normal buton arkaplanı
    const BTN_ACTIVE = '#3498db'; // Canlı Mavi (Aktif Step)
    const TEXT_COLOR = '#ecf0f1';
    
    const baseStyle = {
        padding: '10px 15px', 
        margin: '5px', 
        minWidth: '80px', 
        border: 'none', 
        borderRadius: '5px', 
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        fontSize: '14px',
        fontWeight: '500'
    };
    
    const defaultButtonStyles = { ...baseStyle, backgroundColor: BTN_NORMAL, color: TEXT_COLOR };
    const activeStepStyle = { backgroundColor: BTN_ACTIVE, color: 'white' };
    const commandButtonStyles = { ...baseStyle, backgroundColor: '#7f8c8d', color: 'white', minWidth: '100px' };
    
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
                style={{ ...defaultButtonStyles, backgroundColor: BTN_NORMAL, minWidth: '40px' }}
            >
                {label || `${direction === 'up' ? '+' : '-'}${value}`}
            </button>
        );
    };

    return (
        <div style={{ flex: 1, minHeight: '300px' }}> 
            
            <h4 style={{ marginTop: '0', borderBottom: '1px dotted #4a637d', paddingBottom: '5px', fontSize: '16px', color: TEXT_COLOR }}>Adım Seçimi (mm)</h4>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '15px' }}>
                {[0.1, 1, 5, 10, 50].map(val => (
                    <button 
                        key={val} 
                        onClick={() => setStep(val)} 
                        style={{ ...defaultButtonStyles, marginRight: '10px', ...(step === val ? activeStepStyle : {backgroundColor: BTN_NORMAL}) }}
                    >
                        {val}
                    </button>
                ))}
            </div>

            <h4 style={{ marginTop: '15px', borderBottom: '1px dotted #4a637d', paddingBottom: '5px', fontSize: '16px', color: TEXT_COLOR }}>XYZ Kontrolü (Step: {step}mm)</h4>
            
            {/* Y EKSENİ KONTROLÜ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', maxWidth: '270px', margin: '0 auto 5px' }}>
                <div/>
                <JogButton axis="Y" direction="up" value={step} label={`Y+`} />
                <div/>
            </div>
            
            {/* X EKSENİ KONTROLÜ VE HOME */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', maxWidth: '270px', margin: '0 auto 10px' }}>
                <JogButton axis="X" direction="down" value={step} label={`X-`} />
                <button onClick={() => sendCommand('G28')} style={{ ...commandButtonStyles, backgroundColor: '#2ecc71', color: '#1c2833' }}>HOME ALL</button> {/* Canlı Yeşil */}
                <JogButton axis="X" direction="up" value={step} label={`X+`} />
            </div>

            {/* Z EKSENİ KONTROLÜ */}
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', maxWidth: '270px', margin: '0 auto 20px' }}>
                <div/>
                <JogButton axis="Y" direction="down" value={step} label={`Y-`} />
                <div/>
            </div>

            <p style={{ textAlign: 'center', margin: '10px 0 5px', color: '#95a5a6' }}>Z-Axis (Step: {step}mm)</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <JogButton axis="Z" direction="up" value={step} label={`Z+`} />
                <JogButton axis="Z" direction="down" value={step} label={`Z-`} />
            </div>

            <h4 style={{ marginTop: '15px', borderBottom: '1px dotted #4a637d', paddingBottom: '5px', fontSize: '16px', color: TEXT_COLOR }}>Ekstrüder & Diğer Komutlar</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '10px' }}>
                <JogButton axis="E" direction="up" value={10} label={`E+10`} />
                <JogButton axis="E" direction="down" value={10} label={`E-10`} />
                <button onClick={() => sendCommand('M84')} style={{ ...commandButtonStyles, backgroundColor: '#e74c3c', color: 'white', marginLeft: '5px' }}>MOTORS OFF</button> {/* Canlı Kırmızı */}
            </div>
        </div>
    );
};

export default MoveControl;