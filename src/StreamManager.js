// src/StreamManager.js
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks'; 

// === KRİTİK DÜZELTME: Tema Renklerini Tanımla ===
const COLOR_INPUT_BG = '#2c3e50'; 
const COLOR_SECONDARY_TEXT = '#bdc3c7'; 
const COLOR_LIGHT_TEXT = '#ecf0f1';
const COLOR_PANEL_BG = '#3a4d61'; // Gerekli olabilir
// ===============================================

// KRİTİK FONKSİYON: Dosya okuma işlemini Promise'e sarar
const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

// KRİTİK: Yeni prop'lar (isStreaming, currentProgress, gcodeContent) eklendi
const StreamManager = ({ onMessage, onGcodeLoaded, gcodeContent, isStreaming, setIsStreaming, currentProgress, currentLine }) => {
    // STATE TANIMLARI
    const [fileName, setFileName] = useState('Dosya seçilmedi'); 
    const [status, setStatus] = useState('Hazır');
    const [inputKey, setInputKey] = useState(0); 

    // IPC Dinleyicileri (Akış Tamamlandı)
    useEffect(() => {
        if (!window.electronAPI || !window.electronAPI.onStreamComplete) {
            return () => {}; 
        }

        const unsubscribeComplete = window.electronAPI.onStreamComplete(() => {
            setIsStreaming(false);
            setStatus('Baskı Tamamlandı');
            onMessage('[Sistem] G-code akışı başarıyla tamamlandı.');
        });
        
        return () => {
            unsubscribeComplete();
        };
    }, [onMessage, setIsStreaming]);

    // DOSYA SEÇME VE OKUMA İŞLEVİ (ASYNC/AWAIT ile senkronize edildi)
    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        
        // Temizlik
        onGcodeLoaded(''); 
        setStatus('Hazır');
        
        if (!selectedFile) {
            setFileName('Dosya seçilmedi');
            setInputKey(prev => prev + 1); 
            return;
        }

        const fileDisplayName = selectedFile.name;
        
        // ADIM 1: Durumu "Okunuyor" olarak ayarla
        setFileName(fileDisplayName);
        setStatus(`Okunuyor...`); 

        try {
            // ADIM 2: Asenkron işlemi await ile bekle
            const content = await readFileAsText(selectedFile);

            if (content && content.length > 0) {
                // ADIM 3: Başarılı State'i Ayarla (İçeriği ana state'e gönder)
                onGcodeLoaded(content); 
                setStatus('Yüklendi'); 
                onMessage(`[Sistem] G-code dosyası yüklendi. Toplam satır: ${content.split('\n').length}`);
                
            } else {
                 setStatus('HATA: Boş dosya!');
                 onMessage(`[Sistem] HATA: Seçilen G-code dosyası boş.`);
            }
        } catch (error) {
            setStatus('HATA: Okunamadı!');
            onMessage(`[Sistem] HATA: Dosya okuma hatası: ${error.message}`);
        }
        
        // ADIM 4: Input'u zorla sıfırla (görsel kısıtlamayı yönetir)
        setInputKey(prev => prev + 1);
    };

    // BASKI BAŞLATMA İŞLEVİ
    const handleStartPrint = async () => {
        if (!gcodeContent || gcodeContent.length === 0) { 
            alert('Lütfen önce bir G-code dosyası yükleyin.');
            return;
        }
        
        if (!window.electronAPI || !window.electronAPI.startStream) {
            onMessage('[HATA] Akış API\'ı eksik.');
            return;
        }

        try {
            // G-code içeriğini gönder
            const success = await window.electronAPI.startStream(gcodeContent);
            if (success) {
                setIsStreaming(true);
                setStatus(`Akış Başladı`);
                onMessage(`[AKIIŞ] G-code akışı başlatıldı.`);
            }
        } catch (error) {
            onMessage(`[HATA] Akış başlatılamadı: ${error.message}`);
            setIsStreaming(false);
            setStatus('Akış Hatası');
        }
    };

    const handleStopPrint = async () => {
        if (!window.electronAPI || !window.electronAPI.stopStream) {
            onMessage('[HATA] Akış API\'ı eksik.');
            return;
        }

        try {
            await window.electronAPI.stopStream();
            setIsStreaming(false);
            setStatus(`Durduruldu`);
            onMessage(`[AKIIŞ] G-code akışı kullanıcı tarafından durduruldu.`);
        } catch (error) {
            onMessage(`[HATA] Akış durdurulamadı: ${error.message}`);
        }
    };

    const isReadyToPrint = (gcodeContent && gcodeContent.length > 0) && !isStreaming;
    const currentFileName = (gcodeContent && gcodeContent.length > 0) ? fileName : ''; 
    const totalLines = gcodeContent ? gcodeContent.split('\n').length : 0;
    
    const UploadButtonStyle = {
        padding: '10px 15px',
        backgroundColor: '#2ecc71', // Yeşil
        color: 'white', 
        border: 'none', 
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        textAlign: 'center',
        display: 'block'
    };

    return (
        <div style={{ marginBottom: '10px' }}>
            {/* DOSYA YÜKLEME BUTONU VE DURUM */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                {/* Yükleme Butonu (Görseldeki gibi Mavi) */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <input 
                        key={inputKey}
                        type="file" 
                        accept=".gcode,.gco" 
                        onChange={handleFileChange} 
                        disabled={isStreaming} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                    {/* PC'den YÜKLE Butonu */}
                    <button disabled={isStreaming} style={{ ...UploadButtonStyle, backgroundColor: isStreaming ? '#7f8c8d' : '#3498db' }}>
                        UPLOAD
                    </button>
                </div>
                <button 
                    onClick={handleStopPrint} // STOP PRINT butonunu durdurma işlevine bağladık
                    disabled={!isStreaming} 
                    style={{ padding: '10px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: !isStreaming ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                    STOP PRINT
                </button>
            </div>
            
            {/* YÜKLÜ DOSYA BİLGİSİ (Sadeleştirilmiş) */}
            <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: COLOR_INPUT_BG, marginBottom: '10px', border: '1px solid #4a637d' }}>
                <p style={{ margin: 0, fontSize: '14px', color: COLOR_LIGHT_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentFileName ? `Dosya: ${currentFileName}` : 'Henüz dosya yüklenmedi.'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: COLOR_SECONDARY_TEXT }}>
                    Durum: {status} | Satır: {totalLines}
                </p>
            </div>
            
            {/* İlerleme Çubuğu */}
            <div style={{ margin: '10px 0' }}>
                <progress value={currentProgress} max="100" style={{ width: '100%', height: '10px', appearance: 'none', border: 'none', borderRadius: '5px', overflow: 'hidden' }} />
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: COLOR_SECONDARY_TEXT }}>
                    İlerleme: {currentProgress}% (Satır: {currentLine})
                </p>
            </div>

            {/* BAŞLAT/DURDUR Kontrol Butonları */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                <button 
                    onClick={handleStartPrint} 
                    disabled={!isReadyToPrint} 
                    style={{ padding: '10px', flex: 1, marginRight: '5px', border: 'none', borderRadius: '5px', cursor: !isReadyToPrint ? 'not-allowed' : 'pointer', transition: 'background-color 0.3s', 
                             backgroundColor: isReadyToPrint ? '#2ecc71' : '#7f8c8d', color: 'white' }}
                >
                    Start Print
                </button>
                <button 
                    onClick={handleStopPrint} 
                    disabled={!isStreaming} 
                    style={{ padding: '10px', flex: 1, marginLeft: '5px', border: 'none', borderRadius: '5px', cursor: !isStreaming ? 'not-allowed' : 'pointer', transition: 'background-color 0.3s', 
                             backgroundColor: isStreaming ? '#c0392b' : '#7f8c8d', color: 'white' }}
                >
                    Durdur
                </button>
            </div>
        </div>
    );
};

export default StreamManager;