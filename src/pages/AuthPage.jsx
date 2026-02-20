import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';

function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check availability
    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        setIsLogin(location.pathname === '/login');
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmail(email, password);
            } else {
                if (!name) throw new Error("Please enter your name.");
                await signUpWithEmail(email, password, name);
            }
            navigate('/');
        } catch (err) {
            setError(err.message || "An error occurred during authentication.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithGoogle();
            navigate('/');
        } catch (err) {
            setError(err.message || "Google login failed.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        navigate(isLogin ? '/signup' : '/login');
    };

    return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6 relative overflow-hidden">

            {/* Background Texture */}
            <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            <div className="w-full max-w-md bg-paper shadow-soft rounded-2xl p-8 md:p-12 relative z-10 animate-fade-in border border-white/50">

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="font-serif text-3xl font-bold text-ink mb-2">
                        {isLogin ? 'Welcome Back' : 'Join Writer'}
                    </h1>
                    <p className="text-ink-light font-medium text-sm">
                        {isLogin ? 'Continue your writing journey.' : 'Start your quiet page today.'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-serif italic">
                        {error}
                    </div>
                )}

                {/* Google Button - Only show on Web */}
                {!isNative && (
                    <div className="space-y-3 mb-6">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-ink-lighter/20 hover:border-ink-lighter/40 text-ink font-medium py-3 rounded-xl transition-all duration-300 hover:shadow-sm group disabled:opacity-50"
                        >
                            <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>{loading ? 'Entering...' : 'Continue with Google'}</span>
                        </button>

                        {error && error.includes("popup") && (
                            <button
                                onClick={() => {
                                    setError('');
                                    const { signInWithGoogleRedirect } = useAuth();
                                    signInWithGoogleRedirect();
                                }}
                                className="w-full text-xs text-ink-light opacity-60 hover:opacity-100 transition-opacity underline decoration-dotted underline-offset-2"
                            >
                                Having popup issues? Try Redirect instead
                            </button>
                        )}
                    </div>
                )}

                {!isNative && (
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-ink-lighter/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-paper px-2 text-ink-lighter/50 font-medium tracking-widest">Or</span>
                        </div>
                    </div>
                )}

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-1">
                            <label className="text-xs uppercase tracking-wide font-semibold text-ink-light ml-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-paper-dark border border-transparent focus:bg-white focus:border-ink-lighter/30 rounded-xl outline-none transition-all placeholder:text-ink-lighter/30"
                                placeholder="Your Name"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wide font-semibold text-ink-light ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-paper-dark border border-transparent focus:bg-white focus:border-ink-lighter/30 rounded-xl outline-none transition-all placeholder:text-ink-lighter/30"
                            placeholder="hello@example.com"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wide font-semibold text-ink-light ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-paper-dark border border-transparent focus:bg-white focus:border-ink-lighter/30 rounded-xl outline-none transition-all placeholder:text-ink-lighter/30"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ink text-paper font-medium py-3 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 mt-2 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                {/* Footer Toggle */}
                <div className="mt-8 text-center text-sm">
                    <span className="text-ink-light opacity-80">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                        onClick={toggleMode}
                        className="text-ink font-semibold hover:underline decoration-1 underline-offset-4"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default AuthPage;
