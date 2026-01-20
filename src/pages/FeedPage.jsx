import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';

const FeedPage = () => {
    const navigate = useNavigate();
    const { user: currentUser, loading: authLoading } = useAuth();
    const [loaded, setLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [publicFeed, setPublicFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [userSaves, setUserSaves] = useState(new Set());
    const [savingIds, setSavingIds] = useState(new Set());

    useEffect(() => {
        const fetchFeed = async () => {
            if (authLoading) return;

            try {
                // Fetch published stories (moving sorting to client-side to avoid index requirement)
                const q = query(
                    collection(db, "stories"),
                    where("status", "==", "published")
                );

                const querySnapshot = await getDocs(q);
                let fetchedStories = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        // Safely handle updatedAt for formatting
                        date: data.updatedAt?.toDate
                            ? data.updatedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'Just now',
                        readTime: '3 min'
                    };
                });

                // Client-side Sort
                fetchedStories.sort((a, b) => {
                    const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
                    const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
                    return timeB - timeA;
                });

                // Limit to 50 for performance
                setPublicFeed(fetchedStories.slice(0, 50));

                // Fetch user saves if logged in
                if (authLoading === false && currentUser) {
                    const savesRef = collection(db, "saves");
                    const qSaves = query(savesRef, where("userId", "==", currentUser.uid));
                    const savesSnap = await getDocs(qSaves);
                    const savesSet = new Set(savesSnap.docs.map(doc => doc.data().storyId));
                    setUserSaves(savesSet);
                }
            } catch (error) {
                console.error("Error fetching feed:", error);
            } finally {
                setLoading(false);
                setLoaded(true);
            }
        };

        fetchFeed();
    }, [authLoading, currentUser]);

    const handleToggleSave = async (e, post) => {
        e.stopPropagation();
        if (!currentUser) {
            navigate('/login');
            return;
        }

        const isSaved = userSaves.has(post.id);
        const storyId = post.id;

        // Prevent multiple clicks
        if (savingIds.has(storyId)) return;
        setSavingIds(prev => new Set(prev).add(storyId));

        try {
            if (isSaved) {
                // Unsave: find the doc and delete it
                const q = query(collection(db, "saves"), where("userId", "==", currentUser.uid), where("storyId", "==", storyId));
                const snap = await getDocs(q);
                for (const saveDoc of snap.docs) {
                    await deleteDoc(doc(db, "saves", saveDoc.id));
                }
                setUserSaves(prev => {
                    const next = new Set(prev);
                    next.delete(storyId);
                    return next;
                });
            } else {
                // Save
                await addDoc(collection(db, "saves"), {
                    userId: currentUser.uid,
                    storyId: storyId,
                    savedAt: serverTimestamp(),
                    // Cache some preview data for easier fetching in profile
                    title: post.title,
                    type: post.type || 'story',
                    authorName: post.authorName,
                    authorHandle: post.authorHandle,
                    excerpt: post.excerpt,
                    updatedAt: post.updatedAt
                });
                setUserSaves(prev => new Set(prev).add(storyId));
            }
        } catch (err) {
            console.error("Save Error:", err);
        } finally {
            setSavingIds(prev => {
                const next = new Set(prev);
                next.delete(storyId);
                return next;
            });
        }
    };

    const filteredFeed = publicFeed.filter(post => {
        const matchesTab = activeTab === 'All' || post.type?.toLowerCase() === activeTab.toLowerCase();
        const matchesSearch = post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.authorName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-paper text-ink selection:bg-ink-light selection:text-paper overflow-hidden relative font-sans">

            {/* Background Texture */}
            <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            <NavBar loaded={loaded} />

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-32 md:py-48">

                <header className={`mb-20 space-y-8 ${loaded ? 'animate-ink stagger-header' : 'opacity-0'}`}>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight">The Library</h2>
                            <p className="text-ink-light font-serif italic text-xl">Discover stories that breathe in silence.</p>
                        </div>
                    </div>

                    {/* Search and Tabs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
                        <div className="flex flex-wrap gap-3">
                            {['All', 'Story', 'Poem', 'Blog'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-2 rounded-full text-[9px] md:text-[10px] uppercase tracking-widest font-bold transition-all
                                        ${activeTab === tab
                                            ? 'bg-ink text-paper shadow-soft'
                                            : 'bg-paper-dark text-ink-lighter hover:text-ink hover:bg-white'}
                                    `}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="relative max-w-sm w-full">
                            <input
                                type="text"
                                placeholder="Search stories or authors..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-paper-dark/50 border border-ink-lighter/10 rounded-full px-6 py-3 text-sm focus:outline-none focus:border-ink/20 transition-all font-serif italic"
                            />
                            <svg className="absolute right-5 top-1/2 -translate-y-1/2 text-ink-lighter" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-40">
                        <div className="w-8 h-8 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        {filteredFeed.map((post, index) => (
                            <div
                                onClick={() => navigate(`/read/${post.id}`)}
                                key={post.id}
                                className={`group bg-paper-dark/30 hover:bg-white p-8 md:p-10 rounded-3xl border border-white/50 shadow-soft hover:shadow-2xl transition-all duration-500 flex flex-col justify-between h-[360px] cursor-pointer
                                    ${loaded ? 'animate-reveal' : 'opacity-0'}
                                `}
                                style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                            >
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-ink-lighter bg-paper/50 px-3 py-1 rounded-full border border-ink-lighter/5">
                                            {post.type ? (post.type.charAt(0).toUpperCase() + post.type.slice(1)) : 'Story'}
                                        </span>
                                        <span className="text-ink-lighter font-serif italic text-xs">{post.readTime}</span>
                                    </div>
                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className="text-3xl font-serif font-bold text-ink mb-4 group-hover:tracking-tight transition-all duration-300">
                                            {post.title}
                                        </h3>
                                        {currentUser && (
                                            <div className="flex items-center gap-3">
                                                {userSaves.has(post.id) && (
                                                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-ink/40 animate-ink">Already Saved</span>
                                                )}
                                                <button
                                                    onClick={(e) => handleToggleSave(e, post)}
                                                    className={`p-2.5 rounded-full transition-all duration-500 ${userSaves.has(post.id) ? 'bg-ink text-paper scale-110 shadow-lg' : 'bg-paper/50 text-ink-lighter hover:text-ink hover:bg-white border border-ink-lighter/10'}`}
                                                    disabled={savingIds.has(post.id)}
                                                >
                                                    {savingIds.has(post.id) ? (
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <div className="relative">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={userSaves.has(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                                            </svg>
                                                            {userSaves.has(post.id) && (
                                                                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-ink-light font-serif italic line-clamp-3 leading-relaxed">
                                        {post.excerpt}
                                    </p>
                                </div>

                                <div className="mt-8 pt-8 border-t border-ink-lighter/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center text-[10px] font-bold text-ink-light">
                                            {post.authorName?.[0]}
                                        </div>
                                        <Link
                                            to={`/@${post.authorHandle || post.authorEmail?.split('@')[0] || 'writer'}`}
                                            className="text-xs font-bold uppercase tracking-widest text-ink/70 hover:text-ink hover:underline decoration-ink/20 transition-all font-sans relative z-10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {post.authorName}
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-ink-lighter">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                                            <span className="text-[10px] font-bold">{post.likesCount || 0}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-ink-lighter uppercase tracking-widest">{post.date}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredFeed.length === 0 && (
                    <div className="text-center py-40 animate-reveal stagger-2">
                        <p className="text-ink-lighter font-serif italic mb-4">
                            {searchQuery ? "No matches found for your search." : "The library is currently quiet. Be the first to break the silence."}
                        </p>
                        <Link to="/choose-type" className="mt-8 inline-block px-10 py-3 bg-ink text-paper rounded-full text-xs font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
                            Start Writing
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FeedPage;
