import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

const PageLayout = ({ children }) => {
    const isNative = Capacitor.isNativePlatform();
    const location = useLocation();
    const [displayLocation, setDisplayLocation] = useState(location);
    const [transitionStage, setTransitionStage] = useState('idle'); // idle, cover, reveal
    const [frozenChildren, setFrozenChildren] = useState(children);
    const prevChildrenRef = useRef(children);

    // Keep track of the "incoming" children but don't show them yet
    useEffect(() => {
        prevChildrenRef.current = children;
    }, [children]);

    useEffect(() => {
        if (isNative) return; // Disable for Android/iOS

        if (location.pathname !== displayLocation.pathname || location.search !== displayLocation.search) {
            setTransitionStage('cover');
        }
    }, [location, displayLocation, isNative]);

    const handleTransitionEnd = () => {
        if (transitionStage === 'cover') {
            // Screen is fully covered.
            setTimeout(() => {
                setDisplayLocation(location);
                setFrozenChildren(prevChildrenRef.current);
                setTransitionStage('reveal');
                window.scrollTo(0, 0);
            }, 300); // Shorter pause for better feel
        } else if (transitionStage === 'reveal') {
            setTransitionStage('idle');
        }
    };

    if (isNative) {
        return <div className="min-h-screen">{children}</div>;
    }

    return (
        <div className="relative min-h-screen">
            {/* The sliding panel for page transitions */}
            {transitionStage !== 'idle' && (
                <div
                    className={`page-transition-panel ${transitionStage}`}
                    onAnimationEnd={handleTransitionEnd}
                >
                    <div className="paper-grain"></div>
                </div>
            )}

            <div className={`transition-all duration-700 ${transitionStage === 'cover' ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
                {frozenChildren}
            </div>
        </div>
    );
};

export default PageLayout;
