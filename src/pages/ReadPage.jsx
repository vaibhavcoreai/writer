import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';

const ReadPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [showChapterMenu, setShowChapterMenu] = useState(false);

    const unpublishStory = async () => {
        if (!user || user.uid !== story.authorId) {
            alert("You are not authorized to unpublish this story.");
            return;
        }

        if (!window.confirm("Move this back to drafts? It will no longer be visible in the public library.")) return;

        try {
            const docRef = doc(db, "stories", id);
            await updateDoc(docRef, {
                status: 'draft',
                updatedAt: serverTimestamp()
            });
            navigate('/drafts');
        } catch (error) {
            console.error("Error unpublishing:", error);
            alert("Failed to move to drafts.");
        }
    };

    const toggleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        const isLiked = story.likes?.includes(user.uid);
        const docRef = doc(db, "stories", id);

        try {
            // Optimistic update
            setStory(prev => ({
                ...prev,
                likes: isLiked
                    ? (prev.likes || []).filter(uid => uid !== user.uid)
                    : [...(prev.likes || []), user.uid],
                likesCount: isLiked ? (prev.likesCount || 1) - 1 : (prev.likesCount || 0) + 1
            }));

            await updateDoc(docRef, {
                likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
                likesCount: isLiked ? (story.likesCount || 1) - 1 : (story.likesCount || 0) + 1
            });
        } catch (error) {
            console.error("Error toggling like:", error);
            // Revert on error
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) setStory(docSnap.data());
        }
    };

    const toggleSave = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (saving) return;
        setSaving(true);

        try {
            if (isSaved) {
                const q = query(collection(db, "saves"), where("userId", "==", user.uid), where("storyId", "==", id));
                const snap = await getDocs(q);
                for (const saveDoc of snap.docs) {
                    await deleteDoc(doc(db, "saves", saveDoc.id));
                }
                setIsSaved(false);
            } else {
                await addDoc(collection(db, "saves"), {
                    userId: user.uid,
                    storyId: id,
                    savedAt: serverTimestamp(),
                    title: story.title,
                    type: story.type || 'story',
                    authorName: story.authorName,
                    authorHandle: story.authorHandle,
                    excerpt: story.excerpt || '',
                    updatedAt: story.updatedAt
                });
                setIsSaved(true);
            }
        } catch (err) {
            console.error("Save Error:", err);
        } finally {
            setSaving(false);
        }
    };

    const saveProgress = async (index) => {
        if (!user || !id) return;
        try {
            const progressRef = doc(db, "reading_progress", `${user.uid}_${id}`);
            await setDoc(progressRef, {
                userId: user.uid,
                storyId: id,
                lastChapterIndex: index,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (err) {
            console.error("Error saving progress:", err);
        }
    };

    const handleChapterChange = (index) => {
        setCurrentChapterIndex(index);
        setShowChapterMenu(false);
        saveProgress(index);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchStory = async () => {
            if (authLoading) return;

            try {
                const docRef = doc(db, "stories", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setStory(data);

                    // Fetch Progress ONLY after story exists
                    if (user) {
                        const progressRef = doc(db, "reading_progress", `${user.uid}_${id}`);
                        const progSnap = await getDoc(progressRef);
                        if (progSnap.exists()) {
                            const savedIndex = progSnap.data().lastChapterIndex;
                            // Ensure saved index is valid for current story
                            if (data.chapters && savedIndex < data.chapters.length) {
                                setCurrentChapterIndex(savedIndex);
                            }
                        }
                    }
                } else {
                    console.error("No such story!");
                    navigate('/read');
                }
            } catch (error) {
                console.error("Error fetching story:", error);
            } finally {
                setLoading(false);
                setLoaded(true);
            }
        };

        const checkSaveStatus = async () => {
            if (user) {
                const q = query(collection(db, "saves"), where("userId", "==", user.uid), where("storyId", "==", id));
                const snap = await getDocs(q);
                setIsSaved(!snap.empty);
            }
        };

        fetchStory();
        checkSaveStatus();
    }, [id, navigate, authLoading, user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!story) return null;

    return (
        <div className="min-h-screen bg-paper text-ink selection:bg-ink-light selection:text-paper font-sans">
            <NavBar loaded={loaded} />

            <main className="max-w-3xl mx-auto px-6 py-32 md:py-48 relative z-10">
                <article className={loaded ? 'animate-ink stagger-header' : 'opacity-0'}>
                    {/* Header */}
                    <header className="mb-16 text-center">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-lighter">{story.type || 'Story'}</span>
                            <span className="w-1 h-1 bg-ink-lighter/30 rounded-full"></span>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-ink-lighter">3 min read</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-serif font-bold mb-8 leading-tight">
                            {story.title}
                        </h1>

                        <div className="flex flex-col items-center gap-4">
                            <Link
                                to={`/@${story.authorHandle || story.authorEmail?.split('@')[0] || 'writer'}`}
                                className="text-xs font-bold uppercase tracking-widest text-ink hover:underline decoration-ink/20 transition-all font-sans"
                            >
                                By {story.authorName}
                            </Link>
                            <span className="text-[10px] uppercase tracking-widest text-ink-lighter font-medium italic">
                                Published on {story.updatedAt?.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>

                            {user && user.uid === story.authorId && (
                                <div className="flex gap-4 mt-4">
                                    <button
                                        onClick={() => navigate(`/write?id=${id}&type=${story.type || 'story'}`)}
                                        className="text-[10px] uppercase tracking-widest font-bold text-ink-light px-4 py-2 rounded-full border border-ink-lighter/20 hover:bg-black/5"
                                    >
                                        Edit {story.type ? (story.type.charAt(0).toUpperCase() + story.type.slice(1)) : 'Story'}
                                    </button>
                                    <button
                                        onClick={unpublishStory}
                                        className="text-[10px] uppercase tracking-widest font-bold text-red-500/60 px-4 py-2 rounded-full border border-red-500/10 hover:bg-red-50/50"
                                    >
                                        Move to Drafts
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>

                    {/* Chapter Navigation */}
                    <div className="flex items-center justify-between mb-12 border-b border-ink/5 pb-8 relative">
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-ink-lighter">Chapter</span>
                            <button
                                onClick={() => setShowChapterMenu(!showChapterMenu)}
                                className="flex items-center gap-2 group"
                            >
                                <span className="text-xl font-serif font-bold text-ink group-hover:text-ink-light transition-colors">
                                    {story.chapters?.[currentChapterIndex]?.title || `Chapter ${currentChapterIndex + 1}`}
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-ink-lighter transition-transform ${showChapterMenu ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"></path></svg>
                            </button>
                        </div>

                        {showChapterMenu && (
                            <div className="absolute top-full left-0 mt-4 w-64 bg-paper border border-ink-lighter/10 shadow-2xl rounded-2xl p-4 z-50 animate-fade-in origin-top-left">
                                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-ink-lighter mb-4 px-2">Table of Contents</h4>
                                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                    {story.chapters?.map((ch, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleChapterChange(idx)}
                                            className={`w-full text-left px-3 py-3 rounded-xl text-sm font-serif transition-colors flex flex-col gap-0.5
                                                ${currentChapterIndex === idx ? 'bg-ink text-paper' : 'hover:bg-black/5 text-ink-light'}
                                            `}
                                        >
                                            <span className="font-bold">{ch.title || `Chapter ${idx + 1}`}</span>
                                            {ch.subtitle && <span className={`text-[10px] italic opacity-60 truncate ${currentChapterIndex === idx ? 'text-paper' : 'text-ink-lighter'}`}>{ch.subtitle}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                disabled={currentChapterIndex === 0}
                                onClick={() => handleChapterChange(currentChapterIndex - 1)}
                                className="p-3 rounded-full hover:bg-black/5 text-ink-lighter hover:text-ink disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
                            </button>
                            <button
                                disabled={!story.chapters || currentChapterIndex === story.chapters.length - 1}
                                onClick={() => handleChapterChange(currentChapterIndex + 1)}
                                className="p-3 rounded-full hover:bg-black/5 text-ink-lighter hover:text-ink disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"></path></svg>
                            </button>
                        </div>
                    </div>

                    {/* Active Chapter Content Only */}
                    <div className={`space-y-16 ${loaded ? 'animate-reveal stagger-body' : 'opacity-0'}`}>
                        {story.chapters && story.chapters[currentChapterIndex] ? (
                            <section className="prose prose-lg md:prose-xl prose-ink prose-p:font-serif prose-headings:font-serif max-w-none">
                                {story.chapters[currentChapterIndex].subtitle && (
                                    <h2 className="text-2xl italic text-ink-light mb-8">{story.chapters[currentChapterIndex].subtitle}</h2>
                                )}
                                <div
                                    dangerouslySetInnerHTML={{ __html: story.chapters[currentChapterIndex].content }}
                                    className="leading-relaxed md:leading-[1.8] text-ink/90 first-letter:text-5xl first-letter:font-serif first-letter:mr-3 first-letter:float-left first-letter:text-ink"
                                />
                            </section>
                        ) : (
                            <div className="text-center py-20 italic text-ink-lighter">This story has no content.</div>
                        )}
                    </div>

                    {/* Next Chapter Prompt */}
                    {story.chapters && currentChapterIndex < story.chapters.length - 1 && (
                        <div className="mt-20 p-8 rounded-3xl bg-paper-dark/30 border border-white/50 text-center animate-reveal">
                            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-ink-lighter block mb-4">Finished this chapter?</span>
                            <button
                                onClick={() => handleChapterChange(currentChapterIndex + 1)}
                                className="px-8 py-3 bg-ink text-paper rounded-full text-xs font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-lg inline-flex items-center gap-3"
                            >
                                Next: {story.chapters[currentChapterIndex + 1].title || `Chapter ${currentChapterIndex + 2}`}
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                            </button>
                        </div>
                    )}

                    {/* Footer */}
                    <footer className="mt-32 pt-16 border-t border-ink-lighter/10 flex flex-col items-center">
                        {/* Like Button */}
                        <div className="flex gap-8 mb-20">
                            {/* Like Button */}
                            <div className="flex flex-col items-center gap-4">
                                <button
                                    onClick={toggleLike}
                                    className={`group flex flex-col items-center justify-center p-6 rounded-full transition-all duration-500 hover:scale-110 active:scale-90
                                        ${story.likes?.includes(user?.uid)
                                            ? 'bg-ink text-paper shadow-2xl'
                                            : 'bg-paper-dark/50 text-ink hover:bg-white border border-ink/5'}
                                    `}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="28"
                                        height="28"
                                        viewBox="0 0 24 24"
                                        fill={story.likes?.includes(user?.uid) ? "currentColor" : "none"}
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="transition-all group-hover:rotate-12"
                                    >
                                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                                    </svg>
                                    <span className="mt-2 text-xs font-bold uppercase tracking-widest">{story.likesCount || 0}</span>
                                </button>
                                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-ink-lighter">{story.likes?.includes(user?.uid) ? "Liked" : "Like"}</span>
                            </div>

                            {/* Bookmark Button - Hidden for guests */}
                            {user && (
                                <div className="flex flex-col items-center gap-4">
                                    <button
                                        onClick={toggleSave}
                                        className={`group flex flex-col items-center justify-center p-6 rounded-full transition-all duration-500 hover:scale-110 active:scale-90
                                            ${isSaved
                                                ? 'bg-ink text-paper shadow-2xl'
                                                : 'bg-paper-dark/50 text-ink hover:bg-white border border-ink/5'}
                                        `}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <div className="w-7 h-7 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <div className="relative">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="28"
                                                    height="28"
                                                    viewBox="0 0 24 24"
                                                    fill={isSaved ? "currentColor" : "none"}
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="transition-all group-hover:-translate-y-1"
                                                >
                                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                                </svg>
                                                {isSaved && (
                                                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-md border border-white">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <span className="mt-2 text-[10px] font-bold uppercase tracking-widest">{isSaved ? "Saved" : "Save"}</span>
                                    </button>
                                    <span className={`text-[10px] uppercase tracking-[0.3em] font-bold ${isSaved ? "text-green-600/70" : "text-ink-lighter"}`}>
                                        {isSaved ? "Already in Library" : "Bookmark Post"}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="text-center mb-12">
                            <p className="text-ink-light font-serif italic text-lg mb-8 max-w-md mx-auto leading-relaxed">
                                "Every story is a child of the heart, birthed through the ink of our experiences."
                            </p>
                            <button
                                onClick={() => navigate('/read')}
                                className="text-xs uppercase tracking-[0.3em] font-bold text-ink-lighter hover:text-ink transition-colors flex items-center gap-3 mx-auto"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
                                Back to Library
                            </button>
                        </div>
                    </footer>
                </article>
            </main>
        </div>
    );
};

export default ReadPage;
