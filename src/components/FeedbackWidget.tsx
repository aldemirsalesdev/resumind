import React, { useState, useEffect } from "react";
import { MessageSquare, X, Star, ThumbsUp, ThumbsDown, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from "firebase/auth";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export default function FeedbackWidget({ user }: { user: User | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const location = useLocation();
  const isAfterResume = location.pathname.includes("/review") || location.pathname.includes("/editor");
  const ratingLabel = isAfterResume ? "Deixe sua nota para o currículo gerado" : "Deixe sua nota para a plataforma";

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validations
    if (liked === null) {
      setError("Por favor, selecione se você gostou do site (Sim ou Não).");
      return;
    }

    if (rating === 0) {
      setError("Por favor, selecione uma nota de 1 a 5 estrelas.");
      return;
    }

    if (!feedback.trim()) {
      setError("Por favor, escreva um comentário ou sugestão sobre sua experiência.");
      return;
    }

    if (feedback.trim().length < 5) {
      setError("Por favor, escreva um comentário um pouco mais detalhado (mínimo de 5 caracteres).");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const uid = user ? user.uid : "anonymous";
      const uEmail = user ? user.email : "anonymous";

      // --- IMPLEMENTAÇÃO (FIREBASE FIRESTORE) ---
      await addDoc(collection(db, "feedbacks"), {
        userId: uid,
        userEmail: uEmail,
        userName: user?.displayName || "",
        rating,
        liked,
        feedback: feedback.trim(),
        context: isAfterResume ? "Editor/Review" : "Geral",
        createdAt: serverTimestamp(),
        isPublic,
        approved: false,
      });

      // --- INTEGRACAO COM GOOGLE SHEETS VIA BACKEND ---
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
            userEmail: uEmail,
            userName: user?.displayName || "",
            rating,
            liked,
            feedback: feedback.trim(),
            context: isAfterResume ? "Editor/Review" : "Geral",
            isPublic,
          }),
        });
      } catch (webhookErr) {
        console.warn("Erro silencioso ao enviar webhook para sheets:", webhookErr);
      }

      setToast("Avaliação enviada com sucesso! Muito obrigado.");
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        // Reset form for next time if they open it again
        setTimeout(() => {
          setSubmitted(false);
          setRating(0);
          setLiked(null);
          setFeedback("");
        }, 300);
      }, 2000);
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      setError("Erro ao enviar avaliação. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-white dark:bg-[#111111] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 px-4 py-3.5 rounded-xl shadow-2xl font-medium text-sm"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">Sucesso</span>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-normal">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 print:hidden">
        {/* Floating Button */}
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="flex items-center justify-center p-3 sm:px-4 sm:py-3 bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-500 dark:hover:bg-orange-400 dark:text-black shadow-lg rounded-full transition-transform hover:scale-105 active:scale-95 group border-none"
              aria-label="Deixe seu feedback"
            >
              <MessageSquare size={20} className="sm:mr-2" />
              <span className="hidden sm:inline font-medium text-sm">Feedback</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Popover Form */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-0 right-0 w-80 sm:w-96 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-neutral-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col transform transition-all"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare size={18} /> Ajude a melhorar
                </h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {submitted ? (
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
                    <ThumbsUp size={24} />
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white">Obrigado pelo seu feedback!</h4>
                  <p className="text-sm text-slate-500 dark:text-neutral-400">Sua opinião é valiosa para continuarmos melhorando o projeto.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
                  {/* Validation Error Message */}
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-950/50 text-xs"
                      >
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span className="font-medium">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Thumbs / Gostou */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">Você gostou do site?</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLiked(true);
                          setError(null);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-colors ${
                          liked === true 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
                        }`}
                      >
                        <ThumbsUp size={18} className={liked === true ? 'fill-current' : ''} /> Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLiked(false);
                          setError(null);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-colors ${
                          liked === false 
                            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
                        }`}
                      >
                        <ThumbsDown size={18} className={liked === false ? 'fill-current' : ''} /> Não
                      </button>
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">{ratingLabel}</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setRating(star);
                            setError(null);
                          }}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star 
                            size={28} 
                            className={`${
                              rating >= star 
                                ? 'text-amber-400 fill-current' 
                                : 'text-slate-200 dark:text-neutral-700'
                            } transition-colors`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Area */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">O que podemos melhorar?</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => {
                        setFeedback(e.target.value);
                        setError(null);
                      }}
                      placeholder="Sugestões, críticas, ideias..."
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-[#050505] dark:border-neutral-800 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:outline-none dark:text-white transition-all h-24"
                    />
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 dark:border-neutral-700 dark:bg-[#111111] dark:ring-offset-neutral-900"
                    />
                    <label htmlFor="isPublic" className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed cursor-pointer select-none">
                      Autorizo exibir meu comentário publicamente na landing page de forma anônima ou apenas com minhas iniciais. <span className="text-slate-400 dark:text-neutral-500 font-normal">(Opcional)</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-500 dark:hover:bg-orange-400 dark:text-black font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed border-none"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={18} /> Enviar Avaliação
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
