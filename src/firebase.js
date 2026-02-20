import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "placeholder",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder"
};

// Check for missing keys
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    console.error("CRITICAL ERROR: Firebase API Key is missing. Follow these steps:\n1. Create a '.env' file in the root directory.\n2. Add 'VITE_FIREBASE_API_KEY=your_key_here'\n3. Restart your development server.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
