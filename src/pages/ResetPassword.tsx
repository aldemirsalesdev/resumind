import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { auth, isFirebaseConfigured, missingOrPlaceholderKeys } from "../lib/firebase";
import { 
  sendPasswordResetEmail, 
  confirmPasswordReset, 
  verifyPasswordResetCode 
} from "firebase/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");

  // Flow State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(!!oobCode);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Interaction State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verify the oobCode if present in URL on mount
  useEffect(() => {
    if (!oobCode) return;

    const verifyCode = async () => {
      try {
        const emailAssociated = await verifyPasswordResetCode(auth, oobCode);
        setUserEmail(emailAssociated);
      } catch (err: any) {
        console.error("Code verification error:", err);
        setError("O link de redefinição de senha é inválido, expirou ou já foi utilizado. Por favor, solicite um novo link.");
      } finally {
        setVerifyingCode(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      setError(`Configuração pendente: Adicione as variáveis de ambiente do Firebase. Chaves ausentes: ${missingOrPlaceholderKeys.join(", ")}`);
      return;
    }

    if (!email) {
      setError("Por favor, informe seu endereço de e-mail.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Configuration to direct back to our custom reset page
      const actionCodeSettings = {
        url: window.location.origin + "/redefinir-senha",
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setSuccess("E-mail enviado! Enviamos um link de recuperação para o endereço informado com as instruções para redefinir sua senha.");
      setEmail("");
    } catch (err: any) {
      console.error("Password reset request error:", err);
      // To prevent account harvesting, we show a generic success or clean error
      if (err.code === "auth/invalid-email") {
        setError("O formato do e-mail informado é inválido.");
      } else if (err.code === "auth/user-not-found") {
        setError("Não encontramos nenhuma conta cadastrada com esse e-mail.");
      } else {
        setSuccess("Se existir uma conta com este e-mail, enviaremos o link de redefinição de senha em instantes.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (!password || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      setError("A nova senha deve possuir pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem. Certifique-se de preencher as duas de forma idêntica.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess("Senha redefinida com sucesso! Você já pode realizar o login com as suas novas credenciais.");
      
      // Auto redirect to home/dashboard page after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3500);
    } catch (err: any) {
      console.error("Confirm reset error:", err);
      if (err.code === "auth/expired-action-code") {
        setError("O código de redefinição expirou. Solicite um novo link de recuperação.");
      } else if (err.code === "auth/invalid-action-code") {
        setError("O código de redefinição é inválido ou já foi utilizado.");
      } else if (err.code === "auth/weak-password") {
        setError("A senha informada é fraca. Por favor, utilize pelo menos 6 caracteres.");
      } else {
        setError("Ocorreu um erro inesperado ao alterar sua senha. Tente novamente mais tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-[450px] mx-auto px-4 py-16 flex flex-col justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full dark:bg-[#0c0c0c] bg-white border dark:border-neutral-800 border-slate-200 rounded-2xl shadow-xl p-8 overflow-hidden relative"
      >
        {/* Decorative subtle header line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f95b16]" />

        {verifyingCode ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-8 h-8 text-[#f95b16] animate-spin" />
            <p className="text-xs dark:text-neutral-400 text-slate-500 font-mono uppercase tracking-wider">
              Verificando link de segurança...
            </p>
          </div>
        ) : oobCode ? (
          /* FLOW A: REDEFINIR SENHA COM CÓDIGO */
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight">
                Nova Senha
              </h1>
              <p className="text-xs dark:text-neutral-400 text-slate-500 mt-1 leading-relaxed">
                {userEmail 
                  ? `Crie uma nova credencial para acessar sua conta associada ao e-mail ${userEmail}`
                  : "Preencha sua nova senha forte para restabelecer o acesso à sua conta."}
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 text-xs bg-red-500/10 dark:bg-red-500/5 text-red-500 rounded-xl border border-red-500/10 leading-normal">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 text-xs bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-500 rounded-xl border border-emerald-500/10 leading-normal">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span className="flex-1 font-semibold">{success}</span>
              </div>
            )}

            {!success && (
              <form onSubmit={handleConfirmReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 tracking-wider">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 dark:text-neutral-500 text-slate-400" size={15} />
                    <input
                      type="password"
                      placeholder="Mínimo de 6 caracteres"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border dark:border-neutral-800 border-slate-200 dark:bg-neutral-900 bg-white dark:text-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f95b16] transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 tracking-wider">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 dark:text-neutral-500 text-slate-400" size={15} />
                    <input
                      type="password"
                      placeholder="Repita a mesma senha acima"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border dark:border-neutral-800 border-slate-200 dark:bg-neutral-900 bg-white dark:text-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f95b16] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#f95b16] hover:bg-[#ff6e2d] text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/10 mt-2"
                >
                  <span>{loading ? "Salvando nova senha..." : "Salvar Nova Senha"}</span>
                  {!loading && <ArrowRight size={14} />}
                </button>
              </form>
            )}

            <div className="mt-6 pt-5 border-t dark:border-neutral-900 border-slate-100 flex justify-center">
              <Link
                to="/"
                className="text-xs font-semibold text-slate-500 hover:text-[#f95b16] dark:text-neutral-400 dark:hover:text-[#f95b16] transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={13} />
                <span>Voltar para a página inicial</span>
              </Link>
            </div>
          </div>
        ) : (
          /* FLOW B: SOLICITAR LINK DE RECUPERAÇÃO */
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight">
                Recuperar Senha
              </h1>
              <p className="text-xs dark:text-neutral-400 text-slate-500 mt-1 leading-relaxed">
                Digite o seu e-mail cadastrado. Nós enviaremos um link seguro para você criar uma nova senha sem burocracia.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 text-xs bg-red-500/10 dark:bg-red-500/5 text-red-500 rounded-xl border border-red-500/10 leading-normal">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 text-xs bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-500 rounded-xl border border-emerald-500/10 leading-normal">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span className="flex-1">{success}</span>
              </div>
            )}

            {!success && (
              <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 tracking-wider">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 dark:text-neutral-500 text-slate-400" size={15} />
                    <input
                      type="email"
                      placeholder="Ex: seu-email@dominio.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border dark:border-neutral-800 border-slate-200 dark:bg-neutral-900 bg-white dark:text-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#f95b16] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#f95b16] hover:bg-[#ff6e2d] text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/10 mt-2"
                >
                  <span>{loading ? "Enviando e-mail..." : "Enviar Link de Recuperação"}</span>
                  {!loading && <ArrowRight size={14} />}
                </button>
              </form>
            )}

            <div className="mt-6 pt-5 border-t dark:border-neutral-900 border-slate-100 flex justify-center">
              <Link
                to="/"
                className="text-xs font-semibold text-slate-500 hover:text-[#f95b16] dark:text-neutral-400 dark:hover:text-[#f95b16] transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={13} />
                <span>Voltar para a página inicial</span>
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
