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
    const [loaded, setLoaded] = useState(false);
    const [copied, setCopied] = useState(false);
    const [userWritings, setUserWritings] = useState([]);
    const [stats, setStats] = useState([
        { label: 'Stories', value: 0 },
        { label: 'Poems', value: 0 },
        { label: 'Hearts', value: 0 },
    ]);
    const [isFetching, setIsFetching] = useState(true);

    const isOwnProfile = !urlHandle || (currentUser && currentUser.handle === urlHandle);
    const displayHandle = urlHandle || currentUser?.handle || 'writer';
    const profileUrl = `${window.location.origin}/@${displayHandle}`;

    useEffect(() => {
        const fetchUserData = async () => {
            if (authLoading) return;

            try {
                let targetUid = null;
                let targetUser = null;

                // 1. Resolve Target User
                if (urlHandle) {
                    const usersRef = collection(db, "users");
                    const qUser = query(usersRef, where("handle", "==", urlHandle), limit(1));
                    const userSnap = await getDocs(qUser);

                    if (!userSnap.empty) {
                        targetUser = userSnap.docs[0].data();
                        targetUid = userSnap.docs[0].id;
                    } else {
                        // Fallback: search stories for authorHandle
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
                            // Deep Fallback: Email prefix match
                            const qAll = query(storiesRef, where("status", "==", "published"), limit(100));
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
                } else if (currentUser) {
                    targetUid = currentUser.uid;
                    targetUser = currentUser;
                } else {
                    navigate('/login');
                    return;
                }

                // 2. Load Writings and Stats
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

                    const viewWritings = (targetUid === currentUser?.uid) ? allWritings : allWritings.filter(w => w.status === 'published');
                    setUserWritings(viewWritings);

                    // Stats logic
                    const published = allWritings.filter(w => w.status === 'published');
                    const hearts = published.reduce((acc, w) => acc + (w.likesCount || 0), 0);

                    const statsSet = [
                        { label: 'Stories', value: published.filter(w => !w.type || w.type === 'Story').length },
                        { label: 'Poems', value: published.filter(w => w.type === 'Poem').length },
                        { label: 'Hearts', value: hearts }
                    ];

                    if (targetUid === currentUser?.uid) {
                        statsSet.push({ label: 'Drafts', value: allWritings.filter(w => w.status === 'draft').length });
                    }
                    setStats(statsSet);
                }

            } catch (error) {
                console.error("Profile Error:", error);
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
                    <div className={`flex items-center justify-between mb-8 ${loaded ? 'animate-reveal stagger-1' : 'opacity-0'}`}>
                        <h2 className="text-xs uppercase tracking-[0.3em] font-bold text-ink-lighter">{currentUser?.uid === profileUser?.uid ? 'Your Library' : 'Writings'}</h2>
                        {currentUser?.uid === profileUser?.uid && (
                            <Link to="/write" className="text-xs uppercase tracking-[0.2em] font-bold text-ink-light hover:text-ink transition-colors border-b border-ink/10 pb-1">
                                New Story
                            </Link>
                        )}
                    </div>

                    {userWritings.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {userWritings.map((writing, index) => (
                                <Link
                                    to={`/read/${writing.id}`}
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
                                        <div className="flex items-center gap-4 text-[10px] text-ink-lighter uppercase tracking-widest font-bold">
                                            <span>{writing.type || 'Story'}</span>
                                            <div className="flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                                                <span>{writing.likesCount || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-full hover:bg-black/5 text-ink-light">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border border-dashed border-ink-lighter/10 rounded-2xl">
                            <p className="text-ink-lighter font-serif italic mb-6">The quiet pages await their first ink.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default ProfilePage;
