import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/NavBar';
import AuthPage from './pages/AuthPage';
import EditorPage from './pages/EditorPage';
import WritingTypePage from './pages/WritingTypePage';
import DraftsPage from './pages/DraftsPage';
import FeedPage from './pages/FeedPage';
import ReadPage from './pages/ReadPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import LoadingScreen from './components/LoadingScreen';
import PageLayout from './components/PageLayout';
import CustomCursor from './components/CustomCursor';
import ErrorBoundary from './components/ErrorBoundary';
import { UIProvider } from './context/UIContext';

function LandingPage() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
  }, [])

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-ink-light selection:text-paper overflow-hidden relative">

      {/* Background Texture/Noise (Optional subtlety) */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <NavBar loaded={loaded} />

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">

        {/* Title */}
        <h1 className={`font-serif text-6xl md:text-8xl lg:text-9xl mb-6 tracking-tight transition-all duration-1000 ease-out delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          The Quiet Page.
        </h1>

        {/* Tagline */}
        <p className={`font-serif italic text-xl md:text-2xl text-ink-light max-w-lg leading-relaxed mb-12 transition-all duration-1000 ease-out delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          A sanctuary for your thoughts. Distraction-free writing for the modern storyteller.
        </p>

        {/* Buttons */}
        <div className={`flex flex-col md:flex-row gap-6 items-center transition-all duration-1000 ease-out delay-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Link to="/choose-type" className="group relative px-10 py-4 bg-ink text-paper rounded-full font-sans font-bold text-xs uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl hover:shadow-ink/20 inline-block">
            <span className="relative z-10">Start Writing</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          <Link to="/read" className="group px-10 py-4 text-ink font-sans font-bold text-xs uppercase tracking-[0.2em] border border-ink/10 hover:border-ink/30 rounded-full transition-all hover:bg-white/50 text-center flex items-center gap-3">
            <span>Explore Library</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </Link>
        </div>

        <p className={`mt-12 text-[10px] uppercase tracking-[0.3em] font-bold text-ink-lighter transition-all duration-1000 delay-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          Free to read. No account required.
        </p>

      </main>

      {/* Footer / Copyright */}
      <footer className={`absolute bottom-6 w-full text-center text-xs text-ink-lighter/60 transition-all duration-1000 delay-1000 z-20 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
        <p className="mb-1">© 2026 Writer Inc.</p>
        <p>Crafted by <a href="https://vaibhavmanaji.vercel.app" target="_blank" rel="noopener noreferrer" className="text-ink-lighter hover:text-ink transition-colors border-b border-ink-lighter/20 hover:border-ink/40 pointer-events-auto cursor-pointer">Vaibhav Manaji</a></p>
      </footer>

    </div>
  )
}



function App() {
  const [initialLoading, setInitialLoading] = useState(true);

  return (
    <AuthProvider>
      <UIProvider>
        <ErrorBoundary>
          <CustomCursor />
          {initialLoading && <LoadingScreen onComplete={() => setInitialLoading(false)} />}
          <BrowserRouter>
            <PageLayout>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/signup" element={<AuthPage />} />
                <Route path="/choose-type" element={<WritingTypePage />} />
                <Route path="/drafts" element={<DraftsPage />} />
                <Route path="/read" element={<FeedPage />} />
                <Route path="/read/:id" element={<ReadPage />} />
                <Route path="/write" element={<EditorPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/:handle" element={<ProfilePage />} />
              </Routes>
            </PageLayout>
          </BrowserRouter>
        </ErrorBoundary>
      </UIProvider>
    </AuthProvider>
  );
}

export default App
