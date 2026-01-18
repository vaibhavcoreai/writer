import { useNavigate, Link, useParams } from 'react-router-dom';
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
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

const ProfilePage = () => {
    const { user: currentUser, logout, loading } = useAuth();
    const { handle: urlHandle } = useParams();
    const navigate = useNavigate();
    const [profileUser, setProfileUser] = useState(null);
    const [isPublicView, setIsPublicView] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [copied, setCopied] = useState(false);
    const [userWritings, setUserWritings] = useState([]);
    const [stats, setStats] = useState([
        { label: 'Stories', value: 0 },
        { label: 'Poems', value: 0 },
        { label: 'Drafts', value: 0 },
    ]);
    const [isFetching, setIsFetching] = useState(true);

    const isOwnProfile = !urlHandle || (currentUser && currentUser.email?.split('@')[0] === urlHandle);
    const currentHandle = profileUser?.email?.split('@')[0] || urlHandle || 'writer';
    const profileUrl = `${window.location.origin}/@${currentHandle}`;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                let targetUid = null;
                let targetUser = null;

                if (urlHandle) {
                    // Public view or handle-based view
                    // In a real app, you'd have a users collection. 
                    // For now, we'll infer from the stories if they exist, 
                    // or use the current user if it matches.
                    if (currentUser && currentUser.email?.split('@')[0] === urlHandle) {
                        targetUid = currentUser.uid;
                        targetUser = currentUser;
                        setIsPublicView(false);
                    } else {
                        setIsPublicView(true);
                        // We need to find the authorId for this handle
                        // Hack: search for a story with an author whose email starts with handle
                        // BETTER: search stories for any post by this handle.
                        // For simplicity in this demo, we'll assume the handle is unique and searchable.
                        const storiesRef = collection(db, "stories");
                        const qAuthor = query(storiesRef, where("status", "==", "published"), limit(1));
                        const qSnap = await getDocs(qAuthor);

                        // Because firestore doesn't support searching by email prefix easily without a users collection,
                        // we'll find at least one story by this author.
                        // If no story exists, we can't show much without a users collection.

                        // REFINED: Since we don't have a users collection yet, we fetch stories where visibility is public.
                    }
                } else {
                    if (currentUser) {
                        targetUid = currentUser.uid;
                        targetUser = currentUser;
                        setIsPublicView(false);
                    } else {
                        navigate('/login');
                        return;
                    }
                }

                const q = query(
                    collection(db, "stories"),
                    where("authorId", "==", targetUid || ""),
                    where("status", "==", targetUid === currentUser?.uid ? "draft" : "published"), // Dummy for now
                    orderBy("updatedAt", "desc")
                );

                // REAL LOGIC:
                const storiesRef = collection(db, "stories");
                let finalWritings = [];

                if (targetUid) {
                    const qReal = query(
                        storiesRef,
                        where("authorId", "==", targetUid),
                        orderBy("updatedAt", "desc")
                    );
                    const snap = await getDocs(qReal);
                    finalWritings = snap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        date: doc.data().updatedAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Just now'
                    }));
                    setProfileUser(targetUser);
                } else if (urlHandle) {
                    // Try to find stories by this handle (authorName is closest we have)
                    // Normally you'd query a 'users' collection by handle.
                    // For now, let's filter the first 50 published stories for a match (TEMPORARY HACK)
                    const qPublic = query(collection(db, "stories"), where("status", "==", "published"), limit(50));
                    const snap = await getDocs(qPublic);
                    const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Filter match
                    const authorPosts = allDocs.filter(d => d.authorEmail?.split('@')[0] === urlHandle || d.authorName?.toLowerCase().replace(/\s/g, '') === urlHandle.toLowerCase());

                    if (authorPosts.length > 0) {
                        finalWritings = authorPosts.map(d => ({
                            ...d,
                            date: d.updatedAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Just now'
                        }));
                        setProfileUser({
                            uid: authorPosts[0].authorId,
                            name: authorPosts[0].authorName,
                            avatarUrl: authorPosts[0].authorAvatar || `https://ui-avatars.com/api/?name=${authorPosts[0].authorName}&background=2C2C2C&color=F9F8F4`
                        });
                    }
                }

                setUserWritings(isOwnProfile ? finalWritings : finalWritings.filter(w => w.status === 'published'));

                // Calculate stats
                const processed = isOwnProfile ? finalWritings : finalWritings.filter(w => w.status === 'published');
                const storiesCount = processed.filter(w => (w.type?.toLowerCase() === 'story' || !w.type) && w.status === 'published').length;
                const poemsCount = processed.filter(w => w.type?.toLowerCase() === 'poem' && w.status === 'published').length;
                const draftsCount = isOwnProfile ? finalWritings.filter(w => w.status === 'draft').length : 0;

                setStats([
                    { label: 'Stories', value: storiesCount },
                    { label: 'Poems', value: poemsCount },
                    ...(isOwnProfile ? [{ label: 'Drafts', value: draftsCount }] : []),
                ]);

            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setIsFetching(false);
                setLoaded(true);
            }
        };

        if (!loading) {
            fetchUserData();
        }
    }, [currentUser, loading, urlHandle, navigate, isOwnProfile]);

    const moveToDraft = async (e, writingId) => {
        e.stopPropagation();
        if (!window.confirm("Move this back to drafts? It will be hidden from the public feed.")) return;

        try {
            const docRef = doc(db, "stories", writingId);
            await updateDoc(docRef, {
                status: 'draft',
                updatedAt: serverTimestamp()
            });

            // Update local state
            setUserWritings(prev => prev.map(w =>
                w.id === writingId ? { ...w, status: 'draft' } : w
            ));

            // Recalculate stats
            const updatedWritings = userWritings.map(w =>
                w.id === writingId ? { ...w, status: 'draft' } : w
            );
            const storiesCount = updatedWritings.filter(w => (w.type?.toLowerCase() === 'story' || !w.type) && w.status === 'published').length;
            const poemsCount = updatedWritings.filter(w => w.type?.toLowerCase() === 'poem' && w.status === 'published').length;
            const draftsCount = updatedWritings.filter(w => w.status === 'draft').length;

            setStats([
                { label: 'Stories', value: storiesCount },
                { label: 'Poems', value: poemsCount },
                { label: 'Drafts', value: draftsCount },
            ]);

        } catch (error) {
            console.error("Error moving to draft:", error);
            alert("Failed to move to draft.");
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayUser = isOwnProfile ? currentUser : profileUser;

    if (isFetching && !displayUser) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!displayUser && !isFetching) {
        return (
            <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-2xl font-serif font-bold mb-4">Writer not found.</h1>
                <p className="text-ink-light mb-8 italic">This storyteller hasn't arrived yet.</p>
                <Link to="/" className="px-6 py-2 bg-ink text-paper rounded-full text-xs font-bold uppercase tracking-widest">Return Home</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-paper text-ink selection:bg-ink-light selection:text-paper font-sans">
            <NavBar loaded={loaded} />

            <main className="max-w-4xl mx-auto px-6 py-32 md:py-48 relative z-10">

                {/* Profile Header */}
                <header className={`flex flex-col items-center text-center mb-16 ${loaded ? 'animate-ink' : 'opacity-0'}`}>
                    <div className="relative mb-8">
                        <div className="w-28 h-28 rounded-full bg-ink/5 border-2 border-white shadow-xl flex items-center justify-center overflow-hidden group">
                            {displayUser?.avatarUrl ? (
                                <img src={displayUser.avatarUrl} alt={displayUser.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-4xl font-serif italic text-ink/40">
                                    {displayUser?.name?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        {isOwnProfile && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ink text-paper text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-lg">
                                Pro Writer
                            </div>
                        )}
                    </div>

                    <h1 className="text-4xl font-serif font-bold mb-2 tracking-tight">
                        {displayUser?.name}
                    </h1>

                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full hover:bg-black/5 transition-all group"
                    >
                        <span className="text-sm font-medium text-ink-lighter group-hover:text-ink transition-colors">@{currentHandle}</span>
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

                    {isOwnProfile && (
                        <div className="flex gap-4 mb-12">
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-2 px-6 py-2 bg-ink text-paper rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-soft"
                            >
                                {copied ? 'Link Copied' : 'Share Profile'}
                            </button>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex gap-12 items-center">
                        {stats.map((stat, i) => (
                            <div key={i} className="flex flex-col">
                                <span className="text-2xl font-serif font-bold text-ink">{stat.value}</span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-ink-lighter font-bold">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </header>

                {/* Writings List */}
                <section className="space-y-8">
                    <div className={`flex items-center justify-between mb-8 ${loaded ? 'animate-reveal stagger-1' : 'opacity-0'}`}>
                        <h2 className="text-xs uppercase tracking-[0.3em] font-bold text-ink-lighter">{isOwnProfile ? 'Your Library' : 'Writings'}</h2>
                        {isOwnProfile && (
                            <Link to="/write" className="text-xs uppercase tracking-[0.2em] font-bold text-ink-light hover:text-ink transition-colors border-b border-ink/10 pb-1">
                                New Story
                            </Link>
                        )}
                    </div>

                    {isFetching ? (
                        <div className="flex justify-center py-20">
                            <div className="w-6 h-6 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : userWritings.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {userWritings.map((writing, index) => (
                                <div
                                    key={writing.id}
                                    className={`group flex items-center justify-between p-6 bg-paper border border-white/40 rounded-2xl shadow-soft hover:shadow-xl transition-all
                                        ${loaded ? 'animate-reveal' : 'opacity-0'}
                                    `}
                                    style={{ animationDelay: `${0.8 + index * 0.1}s` }}
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
                                        <span className="text-xs text-ink-lighter uppercase tracking-widest font-bold">{writing.type || 'Story'}</span>
                                    </div>

                                    <div className="flex items-center gap-4 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => navigate(writing.status === 'published' ? `/read/${writing.id}` : `/write?id=${writing.id}`)}
                                            className="p-3 rounded-full hover:bg-black/5 text-ink-light"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                        </button>
                                        {isOwnProfile && writing.status === 'published' && (
                                            <button
                                                onClick={(e) => moveToDraft(e, writing.id)}
                                                className="p-3 rounded-full hover:bg-black/5 text-ink-light"
                                                title="Move to Draft"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8" /><path d="m16 6-4 4-4-4" /><rect width="20" height="8" x="2" y="14" rx="2" /></svg>
                                            </button>
                                        )}
                                        {isOwnProfile && (
                                            <button
                                                onClick={() => navigate(`/write?id=${writing.id}`)}
                                                className="p-3 rounded-full hover:bg-black/5 text-ink-light"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border border-dashed border-ink-lighter/10 rounded-2xl">
                            <p className="text-ink-lighter font-serif italic mb-6">Your library is waiting for its first book.</p>
                            <Link to="/choose-type" className="px-6 py-2 bg-ink text-paper rounded-full text-[10px] uppercase tracking-widest font-bold">Start Writing</Link>
                        </div>
                    )}
                </section>

                {/* Logout Footer */}
                <footer className={`mt-32 pt-16 border-t border-ink-lighter/10 text-center ${loaded ? 'animate-reveal stagger-3' : 'opacity-0'}`}>
                    <div className="flex flex-col items-center gap-6">
                        {isOwnProfile && (
                            <button
                                onClick={() => {
                                    logout();
                                    navigate('/');
                                }}
                                className="text-xs uppercase tracking-[0.3em] font-bold text-ink-lighter hover:text-red-400 transition-colors"
                            >
                                Sign out
                            </button>
                        )}
                        <p className="text-[10px] text-ink-lighter/60 uppercase tracking-widest">
                            Built with passion by <a href="https://vaibhavmanaji.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors border-b border-ink-lighter/20">Vaibhav Manaji</a>
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default ProfilePage;
