// src/ConnectModal.js
import { h, Component } from 'preact';

export default class ConnectModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            ports: [],
            activeCard: null, // 'USB' veya 'WIFI'
            selectedPort: '',
            baudRate: 115200,
            status: 'Lütfen bağlantı türünü seçin.',
            // WiFi
            ipAddress: '192.168.0.1',
            isConnectingWifi: false
        };
    }
    
    componentDidMount() {
        this.scanPorts();
    }

    async scanPorts() {
        if (!window.electronAPI) return;
        try {
            const ports = await window.electronAPI.listPorts(); 
            this.setState({ 
                ports, 
                selectedPort: ports.length > 0 ? ports[0].path : ''
            });
        } catch (err) {
            console.error(err);
        }
    }

    async connectUSB() {
        const { selectedPort, baudRate } = this.state;
        this.setState({ status: `USB Bağlanıyor: ${selectedPort}...` });
        try {
            await window.electronAPI.connectSerial(selectedPort, baudRate); 
            // BAĞLANTI BAŞARILI -> Ana uygulamaya bildir
            this.props.onConnect({ portPath: selectedPort, baudRate: baudRate, type: 'USB' }); 
        } catch (err) {
            this.setState({ status: 'Bağlantı Hatası: ' + err.message });
        }
    }

    async connectWifi() {
        const { ipAddress } = this.state;
        
        // Otomatik Bağlantı Mantığı (IP 192.168.0.1 ise)
        if (ipAddress === '192.168.0.1') {
            const SSID = 'ESP3D';
            const PASS = '12345678';
            this.setState({ isConnectingWifi: true, status: 'Ağ durumu kontrol ediliyor...' });
            
            try {
                const currentSSID = await window.electronAPI.getWifiSSID();
                if (currentSSID !== SSID) {
                    this.setState({ status: `"${SSID}" ağına geçiş yapılıyor...` });
                    const result = await window.electronAPI.connectWifi(SSID, PASS);
                    
                    if (!result.success) {
                        alert(`Bağlantı Hatası: ${result.error}\nLütfen manuel bağlanın.`);
                        this.setState({ status: 'Wi-Fi Bağlantı Hatası', isConnectingWifi: false });
                        return;
                    }
                    this.setState({ status: 'Bağlandı! IP bekleniyor...' });
                    await new Promise(r => setTimeout(r, 3000));
                }
            } catch (err) {
                console.error("Wifi işlem hatası:", err);
            }
        }

        // Ana uygulamaya bildir (Yönlendirme yapma, state gönder)
        let targetUrl = ipAddress.startsWith('http') ? ipAddress : `http://${ipAddress}`;
        this.setState({ status: 'Arayüz başlatılıyor...' });
        
        this.props.onConnect({ 
            type: 'WIFI', 
            portPath: ipAddress, 
            targetUrl: targetUrl 
        });
    }

    handleCardClick(type) {
        if (this.state.activeCard === type) return; 
        this.setState({ activeCard: type, status: `${type} ayarları...` });
    }

    render() {
        const { ports, selectedPort, baudRate, status, activeCard, ipAddress, isConnectingWifi } = this.state;
        
        // --- MODERN STİLLER (ESKİ GÜZEL GÖRÜNÜM GERİ GELDİ) ---
        const containerStyle = {
            display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', fontFamily: 'sans-serif'
        };

        const wrapperStyle = {
            display: 'flex', gap: '40px', perspective: '1000px'
        };

        const cardStyle = (type) => ({
            width: '260px', height: '340px', position: 'relative', transformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)', cursor: 'pointer',
            transform: activeCard === type ? 'rotateY(180deg)' : 'rotateY(0deg)'
        });

        const faceStyle = {
            position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
            borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#fff'
        };

        const backFaceStyle = {
            ...faceStyle, transform: 'rotateY(180deg)', backgroundColor: '#f8f9fa', padding: '20px', boxSizing: 'border-box'
        };

        const iconStyle = { fontSize: '64px', marginBottom: '20px', color: '#007aff' };
        const titleStyle = { fontSize: '24px', fontWeight: 'bold', color: '#333' };
        
        const inputStyle = {
            width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px',
            border: '1px solid #ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
        };

        const btnStyle = {
            width: '100%', padding: '12px', backgroundColor: '#007aff', color: 'white', border: 'none',
            borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px',
            opacity: isConnectingWifi ? 0.7 : 1, pointerEvents: isConnectingWifi ? 'none' : 'auto'
        };

        const backBtnStyle = {
            ...btnStyle, backgroundColor: '#e5e5ea', color: '#333', marginTop: '10px'
        };

        return (
            <div style={containerStyle}>
                <div style={{ position: 'absolute', top: '40px', color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '32px' }}>RootClay Controller</h1>
                    <p style={{ marginTop: '10px', fontSize: '14px', minHeight: '20px' }}>{status}</p>
                </div>

                <div style={wrapperStyle}>
                    
                    {/* --- USB CARD --- */}
                    <div style={cardStyle('USB')} onClick={() => this.handleCardClick('USB')}>
                        {/* ÖN YÜZ */}
                        <div style={faceStyle}>
                            <div style={iconStyle}>🔌</div>
                            <div style={titleStyle}>USB Serial</div>
                            <div style={{ color: '#888', marginTop: '10px' }}>Kablolu Bağlantı</div>
                        </div>
                        {/* ARKA YÜZ */}
                        <div style={backFaceStyle} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '20px', color: '#333' }}>USB Ayarları</h3>
                            <select 
                                value={selectedPort} 
                                onChange={(e) => this.setState({ selectedPort: e.target.value })}
                                style={inputStyle}
                            >
                                {ports.length > 0 ? (
                                    ports.map(p => h('option', { value: p.path }, `${p.path}`))
                                ) : (
                                    h('option', { value: '' }, 'Port Yok')
                                )}
                            </select>
                            <input
                                type="number" value={baudRate}
                                onInput={(e) => this.setState({ baudRate: e.target.value })}
                                placeholder="Baud Rate" style={inputStyle}
                            />
                            <button onClick={() => this.connectUSB()} disabled={!selectedPort} style={btnStyle}>BAĞLAN</button>
                            <button onClick={(e) => { e.stopPropagation(); this.setState({ activeCard: null }); }} style={backBtnStyle}>GERİ</button>
                        </div>
                    </div>

                    {/* --- WIFI CARD --- */}
                    <div style={cardStyle('WIFI')} onClick={() => this.handleCardClick('WIFI')}>
                        {/* ÖN YÜZ */}
                        <div style={faceStyle}>
                            <div style={iconStyle}>📡</div>
                            <div style={titleStyle}>Wi-Fi</div>
                            <div style={{ color: '#888', marginTop: '10px' }}>ESP3D Arayüzü</div>
                        </div>
                        {/* ARKA YÜZ */}
                        <div style={backFaceStyle} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '20px', color: '#333' }}>ESP3D Bağlantısı</h3>
                            
                            <label style={{display:'block', textAlign:'left', fontSize:'12px', color:'#666', marginBottom:'5px'}}>Hedef IP Adresi</label>
                            <input
                                type="text" value={ipAddress}
                                onInput={(e) => this.setState({ ipAddress: e.target.value })}
                                placeholder="IP Adresi" style={inputStyle}
                            />
                            
                            <button onClick={() => this.connectWifi()} style={btnStyle}>
                                {isConnectingWifi ? 'BAĞLANILIYOR...' : 'BAĞLAN & AÇ'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); this.setState({ activeCard: null }); }} style={backBtnStyle}>GERİ</button>
                        </div>
                    </div>

                </div>
            </div>
        );
    }
}