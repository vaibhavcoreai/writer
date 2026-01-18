import { useState, useEffect, useRef } from 'react';

const fonts = [
    { label: 'Classic Serif', value: '"Playfair Display", serif', className: 'font-serif' },
    { label: 'Clean Sans', value: '"Inter", sans-serif', className: 'font-sans' },
    { label: 'Editorial', value: '"Crimson Text", serif', className: 'font-[Crimson_Text]' },
    { label: 'Modern Sans', value: '"Montserrat", sans-serif', className: 'font-[Montserrat]' },
    { label: 'Bookishly', value: '"Merriweather", serif', className: 'font-[Merriweather]' },
    { label: 'Elegant', value: '"Lora", serif', className: 'font-[Lora]' },
    { label: 'Vintage', value: '"Old Standard TT", serif', className: 'font-[Old_Standard_TT]' },
    { label: 'Graceful', value: '"EB Garamond", serif', className: 'font-[EB_Garamond]' },
    { label: 'Delicate', value: '"Spectral", serif', className: 'font-[Spectral]' },
    { label: 'Sophisticated', value: '"Cormorant Garamond", serif', className: 'font-[Cormorant_Garamond]' },
    { label: 'Classic Mono', value: '"Roboto Mono", monospace', className: 'font-mono' },
    { label: 'Rounded', value: '"Quicksand", sans-serif', className: 'font-[Quicksand]' },
];

const fontSizes = [
    { label: 'Small', value: '14px' },
    { label: 'Normal', value: '18px' },
    { label: 'Large', value: '24px' },
    { label: 'Extra Large', value: '32px' },
    { label: 'Huge', value: '48px' },
];

const Toolbar = ({ editor, isTyping }) => {
    const [, setUpdate] = useState(0);
    const [showFonts, setShowFonts] = useState(false);
    const [showSizes, setShowSizes] = useState(false);

    const fontRef = useRef(null);
    const sizeRef = useRef(null);

    /* Force re-render on editor state changes */
    useEffect(() => {
        if (!editor) return;
        const handler = () => setUpdate(v => v + 1);
        editor.on('transaction', handler);
        editor.on('selectionUpdate', handler);
        return () => {
            editor.off('transaction', handler);
            editor.off('selectionUpdate', handler);
        };
    }, [editor]);

    /* Close dropdowns on click outside */
    useEffect(() => {
        const handleClick = (e) => {
            if (fontRef.current && !fontRef.current.contains(e.target)) setShowFonts(false);
            if (sizeRef.current && !sizeRef.current.contains(e.target)) setShowSizes(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!editor) return null;

    const currentFont = fonts.find(f => editor.isActive('textStyle', { fontFamily: f.value })) || fonts[0];
    const currentSize = fontSizes.find(s => editor.isActive('textStyle', { fontSize: s.value })) || { label: 'Size', value: '' };

    const handleAction = (e, action) => {
        e.preventDefault();
        action();
    };

    const setFont = (e, fontValue) => {
        e.preventDefault();
        editor.chain().focus().setFontFamily(fontValue).run();
        setShowFonts(false);
    };

    const setSize = (e, sizeValue) => {
        e.preventDefault();
        editor.chain().focus().setFontSize(sizeValue).run();
        setShowSizes(false);
    };

    return (
        <div className={`fixed top-20 md:top-24 left-1/2 -translate-x-1/2 z-40 transition-all duration-700 w-[95vw] md:w-auto overflow-x-auto no-scrollbar ${isTyping ? 'opacity-0 pointer-events-none -translate-y-2' : 'opacity-100 translate-y-0'}`}>
            <div className="flex items-center bg-paper shadow-2xl md:shadow-soft border border-ink-lighter/10 rounded-full px-4 py-2 gap-1 relative min-w-max mx-auto">

                {/* Font Dropdown */}
                <div className="relative" ref={fontRef}>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); setShowFonts(!showFonts); setShowSizes(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 h-10 rounded-full text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Change Font"
                    >
                        <span className={`text-sm truncate max-w-[100px] ${currentFont.className}`}>
                            {currentFont.label}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showFonts ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>

                    {showFonts && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-paper border border-ink-lighter/10 shadow-lg rounded-xl overflow-hidden animate-fade-in origin-top-left z-50 p-1 max-h-[400px] overflow-y-auto">
                            {fonts.map((f) => (
                                <button
                                    key={f.value}
                                    onMouseDown={(e) => setFont(e, f.value)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between ${f.value === currentFont.value ? 'bg-ink text-paper' : 'hover:bg-black/5 dark:hover:bg-white/5 text-ink'}`}
                                >
                                    <span className={f.className}>{f.label}</span>
                                    {f.value === currentFont.value && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-[1px] h-6 bg-ink-lighter/20 mx-1"></div>

                {/* Size Dropdown */}
                <div className="relative" ref={sizeRef}>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); setShowSizes(!showSizes); setShowFonts(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 h-10 rounded-full text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Change Text Size"
                    >
                        <span className="text-sm font-medium w-12">{currentSize.label === 'Size' ? 'Size' : currentSize.label}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showSizes ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>

                    {showSizes && (
                        <div className="absolute top-full left-0 mt-2 w-40 bg-paper border border-ink-lighter/10 shadow-lg rounded-xl overflow-hidden animate-fade-in origin-top-left z-50 p-1">
                            {fontSizes.map((s) => (
                                <button
                                    key={s.value}
                                    onMouseDown={(e) => setSize(e, s.value)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between ${s.value === (currentSize.value) ? 'bg-ink text-paper' : 'hover:bg-black/5 dark:hover:bg-white/5 text-ink'}`}
                                >
                                    <span>{s.label}</span>
                                    {s.value === currentSize.value && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-[1px] h-6 bg-ink-lighter/20 mx-1"></div>

                {/* Bold */}
                <button
                    onMouseDown={(e) => handleAction(e, () => editor.chain().focus().toggleBold().run())}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${editor.isActive('bold') ? 'bg-ink text-paper' : 'text-ink hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    title="Bold"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
                </button>

                {/* Italic */}
                <button
                    onMouseDown={(e) => handleAction(e, () => editor.chain().focus().toggleItalic().run())}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${editor.isActive('italic') ? 'bg-ink text-paper' : 'text-ink hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    title="Italic"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
                </button>

                <div className="w-[1px] h-6 bg-ink-lighter/20 mx-1"></div>

                {/* Heading 1 */}
                <button
                    onMouseDown={(e) => handleAction(e, () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors font-serif font-bold text-base ${editor.isActive('heading', { level: 1 }) ? 'bg-ink text-paper' : 'text-ink hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    title="Heading 1"
                >
                    H1
                </button>

                {/* Heading 2 */}
                <button
                    onMouseDown={(e) => handleAction(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors font-serif font-bold text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-ink text-paper' : 'text-ink hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    title="Heading 2"
                >
                    H2
                </button>

                <div className="w-[1px] h-6 bg-ink-lighter/20 mx-1"></div>

                {/* Quote */}
                <button
                    onMouseDown={(e) => handleAction(e, () => editor.chain().focus().toggleBlockquote().run())}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${editor.isActive('blockquote') ? 'bg-ink text-paper' : 'text-ink hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    title="Quote"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>
                </button>

            </div>
        </div>
    );
};

export default Toolbar;
