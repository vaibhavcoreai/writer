import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    limit,
    doc,
    updateDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';

const ProfilePage = () => {
    const { user: currentUser, loading: authLoading } = useAuth();
    const { handle: urlHandle } = useParams();
    const navigate = useNavigate();

    const [profileUser, setProfileUser] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [copied, setCopied] = useState(false);
    const [userWritings, setUserWritings] = useState([]);
    const [stats, setStats] = useState([
        { label: 'Published', value: 0 },
        { label: 'Hearts', value: 0 },
    ]);
    const [isFetching, setIsFetching] = useState(true);
    const [activeTab, setActiveTab] = useState('writings'); // 'writings' or 'saved'
    const [savedWritings, setSavedWritings] = useState([]);
    const [fetchingSaved, setFetchingSaved] = useState(false);

    // Filter the handle from URL (e.g., "@vaibhav" -> "vaibhav")
    const cleanHandle = urlHandle?.startsWith('@') ? urlHandle.slice(1) : urlHandle;
    const isOwnProfile = !cleanHandle || cleanHandle === 'profile' || (currentUser && currentUser.handle === cleanHandle);
    const displayHandle = cleanHandle || currentUser?.handle || 'writer';
    const profileUrl = `${window.location.origin}/@${displayHandle}`;

    useEffect(() => {
        const fetchUserData = async () => {
            if (authLoading) return;

            try {
                let targetUid = null;
                let targetUser = null;

                // 1. Resolve Target User
                if (cleanHandle && cleanHandle !== 'profile') {
                    const usersRef = collection(db, "users");
                    const qUser = query(usersRef, where("handle", "==", cleanHandle), limit(1));
                    const userSnap = await getDocs(qUser);

                    if (!userSnap.empty) {
                        targetUser = userSnap.docs[0].data();
                        targetUid = userSnap.docs[0].id;
                    } else {
                        // Search stories for authorHandle
                        const storiesRef = collection(db, "stories");
                        const qStoriesSync = query(
                            storiesRef,
                            where("status", "==", "published"),
                            where("authorHandle", "==", cleanHandle),
                            limit(1)
                        );
                        const syncSnap = await getDocs(qStoriesSync);

                        if (!syncSnap.empty) {
                            const data = syncSnap.docs[0].data();
                            targetUid = data.authorId;
                            targetUser = {
                                uid: targetUid,
                                name: data.authorName,
                                avatarUrl: data.authorAvatar,
                                handle: cleanHandle
                            };
                        } else {
                            // prefix match fallback
                            const qAll = query(storiesRef, where("status", "==", "published"), limit(100));
                            const allSnap = await getDocs(qAll);
                            const found = allSnap.docs.find(d => d.data().authorEmail?.split('@')[0] === cleanHandle);
                            if (found) {
                                const data = found.data();
                                targetUid = data.authorId;
                                targetUser = {
                                    uid: targetUid,
                                    name: data.authorName,
                                    avatarUrl: data.authorAvatar,
                                    handle: cleanHandle
                                };
                            }
                        }
                    }
                } else if (currentUser) {
                    targetUid = currentUser.uid;
                    targetUser = currentUser;
                } else {
                    navigate('/login');
                    return;
                }

                if (!targetUid) {
                    setIsFetching(false);
                    return;
                }

                setProfileUser(targetUser);

                // 2. REAL-TIME Writings and Stats
                const writingsRef = collection(db, "stories");
                const isOwner = targetUid === currentUser?.uid;
                const qWritings = isOwner
                    ? query(writingsRef, where("authorId", "==", targetUid))
                    : query(writingsRef, where("authorId", "==", targetUid), where("status", "==", "published"));

                const unsubscribe = onSnapshot(qWritings, (snapshot) => {
                    let allWritings = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            date: data.updatedAt?.toDate
                                ? data.updatedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'Just now'
                        };
                    });

                    // Sort client-side
                    allWritings.sort((a, b) => {
                        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
                        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
                        return timeB - timeA;
                    });

                    setUserWritings(allWritings);

                    // Real-time Stats
                    const publishedCount = allWritings.filter(w => w.status === 'published').length;
                    const heartsCount = allWritings.filter(w => w.status === 'published').reduce((acc, w) => acc + (w.likesCount || 0), 0);

                    setStats([
                        { label: 'Published', value: publishedCount },
                        { label: 'Hearts', value: heartsCount }
                    ]);

                    setIsFetching(false);
                    setLoaded(true);
                }, (error) => {
                    console.error("Snapshot Error:", error);
                    setIsFetching(false);
                });

                return () => unsubscribe();

            } catch (error) {
                console.error("Profile Error:", error);
                setIsFetching(false);
            }
        };

        fetchUserData();
    }, [urlHandle, currentUser, authLoading, navigate]);

    useEffect(() => {
        const fetchSavedWritings = async () => {
            if (!currentUser || !profileUser || currentUser.uid !== profileUser.uid || activeTab !== 'saved') return;

            setFetchingSaved(true);
            try {
                const savesRef = collection(db, "saves");
                const qSaves = query(savesRef, where("userId", "==", currentUser.uid));
                const savesSnap = await getDocs(qSaves);

                let fetchedSaves = savesSnap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: data.storyId,
                        saveDocId: doc.id,
                        ...data,
                        date: data.savedAt?.toDate
                            ? data.savedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'Just now',
                        rawDate: data.savedAt?.toMillis ? data.savedAt.toMillis() : 0
                    };
                });

                // Client-side sort
                fetchedSaves.sort((a, b) => b.rawDate - a.rawDate);

                setSavedWritings(fetchedSaves);
            } catch (err) {
                console.error("Error fetching saves:", err);
            } finally {
                setFetchingSaved(false);
            }
        };

        fetchSavedWritings();
    }, [activeTab, currentUser, profileUser]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isFetching) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profileUser && !isFetching) {
        return (
            <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-6">
                <NavBar loaded={true} />
                <h1 className="text-2xl font-serif font-bold mb-4">Writer Not Found</h1>
                <p className="text-ink-light mb-8 italic">This path leads to an empty page.</p>
                <Link to="/" className="px-6 py-2 bg-ink text-paper rounded-full text-xs font-bold uppercase tracking-widest">Go Home</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-paper text-ink selection:bg-ink-light selection:text-paper font-sans">
            <NavBar loaded={loaded} />

            <main className="max-w-4xl mx-auto px-6 py-32 md:py-48 relative z-10">
                <header className={`flex flex-col items-center text-center mb-16 ${loaded ? 'animate-ink' : 'opacity-0'}`}>
                    <div className="relative mb-8">
                        <div className="w-28 h-28 rounded-full bg-ink/5 border-2 border-white shadow-xl flex items-center justify-center overflow-hidden group">
                            {profileUser?.avatarUrl ? (
                                <img src={profileUser.avatarUrl} alt={profileUser.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-4xl font-serif italic text-ink/40">
                                    {(profileUser?.name?.[0] || 'W').toUpperCase()}
                                </div>
                            )}
                        </div>
                        {currentUser?.uid === profileUser?.uid && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ink text-paper text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-lg">
                                Pro Writer
                            </div>
                        )}
                    </div>

                    <h1 className="text-4xl font-serif font-bold mb-2 tracking-tight">
                        {profileUser?.name}
                    </h1>

                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full hover:bg-black/5 transition-all group"
                    >
                        <span className="text-sm font-medium text-ink-lighter group-hover:text-ink transition-colors">@{displayHandle}</span>
                        <div className={`p-1 rounded-md transition-all ${copied ? 'bg-green-500/10 text-green-600' : 'text-ink-lighter group-hover:text-ink'}`}>
                            {copied ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            )}
                        </div>
                    </button>

                    <p className="text-ink-light font-serif italic text-lg max-w-md mx-auto mb-10 leading-relaxed">
                        Observing the world through ink and silence. storyteller, dreamer, and explorer of quiet pages.
                    </p>

                    {currentUser?.uid === profileUser?.uid && (
                        <div className="flex gap-4 mb-12">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-2 px-6 py-2 bg-ink text-paper rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-soft"
                            >
                                {copied ? 'Link Copied' : 'Share Profile'}
                            </button>
                        </div>
                    )}

                    <div className="flex gap-12 items-center">
                        {stats.map((stat, i) => (
                            <div key={stat.label} className="flex flex-col">
                                <span className="text-2xl font-serif font-bold text-ink">{stat.value}</span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-ink-lighter font-bold">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </header>

                <section className="space-y-8">
                    <div className={`flex items-center justify-between mb-8 border-b border-ink/5 pb-4 ${loaded ? 'animate-reveal stagger-1' : 'opacity-0'}`}>
                        <div className="flex gap-8">
                            <button
                                onClick={() => setActiveTab('writings')}
                                className={`text-xs uppercase tracking-[0.3em] font-bold transition-all p-1 relative
                                    ${activeTab === 'writings' ? 'text-ink' : 'text-ink-lighter hover:text-ink-light'}
                                `}
                            >
                                {currentUser?.uid === profileUser?.uid ? 'Your Library' : 'Writings'}
                                {activeTab === 'writings' && <div className="absolute -bottom-4 left-0 w-full h-0.5 bg-ink"></div>}
                            </button>
                            {currentUser?.uid === profileUser?.uid && (
                                <button
                                    onClick={() => setActiveTab('saved')}
                                    className={`text-xs uppercase tracking-[0.3em] font-bold transition-all p-1 relative
                                        ${activeTab === 'saved' ? 'text-ink' : 'text-ink-lighter hover:text-ink-light'}
                                    `}
                                >
                                    Saved
                                    {activeTab === 'saved' && <div className="absolute -bottom-4 left-0 w-full h-0.5 bg-ink"></div>}
                                </button>
                            )}
                        </div>
                        {currentUser?.uid === profileUser?.uid && activeTab === 'writings' && (
                            <Link to="/choose-type" className="text-xs uppercase tracking-[0.2em] font-bold text-ink-light hover:text-ink transition-colors border-b border-ink/10 pb-1">
                                New Notebook
                            </Link>
                        )}
                    </div>

                    {activeTab === 'writings' ? (
                        <>
                            {userWritings.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {userWritings.map((writing, index) => (
                                        <Link
                                            to={`/read/${writing.id}`}
                                            key={writing.id}
                                            className={`group flex items-center justify-between p-6 bg-paper border border-white/40 rounded-2xl shadow-soft hover:shadow-xl transition-all
                                                    ${loaded ? 'animate-reveal' : 'opacity-0'}
                                                `}
                                            style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[10px] uppercase tracking-widest font-bold 
                                                            ${writing.status === 'published' ? 'text-green-600/60' : 'text-amber-600/60'}
                                                        `}>
                                                        {writing.status}
                                                    </span>
                                                    <span className="text-ink-lighter font-serif italic text-xs">{writing.date}</span>
                                                </div>
                                                <h3 className="text-xl font-serif font-medium text-ink group-hover:tracking-tight transition-all">
                                                    {writing.title || 'Untitled'}
                                                </h3>
                                                <div className="flex items-center gap-4 text-[10px] text-ink-lighter uppercase tracking-widest font-bold">
                                                    <span>{writing.type ? (writing.type.charAt(0).toUpperCase() + writing.type.slice(1)) : 'Story'}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                                                        <span>{writing.likesCount || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-full hover:bg-black/5 text-ink-light">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border border-dashed border-ink-lighter/10 rounded-2xl">
                                    <p className="text-ink-lighter font-serif italic">The quiet pages await their first ink.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {fetchingSaved ? (
                                <div className="flex justify-center py-20">
                                    <div className="w-6 h-6 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : savedWritings.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {savedWritings.map((saved, index) => (
                                        <Link
                                            to={`/read/${saved.id}`}
                                            key={saved.id}
                                            className="group flex items-center justify-between p-6 bg-paper border border-white/40 rounded-2xl shadow-soft hover:shadow-xl transition-all animate-reveal"
                                            style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-ink-lighter">Saved Post</span>
                                                    <span className="text-ink-lighter font-serif italic text-xs">{saved.date}</span>
                                                </div>
                                                <h3 className="text-xl font-serif font-medium text-ink group-hover:tracking-tight transition-all">
                                                    {saved.title || 'Untitled'}
                                                </h3>
                                                <div className="flex items-center gap-4 text-[10px] text-ink-lighter uppercase tracking-widest font-bold">
                                                    <span>{saved.type ? (saved.type.charAt(0).toUpperCase() + saved.type.slice(1)) : 'Story'}</span>
                                                    <span>by {saved.authorName}</span>
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-full hover:bg-black/5 text-ink-light">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border border-dashed border-ink-lighter/10 rounded-2xl">
                                    <p className="text-ink-lighter font-serif italic">You haven't saved any masterpieces yet.</p>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
};

export default ProfilePage;
