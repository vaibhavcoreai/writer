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
    orderBy,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

const ProfilePage = () => {
    const { user: currentUser, loading: authLoading } = useAuth();
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

    // Better handle detection
    const isOwnProfile = !urlHandle || (currentUser && currentUser.handle === urlHandle);
    const currentHandle = urlHandle || currentUser?.handle || 'writer';
    const profileUrl = `${window.location.origin}/@${currentHandle}`;

    useEffect(() => {
        const fetchUserData = async () => {
            if (authLoading) return;

            try {
                let targetUid = null;
                let targetUser = null;

                // 1. Determine who we are looking for
                if (urlHandle) {
                    // Search users collection by handle
                    const usersRef = collection(db, "users");
                    const qUser = query(usersRef, where("handle", "==", urlHandle), limit(1));
                    const userSnap = await getDocs(qUser);

                    if (!userSnap.empty) {
                        targetUser = userSnap.docs[0].data();
                        targetUid = userSnap.docs[0].id;
                    } else {
                        // Fallback: search stories for this handle prefix in email or explicit handle
                        const storiesRef = collection(db, "stories");
                        const qStoriesSync = query(storiesRef, where("authorHandle", "==", urlHandle), limit(1));
                        const syncSnap = await getDocs(qStoriesSync);

                        if (!syncSnap.empty) {
                            const data = syncSnap.docs[0].data();
                            targetUid = data.authorId;
                            targetUser = {
                                uid: targetUid,
                                name: data.authorName,
                                avatarUrl: data.authorAvatar,
                                handle: urlHandle
                            };
                        } else {
                            // Deepest Fallback: Scan published stories and match prefix manually
                            const qAll = query(storiesRef, where("status", "==", "published"), limit(50));
                            const allSnap = await getDocs(qAll);
                            const found = allSnap.docs.find(d => d.data().authorEmail?.split('@')[0] === urlHandle);
                            if (found) {
                                const data = found.data();
                                targetUid = data.authorId;
                                targetUser = {
                                    uid: targetUid,
                                    name: data.authorName,
                                    avatarUrl: data.authorAvatar,
                                    handle: urlHandle
                                };
                            }
                        }
                    }
                    setIsPublicView(targetUid !== currentUser?.uid);
                } else if (currentUser) {
                    targetUid = currentUser.uid;
                    targetUser = currentUser;
                    setIsPublicView(false);
                } else {
                    // Not logged in and no handle, go to login
                    navigate('/login');
                    return;
                }

                // 2. Fetch writings for this user
                if (targetUid) {
                    setProfileUser(targetUser);
                    const writingsRef = collection(db, "stories");
                    const qWritings = query(
                        writingsRef,
                        where("authorId", "==", targetUid),
                        orderBy("updatedAt", "desc")
                    );
                    const writingsSnap = await getDocs(qWritings);
                    const allWritings = writingsSnap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        date: doc.data().updatedAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Just now'
                    }));

                    const filtered = (targetUid === currentUser?.uid) ? allWritings : allWritings.filter(w => w.status === 'published');
                    setUserWritings(filtered);

                    // 3. Stats
                    const storiesCount = filtered.filter(w => (w.type?.toLowerCase() === 'story' || !w.type) && w.status === 'published').length;
                    const poemsCount = filtered.filter(w => w.type?.toLowerCase() === 'poem' && w.status === 'published').length;
                    const statsArr = [
                        { label: 'Stories', value: storiesCount },
                        { label: 'Poems', value: poemsCount }
                    ];
                    if (targetUid === currentUser?.uid) {
                        statsArr.push({ label: 'Drafts', value: allWritings.filter(w => w.status === 'draft').length });
                    }
                    setStats(statsArr);
                } else {
                    setIsFetching(false);
                }

            } catch (error) {
                console.error("Error loading profile:", error);
            } finally {
                setIsFetching(false);
                setLoaded(true);
            }
        };

        fetchUserData();
    }, [urlHandle, currentUser, authLoading, navigate]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayUser = isPublicView ? profileUser : (currentUser || profileUser);

    if (isFetching) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-ink-lighter border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!displayUser && !isFetching) {
        return (
            <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-6">
                <NavBar loaded={true} />
                <h1 className="text-2xl font-serif font-bold mb-4">Writer Not Found</h1>
                <p className="text-ink-light mb-8 italic">This storyteller hasn't arrived yet.</p>
                <Link to="/" className="px-6 py-2 bg-ink text-paper rounded-full text-xs font-bold uppercase tracking-widest">Return Home</Link>
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
                            {displayUser?.avatarUrl ? (
                                <img src={displayUser.avatarUrl} alt={displayUser.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-4xl font-serif italic text-ink/40">
                                    {(displayUser?.name?.[0] || displayUser?.displayName?.[0] || 'W').toUpperCase()}
                                </div>
                            )}
                        </div>
                        {!isPublicView && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-ink text-paper text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-lg">
                                Pro Writer
                            </div>
                        )}
                    </div>

                    <h1 className="text-4xl font-serif font-bold mb-2 tracking-tight">
                        {displayUser?.name || displayUser?.displayName || 'Writer'}
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

                    {!isPublicView && (
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
                            <div key={i} className="flex flex-col">
                                <span className="text-2xl font-serif font-bold text-ink">{stat.value}</span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-ink-lighter font-bold">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </header>

                <section className="space-y-8">
                    <div className={`flex items-center justify-between mb-8 ${loaded ? 'animate-reveal stagger-1' : 'opacity-0'}`}>
                        <h2 className="text-xs uppercase tracking-[0.3em] font-bold text-ink-lighter">{!isPublicView ? 'Your Library' : 'Writings'}</h2>
                        {!isPublicView && (
                            <Link to="/write" className="text-xs uppercase tracking-[0.2em] font-bold text-ink-light hover:text-ink transition-colors border-b border-ink/10 pb-1">
                                New Story
                            </Link>
                        )}
                    </div>

                    {userWritings.length > 0 ? (
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

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => navigate(`/read/${writing.id}`)}
                                            className="p-3 rounded-full hover:bg-black/5 text-ink-light"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                        </button>
                                        {!isPublicView && (
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
                            <p className="text-ink-lighter font-serif italic mb-6">No stories published yet.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default ProfilePage;
