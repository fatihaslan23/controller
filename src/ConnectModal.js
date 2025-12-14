// src/ConnectModal.js
import { h, Component } from 'preact';

export default class ConnectModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            ports: [],
            selectedPort: '',
            baudRate: 115200, 
            status: 'Lütfen USB portlarını tarayın.'
        };
    }
    
    componentDidMount() {
        this.scanPorts();
    }

    async scanPorts() {
        if (!window.electronAPI || !window.electronAPI.listPorts) {
            this.setState({ status: 'Hata: Electron API bulunamadı.' });
            return;
        }

        this.setState({ status: 'USB Portları aranıyor...' });
        try {
            const ports = await window.electronAPI.listPorts(); 
            this.setState({ 
                ports, 
                selectedPort: ports.length > 0 ? ports[0].path : '',
                status: ports.length === 0 ? 'Port bulunamadı.' : 'Portları seçin.'
            });
        } catch (err) {
            this.setState({ status: 'Port tarama hatası: ' + err.message });
        }
    }

    async connectUSB() {
        const { selectedPort, baudRate } = this.state;
        this.setState({ status: `Bağlanıyor: ${selectedPort}...` });

        try {
            await window.electronAPI.connectSerial(selectedPort, baudRate); 
            
            this.props.onConnect({ portPath: selectedPort, baudRate: baudRate }); 

        } catch (err) {
            this.setState({ status: 'Bağlantı Hatası: ' + err.message });
        }
    }

    render() {
        const { ports, selectedPort, baudRate, status } = this.state;
        
        // KRİTİK DÜZELTME: Koyu temaya uyumlu modal stili
        const modalStyle = {
            backgroundColor: '#34495e', 
            padding: '40px', 
            borderRadius: '10px', 
            textAlign: 'center', 
            minWidth: '400px', 
            color: '#ecf0f1',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)'
        };
        
        const inputStyle = { 
            padding: '12px', 
            width: '100%', 
            marginBottom: '15px', 
            color: '#333', 
            border: '1px solid #4a637d', 
            borderRadius: '5px',
            boxSizing: 'border-box',
            backgroundColor: '#ecf0f1' // Input alanını açık bırak
        };
        
        const buttonStyle = { 
            padding: '12px 25px', 
            backgroundColor: !selectedPort ? '#7f8c8d' : '#27ae60', // Yeşil ton
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            fontSize: '16px',
            cursor: !selectedPort ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
        };
        
        return (
            <div style={modalStyle}>
                <h1 style={{ color: '#ecf0f1', borderBottom: '1px solid #4a637d', paddingBottom: '10px', marginBottom: '20px' }}>RootClay Controller</h1>
                <h3 style={{ color: '#95a5a6' }}>Seri Port Bağlantısı</h3>
                
                <select 
                    value={selectedPort} 
                    onChange={(e) => this.setState({ selectedPort: e.target.value })}
                    style={inputStyle}
                >
                    {ports.length > 0 ? (
                        ports.map(p => h('option', { value: p.path }, `${p.path} (${p.manufacturer})`))
                    ) : (
                        h('option', { value: '' }, 'Port bulunamadı')
                    )}
                </select>
                
                <input
                    type="number"
                    value={baudRate}
                    onInput={(e) => this.setState({ baudRate: e.target.value })}
                    placeholder="Baud Rate (Örn: 115200)"
                    style={inputStyle}
                />

                <button 
                    onClick={() => this.connectUSB()}
                    disabled={!selectedPort}
                    style={buttonStyle}
                >
                    BAĞLAN
                </button>
                
                <p style={{ marginTop: '20px', color: '#3498db', fontWeight: 'bold' }}>Durum: {status}</p>
            </div>
        );
    }
}