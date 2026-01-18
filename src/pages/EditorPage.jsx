import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { FontSize } from '../components/Editor/Extensions/FontSize';
import Toolbar from '../components/Editor/Toolbar';
import { useState, useEffect, useRef } from 'react';
import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import { db } from '../firebase';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';

const EditorPage = () => {
    const { user, loading } = useAuth();
    const { focusMode } = useUI();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const docId = searchParams.get('id');

    const [title, setTitle] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [chapters, setChapters] = useState([
        { id: '1', title: 'Chapter 1', subtitle: 'The Beginning', content: '' }
    ]);
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);
    const [showChapters, setShowChapters] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [isPublishing, setIsPublishing] = useState(false);
    const subtitleRef = useRef(null);

    const isDistractionFree = focusMode && isTyping;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Placeholder.configure({ placeholder: 'Start writing your story...' }),
            TextStyle,
            FontFamily,
            FontSize,
        ],
        content: '',
        onUpdate: () => {
            if (focusMode) setIsTyping(true);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-lg prose-ink prose-p:font-serif prose-headings:font-serif focus:outline-none max-w-none text-ink leading-relaxed',
            },
        },
    });

    // Load Draft if ID exists
    useEffect(() => {
        const loadDraft = async () => {
            if (!docId || !user || !editor) return;

            try {
                const docRef = doc(db, "stories", docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.authorId !== user.uid) {
                        navigate('/drafts');
                        return;
                    }
                    setTitle(data.title || '');
                    if (data.chapters && data.chapters.length > 0) {
                        setChapters(data.chapters);
                        if (editor) {
                            editor.commands.setContent(data.chapters[0].content || '');
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading draft:", error);
            }
        };

        loadDraft();
    }, [docId, user, editor, navigate]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    // Focus Mode Logic
    useEffect(() => {
        if (!focusMode) {
            setIsTyping(false);
            return;
        }

        let lastX = 0;
        let lastY = 0;

        const handleActivity = (e) => {
            const deltaX = Math.abs(e.screenX - lastX);
            const deltaY = Math.abs(e.screenY - lastY);

            if (deltaX > 20 || deltaY > 20) {
                setIsTyping(false);
            }

            lastX = e.screenX;
            lastY = e.screenY;
        };

        window.addEventListener('mousemove', handleActivity);
        return () => window.removeEventListener('mousemove', handleActivity);
    }, [focusMode]);

    const activeChapter = chapters[activeChapterIndex] || { title: 'Chapter', subtitle: '', content: '' };

    const updateChapter = (updates) => {
        const newChapters = [...chapters];
        newChapters[activeChapterIndex] = { ...activeChapter, ...updates };
        setChapters(newChapters);
    };

    const addChapter = () => {
        const newChapter = {
            id: Date.now().toString(),
            title: `Chapter ${chapters.length + 1}`,
            subtitle: '',
            content: ''
        };
        setChapters([...chapters, newChapter]);
        setActiveChapterIndex(chapters.length);
        editor?.commands.setContent('');
    };

    const switchChapter = (index) => {
        if (editor) {
            const newChapters = [...chapters];
            newChapters[activeChapterIndex] = { ...activeChapter, content: editor.getHTML() };
            setChapters(newChapters);
        }
        setActiveChapterIndex(index);
        setShowChapters(false);
        editor?.commands.setContent(chapters[index].content);
    };

    const handleSave = async () => {
        if (!user || !editor) return;
        setSaveStatus('saving');

        const type = searchParams.get('type') || 'story';

        try {
            const storyData = {
                title: title || 'Untitled',
                type: type,
                chapters: chapters.map((ch, i) =>
                    i === activeChapterIndex ? { ...ch, content: editor.getHTML() } : ch
                ),
                authorId: user.uid,
                authorName: user.name || 'Anonymous',
                updatedAt: serverTimestamp(),
                status: 'draft'
            };

            if (docId) {
                await setDoc(doc(db, "stories", docId), storyData, { merge: true });
            } else {
                const docRef = await addDoc(collection(db, "stories"), {
                    ...storyData,
                    createdAt: serverTimestamp()
                });
                navigate(`/write?id=${docRef.id}&type=${type}`, { replace: true });
            }
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Save failed dramatically:", error);
            alert("Save failed. Check browser console for details.");
            setSaveStatus('idle');
        }
    };

    const handlePublish = async () => {
        if (!user || !editor) return;
        setIsPublishing(true);

        const type = searchParams.get('type') || 'story';

        try {
            const storyData = {
                title: title || 'Untitled',
                type: type,
                chapters: chapters.map((ch, i) =>
                    i === activeChapterIndex ? { ...ch, content: editor.getHTML() } : ch
                ),
                authorId: user.uid,
                authorName: user.name || 'Anonymous',
                updatedAt: serverTimestamp(),
                status: 'published',
                excerpt: editor.getText().substring(0, 150) + '...'
            };

            if (docId) {
                await setDoc(doc(db, "stories", docId), storyData, { merge: true });
            } else {
                await addDoc(collection(db, "stories"), {
                    ...storyData,
                    createdAt: serverTimestamp()
                });
            }
            navigate('/read');
        } catch (error) {
            console.error("Publish failed dramatically:", error);
            alert("Publish failed. See console.");
        } finally {
            setIsPublishing(false);
        }
    };


    if (loading || !user) return null;

    return (
        <div className={`min-h-screen bg-paper transition-colors duration-1000 ${isDistractionFree ? 'bg-paper-dark' : 'bg-paper'}`}>

            <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${isDistractionFree ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                <NavBar />
            </div>

            <main className="pt-36 md:pt-32 pb-40 px-3 md:px-8 flex justify-center">
                <div
                    className={`max-w-3xl w-full min-h-[85vh] bg-paper shadow-xl rounded-sm p-6 md:p-16 border border-white/40 transition-all duration-700 relative cursor-text ${isDistractionFree ? 'shadow-2xl scale-[1.01]' : 'shadow-xl'}`}
                >
                    {/* Controls */}
                    <div className={`flex items-center justify-end mb-8 md:absolute md:top-6 md:right-6 md:mb-0 gap-3 transition-opacity duration-700 ${isDistractionFree ? 'opacity-0 md:hover:opacity-100' : 'opacity-100'}`}>
                        <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold text-ink-light hover:text-ink hover:bg-black/5 transition-all bg-paper/50 border border-ink-lighter/5"
                        >
                            {saveStatus === 'saving' ? (
                                <div className="w-3 h-3 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
                            ) : saveStatus === 'saved' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M20 6 9 17l-5-5"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            )}
                            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Draft'}</span>
                        </button>

                        <button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="px-4 py-1.5 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold hover:scale-105 transition-all shadow-soft flex items-center gap-2"
                        >
                            {isPublishing ? (
                                <div className="w-3 h-3 border-2 border-paper border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                            )}
                            <span>Publish</span>
                        </button>
                    </div>

                    {/* Header */}
                    <div className="mb-8 space-y-4">
                        <textarea
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Untitled Story"
                            className="w-full text-4xl md:text-5xl font-bold font-serif bg-transparent border-none outline-none placeholder:text-ink-lighter/30 resize-none overflow-hidden"
                            rows={1}
                        />

                        <div className="flex items-center gap-4 relative">
                            <input
                                ref={subtitleRef}
                                type="text"
                                value={activeChapter.subtitle}
                                onChange={(e) => updateChapter({ subtitle: e.target.value })}
                                placeholder="Chapter Subtitle"
                                className="flex-1 text-xl font-serif italic text-ink-light bg-transparent border-none outline-none placeholder:text-ink-lighter/30"
                            />

                            <button
                                onClick={() => setShowChapters(!showChapters)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-ink-lighter/10 text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-ink-lighter transition-all ${isDistractionFree ? 'opacity-0' : 'opacity-100'}`}
                            >
                                <span className="max-w-[80px] truncate">{activeChapter.title}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
                            </button>

                            {showChapters && (
                                <div className="absolute top-full right-0 mt-4 w-64 bg-paper border border-ink-lighter/10 shadow-xl rounded-2xl p-4 z-50 animate-fade-in origin-top-right">
                                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-ink-lighter mb-4 px-2">Chapters</h4>
                                    <div className="space-y-1 mb-4 max-h-[300px] overflow-y-auto">
                                        {chapters.map((ch, idx) => (
                                            <button
                                                key={ch.id}
                                                onClick={() => switchChapter(idx)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-serif transition-colors flex flex-col gap-0.5
                                                    ${activeChapterIndex === idx ? 'bg-ink text-paper' : 'hover:bg-black/5 text-ink-light'}
                                                `}
                                            >
                                                <span className="font-bold">{ch.title}</span>
                                                {ch.subtitle && <span className={`text-[10px] italic opacity-60 truncate ${activeChapterIndex === idx ? 'text-paper' : 'text-ink-lighter'}`}>{ch.subtitle}</span>}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={addChapter}
                                        className="w-full py-2 px-3 rounded-lg border border-dashed border-ink-lighter/20 text-xs font-bold text-ink-lighter hover:text-ink transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        <span>Add Chapter</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="prose-container relative min-h-[60vh] h-full overflow-hidden">
                        <EditorContent editor={editor} className="tiptap-editor-wrapper h-full min-h-[500px]" />
                    </div>
                </div>

                <Toolbar editor={editor} isTyping={isDistractionFree} />
            </main>
        </div>
    );
};

export default EditorPage;
