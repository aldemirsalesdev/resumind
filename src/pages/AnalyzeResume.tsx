import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle,
  Lightbulb,
  AlertCircle,
  FileCog,
} from "lucide-react";
import { analyzeResume } from "../services/geminiService";
import { calculateAtsScore } from "../lib/atsScore";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function AnalyzeResume() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadingSteps = [
    {
      label: "Leitura do arquivo",
      description: "Lendo e extraindo o conteúdo de texto bruto...",
    },
    {
      label: "Higienização LGPD",
      description:
        "Omitindo cabeçalhos confidenciais, fotos e metadados desnecessários...",
    },
    {
      label: "Mapeamento semântico",
      description:
        "Identificando histórico profissional, formação acadêmica e habilidades...",
    },
    {
      label: "Estruturação inteligente",
      description:
        "Organizando os dados nos padrões de alta legibilidade para recrutadores...",
    },
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === "file-too-large") {
        setError("O arquivo é muito grande. O limite máximo é 5MB.");
      } else {
        setError("Arquivo inválido. Por favor, envie um PDF ou DOCX válido.");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    multiple: false,
    maxSize: 5 * 1024 * 1024,
  } as any);

  const handleAnalyze = async () => {
    if (!file || !auth.currentUser) return;

    setLoading(true);
    setError(null);
    setCurrentStepIndex(0);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      const response = await fetch("/api/extract-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          mimetype: file.type,
          data: base64,
        }),
        credentials: "include",
      });

      const textResponse = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(textResponse);
      } catch (e) {
        console.error("API Error Text:", textResponse);
        const excerpt = textResponse.substring(0, 100);
        throw new Error(
          `Ocorreu um erro no servidor. Resposta bruta: ${excerpt}`,
        );
      }

      if (!response.ok) {
        throw new Error(
          responseData.error || responseData.detail || "Falha ao ler o arquivo",
        );
      }

      const { text } = responseData;

      // console.log("RAW TEXT:", text);

      setCurrentStepIndex(1);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setCurrentStepIndex(2);

      // Extract and structure data with Gemini
      const result = await analyzeResume(text);

      // console.log("PERSONAL INFO AFTER AI:", result?.structuredData?.personalInfo);

      // --- Fallback Regex for Contacts (Client-Side) ---
      const extractEmailFromRawText = (raw: string) => {
        const normalized = raw
          .replace(/\s*@\s*/g, '@')
          .replace(/\s*\.\s*(com|br|org|net|comm|commm)\b/gi, '.$1');
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
        const match = normalized.match(emailRegex);
        if (match) {
          return match[1].replace(/[^\w]+$/, '');
        }
        return null;
      };

      const extractPhoneFromRawText = (raw: string) => {
        const phoneRegex = /(?:(?:\+|00)?55[\s-]?)?(?:\(?0?\d{2}\)?[\s-]?)?(?:9[\s-]?\d{4}|\d{4})[\s-]*\d{4}/g;
        const matches = raw.match(phoneRegex);
        if (matches && matches.length > 0) {
          const validMatches = matches.filter(m => m.replace(/\D/g, '').length >= 8);
          if (validMatches.length > 0) {
             return validMatches[0].trim();
          }
        }
        return null;
      };

      const foundEmail = extractEmailFromRawText(text);
      const foundPhone = extractPhoneFromRawText(text);

      // console.log("EMAIL MATCHES:", foundEmail);
      // console.log("PHONE MATCHES:", foundPhone);

      if (result && !result.structuredData) {
        result.structuredData = {};
      }
      if (result && result.structuredData && !result.structuredData.personalInfo) {
        result.structuredData.personalInfo = {};
      }

      if (result && result.structuredData && result.structuredData.personalInfo) {
        if (foundEmail) {
           result.structuredData.personalInfo.email = foundEmail;
        }
        if (foundPhone) {
           result.structuredData.personalInfo.phone = foundPhone;
        }
      }
      
      // console.log("FINAL PERSONAL INFO SENT TO EDITOR:", result?.structuredData?.personalInfo);
      // --- Fim Fallback Regex ---

      if (result && result.structuredData) {
         if (!result.atsAnalysis) result.atsAnalysis = {};
         const calculatedScore = calculateAtsScore(result.structuredData, result.atsAnalysis.feedback);
         result.atsAnalysis.score = calculatedScore.score;
         result.atsAnalysis.feedback = calculatedScore.feedback;
      }

      setCurrentStepIndex(3);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Complete all steps visually
      setCurrentStepIndex(loadingSteps.length);

      setTimeout(() => {
        navigate("/templates", { state: { extractedData: result } });
      }, 600);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro durante a extração");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-16 flex flex-col gap-10 px-4">
      <div className="text-center flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight dark:text-white text-slate-950">
          Faça o upload do currículo
        </h1>
        <p className="dark:text-neutral-400 text-slate-600 text-base max-w-lg mx-auto">
          Envie o seu currículo em formato PDF ou Word. Nós iremos transferir
          seus dados com precisão para uma estrutura moderna e de fácil leitura.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div
          {...getRootProps()}
          className={cn(
            "p-12 border-2 border-dashed transition-all flex flex-col items-center justify-center gap-6 text-center rounded-2xl",
            isDragActive
              ? "border-orange-500 bg-orange-500/10"
              : "dark:border-neutral-800 border-slate-300 hover:border-neutral-500 dark:hover:bg-neutral-900/40 hover:bg-slate-100/50 bg-transparent",
            file && "border-orange-500/30 dark:bg-orange-500/5 bg-orange-500/5",
            loading && "opacity-75 cursor-not-allowed pointer-events-none",
          )}
        >
          <input {...getInputProps()} disabled={loading} />

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 dark:bg-[#111111] bg-orange-50 text-orange-600 flex items-center justify-center rounded-2xl shadow-sm border dark:border-neutral-800 border-orange-100">
                  <FileText size={32} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    {file.name}
                  </span>
                  <span className="text-xs dark:text-neutral-400 text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                {!loading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors mt-2"
                  >
                    Remover arquivo
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full dark:bg-neutral-800 bg-slate-200/60 flex items-center justify-center dark:text-neutral-400 text-slate-500">
                  <Upload size={28} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold dark:text-neutral-300 text-slate-700">
                    Arraste e solte o arquivo aqui
                  </span>
                  <span className="text-sm dark:text-neutral-400 text-slate-500">
                    PDF, DOCX ou TXT apenas
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Aviso de Foto & LGPD */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 text-amber-800 dark:text-amber-200 flex items-start gap-3.5 text-sm leading-relaxed shadow-sm">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-500" />
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Aviso sobre Fotos & Diretrizes LGPD (2026)
            </span>
            <p className="text-xs">
              Nossa plataforma{" "}
              <strong className="font-semibold">
                não permite currículos com fotos
              </strong>
              . Os modelos atuais de currículos de alto desempenho em{" "}
              <strong className="font-semibold">2026</strong> aboliram
              completamente o uso de imagens para afastar potenciais vieses
              inconscientes de contratação. Além disso, em total conformidade
              com as diretrizes regulatórias da{" "}
              <strong className="font-semibold">
                LGPD (Lei Geral de Proteção de Dados)
              </strong>
              , qualquer imagem ou foto contida no seu arquivo original será{" "}
              <strong className="font-semibold">
                removida de forma automática
              </strong>{" "}
              pelo nosso leitor inteligente na hora do processamento,
              priorizando a segurança e a privacidade total dos seus dados.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-start gap-4 border border-red-200 dark:border-red-500/20 rounded-lg text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className={cn(
              "w-full py-4 text-sm font-semibold rounded-xl flex items-center justify-center gap-3 transition-all min-h-[56px] shadow-sm",
              file && !loading
                ? "bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
                : "dark:bg-neutral-800 bg-slate-200 dark:text-neutral-500 text-slate-400 cursor-not-allowed",
            )}
          >
            {loading ? (
              <>
                <Loader2
                  className="animate-spin text-white animate-infinite"
                  size={18}
                />
                <span>Analisando currículo...</span>
              </>
            ) : (
              <>
                <FileCog size={18} />
                <span>Processar Currículo</span>
              </>
            )}
          </button>

          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 rounded-xl border dark:border-neutral-800 border-slate-200 dark:bg-[#111111] bg-slate-50/50 flex flex-col gap-4 shadow-sm mt-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider dark:text-neutral-400 text-slate-500 border-b dark:border-neutral-800 border-slate-200/60 pb-2.5">
                    <Loader2
                      className="animate-spin text-orange-500 shrink-0"
                      size={14}
                    />
                    <span>Progresso do Processamento Inteligente</span>
                  </div>
                  <div className="flex flex-col gap-3.5">
                    {loadingSteps.map((step, idx) => {
                      const isDone = idx < currentStepIndex;
                      const isActive = idx === currentStepIndex;
                      return (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="mt-0.5 flex items-center justify-center shrink-0">
                            {isDone ? (
                              <CheckCircle
                                size={15}
                                className="text-emerald-500"
                              />
                            ) : isActive ? (
                              <div className="relative flex h-3 w-3 items-center justify-center mt-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded-full border-2 dark:border-neutral-700 border-slate-300 bg-transparent" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={cn(
                                "text-xs font-bold uppercase tracking-wider",
                                isDone
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isActive
                                    ? "text-orange-600 dark:text-orange-400"
                                    : "text-slate-400 dark:text-neutral-500",
                              )}
                            >
                              {step.label}
                            </span>
                            <span
                              className={cn(
                                "text-xs leading-relaxed mt-0.5",
                                isDone
                                  ? "dark:text-neutral-400 text-slate-500 line-through decoration-slate-400 dark:decoration-neutral-700 opacity-60"
                                  : isActive
                                    ? "dark:text-white text-slate-800 font-medium"
                                    : "dark:text-neutral-500 text-slate-400",
                              )}
                            >
                              {step.description}
                            </span>


                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="p-5 border dark:border-neutral-800 border-slate-200 dark:bg-[#111111] bg-white rounded-xl flex gap-4 items-start shadow-sm">
          <CheckCircle size={20} className="text-emerald-500 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold dark:text-white text-slate-900">
              Leitura Inteligente
            </span>
            <p className="text-sm dark:text-neutral-400 text-slate-500 leading-relaxed">
              Nosso sistema extrai as informações sem distorcer o seu histórico
              de carreira.
            </p>
          </div>
        </div>
        <div className="p-5 border dark:border-neutral-800 border-slate-200 dark:bg-[#111111] bg-white rounded-xl flex gap-4 items-start shadow-sm">
          <CheckCircle size={20} className="text-emerald-500 shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold dark:text-white text-slate-900">
              Armazenamento Seguro
            </span>
            <p className="text-sm dark:text-neutral-400 text-slate-500 leading-relaxed">
              Suas informações são salvas de forma segura e privada na sua
              conta, nunca sendo compartilhadas com terceiros.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-4 text-center pb-8">
        <p className="text-xs text-slate-500 dark:text-neutral-500 max-w-lg">
          O Resumind utiliza inteligência artificial para otimização e pode
          cometer erros. Revise sempre o conteúdo final antes de enviar.
        </p>
      </div>
    </div>
  );
}
