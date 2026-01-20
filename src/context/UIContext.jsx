import { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const isNative = Capacitor.isNativePlatform();
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved ? JSON.parse(saved) : false;
    });

    const [focusMode, setFocusMode] = useState(false);
    const [themeAnimation, setThemeAnimation] = useState(null); // 'sunrise' or 'sunset'

    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const toggleDarkMode = () => {
        const willBeDark = !darkMode;
        setThemeAnimation(willBeDark ? 'sunset' : 'sunrise');

        // Faster toggle (approx 0.5s instead of 1.5s)
        setTimeout(() => {
            setDarkMode(willBeDark);
        }, 500);

        // Clear animation
        setTimeout(() => {
            setThemeAnimation(null);
        }, isNative ? 1200 : 2000); // Web animation is now 1.6s
    };

    const toggleFocusMode = () => setFocusMode(!focusMode);

    return (
        <UIContext.Provider value={{
            darkMode,
            toggleDarkMode,
            focusMode,
            setFocusMode,
            toggleFocusMode,
            themeAnimation
        }}>
            {children}
            {themeAnimation && (
                <div className={`theme-transition-${themeAnimation} ${isNative ? 'is-native' : 'is-web'}`}>
                    {!isNative && <div className="paper-grain"></div>}
                </div>
            )}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);
