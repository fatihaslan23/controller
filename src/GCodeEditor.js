// src/GCodeEditor.js
import { h } from 'preact';
import { useRef, useEffect, useState } from 'preact/hooks';

const GCodeEditor = ({ content, startLine, totalLines, isStreaming }) => {
    const editorRef = useRef(null);
    
    // Satıra otomatik odaklanma
    useEffect(() => {
        if (!isStreaming || !editorRef.current) return;
        const activeEl = editorRef.current.querySelector(`[data-line="${startLine}"]`);
        if (activeEl) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [startLine, isStreaming]);

    return (
        <div 
            ref={editorRef}
            style={{ 
                width: '100%', 
                height: '100%', 
                overflowY: 'auto', // Scroll sadece burada olmalı
                padding: '10px',
                fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                fontSize: '11px',
                lineHeight: '1.5',
                color: '#d4d4d4',
                boxSizing: 'border-box'
            }}
        >
            {content ? content.split('\n').map((line, i) => {
                // Aktif satır vurgusu
                const isActive = i === startLine;
                const isComment = line.trim().startsWith(';');
                
                return (
                    <div 
                        key={i} 
                        data-line={i}
                        style={{ 
                            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            borderRadius: '2px',
                            display: 'flex'
                        }}
                    >
                        <span style={{ 
                            color: '#606366', 
                            width: '35px', 
                            textAlign: 'right', 
                            marginRight: '10px', 
                            userSelect: 'none',
                            flexShrink: 0 
                        }}>{i + 1}</span>
                        <span style={{ color: isComment ? '#6a9955' : '#ce9178', whiteSpace: 'pre-wrap' }}>{line}</span>
                    </div>
                );
            }) : (
                <div style={{ color: '#606366', textAlign: 'center', marginTop: '20px' }}>
                    Dosya içeriği burada görüntülenecek...
                </div>
            )}
        </div>
    );
};

export default GCodeEditor;