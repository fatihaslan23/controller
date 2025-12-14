// src/ConnectModal.js
import { h, Component } from 'preact';
import { useState } from 'preact/hooks'; // Hook'lar buradan geliyor

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
    
    // Mount olduktan sonra portları otomatik tarar
    componentDidMount() {
        this.scanPorts();
    }
    
    // Component'i functional Hook'lu bir bileşene çevirip düzeltilen hali:
    // Bu kısım class component olduğu için class yapısını koruyalım:

    async scanPorts() {
        // ... (aynı kalır)
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
            
            // KRİTİK DÜZELTME: Doğru formatta objeyi gönderiyoruz
            this.props.onConnect({ portPath: selectedPort, baudRate: baudRate }); 

        } catch (err) {
            this.setState({ status: 'Bağlantı Hatası: ' + err.message });
        }
    }

    render() {
        const { ports, selectedPort, baudRate, status } = this.state;
        const modalStyle = {
            backgroundColor: '#34495e', padding: '40px', borderRadius: '10px', 
            textAlign: 'center', minWidth: '400px', color: 'white'
        };
        
        return (
            <div style={modalStyle}>
                <h1>RootClay Serial Connect</h1>
                <h3>USB Bağlantısı</h3>
                
                <select 
                    value={selectedPort} 
                    onChange={(e) => this.setState({ selectedPort: e.target.value })}
                    style={{ padding: '10px', width: '100%', marginBottom: '10px', color: 'black' }}
                >
                    {ports.map(p => h('option', { value: p.path }, `${p.path} (${p.manufacturer})`))}
                </select>
                
                <input
                    type="number"
                    value={baudRate}
                    onInput={(e) => this.setState({ baudRate: e.target.value })}
                    placeholder="Baud Rate (Örn: 115200)"
                    style={{ padding: '10px', width: '100%', marginBottom: '20px', color: 'black' }}
                />

                <button 
                    onClick={() => this.connectUSB()}
                    disabled={!selectedPort}
                    style={{ padding: '10px 20px', backgroundColor: '#32b643', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                    BAĞLAN
                </button>
                
                <p style={{ marginTop: '15px' }}>Durum: {status}</p>
            </div>
        );
    }
}