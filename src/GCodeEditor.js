// src/GCodeEditor.js
import { h } from 'preact';
import { useRef, useEffect, useState, useMemo } from 'preact/hooks';

const GCodeEditor = ({ content, startLine, isStreaming }) => {
    const containerRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // --- AYARLAR ---
    const ROW_HEIGHT = 20; // Her satırın yüksekliği (piksel). CSS ile uyumlu olmalı.

    // 1. İçeriği Satırlara Böl (Memoize Et)
    // Her render'da tekrar bölmesin diye hafızada tutuyoruz.
    const lines = useMemo(() => {
        return content ? content.split('\n') : [];
    }, [content]);

    const totalLinesCount = lines.length;
    
    // Sanal toplam yükseklik (Scrollbar'ın doğru boyutta görünmesi için)
    const totalContentHeight = totalLinesCount * ROW_HEIGHT;

    // 2. Görünür Alanı Hesapla
    const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT);
    
    // Tampon (Buffer) ekle ki hızlı kaydırınca beyaz alan görünmesin
    const buffer = 10; 
    const renderStart = Math.max(0, startIndex - buffer);
    const renderEnd = Math.min(totalLinesCount, startIndex + visibleCount + buffer);

    // Sadece görünür satırları al
    const visibleLines = lines.slice(renderStart, renderEnd);

    // 3. Scroll Olayını Dinle
    const handleScroll = (e) => {
        setScrollTop(e.target.scrollTop);
    };

    // 4. Resize Observer (Pencere boyutu değişirse yeniden hesapla)
    useEffect(() => {
        if (!containerRef.current) return;
        
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        
        resizeObserver.observe(containerRef.current);
        
        // İlk yükseklik
        setContainerHeight(containerRef.current.clientHeight);

        return () => resizeObserver.disconnect();
    }, []);

    // 5. Streaming Sırasında Otomatik Kaydırma
    useEffect(() => {
        if (!isStreaming || !containerRef.current) return;
        
        // Hedef satırın piksel pozisyonu
        const targetTop = startLine * ROW_HEIGHT;
        // Eğer hedef satır görünür alanın dışındaysa kaydır
        const currentTop = containerRef.current.scrollTop;
        const currentBottom = currentTop + containerHeight;
        
        if (targetTop < currentTop || targetTop > currentBottom) {
            // Smooth scroll yerine auto (anlık) daha performanslıdır
            containerRef.current.scrollTo({ top: Math.max(0, targetTop - containerHeight / 2) });
        }
    }, [startLine, isStreaming, containerHeight]);

    return (
        <div 
            ref={containerRef}
            onScroll={handleScroll}
            style={{ 
                width: '100%', 
                height: '100%', 
                overflowY: 'auto', 
                overflowX: 'auto',
                position: 'relative', // İçerik absolute olacak
                backgroundColor: '#1e1e1e', 
                fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                fontSize: '12px',
                lineHeight: `${ROW_HEIGHT}px`, // Satır yüksekliğini CSS ile eşle
                color: '#d4d4d4',
            }}
        >
            {/* Sanal Yükseklik Tutucu (Scrollbar için) */}
            <div style={{ height: totalContentHeight, width: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}></div>

            {/* Görünür Satırlar */}
            <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                // Render edilen bloğu doğru konuma itiyoruz
                transform: `translateY(${renderStart * ROW_HEIGHT}px)` 
            }}>
                {visibleLines.length > 0 ? visibleLines.map((line, index) => {
                    const realIndex = renderStart + index;
                    const isActive = realIndex === startLine;
                    const isComment = line.trim().startsWith(';');

                    return (
                        <div 
                            key={realIndex} 
                            style={{ 
                                height: ROW_HEIGHT,
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                whiteSpace: 'pre', // Boşlukları koru
                                paddingRight: '10px'
                            }}
                        >
                            {/* Satır Numarası */}
                            <span style={{ 
                                width: '50px', 
                                textAlign: 'right', 
                                marginRight: '15px', 
                                color: '#606366', 
                                userSelect: 'none',
                                flexShrink: 0,
                                borderRight: '1px solid #333',
                                paddingRight: '5px',
                                opacity: 0.7
                            }}>
                                {realIndex + 1}
                            </span>
                            
                            {/* Kod İçeriği */}
                            <span style={{ color: isComment ? '#6a9955' : '#ce9178' }}>
                                {line}
                            </span>
                        </div>
                    );
                }) : (
                    <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontStyle:'italic' }}>
                        {content ? '' : 'G-Code dosyası bekleniyor...'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GCodeEditor;