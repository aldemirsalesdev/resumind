import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Download,
  RefreshCw,
  FileText,
  ExternalLink,
  X,
  Loader2,
  Info,
} from "lucide-react";
import { analyzeGrammarAndMissingInfo } from "../services/geminiService";
import { AutoScaledPreview } from "../components/AutoScaledPreview";
import { cn } from "../lib/utils";
import { resumeSchema } from "../lib/resumeSchema";
import { calculateAtsScore, normalizeContactInfo } from "../lib/atsScore";
import {
  exportResume,
  getSimpleHash,
  getCleanedDataHash,
  normalizeTemplateId,
} from "../export/exportResume";
import { auth } from "../lib/firebase";

interface PdfBlobContext {
  userId: string;
  resumeId: string;
  templateId: string;
  dataHash: string;
  blob: Blob;
  url: string;
  createdAt: string;
  format?: "pdf";
}

interface DocxBlobContext {
  userId: string;
  resumeId: string;
  templateId: string;
  dataHash: string;
  blob: Blob;
  url: string;
  createdAt: string;
  format?: "docx";
}

const cleanUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined).filter(val => val !== undefined);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = cleanUndefined(obj[key]);
    }
  }
  return result;
};

const mapMissingInfoToFriendlyText = (info: string): string => {
  const normalized = info.toLowerCase().trim();
  if (
    normalized === "website" ||
    normalized === "site" ||
    normalized === "site pessoal" ||
    normalized === "portfolio" ||
    normalized === "portfólio" ||
    normalized.includes("portfólio") ||
    normalized.includes("website")
  ) {
    return "Portfólio ou Website pessoal";
  }
  if (normalized.includes("linkedin")) {
    return "Link do perfil do LinkedIn";
  }
  if (normalized.includes("github")) {
    return "Link do perfil do GitHub";
  }
  if (normalized.includes("resumo") || normalized.includes("resumo profissional")) {
    return "Resumo profissional no início do currículo";
  }
  if (normalized.includes("habilidades") || normalized.includes("competências") || normalized.includes("skills")) {
    return "Habilidades técnicas e competências principais";
  }
  
  return info.charAt(0).toUpperCase() + info.slice(1);
};





export default function ReviewResume() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isDebugMode = searchParams.get("debugExport") === "1";
  
  const { resumeId, data, template: routeTemplate } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isUpdatingAnalysis, setIsUpdatingAnalysis] = useState(false);

  const [currentPdfBlobContext, setCurrentPdfBlobContext] = useState<PdfBlobContext | null>(null);
  const [currentDocxBlobContext, setCurrentDocxBlobContext] = useState<DocxBlobContext | null>(null);

  const [lastDownloadFormat, setLastDownloadFormat] = useState<string | null>(null);
  const [lastDownloadAt, setLastDownloadAt] = useState<string | null>(null);
  const [lastExportError, setLastExportError] = useState<string | null>(null);


  const [currentData, setCurrentData] = useState<any>(data);
  const [template, setTemplate] = useState<string>(() => {
    const initialTpl = routeTemplate || data?.template || "standard";
    return normalizeTemplateId(initialTpl);
  });
  const exportRef = React.useRef<HTMLDivElement>(null);

  const getCurrentExportContext = () => {
    const finalData = currentData?.structuredData || currentData || {};
    const normalizedTemplate = normalizeTemplateId(template);
    const currentHash = getSimpleHash(JSON.stringify({
      resumeData: getCleanedDataHash(finalData),
      templateId: normalizedTemplate
    }));

    return {
      userIdAtual: auth.currentUser?.uid || "anonymous",
      resumeIdAtual: resumeId || "",
      templateIdAtual: normalizedTemplate,
      resumeDataFinalAtual: finalData,
      dataHashAtual: currentHash,
      source: "ReviewResume"
    };
  };

  const openedResumeId = resumeId;
  const selectedResumeId = resumeId;
  const previewTemplateId = template;

  const dataStr = data ? JSON.stringify(data) : "";
  useEffect(() => {
    if (data) {
      setCurrentData((prev: any) => {
        if (JSON.stringify(prev) === dataStr) {
          return prev;
        }
        return data;
      });
    }
    if (routeTemplate && routeTemplate !== template) {
      setTemplate(normalizeTemplateId(routeTemplate));
    }
  }, [dataStr, routeTemplate, template]);

  // Robust fetching on mount from Firestore to keep data fully synchronized and secure
  useEffect(() => {
    async function fetchResumeFromDb() {
      if (!resumeId) return;
      try {
        const { db } = await import("../lib/firebase");
        const { doc, getDoc } = await import("firebase/firestore");
        const docSnap = await getDoc(doc(db, "resumes", resumeId));
        if (docSnap.exists()) {
          const dbData = docSnap.data();
          console.log("FETCHED FRESH RESUME DATA FROM FIRESTORE:", dbData);

          // Extract structural data directly from dbData by filtering out metadata fields.
          // Because updateDoc saves data at the root (...sanitizedData).
          let freshStructuredData: any = dbData.structuredData || dbData.resumeData || dbData.data;

          if (!freshStructuredData) {
            // Reconstruct the resume data from the root, omitting known metadata fields
            const {
              id,
              userId,
              ownerId,
              template,
              createdAt,
              updatedAt,
              localUpdatedAt,
              atsScore,
              score,
              analysis,
              metadata,
              ...restData
            } = dbData;

            if (Object.keys(restData).length > 0 && restData.personalInfo) {
              freshStructuredData = restData;
            }
          }

          if (!freshStructuredData) {
            console.error("Fresh resume data missing structuredData/resumeData/data and could not be reconstructed");
            return;
          }

          // Check if current data is already valid and has structure from location.state or editor
          const currentStructured = currentData?.structuredData || currentData;
          const hasValidCurrentData = currentStructured && currentStructured.personalInfo?.fullName;

          let isDbNewer = false;
          if (dbData) {
            const dbUpdatedAt = dbData.updatedAt || dbData.localUpdatedAt || 0;
            const currentUpdatedAt = currentData?.updatedAt || currentData?.localUpdatedAt || 0;

            const getMs = (val: any) => {
              if (!val) return 0;
              if (typeof val === "number") return val;
              if (typeof val === "string") return new Date(val).getTime();
              if (val.seconds) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
              if (typeof val.toDate === "function") return val.toDate().getTime();
              return 0;
            };

            const dbMs = getMs(dbUpdatedAt);
            const currentMs = getMs(currentUpdatedAt);

            if (dbMs > currentMs) {
              isDbNewer = true;
            }
          }

          if (hasValidCurrentData && !isDbNewer) {
            console.log("FIRESTORE DATA IS NOT NEWER than current editor state. Skipping overwrite to prevent stale state overwriting newer changes.");
          } else {
            setCurrentData((prev: any) => ({
              ...prev,
              ...dbData,
              structuredData: freshStructuredData
            }));
          }

          // Template priorities:
          // 1. template selecionado no editor e enviado para revisão (routeTemplate)
          // 2. template atual em estado local (template, se diferente de "standard")
          // 3. template salvo no currículo (dbData.template) se não houver um template atual mais relevante
          const hasLocalTemplateSource = !!(routeTemplate || (data && data.template));
          const currentTemplateHasValue = !!template && template !== "standard";

          if (dbData.template && !hasLocalTemplateSource && !currentTemplateHasValue) {
            setTemplate(normalizeTemplateId(dbData.template));
          }
        }
      } catch (err) {
        console.error("Error fetching fresh resume from DB:", err);
      }
    }
    fetchResumeFromDb();
  }, [resumeId]);

  const currentDataStr = currentData ? JSON.stringify(currentData) : "";

  // Invalidar PDF/DOCX ao trocar currículo, dados ou modelo
  useEffect(() => {
    console.log("RESUME, DATA OR TEMPLATE CHANGED - INVALIDATING OLD BLOB CACHES");
    setCurrentPdfBlobContext(null);
    setCurrentDocxBlobContext(null);
  }, [resumeId, template, currentDataStr]);

  // Clean up object URLs on unmount or when blob context changes
  useEffect(() => {
    return () => {
      if (currentPdfBlobContext?.url) {
        URL.revokeObjectURL(currentPdfBlobContext.url);
      }
    };
  }, [currentPdfBlobContext?.url]);

  useEffect(() => {
    return () => {
      if (currentDocxBlobContext?.url) {
        URL.revokeObjectURL(currentDocxBlobContext.url);
      }
    };
  }, [currentDocxBlobContext?.url]);
  useEffect(() => {
    async function runReview() {
      if (!currentData) return;

      const structData = currentData.structuredData || currentData || {};

      // 1. Load existing analysis from DB without modifying the resume document on load

      // 2. Try to load existing analysis from DB
      try {
        const currentDataHash = getCleanedDataHash(structData);

        let existingAnalysisDoc: any = null;
        let existingAnalysisRef: any = null;
        let foundInDb = false;

        if (resumeId) {
          const { auth, db } = await import("../lib/firebase");
          const { collection, query, where, getDocs } =
            await import("firebase/firestore");

          if (auth.currentUser) {
            const analysesQ = query(
              collection(db, "analyses"),
              where("resumeId", "==", resumeId),
              where("userId", "==", auth.currentUser.uid),
            );
            const aSnap = await getDocs(analysesQ);
            if (!aSnap.empty) {
              existingAnalysisDoc = aSnap.docs[0].data();
              existingAnalysisRef = aSnap.docs[0].ref;
              foundInDb = true;
            }
          }
        }

        let res: any = {};

        if (foundInDb && existingAnalysisDoc) {
          const savedHash = existingAnalysisDoc.dataHash || existingAnalysisDoc.lastDataHash;
          const isHashMatch = savedHash === currentDataHash;
          
          setNeedsUpdate(!isHashMatch);

          res = {
            grammarErrors: existingAnalysisDoc.grammarErrors || [],
            missingInfo: existingAnalysisDoc.missingInfo || [],
            actionableCorrections: existingAnalysisDoc.actionableCorrections || [],
            atsAnalysis: {
              score: existingAnalysisDoc.score || 0,
              feedback: existingAnalysisDoc.feedback || [],
              suggestions: existingAnalysisDoc.suggestions || [],
              aiEvaluations: existingAnalysisDoc.aiEvaluations || null,
            },
          };
        } else {
          // If no analysis exists in the DB, we don't automatically trigger Gemini.
          // We show the update required flag and run a local fallback.
          setNeedsUpdate(true);

          const fallbackAts = calculateAtsScore(structData, []);
          res = {
            grammarErrors: [],
            missingInfo: fallbackAts.missingInfo || [],
            actionableCorrections: [],
            atsAnalysis: fallbackAts,
          };
        }

        // Post-process to ensure no false positives for missing info based on current structuredData
        const contactInfo = normalizeContactInfo(structData);
        const hasEmail = contactInfo.email.length > 0;
        const hasPhone = contactInfo.phone.length > 0;
        const hasLinkedin = contactInfo.linkedin.length > 0;
        const hasLocation = contactInfo.location.length >= 3 && !/^[.,/\\#!$%^&*;:{}=\-_`~()\s]+$/.test(contactInfo.location);

        if (res.missingInfo && Array.isArray(res.missingInfo)) {
          res.missingInfo = res.missingInfo.filter((info: string) => {
            const lInfo = info.toLowerCase();
            if (hasEmail && (lInfo.includes("email") || lInfo.includes("e-mail"))) return false;
            if (hasPhone && lInfo.includes("telefone")) return false;
            if (hasLinkedin && lInfo.includes("linkedin")) return false;
            if (hasLocation && (lInfo.includes("cidade") || lInfo.includes("localização") || lInfo.includes("localizacao") || lInfo.includes("endereço") || lInfo.includes("endereco") || lInfo.includes("bairro"))) return false;
            return true;
          });
        }
        if (res.atsAnalysis && Array.isArray(res.atsAnalysis.feedback)) {
          res.atsAnalysis.feedback = res.atsAnalysis.feedback.filter((fb: any) => {
            const cat = (fb?.category || "").toLowerCase();
            const msg = (fb?.message || "").toLowerCase();
            if (cat.includes("legibilidade") || cat.includes("flesch") || cat.includes("readability") ||
                msg.includes("legibilidade") || msg.includes("flesch") || msg.includes("readability")) return false;
            if (hasEmail && (msg.includes("e-mail") || msg.includes("email")) && (msg.includes("vazio") || msg.includes("falta"))) return false;
            if (hasPhone && msg.includes("telefone") && (msg.includes("vazio") || msg.includes("falta"))) return false;
            if (hasLinkedin && msg.includes("linkedin") && (msg.includes("vazio") || msg.includes("falta"))) return false;
            if (hasLocation && (msg.includes("cidade") || msg.includes("localização") || msg.includes("localizacao") || msg.includes("endereço") || msg.includes("endereco") || msg.includes("bairro")) && (msg.includes("vazio") || msg.includes("falta") || msg.includes("ausente") || msg.includes("adicione") || msg.includes("informado") || msg.includes("informar"))) return false;
            return true;
          });
        }

        setReviewResult(res);
      } catch (err) {
        console.warn(
          "Análise de ortografia do Gemini falhou ou cota excedida. Usando fallback seguro:",
          err,
        );
        const fallbackAts = calculateAtsScore(structData, currentData.atsAnalysis?.feedback || [], currentData.atsAnalysis?.aiEvaluations);
        setReviewResult({
          grammarErrors: [],
          missingInfo: fallbackAts.missingInfo || [],
          actionableCorrections: [],
          atsAnalysis: fallbackAts,
        });
      } finally {
        setLoading(false);
      }
    }
    runReview();
  }, [currentDataStr, resumeId]);

  const handleUpdateAnalysis = async () => {
    if (!currentData) return;
    setIsUpdatingAnalysis(true);

    const structData = currentData.structuredData || currentData || {};
    const cleaned = JSON.parse(JSON.stringify(structData));
    if (cleaned && Array.isArray(cleaned.skills))
      cleaned.skills = cleaned.skills.filter((s: string) => s.trim() !== "");
    if (cleaned && Array.isArray(cleaned.certifications))
      cleaned.certifications = cleaned.certifications.filter((s: any) => typeof s === 'string' ? s.trim() !== '' : !!s);
    if (cleaned && Array.isArray(cleaned.languages))
      cleaned.languages = cleaned.languages.filter((s: string) => s.trim() !== "");

    const currentDataHash = getCleanedDataHash(structData);

    try {
      const res = await analyzeGrammarAndMissingInfo(cleaned);

      if (res?.atsAnalysis?.score <= 10 && res?.atsAnalysis?.score > 0) {
        res.atsAnalysis.score = Math.round(res.atsAnalysis.score * 10);
      } else if (res?.atsAnalysis?.score) {
        res.atsAnalysis.score = Math.round(res.atsAnalysis.score);
      }
      if (res?.atsAnalysis && typeof res.atsAnalysis.score === "number") {
        res.atsAnalysis.score = Math.min(res.atsAnalysis.score, 100);
      }

      if (!res.atsAnalysis) res.atsAnalysis = { score: 70, feedback: [] };
      if (!res.atsAnalysis.feedback) res.atsAnalysis.feedback = [];
      if (!res.actionableCorrections) res.actionableCorrections = [];

      if (res.grammarErrors && Array.isArray(res.grammarErrors)) {
        res.grammarErrors.forEach((err: string) => {
          if (
            err &&
            !err.toLowerCase().includes("string") &&
            !err.toLowerCase().includes("array") &&
            !err.toLowerCase().includes("json")
          ) {
            res.atsAnalysis.feedback.push({
              category: "Erros de Português",
              message: err,
              severity: "high",
              type: "error",
            });
          }
        });
      }

      if (res.missingInfo && Array.isArray(res.missingInfo)) {
        res.missingInfo.forEach((info: string) => {
          if (
            info &&
            !info.toLowerCase().includes("string") &&
            !info.toLowerCase().includes("array") &&
            !info.toLowerCase().includes("json")
          ) {
            res.atsAnalysis.feedback.push({
              category: "Informações Faltando",
              message: mapMissingInfoToFriendlyText(info),
              severity: "medium",
              type: "warning",
            });
          }
        });
      }

      const finalAts = calculateAtsScore(structData, res.atsAnalysis?.feedback || [], res.aiEvaluations);
      res.atsAnalysis = finalAts;
      res.missingInfo = finalAts.missingInfo || [];

      const contactInfo = normalizeContactInfo(structData);
      const hasEmail = contactInfo.email.length > 0;
      const hasPhone = contactInfo.phone.length > 0;
      const hasLinkedin = contactInfo.linkedin.length > 0;
      const hasLocation = contactInfo.location.length >= 3 && !/^[.,/\\#!$%^&*;:{}=\-_`~()\s]+$/.test(contactInfo.location);

      if (res.missingInfo && Array.isArray(res.missingInfo)) {
        res.missingInfo = res.missingInfo.filter((info: string) => {
          const lInfo = info.toLowerCase();
          if (hasEmail && (lInfo.includes("email") || lInfo.includes("e-mail"))) return false;
          if (hasPhone && lInfo.includes("telefone")) return false;
          if (hasLinkedin && lInfo.includes("linkedin")) return false;
          if (hasLocation && (lInfo.includes("cidade") || lInfo.includes("localização") || lInfo.includes("localizacao") || lInfo.includes("endereço") || lInfo.includes("endereco") || lInfo.includes("bairro"))) return false;
          return true;
        });
      }
      if (res.atsAnalysis && Array.isArray(res.atsAnalysis.feedback)) {
        res.atsAnalysis.feedback = res.atsAnalysis.feedback.filter((fb: any) => {
          const cat = (fb?.category || "").toLowerCase();
          const msg = (fb?.message || "").toLowerCase();
          if (cat.includes("legibilidade") || cat.includes("flesch") || cat.includes("readability") ||
              msg.includes("legibilidade") || msg.includes("flesch") || msg.includes("readability")) return false;
          if (hasEmail && (msg.includes("e-mail") || msg.includes("email")) && (msg.includes("vazio") || msg.includes("falta"))) return false;
          if (hasPhone && msg.includes("telefone") && (msg.includes("vazio") || msg.includes("falta"))) return false;
          if (hasLinkedin && msg.includes("linkedin") && (msg.includes("vazio") || msg.includes("falta"))) return false;
          if (hasLocation && (msg.includes("cidade") || msg.includes("localização") || msg.includes("localizacao") || msg.includes("endereço") || msg.includes("endereco") || msg.includes("bairro")) && (msg.includes("vazio") || msg.includes("falta") || msg.includes("ausente") || msg.includes("adicione") || msg.includes("informado") || msg.includes("informar"))) return false;
          return true;
        });
      }

      if (resumeId) {
        const { auth, db } = await import("../lib/firebase");
        const { collection, query, where, getDocs, updateDoc, addDoc, doc } = await import("firebase/firestore");

        if (auth.currentUser) {
          await updateDoc(doc(db, "resumes", resumeId), cleanUndefined({
            atsScore: finalAts.score,
            updatedAt: new Date().toISOString(),
          }));

          const analysesRef = collection(db, "analyses");
          const q = query(analysesRef, where("resumeId", "==", resumeId), where("userId", "==", auth.currentUser.uid));
          const snap = await getDocs(q);

          const analysisPayload = {
            score: finalAts.score,
            feedback: finalAts.feedback,
            suggestions: res.atsAnalysis?.suggestions || [],
            grammarErrors: res.grammarErrors || [],
            missingInfo: res.missingInfo || [],
            actionableCorrections: res.actionableCorrections || [],
            aiEvaluations: res.aiEvaluations || null,
            dataHash: currentDataHash,
            lastDataHash: currentDataHash,
            updatedAt: new Date().toISOString(),
          };

          if (!snap.empty) {
            await updateDoc(snap.docs[0].ref, cleanUndefined(analysisPayload));
          } else {
            await addDoc(analysesRef, cleanUndefined({
              resumeId,
              userId: auth.currentUser.uid,
              ...analysisPayload,
              createdAt: new Date().toISOString(),
            }));
          }
        }
      }

      setReviewResult(res);
      setNeedsUpdate(false);
    } catch (err) {
      console.error("Erro ao atualizar análise:", err);
      alert("Falha ao processar re-análise. Verifique sua conexão ou tente novamente.");
    } finally {
      setIsUpdatingAnalysis(false);
    }
  };

  if (!data) {
    return (
      <div className="p-12 text-center text-neutral-400 font-medium">
        Nenhum dado para revisar.
      </div>
    );
  }

  const getFinalResumeData = () => {
    return currentData?.structuredData || currentData || {};
  };

  const previewData = React.useMemo(() => {
    return { structuredData: getFinalResumeData() };
  }, [currentDataStr]);

  const assertExportContextMatchesCurrentState = (
    context: ReturnType<typeof getCurrentExportContext>,
    blobContext?: PdfBlobContext | DocxBlobContext | null
  ) => {
    if (context.resumeIdAtual !== resumeId) {
      throw new Error(`Security Mismatch: Export resume ID "${context.resumeIdAtual}" does not match active resume ID "${resumeId}".`);
    }
    const contextTemplateNormalized = normalizeTemplateId(context.templateIdAtual);
    const activeTemplateNormalized = normalizeTemplateId(template);
    if (contextTemplateNormalized !== activeTemplateNormalized) {
      throw new Error(`Security Mismatch: Export template ID "${contextTemplateNormalized}" does not match active template ID "${activeTemplateNormalized}".`);
    }
    if (auth.currentUser && context.userIdAtual !== auth.currentUser.uid) {
      throw new Error(`Security Mismatch: Export user ID "${context.userIdAtual}" does not match active authenticated user "${auth.currentUser.uid}".`);
    }

    if (blobContext) {
      if (blobContext.userId !== context.userIdAtual) {
        throw new Error(`Cache Security Mismatch: Cached Blob user ID "${blobContext.userId}" does not match current user "${context.userIdAtual}".`);
      }
      if (blobContext.resumeId !== context.resumeIdAtual) {
        throw new Error(`Cache Security Mismatch: Cached Blob resume ID "${blobContext.resumeId}" does not match current resume "${context.resumeIdAtual}".`);
      }
      const blobTemplateNormalized = normalizeTemplateId(blobContext.templateId);
      if (blobTemplateNormalized !== contextTemplateNormalized) {
        throw new Error(`Cache Security Mismatch: Cached Blob template ID "${blobTemplateNormalized}" does not match current template "${contextTemplateNormalized}".`);
      }
      if (blobContext.dataHash !== context.dataHashAtual) {
        throw new Error(`Cache Security Mismatch: Cached Blob data hash "${blobContext.dataHash}" is stale compared to current hash "${context.dataHashAtual}".`);
      }
    }
  };

  const handleDownload = async () => {
    const exportContext = getCurrentExportContext();
    const finalData = exportContext.resumeDataFinalAtual;
    const personalInfo = finalData?.personalInfo;
    const fullName = personalInfo?.fullName;
    const hasMainSection = 
      (finalData?.experience && finalData.experience.length > 0) ||
      (finalData?.education && finalData.education.length > 0) ||
      (finalData?.projects && finalData.projects.length > 0) ||
      (finalData?.skills && finalData.skills.length > 0);

    if (!finalData || !fullName || !hasMainSection || !exportContext.templateIdAtual) {
      alert("Erro de validação: O currículo parece estar incompleto. Verifique se preencheu suas informações principais.");
      return;
    }

    setLastDownloadFormat("PDF");
    setLastDownloadAt(new Date().toISOString());
    setLastExportError(null);

    const pdfMatches = currentPdfBlobContext?.resumeId === exportContext.resumeIdAtual && normalizeTemplateId(currentPdfBlobContext?.templateId) === normalizeTemplateId(exportContext.templateIdAtual) && currentPdfBlobContext?.dataHash === exportContext.dataHashAtual && currentPdfBlobContext?.format === "pdf";
    const docxMatches = currentDocxBlobContext?.resumeId === exportContext.resumeIdAtual && normalizeTemplateId(currentDocxBlobContext?.templateId) === normalizeTemplateId(exportContext.templateIdAtual) && currentDocxBlobContext?.dataHash === exportContext.dataHashAtual && currentDocxBlobContext?.format === "docx";

    console.group("EXPORT TEMPLATE CHECK");
    console.log("FORMAT:", "pdf");
    console.log("RESUME ID:", resumeId);
    console.log("RAW TEMPLATE:", template);
    console.log("NORMALIZED TEMPLATE:", normalizeTemplateId(template));
    console.log("EXPORT TEMPLATE ID:", exportContext.templateIdAtual);
    console.log("PREVIEW TEMPLATE ID:", template);
    console.log("PDF BLOB CONTEXT:", currentPdfBlobContext);
    console.log("DOCX BLOB CONTEXT:", currentDocxBlobContext);
    console.log("DATA HASH:", exportContext.dataHashAtual);
    console.groupEnd();

    // 2. Validate templateId matches
    const templateIdAtual = normalizeTemplateId(exportContext.templateIdAtual);
    const templateIdPreview = normalizeTemplateId(template);

    // Validate actual vs preview
    if (templateIdAtual !== templateIdPreview) {
      console.error("Export blocked: selected template does not match export template. (Diverged field: templateId atual vs templateId do preview)", {
        templateIdAtual,
        templateIdPreview,
      });
      alert("Export blocked: selected template does not match export template.");
      setCurrentPdfBlobContext(null);
      return;
    }

    let activeBlob = currentPdfBlobContext?.blob;

    // Validate actual vs Blob
    if (currentPdfBlobContext) {
      const templateIdBlob = normalizeTemplateId(currentPdfBlobContext.templateId);
      if (templateIdBlob !== templateIdAtual) {
        console.error("Export blocked: selected template does not match export template. Blob template mismatched. (Diverged field: templateId atual vs templateId do Blob)", {
          templateIdAtual,
          templateIdBlob,
        });
        setCurrentPdfBlobContext(null);
        activeBlob = undefined;
      }
    }

    try {
      // Security assertions block
      assertExportContextMatchesCurrentState(exportContext, activeBlob ? currentPdfBlobContext : null);

      setIsExportingPdf(true);

      activeBlob = currentPdfBlobContext?.blob;

      if (!activeBlob || !pdfMatches) {
        console.log("REGENERATING PDF BLOB: Current pdf blob context is outdated, wrong owner, or missing.");
        const { pdf } = await import("@react-pdf/renderer");
        const { TemplatePdfDocument } = await import("../templates/standardATS/pdf");
        activeBlob = await pdf(<TemplatePdfDocument data={finalData} templateId={exportContext.templateIdAtual} />).toBlob();
        
        const newCtx: PdfBlobContext = {
          userId: exportContext.userIdAtual,
          resumeId: exportContext.resumeIdAtual || "",
          templateId: exportContext.templateIdAtual,
          dataHash: exportContext.dataHashAtual,
          blob: activeBlob,
          url: URL.createObjectURL(activeBlob),
          createdAt: new Date().toISOString(),
          format: "pdf"
        };
        setCurrentPdfBlobContext(newCtx);

        // Assert again to ensure no race conditions changed state
        assertExportContextMatchesCurrentState(exportContext, newCtx);

        await exportResume({
          format: "pdf",
          userId: exportContext.userIdAtual,
          resumeId: exportContext.resumeIdAtual,
          templateId: exportContext.templateIdAtual,
          resumeData: finalData,
          cachedBlobContext: newCtx,
          dataHash: exportContext.dataHashAtual,
        });
      } else {
        await exportResume({
          format: "pdf",
          userId: exportContext.userIdAtual,
          resumeId: exportContext.resumeIdAtual,
          templateId: exportContext.templateIdAtual,
          resumeData: finalData,
          cachedBlobContext: currentPdfBlobContext,
          dataHash: exportContext.dataHashAtual,
        });
      }

    } catch (error: any) {
      console.error("Error generating PDF:", error);
      setLastExportError(error.message || error.toString());
      alert(`Ocorreu um erro ao gerar o PDF: ${error.message || error}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportDoc = async () => {
    const exportContext = getCurrentExportContext();
    const finalData = exportContext.resumeDataFinalAtual;
    const personalInfo = finalData?.personalInfo;
    const fullName = personalInfo?.fullName;

    if (!finalData || !fullName || !exportContext.templateIdAtual) {
      alert("Erro de validação: O currículo parece estar incompleto. Verifique se preencheu suas informações principais.");
      return;
    }

    setLastDownloadFormat("DOCX");
    setLastDownloadAt(new Date().toISOString());
    setLastExportError(null);

    const pdfMatches = currentPdfBlobContext?.resumeId === exportContext.resumeIdAtual && normalizeTemplateId(currentPdfBlobContext?.templateId) === normalizeTemplateId(exportContext.templateIdAtual) && currentPdfBlobContext?.dataHash === exportContext.dataHashAtual && currentPdfBlobContext?.format === "pdf";
    const docxMatches = currentDocxBlobContext?.resumeId === exportContext.resumeIdAtual && normalizeTemplateId(currentDocxBlobContext?.templateId) === normalizeTemplateId(exportContext.templateIdAtual) && currentDocxBlobContext?.dataHash === exportContext.dataHashAtual && currentDocxBlobContext?.format === "docx";

    console.group("EXPORT TEMPLATE CHECK");
    console.log("FORMAT:", "docx");
    console.log("RESUME ID:", resumeId);
    console.log("RAW TEMPLATE:", template);
    console.log("NORMALIZED TEMPLATE:", normalizeTemplateId(template));
    console.log("EXPORT TEMPLATE ID:", exportContext.templateIdAtual);
    console.log("PREVIEW TEMPLATE ID:", template);
    console.log("PDF BLOB CONTEXT:", currentPdfBlobContext);
    console.log("DOCX BLOB CONTEXT:", currentDocxBlobContext);
    console.log("DATA HASH:", exportContext.dataHashAtual);
    console.groupEnd();

    // 2. Validate templateId matches
    const templateIdAtual = normalizeTemplateId(exportContext.templateIdAtual);
    const templateIdPreview = normalizeTemplateId(template);

    // Validate actual vs preview
    if (templateIdAtual !== templateIdPreview) {
      console.error("Export blocked: selected template does not match export template. (Diverged field: templateId atual vs templateId do preview)", {
        templateIdAtual,
        templateIdPreview,
      });
      alert("Export blocked: selected template does not match export template.");
      setCurrentDocxBlobContext(null);
      return;
    }

    let activeBlob = currentDocxBlobContext?.blob;

    // Validate actual vs Blob
    if (currentDocxBlobContext) {
      const templateIdBlob = normalizeTemplateId(currentDocxBlobContext.templateId);
      if (templateIdBlob !== templateIdAtual) {
        console.error("Export blocked: selected template does not match export template. Blob template mismatched. (Diverged field: templateId atual vs templateId do Blob)", {
          templateIdAtual,
          templateIdBlob,
        });
        setCurrentDocxBlobContext(null);
        activeBlob = undefined;
      }
    }

    try {
      // Security assertions block
      assertExportContextMatchesCurrentState(exportContext, activeBlob ? currentDocxBlobContext : null);

      if (!activeBlob || !docxMatches) {
        console.log("REGENERATING DOCX BLOB: Current docx blob context is outdated, wrong owner, or missing.");
        const { generateStandardATSDocx } = await import("../templates/standardATS/docx");
        activeBlob = await generateStandardATSDocx(finalData, exportContext.templateIdAtual);

        const newCtx: DocxBlobContext = {
          userId: exportContext.userIdAtual,
          resumeId: exportContext.resumeIdAtual || "",
          templateId: exportContext.templateIdAtual,
          dataHash: exportContext.dataHashAtual,
          blob: activeBlob,
          url: URL.createObjectURL(activeBlob),
          createdAt: new Date().toISOString(),
          format: "docx"
        };
        setCurrentDocxBlobContext(newCtx);

        // Assert again to ensure no race conditions changed state
        assertExportContextMatchesCurrentState(exportContext, newCtx);

        await exportResume({
          format: "docx",
          userId: exportContext.userIdAtual,
          resumeId: exportContext.resumeIdAtual,
          templateId: exportContext.templateIdAtual,
          resumeData: finalData,
          cachedBlobContext: newCtx,
          dataHash: exportContext.dataHashAtual,
        });
      } else {
        await exportResume({
          format: "docx",
          userId: exportContext.userIdAtual,
          resumeId: exportContext.resumeIdAtual,
          templateId: exportContext.templateIdAtual,
          resumeData: finalData,
          cachedBlobContext: currentDocxBlobContext,
          dataHash: exportContext.dataHashAtual,
        });
      }
    } catch (error: any) {
      console.error("DOCX download error:", error);
      setLastExportError(error.message || error.toString());
      alert(`Ocorreu um erro ao gerar o arquivo DOCX: ${error.message || error}`);
    }
  };

  return (
    <div className="w-full flex justify-center">
      {isDebugMode && (
        <div className="fixed top-16 right-4 z-50 bg-black/90 text-green-400 p-4 rounded-lg shadow-xl text-xs font-mono max-w-sm overflow-auto max-h-[80vh] print:hidden break-all">
          <div className="flex justify-between items-center mb-2 border-b border-green-700 pb-2">
            <h3 className="text-white font-bold text-sm">DEBUG EXPORT</h3>
            <button
              onClick={() => {
                const ctx = getCurrentExportContext();
                const json = JSON.stringify({
                  routeResumeId: resumeId,
                  exportResumeId: ctx.resumeIdAtual,
                  exportResumeName: ctx.resumeDataFinalAtual?.personalInfo?.name || ctx.resumeDataFinalAtual?.personalInfo?.fullName,
                  rawTemplate: template,
                  normalizedTemplate: normalizeTemplateId(template),
                  dataHash: ctx.dataHashAtual,
                  pdfBlobContext: currentPdfBlobContext,
                  docxBlobContext: currentDocxBlobContext,
                  pdfContextMatches: currentPdfBlobContext?.resumeId === ctx.resumeIdAtual && normalizeTemplateId(currentPdfBlobContext?.templateId) === normalizeTemplateId(ctx.templateIdAtual) && currentPdfBlobContext?.dataHash === ctx.dataHashAtual,
                  docxContextMatches: currentDocxBlobContext?.resumeId === ctx.resumeIdAtual && normalizeTemplateId(currentDocxBlobContext?.templateId) === normalizeTemplateId(ctx.templateIdAtual) && currentDocxBlobContext?.dataHash === ctx.dataHashAtual,
                  lastDownloadFormat,
                  lastDownloadAt,
                  lastExportError
                }, null, 2);
                navigator.clipboard.writeText(json);
                alert("Debug JSON copiado para área de transferência!");
              }}
              className="bg-green-700 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
            >
              Copiar Debug Export
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <p><span className="text-gray-400">routeResumeId:</span> {resumeId}</p>
            <p><span className="text-gray-400">exportResumeId:</span> {getCurrentExportContext().resumeIdAtual}</p>
            <p><span className="text-gray-400">exportResumeName:</span> {getCurrentExportContext().resumeDataFinalAtual?.personalInfo?.name || getCurrentExportContext().resumeDataFinalAtual?.personalInfo?.fullName}</p>
            <p><span className="text-gray-400">rawTemplate:</span> {template}</p>
            <p><span className="text-gray-400">normalizedTemplate:</span> {normalizeTemplateId(template)}</p>
            <p><span className="text-gray-400">dataHash:</span> {getCurrentExportContext().dataHashAtual}</p>
            <p className="mt-2 border-t border-green-800 pt-1 text-gray-300">PDF Context</p>
            <p><span className="text-gray-400">Has Blob:</span> {currentPdfBlobContext ? "Yes" : "No"}</p>
            <p><span className="text-gray-400">Matches:</span> {currentPdfBlobContext?.resumeId === getCurrentExportContext().resumeIdAtual && normalizeTemplateId(currentPdfBlobContext?.templateId) === normalizeTemplateId(getCurrentExportContext().templateIdAtual) && currentPdfBlobContext?.dataHash === getCurrentExportContext().dataHashAtual ? "Yes" : "No"}</p>
            <p className="mt-2 border-t border-green-800 pt-1 text-gray-300">DOCX Context</p>
            <p><span className="text-gray-400">Has Blob:</span> {currentDocxBlobContext ? "Yes" : "No"}</p>
            <p><span className="text-gray-400">Matches:</span> {currentDocxBlobContext?.resumeId === getCurrentExportContext().resumeIdAtual && normalizeTemplateId(currentDocxBlobContext?.templateId) === normalizeTemplateId(getCurrentExportContext().templateIdAtual) && currentDocxBlobContext?.dataHash === getCurrentExportContext().dataHashAtual ? "Yes" : "No"}</p>
            
            <p className="mt-2 border-t border-green-800 pt-1 text-gray-300">Last Action</p>
            <p><span className="text-gray-400">Format:</span> {lastDownloadFormat || "None"}</p>
            <p><span className="text-gray-400">At:</span> {lastDownloadAt || "None"}</p>
            {lastExportError && <p className="text-red-400 mt-1"><span className="text-red-500">Error:</span> {lastExportError}</p>}
          </div>
        </div>
      )}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-neutral-950/80 backdrop-blur-sm print:hidden">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-sm w-full relative p-6 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col gap-4 text-center items-center mt-2">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ExternalLink size={26} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                Abra em uma nova aba
              </h3>
              <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
                Você parece estar utilizando o aplicativo dentro de um quadro
                protegido. Para conseguir baixar o PDF do seu currículo com
                sucesso, você precisa abrir a aplicação numa aba cheia do
                navegador.
              </p>
              <button
                onClick={() => {
                  window.open(window.location.href, "_blank");
                  setShowPrintModal(false);
                }}
                className="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                Abrir em Nova Aba
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="max-w-4xl mx-auto pt-28 md:pt-32 pb-16 flex flex-col gap-8 md:gap-12 print:hidden w-full px-4">
        <header className="flex flex-col gap-2 text-center items-center">
          <span className="text-xs font-semibold uppercase text-orange-600">
            Passo 4 de 4
          </span>
          <h1 className="text-3xl font-bold tracking-tight dark:text-white text-slate-950">
            Revisão Final
          </h1>
          <p className="dark:text-neutral-400 text-slate-600 text-sm max-w-lg px-2">
            Validamos sua ortografia e garantimos que nenhuma informação
            essencial ficou de fora antes de você realizar o download.
          </p>
        </header>

        {loading ? (
          <div className="w-full py-16 px-4 flex flex-col items-center justify-center gap-4 text-center">
            <RefreshCw size={32} className="animate-spin text-orange-600 shrink-0" />
            <span className="font-semibold text-sm md:text-base dark:text-neutral-400 text-slate-600 max-w-xs md:max-w-none">
              Analisando ortografia e estrutura geral...
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {reviewResult && (
              <div className="flex flex-col gap-6">
                {needsUpdate && (
                  <div className="border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 text-amber-800 dark:text-amber-200 p-4 md:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm">Seu currículo foi alterado desde a última análise</span>
                        <p className="text-xs dark:text-neutral-400 text-slate-500 leading-relaxed">
                          As alterações feitas no currículo ainda não foram processadas para atualizar sua pontuação de compatibilidade ATS e o feedback ortográfico detalhado.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleUpdateAnalysis}
                      disabled={isUpdatingAnalysis}
                      className="shrink-0 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/60 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm self-end sm:self-center cursor-pointer"
                    >
                      {isUpdatingAnalysis ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          <span>Analisando...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          <span>Atualizar análise</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                {/* ATS Score Card */}
                <div className="border dark:border-neutral-800 border-slate-200 rounded-xl dark:bg-[#111111] bg-white p-5 md:p-6 w-full flex flex-col md:flex-row items-center gap-6 justify-between shadow-sm text-center md:text-left">
                  <div className="flex flex-col gap-1 max-w-[500px]">
                    <h3 className="font-bold text-lg flex items-center justify-center md:justify-start gap-2 dark:text-white text-slate-900">
                      <CheckCircle2
                        className={cn(
                          reviewResult.atsAnalysis?.score >= 80
                            ? "text-emerald-500"
                            : reviewResult.atsAnalysis?.score >= 50
                              ? "text-amber-500"
                              : "text-red-500",
                        )}
                        size={20}
                      />{" "}
                      Pontuação Estimada ATS
                    </h3>
                    <p className="text-sm dark:text-neutral-400 text-slate-500 leading-relaxed">
                      {reviewResult.atsAnalysis?.score >= 80
                        ? "Fantástico! O seu currículo atingiu uma pontuação excelente e tem grandes chances de se destacar enormemente nas plataformas ATS. Excelente trabalho!"
                        : reviewResult.atsAnalysis?.score >= 50
                          ? "Bom trabalho! O seu currículo tem boas chances de ser aprovado, mas ajustes finos e refinamentos nas palavras-chave ajudarão as plataformas a ler sua experiência de forma otimizada."
                          : "Atenção redobrada. No formato atual e sem as devidas palavras-chave, os sistemas automatizados (ATS) podem ter muita dificuldade em ler o currículo ou até ignorá-lo. Recomendamos voltar e fortalecer o texto."}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-center border font-black text-4xl h-24 w-24 rounded-full shadow-sm shrink-0 mx-auto md:mx-0",
                      reviewResult.atsAnalysis?.score >= 80
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : reviewResult.atsAnalysis?.score >= 50
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          : "bg-red-500/10 text-red-500 border-red-500/30",
                    )}
                  >
                    {reviewResult.atsAnalysis?.score || 0}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Warnings card */}
                  <div className="border dark:border-neutral-800 border-slate-200 rounded-xl dark:bg-[#111111] bg-white p-5 md:p-6 flex flex-col gap-4 shadow-sm">
                    <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white text-slate-900">
                      <AlertCircle className="text-amber-500" size={20} />{" "}
                      Correções Rápidas Sugeridas
                    </h3>
                    {reviewResult.atsAnalysis?.feedback?.some(
                      (f: any) => f.type === "error" || f.type === "warning" || f.type === "info",
                    ) ? (
                      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                        {reviewResult.atsAnalysis?.feedback
                          ?.filter(
                            (f: any) =>
                              f.type === "error" || f.type === "warning" || f.type === "info",
                          )
                          .sort((a: any, b: any) => {
                            const typePriority: Record<string, number> = { "error": 1, "warning": 2, "info": 3, "success": 4 };
                            return typePriority[a.type] - typePriority[b.type];
                          })
                          .map((f: any, i: number) => {
                            const isError = f.type === "error";
                            return (
                              <div
                                key={`feedback-${i}`}
                                className={cn(
                                  "p-4 rounded-xl border text-sm flex gap-3 transition-all",
                                  isError
                                    ? "bg-red-500/5 border-red-500/10 dark:border-red-500/20 text-red-950 dark:text-red-200"
                                    : f.type === "info"
                                    ? "bg-blue-500/5 border-blue-500/10 dark:border-blue-500/20 text-blue-950 dark:text-blue-200"
                                    : "bg-amber-500/5 border-amber-500/10 dark:border-amber-500/20 text-amber-950 dark:text-amber-200"
                                )}
                              >
                                <span className={cn(
                                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                  isError ? "bg-red-500" : f.type === "info" ? "bg-blue-500" : "bg-amber-500"
                                )} />
                                <div className="flex-1 leading-relaxed">
                                  <span className="font-semibold block mb-1">
                                    {f.category || (isError ? "Correção Crítica" : "Aviso de Melhoria")}
                                  </span>
                                  <p className="dark:text-neutral-300 text-slate-700">{f.message}</p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-emerald-500 text-sm font-medium flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                        <CheckCircle2 size={18} /> O texto e a estrutura parecem
                        estar ótimos!
                      </div>
                    )}
                  </div>

                  {/* Missing Info checklist card */}
                  <div className="border dark:border-neutral-800 border-slate-200 rounded-xl dark:bg-[#111111] bg-white p-5 md:p-6 flex flex-col gap-4 shadow-sm">
                    <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white text-slate-900">
                      <AlertCircle className="text-amber-500" size={20} />{" "}
                      Checklist de Informações
                    </h3>
                    
                    {reviewResult.atsAnalysis?.score >= 75 && (
                      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200 text-sm flex gap-3 items-start shadow-sm">
                        <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={18} />
                        <div className="flex-1 leading-relaxed">
                          <span className="font-bold block mb-1 text-emerald-800 dark:text-emerald-300">
                            {reviewResult.atsAnalysis.score >= 85 ? "Excelente Score de Compatibilidade!" : "Bom Score de Compatibilidade!"}
                          </span>
                          <p className="dark:text-neutral-300 text-slate-700">
                            Seu currículo já possui excelentes informações e uma boa estrutura de conteúdo. Continue assim!
                          </p>
                        </div>
                      </div>
                    )}

                    {reviewResult.missingInfo && reviewResult.missingInfo.length > 0 ? (
                      <>
                        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                          {reviewResult.missingInfo
                            .filter(
                              (e: string) =>
                                !e.toLowerCase().includes("string") &&
                                !e.toLowerCase().includes("array") &&
                                !e.toLowerCase().includes("json"),
                            )
                            .map((err: string, i: number) => (
                              <div
                                key={i}
                                className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/10 dark:border-amber-500/20 text-amber-950 dark:text-amber-200 text-sm flex gap-3"
                              >
                                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <div className="flex-1 leading-relaxed">
                                  <span className="font-semibold block mb-1">Recomendação</span>
                                  <p className="dark:text-neutral-300 text-slate-700">{mapMissingInfoToFriendlyText(err)}</p>
                                </div>
                              </div>
                            ))}
                        </div>

                        <div className="p-3.5 rounded-xl border border-blue-500/10 dark:border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/5 text-slate-600 dark:text-neutral-400 text-xs leading-relaxed flex gap-2.5 items-start">
                          <Info className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" size={16} />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-neutral-200 block mb-1">Dica sobre os itens recomendados:</span>
                            Os itens listados acima (como <strong className="font-medium text-slate-800 dark:text-neutral-200">portfólio, site pessoal ou redes profissionais</strong>) são excelentes para garantir a pontuação máxima nos robôs de triagem. Porém, se você não tiver ou não precisar de algum deles no momento (como um site próprio), <strong className="font-medium text-slate-800 dark:text-neutral-200">não se preocupe!</strong> Seu currículo já está excelente e perfeitamente funcional para envio.
                          </div>
                        </div>
                      </>
                    ) : (
                      !(reviewResult.atsAnalysis?.score >= 75) && (
                        <div className="text-emerald-500 text-sm font-medium flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                          <CheckCircle2 size={18} /> Estrutura de informações completa!
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 w-full mt-6 items-start justify-center">
              {/* Preview */}
              <div className="w-full flex-1 max-w-[794px] flex justify-center">
                <div className="w-full" id="resume-pdf-target">
                  <AutoScaledPreview
                    data={previewData}
                    templateId={template}
                    fullHeight={true}
                    onBlobGenerated={(blob, url) => {
                      const context = getCurrentExportContext();
                      setCurrentPdfBlobContext({
                        userId: context.userIdAtual,
                        resumeId: context.resumeIdAtual,
                        templateId: context.templateIdAtual,
                        dataHash: context.dataHashAtual,
                        blob,
                        url,
                        createdAt: new Date().toISOString(),
                        format: "pdf"
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 mt-8 text-center">
              <p className="text-xs text-slate-500 dark:text-neutral-500 max-w-lg">
                O Resumind utiliza inteligência artificial para otimização e
                pode cometer erros. Revise sempre o conteúdo final antes de
                enviar.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 mb-24 border-t dark:border-neutral-800 border-slate-200 mt-6">
              <button
                onClick={() =>
                  navigate("/editor", {
                    state: { resumeId, data: currentData, template },
                  })
                }
                className="flex-1 px-6 py-4 border dark:border-neutral-700 border-slate-300 rounded-lg dark:text-neutral-300 text-slate-700 hover:dark:bg-neutral-900 hover:bg-slate-50 transition-colors text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <ChevronLeft size={18} /> Voltar e Editar Novamente
              </button>
              <button
                onClick={handleDownload}
                disabled={isExportingPdf}
                className="flex-1 px-6 py-4 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Gerando
                    PDF...
                  </>
                ) : (
                  <>
                    <Download size={18} /> Baixar PDF
                  </>
                )}
              </button>
              <button
                onClick={exportDoc}
                className="flex-1 px-6 py-4 bg-slate-800 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-slate-100 transition-colors rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <FileText size={18} /> Baixar DOCX
              </button>
            </div>
          </div>
        )}
      </div>

      {/* For PDF Printing - Standard window.print() support if triggered */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white m-0 p-0 text-black">
        <div className="w-[794px] mx-auto">
          <AutoScaledPreview
            data={previewData}
            templateId={template}
            zoom={1.0}
          />
        </div>
        <style>{`
           @media print {
             body { margin: 0; padding: 0; background: white; }
             @page { size: A4; margin: 0mm; }
           }
         `}</style>
      </div>
    </div>
  );
}
