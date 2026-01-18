import { createContext, useState, useContext, useEffect } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Map Firebase user to our application user format
                const mappedUser = {
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || 'Writer',
                    email: firebaseUser.email,
                    avatarUrl: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'Writer'}&background=2C2C2C&color=F9F8F4&font-size=0.4`
                };
                setUser(mappedUser);
                localStorage.setItem('writer_user', JSON.stringify(mappedUser));

                // Sync to Firestore 'users' collection
                const syncUser = async () => {
                    try {
                        await setDoc(doc(db, "users", firebaseUser.uid), {
                            ...mappedUser,
                            lastLogin: serverTimestamp(),
                            handle: firebaseUser.email?.split('@')[0] || 'writer'
                        }, { merge: true });
                    } catch (e) {
                        console.error("Error syncing user:", e);
                    }
                };
                syncUser();
            } else {
                setUser(null);
                localStorage.removeItem('writer_user');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
            throw error;
        }
    };

    const signUpWithEmail = async (email, password, displayName) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName });
            return userCredential.user;
        } catch (error) {
            console.error("Error signing up:", error);
            throw error;
        }
    };

    const signInWithEmail = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error("Error signing in:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            signInWithGoogle,
            signUpWithEmail,
            signInWithEmail,
            logout,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
