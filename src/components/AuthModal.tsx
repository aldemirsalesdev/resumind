import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, User, Ghost, VenetianMask } from "lucide-react";
import { auth, googleProvider, isFirebaseConfigured, missingOrPlaceholderKeys } from "../lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, initialTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) {
      setError(`Erro de Configuração: Falta configurar as variáveis de ambiente do Firebase. Chaves ausentes: ${missingOrPlaceholderKeys.join(", ")}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        if (err.code === "auth/operation-not-allowed") {
          setError("O provedor Google não está ativado nas configurações do seu projeto Firebase. Ative-o em Authentication > Sign-in method.");
        } else if (err.code === "auth/unauthorized-domain") {
          setError(`Domínio não autorizado: Adicione o domínio "${window.location.hostname}" nas configurações do seu Console do Firebase (Vá em Authentication > Settings/Configurações > Authorized domains/Domínios autorizados).`);
        } else if (err.code === "auth/popup-blocked") {
          setError("O pop-up de login foi bloqueado pelo navegador. Libere a exibição de pop-ups ou abra o link em uma nova aba separada.");
        } else if (err.code === "auth/web-storage-unsupported" || err.message?.includes("web storage") || err.message?.includes("cookie")) {
          setError("Seu navegador restringiu cookies de terceiros no visualizador do AI Studio. Por favor, abra o aplicativo em uma nova aba para logar com o Google, ou use login com E-mail e Senha.");
        } else {
          setError(err.message || "Erro ao autenticar com o Google. Se estiver no visualizador do AI Studio, experimente abrir o link em uma nova aba.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    if (!isFirebaseConfigured) {
      setError(`Erro de Configuração: Falta configurar as variáveis de ambiente do Firebase. Chaves ausentes: ${missingOrPlaceholderKeys.join(", ")}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      onClose();
    } catch (err: any) {
      console.error("Anonymous auth error:", err);
      if (err.code === "auth/operation-not-allowed") {
        setError("O login anônimo não está ativado nas configurações do seu projeto Firebase. Ative-o em Authentication > Sign-in method.");
      } else {
        setError(err.message || "Erro ao autenticar como visitante.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isFirebaseConfigured) {
      setError(`Erro de Configuração: Falta configurar as variáveis de ambiente do Firebase. Chaves ausentes: ${missingOrPlaceholderKeys.join(", ")}`);
      return;
    }
    if (!email) {
      setError("Por favor, preencha o e-mail para recuperar a senha.");
      return;
    }
    
    // Quick validation check just for format roughly
    if (!email.includes("@") || !email.includes(".")) {
      setError("Por favor, insira um e-mail válido.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    console.log("Password reset requested for:", email);

    try {
      // Tentar descobrir se o email usa Google (pode falhar dependendo da proteção de enumeração de email do Firebase)
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes("google.com")) {
          setSuccess("Se você usa login com Google, recupere o acesso pela sua Conta Google.");
          setLoading(false);
          return;
        }
      } catch (e) {
        // Ignora erro de fetchSignInMethodsForEmail (ex: email enumeration protection ativo)
        console.log("fetchSignInMethodsForEmail not available or error", e);
      }

      const actionCodeSettings = {
        url: window.location.origin + "/redefinir-senha",
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      console.log("Password reset success");
      setSuccess("Se existir uma conta com este e-mail, enviaremos um link de recuperação para redefinir sua senha.");
    } catch (err: any) {
      console.error("Password reset error code:", err.code);
      // Safe generic message regardless of error
      setSuccess("Se existir uma conta com este e-mail, enviaremos um link para redefinir sua senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      setError(`Erro de Configuração: Falta configurar as variáveis de ambiente do Firebase no .env ou painel de configurações. Chaves ausentes: ${missingOrPlaceholderKeys.join(", ")}`);
      return;
    }
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    if (tab === "register" && !name) {
      setError("Por favor, informe seu nome.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (tab === "login") {
        // Sign in with Firebase
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        // Register with Firebase
        const fbCred = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update profile name in Firebase
        if (fbCred.user) {
          const { updateProfile } = await import("firebase/auth");
          await updateProfile(fbCred.user, { displayName: name });
        }

        setSuccess("Conta criada com sucesso! Você já pode navegar pelo seu painel.");
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message || "Ocorreu um erro na autenticação.";
      if (err.code === "auth/email-already-in-use") {
        msg = "Este endereço de e-mail já está sendo utilizado.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        msg = "E-mail ou senha inválidos.";
      } else if (err.code === "auth/weak-password") {
        msg = "A senha deve conter pelo menos 6 caracteres.";
      } else if (err.code === "auth/operation-not-allowed") {
        msg = "O método de entrada com E-mail e Senha não está ativado no painel Firebase do seu projeto. Acesse Firebase Console > Authentication > Sign-in method para ativá-lo.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-[400px] dark:bg-[#0c0c0c] bg-white border dark:border-neutral-800 border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg font-black dark:text-white text-slate-900 tracking-tight">
                  {tab === "login" ? "Acesse sua conta" : "Crie sua conta"}
                </h3>
                <p className="text-xs dark:text-neutral-400 text-slate-500 leading-snug">
                  {tab === "login" 
                    ? "Entre para salvar seus currículos e análises ATS." 
                    : "Comece a otimizar seus currículos gratuitamente."}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg dark:hover:bg-neutral-800 hover:bg-slate-100 dark:text-neutral-400 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error & Success Messages */}
            {!isFirebaseConfigured && (
              <div className="mb-4 flex flex-col gap-1.5 p-3 text-xs bg-amber-500/10 dark:bg-amber-500/5 text-amber-500 rounded-xl border border-amber-500/10 leading-normal">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="font-bold">Configuração do Firebase ausente ou inválida</span>
                </div>
                <p className="pl-6 text-[11px] dark:text-neutral-400 text-slate-500">
                  Para habilitar a autenticação, preencha as variáveis de ambiente <code className="px-1 py-0.5 rounded dark:bg-neutral-800 bg-slate-100 text-[10px] font-mono text-amber-500">VITE_FIREBASE_*</code> no seu arquivo <code className="px-1 py-0.5 rounded dark:bg-neutral-800 bg-slate-100 text-[10px] font-mono text-amber-500">.env</code> ou no painel da Vercel.
                </p>
                <p className="pl-6 text-[10px] dark:text-neutral-400 text-slate-400">
                  Ausentes: {missingOrPlaceholderKeys.join(", ")}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 p-3 text-xs bg-red-500/10 dark:bg-red-500/5 text-red-500 rounded-xl border border-red-500/10 leading-normal">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-start gap-2 p-3 text-xs bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-500 rounded-xl border border-emerald-500/10 leading-normal">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Official Branded Google Sign-In */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border dark:border-neutral-800 border-slate-200 dark:bg-[#111111] bg-white dark:hover:bg-neutral-800 hover:bg-slate-50 rounded-xl text-xs font-semibold dark:text-white text-slate-700 shadow-sm transition-all cursor-pointer disabled:opacity-50 font-sans"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-5.29-4.53z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Continuar com o Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full mb-4">
              <span className="h-[1px] flex-1 dark:bg-neutral-800 bg-slate-200"></span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-neutral-500">ou continue com e-mail</span>
              <span className="h-[1px] flex-1 dark:bg-neutral-800 bg-slate-200"></span>
            </div>

            {/* Credential Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {tab === "register" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 dark:text-neutral-500 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Alexandre Souza"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border dark:border-neutral-800 border-slate-200 dark:bg-neutral-900 bg-white dark:text-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f95b16] transition-shadow"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 dark:text-neutral-500 text-slate-400" size={14} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@dominio.com"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border dark:border-neutral-800 border-slate-200 dark:bg-neutral-900 bg-white dark:text-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f95b16] transition-shadow"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 dark:text-neutral-500 text-slate-400" size={14} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border dark:border-neutral-800 border-slate-200 dark:bg-neutral-900 bg-white dark:text-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f95b16] transition-shadow"
                  />
                </div>
                {tab === "login" && (
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-[11px] font-medium text-slate-500 hover:text-[#f95b16] dark:text-neutral-400 dark:hover:text-[#f95b16] transition-colors cursor-pointer"
                    >
                      Esqueci minha senha?
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#f95b16] hover:bg-[#ff6e2d] text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/10 mt-2"
              >
                <span>{loading ? "Processando..." : (tab === "login" ? "Entrar" : "Criar minha conta")}</span>
                {!loading && <ArrowRight size={14} />}
              </button>
            </form>

            {/* Guest / Visitor Mode */}
            <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-neutral-500">ou experimente sem cadastro</span>
              <button
                type="button"
                onClick={handleAnonymousLogin}
                disabled={loading}
                className="text-xs font-bold text-[#f95b16] hover:text-[#ff6e2d] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 hover:underline"
              >
                <User size={13} />
                <span>Entrar como Visitante</span>
              </button>
            </div>

            {/* Bottom Switch Tab Section */}
            <div className="mt-5 pt-4 border-t dark:border-neutral-900 border-slate-100 flex items-center justify-center gap-1.5 text-xs">
              <span className="dark:text-neutral-400 text-slate-500">
                {tab === "login" ? "Não possui uma conta?" : "Já possui cadastro?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTab(tab === "login" ? "register" : "login");
                  setError(null);
                  setSuccess(null);
                }}
                className="text-[#f95b16] font-bold hover:underline cursor-pointer"
              >
                {tab === "login" ? "Cadastre-se" : "Faça login"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
