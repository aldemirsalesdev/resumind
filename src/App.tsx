import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { onAuthStateChanged, User, getRedirectResult } from "firebase/auth";
import { auth } from "./lib/firebase";

// Components
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import AnalyzeResume from "./pages/AnalyzeResume";
import ResumeEditor from "./pages/ResumeEditor";
import TemplateSelection from "./pages/TemplateSelection";
import ReviewResume from "./pages/ReviewResume";
import AdminFeedbacks from "./pages/AdminFeedbacks";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ResetPassword from "./pages/ResetPassword";
import FeedbackWidget from "./components/FeedbackWidget";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { cn } from "./lib/utils";

const adminEmail = (import.meta as any).env.VITE_ADMIN_EMAIL || "";

function AppLayout({ user }: { user: User | null }) {
  const location = useLocation();
  const isLanding = location.pathname === "/" || location.pathname === "/index.html";
  const isMarketing = isLanding || (!user && location.pathname !== "/termos" && location.pathname !== "/privacidade" && location.pathname !== "/redefinir-senha");
  const isEditor = location.pathname === "/editor" && !!user;

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        // Wait briefly for route transition / render to complete
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
        return () => clearTimeout(timer);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen dark:bg-[#050505] bg-slate-50 dark:text-white text-slate-900 flex flex-col font-sans">
      <Navbar user={user} />
      <main
        className={cn(
          "flex-1 w-full pt-28",
          !isMarketing && !isEditor && "px-4 sm:px-6 pb-8 md:pb-12",
          isEditor && "px-0 pb-0 lg:px-4 lg:pb-2",
        )}
      >
        <Routes>
          <Route path="/" element={<LandingPage user={user} />} />
          <Route path="/index.html" element={<LandingPage user={user} />} />
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <LandingPage user={user} />}
          />
          <Route
            path="/analyze"
            element={user ? <AnalyzeResume /> : <LandingPage user={user} />}
          />
          <Route
            path="/templates"
            element={user ? <TemplateSelection /> : <LandingPage user={user} />}
          />
          <Route
            path="/editor"
            element={user ? <ResumeEditor /> : <LandingPage user={user} />}
          />
          <Route
            path="/review"
            element={user ? <ReviewResume /> : <LandingPage user={user} />}
          />
          <Route
            path="/admin/feedbacks"
            element={user && user.email === adminEmail ? <AdminFeedbacks /> : <LandingPage user={user} />}
          />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          
          {/* Wildcard fallback that renders LandingPage directly to prevent iframe navigation glitches */}
          <Route path="*" element={<LandingPage user={user} />} />
        </Routes>
      </main>
      {!isMarketing && !isEditor && (
        <footer className="w-full border-t dark:border-neutral-800 border-slate-200 dark:bg-[#0A0A0A] bg-slate-100 dark:text-neutral-500 text-slate-500 text-sm print:hidden">
          <div className="max-w-[1400px] w-full mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="font-bold dark:text-white text-slate-900 text-base">Resumind</div>
              <p className="text-xs text-center md:text-left">
                Otimização profissional de currículos para sistemas ATS com Inteligência Artificial.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1.5">
              <div className="flex items-center gap-3 text-xs font-semibold">
                <Link to="/termos" className="dark:text-neutral-400 text-slate-500 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors">
                  Termos de Uso
                </Link>
                <span className="dark:text-neutral-700 text-slate-300">•</span>
                <Link to="/privacidade" className="dark:text-neutral-400 text-slate-500 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors">
                  Política de Privacidade
                </Link>
              </div>
              <p className="text-xs font-medium text-center md:text-right mt-0.5">
                &copy; 2026 Resumind. Criado por Aldemir Sales.
              </p>
              <div className="flex items-center gap-3 text-xs font-medium mt-0.5">
                <a href="https://linkedin.com/in/aldemirsales" target="_blank" rel="noopener noreferrer" className="dark:text-neutral-300 text-slate-600 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors font-semibold">
                  LinkedIn
                </a>
                <span className="dark:text-neutral-700 text-slate-300">•</span>
                <a href="https://github.com/aldemirsalesdev" target="_blank" rel="noopener noreferrer" className="dark:text-neutral-300 text-slate-600 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors font-semibold">
                  GitHub
                </a>
                <span className="dark:text-neutral-700 text-slate-300">•</span>
                <a href="mailto:contato@resumind.site" className="dark:text-neutral-300 text-slate-600 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors font-semibold">
                  contato@resumind.site
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
      <FeedbackWidget user={user} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process redirect result if any to handle direct Google login redirects
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        console.error("Error handling Google redirect sign-in:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : "dark";
    const isDark = savedTheme !== "light";
    return (
      <div className={cn("flex items-center justify-center min-h-screen transition-colors duration-150", isDark ? "bg-[#050505]" : "bg-slate-50")}>
        <div className={cn("w-12 h-12 border rounded-full animate-spin", isDark ? "border-neutral-800 border-t-orange-500" : "border-slate-200 border-t-orange-500")}></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <AppLayout user={user} />
      </Router>
    </ThemeProvider>
  );
}
