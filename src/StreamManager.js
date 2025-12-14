// src/StreamManager.js (Hardcoded ID Çözümü)
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks'; 

let globalGcodeContent = '';

const StreamManager = ({ onMessage }) => {
    // STATE TANIMLARI
    const [fileName, setFileName] = useState('Dosya seçilmedi'); 
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Hazır');
    const [isStreaming, setIsStreaming] = useState(false); 
    const [renderCount, setRenderCount] = useState(0); 

    // KRİTİK LOG 1: Debug amaçlı
    useEffect(() => {
        const contentLoaded = globalGcodeContent.length > 0;
        const color = contentLoaded ? 'color: green;' : 'color: blue;';
        console.log(`%c[DEBUG] RENDER: Count=${renderCount}, Content Loaded = ${contentLoaded}`, color);
    }, [renderCount, isStreaming]); 
    
    // IPC Dinleyicileri (Aynı Kalır)
    useEffect(() => {
        if (!window.electronAPI || !window.electronAPI.onProgress || !window.electronAPI.onStreamComplete) {
            return () => {}; 
        }
        // ... (Cleanup mantığı)
    }, []);

    // DOSYA SEÇME VE OKUMA İŞLEVİ
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        
        // 1. Temizlik ve Başlangıç Durumu
        globalGcodeContent = ''; 
        
        // setFileName'ı burada çağırmayıp, sadece dosya seçilmediyse sıfırlayalım
        if (!selectedFile) {
            setFileName('Dosya seçilmedi');
            setStatus('Hazır'); 
            return;
        }

        // Seçim başladığında sadece durumu güncelle
        setStatus('Dosya Okunuyor...'); 
        setProgress(0);

        console.log(`[DEBUG] Dosya Seçildi: ${selectedFile.name}. Okuma Başlıyor.`);

        // 2. Dosyayı Asenkron Oku
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            
            if (content && content.length > 0) {
                console.log(`%c[DEBUG] OKUMA BAŞARILI. Uzunluk: ${content.length}. GLOBAL VE RENDER GÜNCELLEMESİ BAŞLIYOR.`, 'color: #33ccff; font-weight: bold;');
                
                // Başarılı Güncelleme
                globalGcodeContent = content; // Global değişkene kaydet
                
                // GECİKMELİ VE ZORUNLU GÖRSEL GÜNCELLEME
                // Görsel state'leri, global atama yapıldıktan SONRA güncelle
                setFileName(selectedFile.name); 
                setStatus('Dosya Yüklendi');    
                
                // KRİTİK: Sayıcıyı güncelleyerek arayüzü ZORLA YENİLE
                setRenderCount(prev => prev + 1); 
                
                onMessage(`[Sistem] G-code dosyası yüklendi. Toplam satır: ${content.split('\n').length}`);
                
            } else {
                 console.log(`%c[DEBUG] HATA: Dosya Boş Okundu.`, 'color: red;');
                 setFileName('HATA: Boş dosya!');
                 setStatus('HATA: Boş dosya!');
                 globalGcodeContent = '';
                 setRenderCount(prev => prev + 1); 
                 onMessage(`[Sistem] HATA: Seçilen G-code dosyası boş.`);
            }
        };
        reader.onerror = () => {
             console.log(`%c[DEBUG] HATA: FileReader Hatası.`, 'color: red;');
             setFileName('HATA: Okunamadı!');
             setStatus('HATA: Okunamadı!');
             globalGcodeContent = '';
             setRenderCount(prev => prev + 1); 
        };
        reader.readAsText(selectedFile);
    };

    // BASKI BAŞLATMA İŞLEVİ
    const handleStartPrint = async () => {
        if (globalGcodeContent.length === 0) { 
            alert('Lütfen önce bir G-code dosyası yükleyin.');
            return;
        }
        // ... (Aynı kalır)
    };

    const handleStopPrint = async () => {
        // ... (Aynı kalır)
    };

    const isReadyToPrint = globalGcodeContent.length > 0 && !isStreaming;

    return (
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
            <h3>PC'den Baskı Yöneticisi</h3>
            
            <input 
                key={renderCount} // KRİTİK: Key değiştirerek Input'u sıfırla/yenile
                type="file" 
                accept=".gcode,.gco" 
                onChange={handleFileChange} 
                disabled={isStreaming} 
                style={{ marginBottom: '10px' }}
            />
            
            <p>Yüklü Dosya: <strong>{fileName}</strong> ({status})</p>
            
            <div style={{ margin: '10px 0' }}>
                <progress value={progress} max="100" style={{ width: '100%' }} />
                <p style={{ margin: '5px 0 0 0' }}>İlerleme: {progress}%</p>
            </div>

            <button 
                onClick={handleStartPrint} 
                disabled={!isReadyToPrint} 
                style={{ marginRight: '10px', padding: '10px' }}
            >
                Baskıyı Başlat
            </button>
            <button 
                onClick={handleStopPrint} 
                disabled={!isStreaming} 
                style={{ padding: '10px' }}
            >
                Durdur
            </button>
        </div>
    );
};

export default StreamManager;