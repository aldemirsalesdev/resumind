import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  FileText,
  LayoutDashboard,
  Info,
  Layers,
  Tag,
  Home,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import AuthModal from "./AuthModal";

export default function Navbar({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">(
    "login",
  );

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleLoginClick = (tab: "login" | "register" = "login") => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div
      className={cn(
        "fixed top-4 left-0 right-0 z-50 w-full flex justify-center mx-auto px-4 lg:px-8 dark:text-white text-slate-900 print:hidden",
      )}
    >
      <nav
        className={cn(
          "flex flex-col py-3 px-6 lg:px-8 backdrop-blur-md border-[3px] max-w-5xl mx-auto dark:bg-[#0a0a0a]/90 dark:border-[#ffffff15] dark:shadow-2xl bg-white/90 border-[#f0f0f0] shadow-[0_8px_30px_rgb(0,0,0,0.08)]",
          !mobileMenuOpen
            ? "w-max lg:w-full rounded-full"
            : "w-full rounded-[24px]",
        )}
      >
        {/* Main Header Container Row */}
        <div className="flex items-center justify-between w-full gap-6 lg:gap-0">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <span className="font-black tracking-tight text-xl font-sans">
              Resu<span className="text-[#FF5500]">mind</span>
            </span>
          </Link>

          {/* Desktop Controls (Logged in user vs Guest user) */}
          {user ? (
            <>
              <div className="hidden lg:flex items-center gap-6 xl:gap-8 flex-1 justify-center">
                <Link
                  to="/"
                  className="text-sm font-semibold hover:text-[#f95b16] flex items-center gap-1.5 py-1"
                >
                  <Home size={16} className="shrink-0" />
                  <span>Início</span>
                </Link>
                <a
                  href="/#como-funciona"
                  className="text-sm font-semibold hover:text-[#f95b16] flex items-center gap-1.5 py-1"
                >
                  <Info size={16} className="shrink-0" />
                  <span>Como funciona</span>
                </a>
                <a
                  href="/#recursos"
                  className="text-sm font-semibold hover:text-[#f95b16] flex items-center gap-1.5 py-1"
                >
                  <Layers size={16} className="shrink-0" />
                  <span>Recursos</span>
                </a>
                <Link
                  to="/dashboard"
                  className="text-sm font-semibold hover:text-[#f95b16] flex items-center gap-1.5 py-1"
                >
                  <LayoutDashboard size={16} className="shrink-0" />
                  <span>Painel</span>
                </Link>
                <button
                  onClick={toggleTheme}
                  className="text-sm font-semibold hover:text-[#f95b16] flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer shrink-0 dark:hover:bg-neutral-800 hover:bg-slate-100"
                >
                  {theme === "dark" ? (
                    <Sun size={16} className="shrink-0" />
                  ) : (
                    <Moon size={16} className="shrink-0" />
                  )}
                  <span>Modo {theme === "dark" ? "claro" : "escuro"}</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-3 shrink-0">
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-transparent border rounded-full text-sm font-bold whitespace-nowrap cursor-pointer dark:border-neutral-700 dark:hover:bg-[#111] border-slate-300 hover:bg-slate-50"
                >
                  Sair
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="hidden lg:flex items-center gap-6 xl:gap-8 flex-1 justify-end">
                <a
                  href="/#como-funciona"
                  className="text-sm font-semibold hover:text-[#f95b16] flex items-center gap-1.5 py-1"
                >
                  <Info size={16} className="shrink-0" />
                  <span>Como funciona</span>
                </a>
                <a
                  href="/#recursos"
                  className="text-sm font-semibold hover:text-[#f95b16] flex items-center gap-1.5 py-1"
                >
                  <Layers size={16} className="shrink-0" />
                  <span>Recursos</span>
                </a>
                <button
                  onClick={toggleTheme}
                  className="text-sm font-semibold hover:text-[#f95b16] flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer shrink-0 dark:hover:bg-neutral-800 hover:bg-slate-100"
                >
                  {theme === "dark" ? (
                    <Sun size={16} className="shrink-0" />
                  ) : (
                    <Moon size={16} className="shrink-0" />
                  )}
                  <span>Modo {theme === "dark" ? "claro" : "escuro"}</span>
                </button>
                <button
                  onClick={() => handleLoginClick("login")}
                  className="px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap border cursor-pointer dark:border-neutral-700 dark:hover:bg-[#111] border-slate-300 hover:bg-slate-50"
                >
                  Entrar
                </button>
              </div>
            </>
          )}

          {/* Mobile Specific Right Controls (Theme toggle & Menu button) */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full cursor-pointer dark:text-neutral-300 dark:hover:bg-neutral-800 text-slate-700 hover:bg-slate-100"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full cursor-pointer dark:text-neutral-300 dark:hover:bg-neutral-800 text-slate-700 hover:bg-slate-100"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Menu List */}
        {mobileMenuOpen && (
          <div className="flex lg:hidden flex-col gap-3 mt-3 pt-3 border-t border-dashed dark:border-neutral-800 border-slate-200 w-full animate-in fade-in slide-in-from-top-2 duration-200 select-none">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() =>
                    setTimeout(() => setMobileMenuOpen(false), 120)
                  }
                  className="text-sm font-bold hover:text-[#f95b16] flex items-center gap-2.5 px-3 py-2.5 rounded-xl dark:hover:bg-neutral-800/60 hover:bg-slate-100"
                >
                  <LayoutDashboard size={16} className="shrink-0" />
                  <span>Painel</span>
                </Link>
                <Link
                  to="/"
                  onClick={() =>
                    setTimeout(() => setMobileMenuOpen(false), 120)
                  }
                  className="text-sm font-bold hover:text-[#f95b16] flex items-center gap-2.5 px-3 py-2.5 rounded-xl dark:hover:bg-neutral-800/60 hover:bg-slate-100"
                >
                  <Home size={16} className="shrink-0" />
                  <span>Início</span>
                </Link>
                <a
                  href="/#como-funciona"
                  onClick={() =>
                    setTimeout(() => setMobileMenuOpen(false), 120)
                  }
                  className="text-sm font-bold hover:text-[#f95b16] flex items-center gap-2.5 px-3 py-2.5 rounded-xl dark:hover:bg-neutral-800/60 hover:bg-slate-100"
                >
                  <Info size={16} className="shrink-0" />
                  <span>Como funciona</span>
                </a>
                <a
                  href="/#recursos"
                  onClick={() =>
                    setTimeout(() => setMobileMenuOpen(false), 120)
                  }
                  className="text-sm font-bold hover:text-[#f95b16] flex items-center gap-2.5 px-3 py-2.5 rounded-xl dark:hover:bg-neutral-800/60 hover:bg-slate-100"
                >
                  <Layers size={16} className="shrink-0" />
                  <span>Recursos</span>
                </a>
                <button
                  onClick={() => {
                    setTimeout(() => setMobileMenuOpen(false), 120);
                    handleLogout();
                  }}
                  className="w-full text-left text-sm font-bold text-red-500 hover:text-red-400 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-red-500/10 hover:bg-red-500/5 cursor-pointer mt-1"
                >
                  <LogOut size={16} className="shrink-0" />
                  <span>Sair da Conta</span>
                </button>
              </>
            ) : (
              <>
                <a
                  href="/#como-funciona"
                  onClick={() =>
                    setTimeout(() => setMobileMenuOpen(false), 120)
                  }
                  className="text-sm font-bold hover:text-[#f95b16] flex items-center gap-2.5 px-3 py-2.5 rounded-xl dark:hover:bg-neutral-800/60 hover:bg-slate-100"
                >
                  <Info size={16} className="shrink-0" />
                  <span>Como funciona</span>
                </a>
                <a
                  href="/#recursos"
                  onClick={() =>
                    setTimeout(() => setMobileMenuOpen(false), 120)
                  }
                  className="text-sm font-bold hover:text-[#f95b16] flex items-center gap-2.5 px-3 py-2.5 rounded-xl dark:hover:bg-neutral-855 hover:bg-slate-100"
                >
                  <Layers size={16} className="shrink-0" />
                  <span>Recursos</span>
                </a>
                <button
                  onClick={() => {
                    setTimeout(() => setMobileMenuOpen(false), 120);
                    handleLoginClick("login");
                  }}
                  className="w-full text-center text-sm font-bold bg-[#f95b16] hover:bg-[#ff6e2d] text-white flex items-center justify-center gap-2 py-3 rounded-full shadow-md cursor-pointer mt-2"
                >
                  Entrar / Cadastrar-se
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
      />
    </div>
  );
}
