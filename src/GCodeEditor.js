// src/GCodeEditor.js
import { h } from 'preact';
import { useRef, useEffect, useState } from 'preact/hooks';

const GCodeEditor = ({ content, onContentChange, startLine, totalLines, isStreaming }) => {
    const editorRef = useRef(null);
    const [editorContent, setEditorContent] = useState(content);
    
    // Tema renkleri
    const BG_COLOR = '#2c3e50'; // Terminal arkaplanı
    const LINE_NUMBER_COLOR = '#95a5a6';
    const CODE_COLOR = '#ecf0f1';
    const COMMENT_COLOR = '#2ecc71';
    const HIGHLIGHT_COLOR = '#3498db33'; // Mavi şeffaf vurgu

    useEffect(() => {
        setEditorContent(content);
    }, [content]);

    // Aktif satırı işaretle ve kaydır
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !isStreaming || startLine === undefined) return;

        editor.childNodes.forEach((line) => {
            line.style.backgroundColor = 'transparent';
        });

        const activeLineElement = editor.querySelector(`[data-line-index="${startLine}"]`);
        
        if (activeLineElement) {
            activeLineElement.style.backgroundColor = HIGHLIGHT_COLOR; 
            
            const editorHeight = editor.clientHeight;
            const scroll = editor.scrollTop;
            const lineTop = activeLineElement.offsetTop;
            const lineHeight = activeLineElement.offsetHeight;

            if (lineTop < scroll || lineTop + lineHeight > scroll + editorHeight) {
                activeLineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [startLine, isStreaming]);
    
    // G-code'u satır satır böl ve göster
    const renderContent = () => {
        if (!editorContent) {
            return h('div', { style: { opacity: 0.5, padding: '10px' } }, 'G-code içeriği burada görüntülenecektir...');
        }
        
        return editorContent.split('\n').map((line, index) => {
            return h('div', { 
                key: index, 
                'data-line-index': index, 
                style: { display: 'flex', fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: '1.4', cursor: 'default' }
            }, [
                h('span', { style: { width: '40px', marginRight: '10px', color: LINE_NUMBER_COLOR, textAlign: 'right', userSelect: 'none' } }, index + 1),
                h('span', { style: { flex: 1, color: line.startsWith(';') ? COMMENT_COLOR : CODE_COLOR } }, line)
            ]);
        });
    }

    return (
        // flex: 1 ile kalan dikey alanı doldurur.
        <div style={{ 
            flex: 1, 
            border: '1px solid #4a637d', 
            borderRadius: '4px',
            backgroundColor: BG_COLOR, 
            overflowY: 'scroll',
            fontFamily: 'monospace',
            padding: '5px',
            minHeight: '200px'
        }} ref={editorRef}>
            {renderContent()}
        </div>
    );
};

export default GCodeEditor;