import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

function NavBar({ loaded = true }) {
    const { user, logout } = useAuth();
    const { darkMode, toggleDarkMode, focusMode, toggleFocusMode } = useUI();
    const navigate = useNavigate();
    const location = useLocation();
    const isWritingPage = location.pathname === '/write';
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        setIsDropdownOpen(false);
        logout();
        navigate('/');
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 p-4 md:px-12 md:py-8 flex justify-between items-center z-50 transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>

            <div className="flex items-center gap-4 md:gap-12">
                <Link to="/" className="font-serif italic font-bold text-lg md:text-xl tracking-tight text-ink hover:opacity-80 transition-opacity">
                    Writer.
                </Link>
                <div className="flex items-center gap-4 md:gap-8">
                    <Link to="/read" className="hover:text-ink transition-colors text-[10px] md:text-sm font-bold uppercase tracking-widest">Read</Link>
                    <Link to="/choose-type" className="hover:text-ink transition-colors text-[10px] md:text-sm font-bold uppercase tracking-widest">Write</Link>
                    {user && (
                        <Link to="/drafts" className="hidden md:block hover:text-ink transition-colors text-sm font-medium tracking-wide text-ink-light">My Drafts</Link>
                    )}
                </div>
            </div>

            <div className="flex gap-2 md:gap-6 items-center">

                {/* Theme Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="p-1.5 md:p-2 rounded-full hover:bg-black/5 transition-all duration-300 text-ink-light"
                    title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {darkMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="18.36" x2="5.64" y2="16.93"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    )}
                </button>

                {/* Focus Toggle */}
                {user && isWritingPage && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFocusMode();
                        }}
                        className={`p-1.5 md:p-2 rounded-full transition-all duration-300 pointer-events-auto relative z-[60] ${focusMode ? 'bg-ink text-paper shadow-md' : 'hover:bg-black/5 text-ink-light'}`}
                        title="Focus Mode"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>
                )}

                <div className="w-[1px] h-4 bg-ink-lighter/20 hidden md:block"></div>

                {user ? (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 md:gap-3 group focus:outline-none"
                        >
                            <div className="text-right hidden md:block">
                                <div className="text-[10px] text-ink-lighter/70 uppercase tracking-widest font-bold">Signed in</div>
                                <div className="text-xs text-ink font-serif italic">{user.name}</div>
                            </div>
                            <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white shadow-soft transition-transform duration-300 ${isDropdownOpen ? 'scale-105 ring-2 ring-ink-light/20' : 'group-hover:scale-105'}`}
                            />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-3 w-40 md:w-48 bg-paper border border-white/60 shadow-lg rounded-xl overflow-hidden animate-fade-in origin-top-right z-50">
                                <div className="py-1">
                                    <Link to="/profile" className="block px-4 py-2 md:py-3 text-sm text-ink hover:bg-black/5" onClick={() => setIsDropdownOpen(false)}>Profile</Link>
                                    <Link to="/drafts" className="md:hidden block px-4 py-2 text-sm text-ink hover:bg-black/5" onClick={() => setIsDropdownOpen(false)}>My Drafts</Link>
                                    <Link to="/settings" className="block px-4 py-2 md:py-3 text-sm text-ink hover:bg-black/5" onClick={() => setIsDropdownOpen(false)}>Settings</Link>
                                    <div className="h-[1px] bg-ink-lighter/5 my-1 mx-4"></div>
                                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 md:py-3 text-sm text-red-800/80 hover:bg-red-50/50">Logout</button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link
                        to="/login"
                        className="px-4 py-1.5 md:px-5 md:py-2.5 rounded-full border border-ink-lighter/20 text-[10px] md:text-xs font-bold uppercase tracking-widest text-ink hover:bg-white transition-all shadow-soft"
                    >
                        Sign In
                    </Link>
                )}
            </div>
        </nav>
    );
}

export default NavBar;
