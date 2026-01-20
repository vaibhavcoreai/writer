import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    deleteDoc
} from 'firebase/firestore';

const DraftsPage = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [loaded, setLoaded] = useState(false);

    const fetchDrafts = async () => {
        if (!user) return;
        setIsFetching(true);

        try {
            const q = query(
                collection(db, "stories"),
                where("authorId", "==", user.uid),
                where("status", "==", "draft")
            );

            const querySnapshot = await getDocs(q);
            let fetchedDrafts = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: data.updatedAt?.toDate
                        ? data.updatedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Just now'
                };
            });

            // Client-side Sort
            fetchedDrafts.sort((a, b) => {
                const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
                const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
                return timeB - timeA;
            });

            setDrafts(fetchedDrafts);
        } catch (error) {
            console.error("Error fetching drafts:", error);
        } finally {
            setIsFetching(false);
            setLoaded(true);
        }
    };

    // Fetch drafts from Firestore
    useEffect(() => {
        if (!loading) {
            if (user) {
                fetchDrafts();
            } else {
                navigate('/login');
            }
        }
    }, [user, loading, navigate]);

    const handleDelete = async (e, draftId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this draft? This action cannot be undone.")) return;

        try {
            await deleteDoc(doc(db, "stories", draftId));
            setDrafts(drafts.filter(d => d.id !== draftId));
        } catch (error) {
            console.error("Error deleting draft:", error);
            alert("Failed to delete draft.");
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-paper text-ink selection:bg-ink-light selection:text-paper font-sans">

            {/* Background Texture */}
            <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            <NavBar loaded={loaded} />

            <main className="relative z-10 flex flex-col items-center min-h-screen px-6 py-32 md:py-48 max-w-4xl mx-auto">

                <header className={`text-center mb-16 ${loaded ? 'animate-ink stagger-header' : 'opacity-0'}`}>
                    <h2 className="font-serif text-4xl md:text-5xl mb-4 tracking-tight text-ink">Continue Writing</h2>
                    <p className="text-ink-light font-serif italic text-lg max-w-md mx-auto leading-relaxed">
                        Pick up your pen right where you left it. Your stories are waiting.
                    </p>
                </header>

                <div className="w-full space-y-4">
                    {isFetching ? (
                        <div className="flex justify-center py-20">
                            <div className="w-6 h-6 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : drafts.length > 0 ? (
                        drafts.map((draft, index) => (
                            <div
                                key={draft.id}
                                onClick={() => navigate(`/write?id=${draft.id}&type=${draft.type || 'story'}`)}
                                className={`group flex flex-col md:flex-row md:items-center justify-between p-6 md:px-8 bg-paper border border-white/40 rounded-xl shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer 
                                    ${loaded ? 'animate-reveal' : 'opacity-0'}
                                `}
                                style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                            >
                                <div className="space-y-1">
                                    <h3 className="text-xl font-serif font-medium text-ink group-hover:text-ink transition-colors">
                                        {draft.title || 'Untitled Draft'}
                                    </h3>
                                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-ink-lighter font-bold">
                                        <span>Last edited: {draft.date}</span>
                                        <span className="opacity-30">•</span>
                                        <span>{draft.type || 'story'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-6 md:mt-0">
                                    <button
                                        onClick={(e) => handleDelete(e, draft.id)}
                                        className="p-2 text-red-800/40 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                        title="Delete Draft"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    </button>
                                    <button className="text-[10px] uppercase tracking-[0.2em] font-bold text-ink-lighter group-hover:text-ink transition-colors flex items-center gap-2">
                                        <span>Open {draft.type || 'Notebook'}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 border border-dashed border-ink-lighter/10 rounded-3xl animate-reveal stagger-2">
                            <p className="text-ink-lighter font-serif italic mb-6">No drafts found. The page is waiting for your touch.</p>
                            <button
                                onClick={() => navigate('/choose-type')}
                                className="px-6 py-2 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold hover:scale-105 transition-all shadow-soft"
                            >
                                Start Writing
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DraftsPage;
