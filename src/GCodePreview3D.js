// src/GCodePreview3D.js
import { h } from 'preact';

const GCodePreview3D = ({ gcodeContent }) => {
    // 3D Preview alanını görseldeki gibi sade ve koyu yapıyoruz.
    const BG_COLOR = '#1c2833'; // Görseldeki gibi koyu ton
    
    return (
        <div style={{ 
            flex: 1, 
            height: '100%', 
            backgroundColor: BG_COLOR, 
            color: '#fff',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            fontSize: '18px',
            borderRadius: '8px', // Dış panelle uyumlu
            border: '1px solid #4a637d'
        }}>
            {gcodeContent ? '3D Önizleme Alanı (G-code Yüklendi)' : '3D Önizleme Alanı (Dosya Yükleniyor...)'}
            <br />
            {gcodeContent ? '(Gelecekte 3D Görüntü Burada Yer Alacak)' : ''}
        </div>
    );
};

export default GCodePreview3D;