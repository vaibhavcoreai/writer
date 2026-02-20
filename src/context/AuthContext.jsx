import { createContext, useState, useContext, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
    signInWithPopup,
    signInWithRedirect,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    signInWithCredential, // Added for Native Auth
    GoogleAuthProvider // Added for Native Auth
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'; // Native Plugin
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
                    avatarUrl: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'Writer'}&background=2C2C2C&color=F9F8F4&font-size=0.4`,
                    handle: firebaseUser.email?.split('@')[0] || 'writer'
                };
                setUser(mappedUser);
                localStorage.setItem('writer_user', JSON.stringify(mappedUser));

                // Sync to Firestore 'users' collection
                const syncUser = async () => {
                    try {
                        await setDoc(doc(db, "users", firebaseUser.uid), {
                            ...mappedUser,
                            lastLogin: serverTimestamp(),
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
            // Check if Firebase keys are missing/placeholder
            if (auth.config.apiKey === "placeholder" || !auth.config.apiKey) {
                throw new Error("Firebase configuration is missing. Please check your .env file and ensure VITE_FIREBASE_API_KEY is set correctly.");
            }

            // Check platform reliably
            if (Capacitor.isNativePlatform()) {
                alert("For the best experience on mobile, please use Email/Password sign-in or use the web version.");
                return;
            }

            // Web: Continue with Popup
            // Note: If this fails with auth/popup-closed-by-user, it often means:
            // 1. The user manually closed it.
            // 2. A popup blocker stopped it.
            // 3. The domain (like localhost) is not authorized in Firebase Console.
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Google Sign-In Error:", error.code, error.message);

            // Handle specific Firebase Auth errors
            if (error.code === 'auth/popup-closed-by-user') {
                throw new Error("The sign-in popup was closed before completion. If you didn't close it, check if your browser blocked the popup, or try again.");
            } else if (error.code === 'auth/cancelled-popup-request') {
                throw new Error("Only one sign-in popup can be active at a time. Please wait for the current one to finish.");
            } else if (error.code === 'auth/operation-not-allowed') {
                throw new Error("Google Sign-In is not enabled in your Firebase Console (Authentication > Sign-in method).");
            } else if (error.code === 'auth/unauthorized-domain') {
                throw new Error(`This domain (${window.location.hostname}) is not authorized for Firebase Auth. Add it in Firebase Console > Authentication > Settings > Authorized domains.`);
            } else if (error.code === 'auth/popup-blocked') {
                throw new Error("The sign-in popup was blocked by your browser. Please allow popups for this site.");
            }

            throw error;
        }
    };

    const signInWithGoogleRedirect = async () => {
        try {
            if (auth.config.apiKey === "placeholder" || !auth.config.apiKey) {
                throw new Error("Firebase configuration is missing.");
            }
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google Redirect:", error);
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
            signInWithGoogleRedirect,
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
