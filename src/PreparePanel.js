// src/PreparePanel.js
import { h } from 'preact';
import { useState } from 'preact/hooks';

const PreparePanel = ({ onSendCommand }) => {
    const [mixRatio, setMixRatio] = useState(85);
    const [ramFeed, setRamFeed] = useState(5000);
    const [clayFeed, setClayFeed] = useState(5000);

    const cardStyle = {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #f2f2f7',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
    };

    const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#8e8e93', marginBottom: '8px', textTransform: 'uppercase' };
    
    // Modern input stili
    const inputModern = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #e5e5ea',
        backgroundColor: '#f2f2f7',
        fontSize: '14px',
        fontWeight: '600',
        color: '#1c1c1e',
        textAlign: 'center',
        outline: 'none',
        transition: 'border 0.2s'
    };

    const btnModern = {
        border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
        flex: 1, transition: 'transform 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center'
    };

    return (
        <div style={{ padding: '20px', overflowY: 'auto' }}>
            
            {/* MIXER RATIO CARD */}
            <div style={cardStyle}>
                <span style={labelStyle}>Mixer Ratio</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#3a3a3c', marginBottom: '8px', fontWeight: '500' }}>
                    <span>Kil Ekstruder: <strong>{mixRatio}</strong></span>
                    <span>Ram: <strong>{100 - mixRatio}</strong></span>
                </div>
                
                {/* Custom Slider */}
                <input 
                    type="range" min="0" max="100" value={mixRatio} 
                    onInput={(e) => setMixRatio(e.target.value)}
                    style={{ 
                        width: '100%', 
                        cursor: 'pointer', 
                        accentColor: '#007aff', 
                        height: '6px',
                        borderRadius: '3px',
                        marginBottom: '12px'
                    }} 
                />
                <button style={{ ...btnModern, width: '100%', backgroundColor: '#007aff', color: 'white', boxShadow: '0 4px 10px rgba(0,122,255,0.3)' }}>
                    SET RATIO
                </button>
            </div>

            {/* RAM EXTRUDER CARD */}
            <div style={cardStyle}>
                <span style={labelStyle}>Ram Extruder (Depo)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <input type="number" value={ramFeed} onInput={e => setRamFeed(e.target.value)} style={inputModern} />
                    <span style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '500', whiteSpace: 'nowrap' }}>mm/min</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => onSendCommand(`G1 E10 F${ramFeed}`)} style={{ ...btnModern, backgroundColor: '#f2f2f7', color: '#1c1c1e' }}>Forward</button>
                    <button onClick={() => onSendCommand('M5')} style={{ ...btnModern, backgroundColor: '#ff3b30', color: 'white', maxWidth: '60px' }}>STOP</button>
                    <button onClick={() => onSendCommand(`G1 E-10 F${ramFeed}`)} style={{ ...btnModern, backgroundColor: '#f2f2f7', color: '#1c1c1e' }}>Retract</button>
                </div>
            </div>

            {/* CLAY EXTRUDER CARD */}
            <div style={{ ...cardStyle, border: '1px solid #34c759', backgroundColor: '#f0fdf4' }}>
                <span style={{ ...labelStyle, color: '#34c759' }}>Clay Extruder (Baskı Kafası)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <input type="number" value={clayFeed} onInput={e => setClayFeed(e.target.value)} style={{ ...inputModern, backgroundColor: '#ffffff', border: '1px solid #d1fae5' }} />
                    <span style={{ fontSize: '12px', color: '#34c759', fontWeight: '500' }}>mm/min</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => onSendCommand('T0')} style={{ ...btnModern, backgroundColor: '#34c759', color: 'white', boxShadow: '0 4px 10px rgba(52,199,89,0.3)' }}>
                        ▶ START
                    </button>
                    <button onClick={() => onSendCommand('T0 M5')} style={{ ...btnModern, backgroundColor: '#ffffff', color: '#ff3b30', border: '1px solid #ff3b30' }}>
                        ◼ STOP
                    </button>
                </div>
            </div>

        </div>
    );
};

export default PreparePanel;