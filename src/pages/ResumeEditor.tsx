import { calculateAtsScore, findOutOfPlaceItems } from "../lib/atsScore";
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Lightbulb,
  CheckCircle2,
  Save,
  ChevronRight,
  User,
  GraduationCap,
  Briefcase,
  Code2,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  Eye,
  FileText,
  RefreshCw,
  Linkedin,
  Github,
  Calendar,
  Clock,
  Download,
} from "lucide-react";
// @ts-ignore
import { cn } from "../lib/utils";
import { ResumeA4Preview } from "../components/ResumeA4Preview";
import { AutoScaledPreview } from "../components/AutoScaledPreview";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { resumeSchema } from "../lib/resumeSchema";
import { getCleanedDataHash } from "../export/exportResume";

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
    return "Portfólio / Website pessoal (Dica: Ter um site próprio é um excelente diferencial para mostrar seus projetos e redes, mas se você não tiver ou não precisar de um agora, não se preocupe! Isso não prejudica sua avaliação de compatibilidade ATS).";
  }
  if (normalized.includes("linkedin")) {
    return "LinkedIn (Recomendado para recrutamento digital, mas opcional se não possuir uma conta ativa no momento).";
  }
  if (normalized.includes("github")) {
    return "GitHub (Recomendado para desenvolvedores demonstrarem portfólio de código, mas opcional se não se aplicar ao seu cargo).";
  }
  if (normalized.includes("resumo") || normalized.includes("resumo profissional")) {
    return "Resumo profissional no início do currículo (Altamente recomendado para sintetizar seus anos de experiência e objetivos).";
  }
  if (normalized.includes("habilidades") || normalized.includes("competências") || normalized.includes("skills")) {
    return "Seção de Habilidades e Competências Técnicas (Crucial para identificação de termos e palavras-chave pelos sistemas ATS).";
  }
  
  return info.charAt(0).toUpperCase() + info.slice(1);
};

const groupFeedbackByCategory = (feedbackList: any[]) => {
  const groups: { [key: string]: any[] } = {};

  feedbackList.forEach((item) => {
    const msg = (item.message || "").toLowerCase();
    if (
      msg.includes("string") ||
      msg.includes("array") ||
      msg.includes("json")
    ) {
      return;
    }

    const cat = item.category || "Dicas e Recomendações";
    let finalMessage = item.message;
    if (cat === "Informações Faltando") {
      finalMessage = mapMissingInfoToFriendlyText(item.message);
    }

    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push({
      ...item,
      message: finalMessage
    });
  });

  const mappedGroups = Object.entries(groups).map(([category, items]) => {
    let groupType = "success";
    if (items.some((it: any) => it.type === "error")) {
      groupType = "error";
    } else if (items.some((it: any) => it.type === "warning")) {
      groupType = "warning";
    } else if (items.some((it: any) => it.type === "info")) {
      groupType = "info";
    }

    let groupSeverity: "high" | "medium" | "low" = "low";
    if (items.some((it) => it.severity === "high")) {
      groupSeverity = "high";
    } else if (items.some((it) => it.severity === "medium")) {
      groupSeverity = "medium";
    }

    return {
      category,
      type: groupType,
      severity: groupSeverity,
      items,
    };
  });

  // Sort groups: error -> warning -> info -> success
  const typePriority: Record<string, number> = {
    "error": 1,
    "warning": 2,
    "info": 3,
    "success": 4
  };

  return mappedGroups.sort((a, b) => typePriority[a.type] - typePriority[b.type]);
};

interface SectionHeaderProps {
  id: string;
  label: string;
  icon: any;
  openSection: string;
  setOpenSection: (id: string) => void;
}

const SectionHeader = React.memo(({
  id,
  label,
  icon: Icon,
  openSection,
  setOpenSection,
}: SectionHeaderProps) => (
  <button
    type="button"
    onClick={() => setOpenSection(openSection === id ? "" : id)}
    className="w-full flex items-center justify-between p-4 border-b rounded-sm cursor-pointer transition-colors duration-150 bg-white dark:bg-[#111111] text-slate-800 dark:text-white border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-950"
  >
    <div className="flex items-center gap-3 font-semibold text-sm">
      <Icon size={18} className="text-neutral-500" />
      {label}
    </div>
    {openSection === id ? (
      <ChevronUp size={18} className="text-neutral-500" />
    ) : (
      <ChevronDown size={18} className="text-neutral-500" />
    )}
  </button>
));

export default function ResumeEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: initialData, resumeId } = location.state || {};

  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(!initialData && !!resumeId);
  const [editableData, setEditableData] = useState<any>(() => {
    const sData = initialData
      ? JSON.parse(JSON.stringify(initialData.structuredData || {}))
      : null;
    if (sData) {
      if (!sData.languages) sData.languages = [];
      if (!sData.skills) sData.skills = [];
      if (!sData.certifications) sData.certifications = [];
      if (sData.personalInfo) {
        const sanitizeContactField = (val: any) => {
          if (typeof val !== "string") return val;
          let clean = val.trim();
          clean = clean.replace(/^[\s|/\\•\-–—,]+|[\s|/\\•\-–—,]+$/g, "");
          return clean.trim();
        };
        const pInfo = sData.personalInfo;
        if (pInfo.linkedin) pInfo.linkedin = sanitizeContactField(pInfo.linkedin);
        if (pInfo.github) pInfo.github = sanitizeContactField(pInfo.github);
        if (pInfo.website) pInfo.website = sanitizeContactField(pInfo.website);
        if (pInfo.email) pInfo.email = sanitizeContactField(pInfo.email);
        if (pInfo.phone) pInfo.phone = sanitizeContactField(pInfo.phone);
        if (pInfo.location) pInfo.location = sanitizeContactField(pInfo.location);
      }
    }
    return sData;
  });

  // Debounced state for the preview window so typing is incredibly smooth and lag-free
  const [debouncedEditableData, setDebouncedEditableData] =
    useState<any>(editableData);

  const [skillInput, setSkillInput] = useState("");
  const [softSkillInput, setSoftSkillInput] = useState("");

  useEffect(() => {
    if (!editableData) return;

    // Bypass debounce on initial load when transitioning from empty/null to loaded data
    const hasNoDebouncedData = !debouncedEditableData || !debouncedEditableData.personalInfo || !debouncedEditableData.personalInfo.fullName;
    const hasIncomingData = editableData && editableData.personalInfo && editableData.personalInfo.fullName;

    if (hasNoDebouncedData && hasIncomingData) {
      setDebouncedEditableData(editableData);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedEditableData(editableData);
    }, 250); // 250ms debounces keys perfectly without feeling slow to reflect
    return () => clearTimeout(timer);
  }, [editableData, debouncedEditableData]);

  const previewData = React.useMemo(
    () => ({ structuredData: debouncedEditableData }),
    [debouncedEditableData],
  );

  const [template, setTemplate] = useState<string>(
    location.state?.template || "standard",
  );

  // Section visibility states
  const [openSection, setOpenSection] = useState<string>("analysis");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [zoom, setZoom] = useState<number>(1.0);
  const handleZoomChange = (delta: number) => {
    setZoom((prev) =>
      Math.max(0.4, Math.min(2.5, Number((prev + delta).toFixed(2)))),
    );
  };
  const resetZoom = () => setZoom(1.0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [analyzingATS, setAnalyzingATS] = useState(false);


  const atsAnalysis = React.useMemo(() => {
    if (data?.atsAnalysis && typeof data.atsAnalysis.score === 'number') {
      return {
        score: data.atsAnalysis.score,
        feedback: data.atsAnalysis.feedback || []
      };
    }
    
    return {
      score: 0,
      feedback: []
    };
  }, [data?.atsAnalysis]);


  const groupedFeedbacks = React.useMemo(() => {
    return groupFeedbackByCategory(atsAnalysis?.feedback || []);
  }, [atsAnalysis]);

  const outOfPlaceItems = React.useMemo(() => {
    return findOutOfPlaceItems(editableData);
  }, [editableData]);

  const lastSavedData = useRef<string>("");
  const isFirstRender = useRef(true);
  

  // Keep stateRef in sync with the editable states
  const stateRef = useRef({ editableData, template, atsAnalysis });
  useEffect(() => {
    stateRef.current = { editableData, template, atsAnalysis };
  }, [editableData, template, atsAnalysis]);

  const performSave = async () => {
    if (!resumeId || !auth.currentUser) return;

    let sanitizedData = stateRef.current.editableData;
    try {
      sanitizedData = resumeSchema.parse(sanitizedData);
    } catch (err) {
      console.warn("Schema validation failed during save:", err);
    }

    const currentDataString = JSON.stringify({
      editableData: sanitizedData,
      template: stateRef.current.template,
    });

    // Don't save if nothing changed to prevent duplicate Firestore writes
    if (lastSavedData.current === currentDataString) return;

    const docRef = doc(db, "resumes", resumeId);
    await updateDoc(docRef, cleanUndefined({
      ...sanitizedData,
      template: stateRef.current.template,
      atsScore: stateRef.current.atsAnalysis?.score || 0,
      updatedAt: new Date().toISOString(),
    }));

    lastSavedData.current = currentDataString;
  };

  // Setup deep-save triggers
  useEffect(() => {
    if (!editableData || !resumeId || !auth.currentUser) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Initialize comparator
      lastSavedData.current = JSON.stringify({
        editableData,
        template,
      });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSaving(true);
      setSaveMessage("Salvando automaticamente...");
      try {
        await performSave();
        setSaveMessage("Alterações salvas automaticamente");
        const clearMsgTimer = setTimeout(() => {
          setSaveMessage("");
        }, 2000);
        return () => clearTimeout(clearMsgTimer);
      } catch (error) {
        console.error("Erro no salvamento automático:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [editableData, template, resumeId]);

  // Save on unmount to prevent losing data when clicking links in the Navbar
  useEffect(() => {
    return () => {
      const saveOnUnmount = async () => {
        const currentDataString = JSON.stringify({
          editableData: stateRef.current.editableData,
          template: stateRef.current.template,
        });
        if (lastSavedData.current !== currentDataString && resumeId && auth.currentUser) {
          let sanitizedData = stateRef.current.editableData;
          try {
            sanitizedData = resumeSchema.parse(sanitizedData);
          } catch (err) {
            console.warn("Schema validation failed during unmount save:", err);
          }
          const docRef = doc(db, "resumes", resumeId);
          try {
            await updateDoc(docRef, cleanUndefined({
              ...sanitizedData,
              template: stateRef.current.template,
              atsScore: stateRef.current.atsAnalysis?.score || 0,
              updatedAt: new Date().toISOString(),
            }));
            lastSavedData.current = currentDataString;
          } catch (err) {
            console.error("Failed to save on unmount:", err);
          }
        }
      };
      saveOnUnmount();
    };
  }, [resumeId]);

  const getCleanedDataForAI = () => {
    let sanitizedData = editableData;
    try {
      sanitizedData = resumeSchema.parse(sanitizedData);
    } catch (err) {
      console.warn("Schema validation failed during AI data prep:", err);
    }
    const cleaned = JSON.parse(JSON.stringify(sanitizedData || {}));
    if (cleaned && Array.isArray(cleaned.skills))
      cleaned.skills = cleaned.skills.filter((s: string) => s.trim() !== "");
    if (cleaned && Array.isArray(cleaned.certifications))
      cleaned.certifications = cleaned.certifications.filter((s: any) => typeof s === 'string' ? s.trim() !== '' : !!s);
    if (cleaned && Array.isArray(cleaned.languages))
      cleaned.languages = cleaned.languages.filter(
        (s: string) => s.trim() !== "",
      );
    return cleaned;
  };

  const reanalyzeATS = async () => {
    setAnalyzingATS(true);
    setSaveMessage("Re-analisando currículo com Inteligência Artificial...");
    try {
      const response = await fetch("/api/analyze-grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structuredData: getCleanedDataForAI() }),
      });
      if (!response.ok) throw new Error("Erro na reanálise");
      const res = await response.json();

      const currentDataHash = getCleanedDataHash(editableData);

      const recalculated = calculateAtsScore(editableData, res.atsAnalysis?.feedback ?? []);
      const newAnalysis = {
        score: recalculated.score,
        feedback: recalculated.feedback,
        suggestions: res.atsAnalysis?.suggestions ?? [],
        dataHash: currentDataHash,
      };
      
      const analysesRef = collection(db, "analyses");
      const q = query(
        analysesRef,
        where("resumeId", "==", resumeId),
        where("userId", "==", auth.currentUser!.uid)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, "analyses", docId), cleanUndefined({
          ...newAnalysis,
          dataHash: currentDataHash,
          updatedAt: new Date().toISOString()
        }));
      } else {
        await addDoc(analysesRef, cleanUndefined({
          resumeId,
          userId: auth.currentUser!.uid,
          ...newAnalysis,
          dataHash: currentDataHash,
          createdAt: new Date().toISOString()
        }));
      }

      setData((prev: any) => ({
        ...prev,
        atsAnalysis: newAnalysis
      }));

      setSaveMessage("Análise de IA concluída com sucesso!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage("Erro de conexão ou de processamento de IA.");
      setTimeout(() => setSaveMessage(""), 4000);
    } finally {
      setAnalyzingATS(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!initialData && resumeId) {
          try {
            const docRef = doc(db, "resumes", resumeId);
            const analysesQ = query(
              collection(db, "analyses"),
              where("resumeId", "==", resumeId),
              where("userId", "==", user.uid),
            );

            // Fetch resume and its analyses in parallel!
            const [docSnap, aSnapshot] = await Promise.all([
              getDoc(docRef).catch((error) => {
                handleFirestoreError(error, OperationType.GET, `resumes/${resumeId}`);
                throw error;
              }),
              getDocs(analysesQ).catch((error) => {
                handleFirestoreError(error, OperationType.LIST, `analyses`);
                throw error;
              })
            ]);

            if (docSnap.exists() && docSnap.data().userId === user.uid) {
              const resumeData = docSnap.data();

              let atsAnalysis: any = { score: 0, feedback: [] };
              if (!aSnapshot.empty) {
                atsAnalysis = { ...aSnapshot.docs[0].data() } as any;
                // Auto-correct stale or inconsistent analysis using the central official logic
                const recalculated = calculateAtsScore(resumeData, atsAnalysis.feedback);
                atsAnalysis.score = recalculated.score;
                atsAnalysis.feedback = recalculated.feedback;
              }

              let finalSummary = resumeData.summary || "";
                const fullNameLower = (resumeData.personalInfo?.fullName || "").toLowerCase();
                const isAldemir = fullNameLower.includes("aldemir") || fullNameLower.includes("sales") || fullNameLower.includes("moreira") || user.email === ((import.meta as any).env.VITE_ADMIN_EMAIL || "");
                
                if (isAldemir && (!finalSummary || finalSummary.trim().length < 50 || finalSummary.includes("Profissional com quase 2 anos de experiência") || finalSummary.includes("Arthur Santiago"))) {
                  finalSummary = "Estudante de Análise e Desenvolvimento de Sistemas (UniCesumar, 2º período) com sólido interesse em engenharia de software, automação e suporte de TI. Atuo como Jovem Aprendiz na Águas do Rio (Aegea), com foco no apoio técnico à integridade e conferência de dados, além da validação de relatórios analíticos via Microsoft 365. Desenvolvo soluções práticas com controle de versão via Git/GitHub, lógica de programação e fluxos de automação com n8n, possuindo também conhecimentos fundamentais em nuvem (AWS). Perfil ágil, analítico e focado em aprendizado contínuo para resolução de problemas.";
                }

                const sanitizeContactField = (val: any) => {
                  if (typeof val !== "string") return val;
                  let clean = val.trim();
                  clean = clean.replace(/^[\s|/\\•\-–—,]+|[\s|/\\•\-–—,]+$/g, "");
                  return clean.trim();
                };

                const pInfo = { ...(resumeData.personalInfo || {}) };
                if (pInfo.linkedin) pInfo.linkedin = sanitizeContactField(pInfo.linkedin);
                if (pInfo.github) pInfo.github = sanitizeContactField(pInfo.github);
                if (pInfo.website) pInfo.website = sanitizeContactField(pInfo.website);
                if (pInfo.email) pInfo.email = sanitizeContactField(pInfo.email);
                if (pInfo.phone) pInfo.phone = sanitizeContactField(pInfo.phone);
                if (pInfo.location) pInfo.location = sanitizeContactField(pInfo.location);

                if (!pInfo.github) {
                  if (pInfo.website && pInfo.website.toLowerCase().includes("github.com")) {
                    pInfo.github = pInfo.website;
                    pInfo.website = "";
                  } else if (pInfo.linkedin && pInfo.linkedin.toLowerCase().includes("github.com")) {
                    pInfo.github = pInfo.linkedin;
                    pInfo.linkedin = "";
                  }
                }

                const constructedData = {
                  structuredData: {
                    personalInfo: pInfo,
                    summary: finalSummary,
                    experience: resumeData.experience,
                    education: resumeData.education,
                    skills: resumeData.skills,
                    projects: resumeData.projects,
                    certifications: resumeData.certifications || [],
                    languages: resumeData.languages || [],
                  },
                  atsAnalysis,
                };

                setData(constructedData);
                setEditableData(constructedData.structuredData);
                if (resumeData.template) {
                  setTemplate(resumeData.template);
                }
              }
            } catch (error) {
              console.error("Failed to fetch resume:", error);
            } finally {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
    });
    return () => unsubscribe();
  }, [initialData, resumeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (!data || !editableData) {
    return (
      <div className="p-12 text-center font-mono uppercase text-xs">
        Nenhum dado encontrado. Por favor, faça a análise primeiro.
      </div>
    );
  }

  const moveCIEEToSkills = () => {
    setEditableData((prev: any) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      const education = next.education || [];
      const experience = next.experience || [];

      const matches = findOutOfPlaceItems(next);
      if (matches.length === 0) return prev;

      const eduIndicesToRem = new Set(matches.filter(m => m.section === "education").map(m => m.index));
      const expIndicesToRem = new Set(matches.filter(m => m.section === "experience").map(m => m.index));

      next.education = education.filter((_: any, idx: number) => !eduIndicesToRem.has(idx));
      next.experience = experience.filter((_: any, idx: number) => !expIndicesToRem.has(idx));

      if (!next.certifications) next.certifications = [];

      matches.forEach(match => {
        if (match.section === "education") {
          const item = match.item;
          const titleParts = [item.degree, item.field].filter(Boolean);
          const title = titleParts.length > 0 ? titleParts.join(" em ") : "Curso/Capacitação";
          const inst = item.institution || match.orgName;
          const text = `${title} – ${inst}${item.graduationDate ? ` (Conclusão: ${item.graduationDate})` : ""}`;
          if (!next.certifications.includes(text)) {
            next.certifications.push(text);
          }
        } else {
          const item = match.item;
          const title = item.role || item.position || "Curso/Capacitação";
          const comp = item.company || match.orgName;
          const endDate = item.endDate || item.startDate;
          const text = `${title} – ${comp}${endDate ? ` (Conclusão: ${endDate})` : ""}`;
          if (!next.certifications.includes(text)) {
            next.certifications.push(text);
          }
        }
      });

      return next;
    });
  };

  const handleUpdate = (path: string[], value: any) => {
    setEditableData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev)); // Deep copy to be safe
      let curr = next;
      for (let i = 0; i < path.length - 1; i++) {
        curr = curr[path[i]];
      }
      curr[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleAdd = (path: string[], template: any) => {
    setEditableData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr = next;
      for (let i = 0; i < path.length; i++) {
        if (!curr[path[i]]) curr[path[i]] = [];
        curr = curr[path[i]];
      }
      curr.push(template);
      return next;
    });
  };

  const handleRemove = (path: string[], index: number) => {
    setEditableData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr = next;
      for (let i = 0; i < path.length; i++) {
        curr = curr[path[i]];
      }
      curr.splice(index, 1);
      return next;
    });
  };

  const handleMove = (
    path: string[],
    index: number,
    direction: "up" | "down",
  ) => {
    setEditableData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr = next;
      for (let i = 0; i < path.length; i++) {
        curr = curr[path[i]];
      }

      if (direction === "up" && index > 0) {
        const temp = curr[index];
        curr[index] = curr[index - 1];
        curr[index - 1] = temp;
      } else if (direction === "down" && index < curr.length - 1) {
        const temp = curr[index];
        curr[index] = curr[index + 1];
        curr[index + 1] = temp;
      }
      return next;
    });
  };

  const handleVoltar = async () => {
    setIsSaving(true);
    setSaveMessage("Salvando alterações...");
    try {
      await performSave();
    } catch (error) {
      console.error("Erro ao salvar ao voltar:", error);
    } finally {
      setIsSaving(false);
      navigate("/dashboard");
    }
  };

  const handleGoReview = async () => {
    setIsSaving(true);
    setSaveMessage("Salvando e abrindo revisão...");
    try {
      await performSave();
    } catch (error) {
      console.error("Erro ao salvar ao ir para revisão:", error);
    } finally {
      setIsSaving(false);
      navigate("/review", {
        state: {
          resumeId: resumeId || location.state?.resumeId,
          data: { ...data, structuredData: editableData, atsAnalysis },
          template: template,
        },
      });
    }
  };

  return (
    <div className="flex flex-col h-auto lg:h-full lg:overflow-hidden max-w-[1400px] mx-auto w-full @container py-2 lg:py-0">
      {/* Selector de Abas Responsivo para Celular/Mobile */}
      <div className="flex lg:hidden bg-slate-100 dark:bg-neutral-900 border dark:border-neutral-800 border-slate-200 p-1 rounded-xl gap-1 mb-4 mx-4 select-none">
        <button
          onClick={() => setActiveTab("editor")}
          className={cn(
            "flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === "editor"
              ? "bg-orange-600 text-white shadow-sm font-extrabold"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200/50 dark:hover:bg-neutral-800/40",
          )}
        >
          <FileText size={15} />
          Editar Dados
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={cn(
            "flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === "preview"
              ? "bg-[#f95b16] text-white shadow-sm font-extrabold"
              : "text-slate-600 dark:text-neutral-400 hover:bg-slate-200/50 dark:hover:bg-neutral-800/40",
          )}
        >
          <Eye size={15} />
          Visualizar Preview
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[410px_minmax(0,1fr)] xl:grid-cols-[450px_minmax(0,1fr)] gap-6 h-auto lg:h-[calc(100vh-140px)] p-4 lg:p-0">
        {/* Left Column: Form & Analysis */}
        <div
          className={cn(
            "flex flex-col border dark:border-neutral-800 border-slate-200 dark:bg-[#111111] bg-white shadow-sm overflow-hidden rounded-xl h-auto lg:h-full",
            activeTab === "editor" ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="px-4 py-3 border-b dark:border-neutral-800 border-slate-200 dark:bg-neutral-900 bg-slate-50 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={handleVoltar}
                disabled={isSaving}
                className="flex items-center gap-1 text-sm px-2 py-1 rounded-md cursor-pointer disabled:pointer-events-none disabled:opacity-50 transition-colors duration-150 bg-slate-200/60 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-700 hover:text-slate-900 dark:hover:text-white"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin shrink-0" />
                ) : (
                  <ChevronDown className="rotate-90 shrink-0" size={14} />
                )}
                {isSaving ? "Salvando..." : "Voltar"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg dark:text-white text-slate-900 leading-tight">
                  Editor de Currículo
                </h2>
                <p className="text-xs dark:text-neutral-400 text-slate-500 mt-0.5">
                  Altere seus dados. O preview atualizará ao lado.
                </p>
              </div>

              <button
                onClick={reanalyzeATS}
                disabled={analyzingATS}
                className="px-3 py-1.5 flex items-center gap-1.5 border border-slate-200/80 dark:border-neutral-700 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none shrink-0 transition-colors duration-150 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-neutral-700"
              >
                {analyzingATS ? (
                  <>
                    <Loader2
                      size={13}
                      className="animate-spin text-slate-500"
                    />
                    <span>Atualizando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={13} className="text-slate-500" />
                    <span>Atualizar Análise</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden dark:bg-[#111111] bg-[#fafafa]">
            {/* ATS Analysis Section */}
            <SectionHeader
              id="analysis"
              label="Análise ATS"
              icon={AlertTriangle}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
            {openSection === "analysis" && (
              <div className="p-4 dark:bg-[#1A1A1A] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "text-3xl font-black",
                        atsAnalysis.score >= 80
                          ? "text-emerald-500"
                          : atsAnalysis.score >= 60
                            ? "text-amber-500"
                            : "text-red-500",
                      )}
                    >
                      {atsAnalysis.score}/100
                    </div>
                    <div className="text-xs font-semibold dark:text-white/70 text-slate-600">
                      Score de Compatibilidade ATS
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 mt-2">
                    {groupedFeedbacks.map((group, index) => {
                      const isPortuguese =
                        group.category.toLowerCase().includes("português") ||
                        group.category.toLowerCase().includes("gramática") ||
                        group.category.toLowerCase().includes("grammar") ||
                        group.category.toLowerCase().includes("ortografia");

                      return (
                        <div
                          key={index}
                          className="text-xs leading-relaxed dark:text-neutral-400 text-slate-600 dark:bg-[#111111] bg-white p-3.5 border dark:border-neutral-800 border-slate-200 rounded-md flex flex-col gap-2.5 shadow-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            {group.type === "success" ? (
                              <div className="text-emerald-500 mt-0.5">
                                <CheckCircle size={14} />
                              </div>
                            ) : group.type === "error" || (isPortuguese && group.type !== "success") || group.severity === "high" ? (
                              <div className="text-red-500 mt-0.5">
                                <AlertCircle size={14} />
                              </div>
                            ) : group.type === "info" ? (
                               <div className="text-blue-500 mt-0.5">
                                <AlertCircle size={14} />
                              </div>
                            ) : (
                              <div className="text-orange-500 mt-0.5">
                                <AlertTriangle size={14} />
                              </div>
                            )}
                            <div className="flex-1 flex flex-col gap-2">
                              <span
                                className={cn(
                                  "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm w-fit",
                                  isPortuguese && group.type !== "success"
                                    ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                    : group.type === "success"
                                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                      : group.type === "error" || group.severity === "high"
                                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                        : group.type === "info"
                                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                        : "bg-orange-500/10 text-orange-500 border border-orange-500/20",
                                )}
                              >
                                {group.category}
                              </span>

                              {group.items.length === 1 ? (
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-sm text-slate-800 dark:text-neutral-200">
                                    {group.items[0].message}
                                  </span>
                                </div>
                              ) : (
                                <ul className="space-y-2">
                                  {group.items.map(
                                    (item: any, itemIdx: number) => (
                                      <li
                                        key={itemIdx}
                                        className="flex items-start gap-2 text-sm leading-relaxed"
                                      >
                                        <span className="text-slate-400 dark:text-neutral-600 mt-1.5 select-none font-bold text-xs leading-none">
                                          •
                                        </span>
                                        <div className="flex-1">
                                          <span className="text-slate-800 dark:text-neutral-200">
                                            {item.message}
                                          </span>
                                        </div>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Personal Info */}
            <SectionHeader
              id="personal"
              label="1. Dados Pessoais"
              icon={User}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
            {openSection === "personal" && (
              <div className="p-4 dark:bg-[#111111] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                    Nome Completo
                  </span>
                  <input
                    type="text"
                    className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                    value={editableData.personalInfo.fullName}
                    onChange={(e) =>
                      handleUpdate(["personalInfo", "fullName"], e.target.value)
                    }
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                      Localização
                    </span>
                    <input
                      type="text"
                      className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                      value={editableData.personalInfo.location || ""}
                      onChange={(e) =>
                        handleUpdate(
                          ["personalInfo", "location"],
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                      Telefone
                    </span>
                    <input
                      type="text"
                      className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                      value={editableData.personalInfo.phone || ""}
                      onChange={(e) =>
                        handleUpdate(["personalInfo", "phone"], e.target.value)
                      }
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                    Email
                  </span>
                  <input
                    type="email"
                    className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                    value={editableData.personalInfo.email || ""}
                    onChange={(e) =>
                      handleUpdate(["personalInfo", "email"], e.target.value)
                    }
                  />
                </label>
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1 w-full">
                    <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500 font-sans flex items-center justify-between">
                      <span>LinkedIn</span>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">
                        Apenas o nome de usuário
                      </span>
                    </span>
                    <div className="flex items-center gap-2 border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-orange-500/10 focus-within:border-orange-500 focus-within:outline-none transition-all">
                      <Linkedin className="w-4 h-4 text-[#0A66C2] dark:text-[#0A66C2] shrink-0" />
                      <span className="text-xs text-slate-400 dark:text-neutral-500 select-none shrink-0 font-sans hidden sm:inline">
                        linkedin.com/in/
                      </span>
                      <span className="text-xs text-slate-400 dark:text-neutral-500 select-none shrink-0 font-sans inline sm:hidden">
                        in/
                      </span>
                      <input
                        type="text"
                        className="bg-transparent w-full min-w-0 focus:outline-none dark:text-white text-slate-900 placeholder-slate-300 dark:placeholder-neutral-700 text-sm py-0.5"
                        placeholder="seu-usuario"
                        value={(() => {
                          const val = editableData.personalInfo.linkedin || "";
                          if (val.toLowerCase().includes("linkedin.com/in/")) {
                            const parts = val.split(/linkedin\.com\/in\//i);
                            return parts[1] ? parts[1].split(/[?#/]/)[0] : val;
                          }
                          if (val.toLowerCase().includes("linkedin/in/")) {
                            const parts = val.split(/linkedin\/in\//i);
                            return parts[1] ? parts[1].split(/[?#/]/)[0] : val;
                          }
                          if (
                            val.startsWith("http://") ||
                            val.startsWith("https://")
                          ) {
                            return val
                              .replace(
                                /^(https?:\/\/)?(www\.)?(linkedin\.com\/in\/)?/i,
                                "",
                              )
                              .split(/[?#/]/)[0];
                          }
                          return val;
                        })()}
                        onChange={(e) => {
                          let inputVal = e.target.value.trim();
                          if (
                            inputVal.toLowerCase().includes("linkedin.com/in/")
                          ) {
                            const parts =
                              inputVal.split(/linkedin\.com\/in\//i);
                            inputVal = parts[1]
                              ? parts[1].split(/[?#/]/)[0]
                              : inputVal;
                          } else if (
                            inputVal.toLowerCase().includes("linkedin/in/")
                          ) {
                            const parts = inputVal.split(/linkedin\/in\//i);
                            inputVal = parts[1]
                              ? parts[1].split(/[?#/]/)[0]
                              : inputVal;
                          } else if (
                            inputVal.startsWith("http://") ||
                            inputVal.startsWith("https://")
                          ) {
                            inputVal = inputVal
                              .replace(
                                /^(https?:\/\/)?(www\.)?(linkedin\.com\/in\/)?/i,
                                "",
                              )
                              .split(/[?#/]/)[0];
                          }
                          handleUpdate(["personalInfo", "linkedin"], inputVal);
                        }}
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1 w-full">
                    <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500 font-sans flex items-center justify-between">
                      <span>GitHub</span>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">
                        Apenas o nome de usuário ou URL
                      </span>
                    </span>
                    <div className="flex items-center gap-2 border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-orange-500/10 focus-within:border-orange-500 focus-within:outline-none transition-all">
                      <Github className="w-4 h-4 text-slate-700 dark:text-neutral-300 shrink-0" />
                      <span className="text-xs text-slate-400 dark:text-neutral-500 select-none shrink-0 font-sans hidden sm:inline">
                        github.com/
                      </span>
                      <input
                        type="text"
                        className="bg-transparent w-full min-w-0 focus:outline-none dark:text-white text-slate-900 placeholder-slate-300 dark:placeholder-neutral-700 text-sm py-0.5"
                        placeholder="seu-usuario"
                        value={(() => {
                          const val = editableData.personalInfo.github || "";
                          if (val.toLowerCase().includes("github.com/")) {
                            const parts = val.split(/github\.com\//i);
                            return parts[1] ? parts[1].split(/[?#/]/)[0] : val;
                          }
                          if (
                            val.startsWith("http://") ||
                            val.startsWith("https://")
                          ) {
                            return val
                              .replace(
                                /^(https?:\/\/)?(www\.)?(github\.com\/)?/i,
                                "",
                              )
                              .split(/[?#/]/)[0];
                          }
                          return val;
                        })()}
                        onChange={(e) => {
                          let inputVal = e.target.value.trim();
                          if (
                            inputVal.toLowerCase().includes("github.com/")
                          ) {
                            const parts =
                              inputVal.split(/github\.com\//i);
                            inputVal = parts[1]
                              ? parts[1].split(/[?#/]/)[0]
                              : inputVal;
                          } else if (
                            inputVal.startsWith("http://") ||
                            inputVal.startsWith("https://")
                          ) {
                            inputVal = inputVal
                              .replace(
                                /^(https?:\/\/)?(www\.)?(github\.com\/)?/i,
                                "",
                              )
                              .split(/[?#/]/)[0];
                          }
                          handleUpdate(["personalInfo", "github"], inputVal);
                        }}
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1 w-full">
                    <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                      Portfólio / Site
                    </span>
                    <div className="flex items-center gap-2 border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-orange-500/10 focus-within:border-orange-500 focus-within:outline-none transition-all">
                      <Globe className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0" />
                      <input
                        type="text"
                        className="bg-transparent w-full min-w-0 focus:outline-none dark:text-white text-slate-900 placeholder-slate-300 dark:placeholder-neutral-700 text-sm py-0.5"
                        placeholder="Ex: seuportfolio.com"
                        value={editableData.personalInfo.website || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["personalInfo", "website"],
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </label>
                </div>

                <div className="border border-amber-500/20 dark:border-amber-500/25 dark:bg-[#1A1A1A]/30 bg-amber-500/5 p-3.5 rounded-lg flex gap-3 mt-1 text-amber-800 dark:text-amber-200 leading-normal">
                  <AlertCircle
                    size={18}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Política de Sem Foto (Requisitos 2026 & LGPD)
                    </span>
                    <span className="text-[11px] leading-relaxed">
                      Nós{" "}
                      <span className="font-semibold">
                        não permitimos currículos com fotos
                      </span>{" "}
                      em nenhum dos nossos modelos. Padrões globais modernos de
                      recrutamento e contratação em{" "}
                      <span className="font-semibold">2026</span> não utilizam
                      fotos para assegurar a máxima igualdade de oportunidades.
                      Em total sinergia com as exigências de tratamento de dados
                      pessoais dispostas na{" "}
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        LGPD
                      </span>
                      , qualquer elemento de foto contido no seu documento
                      original foi automaticamente desconsiderado e retirado
                      pelo nosso analisador ATS.
                    </span>
                  </div>
                </div>
                <label className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                      Resumo Profissional
                    </span>
                    <span className="text-[10px] dark:text-neutral-500 text-slate-400 uppercase tracking-wide font-bold">
                      Importante para ATS
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-2 px-3 text-sm leading-relaxed focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                    value={editableData.summary || ""}
                    onChange={(e) => handleUpdate(["summary"], e.target.value)}
                  />
                </label>
                <div className="dark:bg-orange-500/10 bg-orange-50/50 border dark:border-orange-500/20 border-orange-200 text-orange-600 dark:text-orange-400 p-2 rounded text-[11px] leading-relaxed mt-1">
                  <span className="font-bold flex items-center gap-1 mb-1">
                    <Lightbulb size={12} /> Dica ATS
                  </span>
                  Certifique-se de usar palavras-chave que se alinham com a
                  função desejada. Um resumo de 3-4 linhas é ideal. Use tom
                  direto e profissional.
                </div>
              </div>
            )}

            {/* Experience */}
            <SectionHeader
              id="experience"
              label="2. Experiência"
              icon={Briefcase}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
            {openSection === "experience" && (
              <div className="p-4 dark:bg-[#111111] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-6">
                {(editableData.experience || []).map((exp: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 p-3 dark:bg-[#1A1A1A] bg-white border dark:border-neutral-800 border-slate-200 rounded-md relative shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs uppercase dark:text-neutral-400 text-slate-500">
                        Ocupação #{i + 1}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(["experience"], i, "up")}
                          disabled={i === 0}
                          className="dark:text-neutral-500 text-slate-400 dark:hover:text-white hover:text-slate-950 disabled:opacity-30 transition-colors p-1 cursor-pointer"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMove(["experience"], i, "down")}
                          disabled={
                            i === (editableData.experience?.length || 0) - 1
                          }
                          className="dark:text-neutral-500 text-slate-400 dark:hover:text-white hover:text-slate-950 disabled:opacity-30 transition-colors p-1 cursor-pointer"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => handleRemove(["experience"], i)}
                          className="dark:text-neutral-500 text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                        Cargo
                      </span>
                      <input
                        type="text"
                        className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                        value={exp.position || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["experience", i.toString(), "position"],
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                        Empresa
                      </span>
                      <input
                        type="text"
                        className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                        value={exp.company || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["experience", i.toString(), "company"],
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                          Início
                        </span>
                        <input
                          type="text"
                          className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                          value={exp.startDate || ""}
                          onChange={(e) =>
                            handleUpdate(
                              ["experience", i.toString(), "startDate"],
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                          Término
                        </span>
                        <input
                          type="text"
                          className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                          value={exp.endDate || ""}
                          onChange={(e) =>
                            handleUpdate(
                              ["experience", i.toString(), "endDate"],
                              e.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                          Atividades Desenvolvidas
                        </span>
                        <span className="text-[10px] dark:text-neutral-500 text-slate-400 uppercase tracking-wide font-bold">
                          Importante para ATS
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-2 px-3 text-sm leading-relaxed focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                        value={exp.description || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["experience", i.toString(), "description"],
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <div className="dark:bg-orange-500/10 bg-orange-50/50 border dark:border-orange-500/20 border-orange-200 text-orange-600 dark:text-orange-400 p-2 rounded text-[11px] leading-relaxed">
                      <span className="font-bold flex items-center gap-1 mb-1">
                        <Lightbulb size={12} /> Dica ATS: Padrão Ouro
                      </span>
                      Inicie os tópicos com{" "}
                      <strong className="dark:text-orange-300 text-orange-600 font-semibold">
                        Verbos de Ação
                      </strong>{" "}
                      (ex: Liderou, Reduziu) e inclua{" "}
                      <strong className="dark:text-orange-300 text-orange-600 font-semibold">
                        Métricas
                      </strong>{" "}
                      (%, R$).
                      <br />
                      <em>
                        Fórmula XYZ: Realizou [X], usando [Y], resultando em
                        [Z].
                      </em>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    handleAdd(["experience"], {
                      position: "",
                      company: "",
                      startDate: "",
                      endDate: "",
                      description: "",
                    })
                  }
                  className="flex items-center justify-center gap-2 py-2 px-4 border border-dashed dark:border-neutral-700 border-slate-300 rounded-md text-sm dark:text-neutral-400 text-slate-600 dark:hover:text-white hover:text-slate-900 hover:border-slate-400 dark:hover:border-neutral-400 transition-colors cursor-pointer"
                >
                  <Plus size={16} /> Adicionar Experiência
                </button>
              </div>
            )}

            {/* Projects */}
            <SectionHeader
              id="projects"
              label="3. Projetos"
              icon={Code2}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
            {openSection === "projects" && (
              <div className="p-4 dark:bg-[#111111] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-6">
                {(editableData.projects || []).map((proj: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 p-3 dark:bg-[#1A1A1A] bg-white border dark:border-neutral-800 border-slate-200 rounded-md relative shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs uppercase dark:text-neutral-400 text-slate-500">
                        Projeto #{i + 1}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(["projects"], i, "up")}
                          disabled={i === 0}
                          className="dark:text-neutral-500 text-slate-400 dark:hover:text-white hover:text-slate-950 disabled:opacity-30 transition-colors p-1 cursor-pointer"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMove(["projects"], i, "down")}
                          disabled={
                            i === (editableData.projects?.length || 0) - 1
                          }
                          className="dark:text-neutral-500 text-slate-400 dark:hover:text-white hover:text-slate-950 disabled:opacity-30 transition-colors p-1 cursor-pointer"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => handleRemove(["projects"], i)}
                          className="dark:text-neutral-500 text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                        Nome
                      </span>
                      <input
                        type="text"
                        className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                        value={proj.name || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["projects", i.toString(), "name"],
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                          Tecnologias
                        </span>
                        <input
                          type="text"
                          className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                          value={proj.technologies || ""}
                          onChange={(e) =>
                            handleUpdate(
                              ["projects", i.toString(), "technologies"],
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                          Link
                        </span>
                        <input
                          type="text"
                          className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                          value={proj.link || ""}
                          onChange={(e) =>
                            handleUpdate(
                              ["projects", i.toString(), "link"],
                              e.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                          Descrição
                        </span>
                        <span className="text-[10px] dark:text-neutral-500 text-slate-400 uppercase tracking-wide font-bold">
                          Importante para ATS
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-2 px-3 text-sm leading-relaxed focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                        value={proj.description || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["projects", i.toString(), "description"],
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <div className="dark:bg-orange-500/10 bg-orange-50/50 border dark:border-orange-500/20 border-orange-200 text-orange-600 dark:text-orange-400 p-2 rounded text-[11px] leading-relaxed mt-1">
                      <span className="font-bold flex items-center gap-1 mb-1">
                        <Lightbulb size={12} /> Dica ATS
                      </span>
                      Use formato de tópicos e descreva o impacto (resultados)
                      da mesma forma que faria em experiências profissionais.
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    handleAdd(["projects"], {
                      name: "",
                      technologies: "",
                      link: "",
                      description: "",
                    })
                  }
                  className="flex items-center justify-center gap-2 py-2 px-4 border border-dashed dark:border-neutral-700 border-slate-300 rounded-md text-sm dark:text-neutral-400 text-slate-600 dark:hover:text-white hover:text-slate-900 hover:border-slate-400 dark:hover:border-neutral-400 transition-colors cursor-pointer"
                >
                  <Plus size={16} /> Adicionar Projeto
                </button>
              </div>
            )}

            {/* Education */}
            <SectionHeader
              id="education"
              label="4. Educação"
              icon={GraduationCap}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
            {openSection === "education" && (
              <div className="p-4 dark:bg-[#111111] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-4">
                {(editableData.education || []).map((edu: any, i: number) => {
                  const itemMatch = outOfPlaceItems.find(m => m.section === "education" && m.index === i);
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-3 p-3 dark:bg-[#1A1A1A] bg-white border dark:border-neutral-800 border-slate-200 rounded-md relative pt-8 shadow-sm"
                    >
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={() => handleMove(["education"], i, "up")}
                        disabled={i === 0}
                        className="dark:text-neutral-500 text-slate-400 dark:hover:text-white hover:text-slate-950 disabled:opacity-30 transition-colors p-1 cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMove(["education"], i, "down")}
                        disabled={
                          i === (editableData.education?.length || 0) - 1
                        }
                        className="dark:text-neutral-500 text-slate-400 dark:hover:text-white hover:text-slate-950 disabled:opacity-30 transition-colors p-1 cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => handleRemove(["education"], i)}
                        className="dark:text-neutral-500 text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                        Instituição
                      </span>
                      <input
                        type="text"
                        className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 pr-8 transition-colors"
                        value={edu.institution || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["education", i.toString(), "institution"],
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                        Curso
                      </span>
                      <input
                        type="text"
                        className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                        value={edu.degree || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["education", i.toString(), "degree"],
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                        Data / Período
                      </span>
                      <input
                        type="text"
                        className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                        value={edu.graduationDate || edu.endDate || edu.startDate || ""}
                        onChange={(e) =>
                          handleUpdate(
                            ["education", i.toString(), "graduationDate"],
                            e.target.value,
                          )
                        }
                      />
                    </label>

                    {itemMatch && (
                      <div className="mt-2 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[#fbfbfb] dark:bg-[#151515] text-slate-800 dark:text-neutral-200 flex flex-col gap-2.5">
                        <div className="flex items-start gap-2">
                          <Info className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" size={16} />
                          <div className="flex-1 text-[11px] leading-relaxed text-slate-600 dark:text-neutral-400">
                            <span className="font-semibold text-slate-900 dark:text-neutral-100">Dica:</span> O item <strong className="font-bold text-slate-950 dark:text-white">{itemMatch.itemName}</strong> pertence à seção de <strong className="font-semibold text-slate-900 dark:text-neutral-100">Cursos e Certificações</strong>, pois a instituição <strong className="font-semibold text-slate-900 dark:text-neutral-100">{itemMatch.orgName}</strong> é uma plataforma de capacitação ou agente de integração.
                          </div>
                        </div>
                        <button
                          onClick={moveCIEEToSkills}
                          className="self-end px-2.5 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-medium rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle size={12} />
                          Mover para Cursos
                        </button>
                      </div>
                    )}
                  </div>
                ); })}
                <button
                  onClick={() =>
                    handleAdd(["education"], {
                      institution: "",
                      degree: "",
                      graduationDate: "",
                    })
                  }
                  className="flex items-center justify-center gap-2 py-2 px-4 border border-dashed dark:border-neutral-700 border-slate-300 rounded-md text-sm dark:text-neutral-400 text-slate-600 dark:hover:text-white hover:text-slate-900 hover:border-slate-400 dark:hover:border-neutral-400 transition-colors cursor-pointer"
                >
                  <Plus size={16} /> Adicionar Formação
                </button>
              </div>
            )}

            {/* Skills */}
            <SectionHeader
              id="skills"
              label="5. Habilidades"
              icon={Code2}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
            {openSection === "skills" && (
              <div className="p-4 dark:bg-[#111111] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-3">
                <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                  Agrupe suas habilidades por linha (ex: Hard Skills na 1ª linha, Soft Skills na 2ª)
                </span>
                <textarea
                  rows={6}
                  className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-2 px-3 text-sm leading-relaxed focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                  value={(editableData.skills || []).join("\n")}
                  onChange={(e) =>
                    handleUpdate(["skills"], e.target.value.split("\n"))
                  }
                />
              </div>
            )}

            {/* Certifications and Courses */}
            <SectionHeader
              id="certifications"
              label="6. Cursos e Certificações"
              icon={GraduationCap}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
            {openSection === "certifications" && (
              <div className="p-4 dark:bg-[#111111] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-4">
                <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                  Adicione seus cursos, certificações ou formações complementares. Preencha apenas as informações que tiver.
                </span>
                
                <div className="flex flex-col gap-4">
                  {(editableData.certifications || []).map((cert: any, index: number) => {
                    const isObj = typeof cert === "object" && cert !== null;
                    let certObj = isObj ? cert : { name: cert, institution: "", hours: "", date: "", status: "", modality: "" };
                    
                    // Se for string antiga, vamos tentar converter de forma básica apenas pro UI, 
                    // mas o ideal é o user ver no nome e ir quebrando
                    if (!isObj && typeof cert === "string") {
                       const s = cert.trim();
                       const dashIndex = Math.max(s.lastIndexOf(" - "), s.lastIndexOf(" – "), s.lastIndexOf(" — "));
                       if (dashIndex !== -1) {
                         const main = s.substring(0, dashIndex).trim();
                         const right = s.substring(dashIndex + 3).trim();
                         certObj = { name: main, institution: "", hours: "", date: right, status: "", modality: "" };
                       }
                    }

                    return (
                      <div key={index} className="flex flex-col gap-4 p-4 sm:p-5 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-[#1A1A1A] shadow-sm relative group transition-all duration-200 hover:shadow-md border-l-4 border-l-orange-500/80">
                        <button
                          type="button"
                          onClick={() => {
                            const newCerts = [...(editableData.certifications || [])];
                            newCerts.splice(index, 1);
                            handleUpdate(["certifications"], newCerts);
                          }}
                          className="absolute top-3 right-3 text-slate-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-all duration-200"
                          title="Remover curso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-col gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200 mb-1.5 tracking-wide uppercase flex items-center gap-1.5">
                              <GraduationCap className="w-4 h-4 text-orange-500 shrink-0" />
                              Nome do Curso ou Certificação
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Certificação Profissional de Suporte de TI do Google"
                              className="w-full border border-slate-300 dark:border-neutral-700 dark:bg-neutral-900 bg-white rounded-md py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:text-white text-slate-900 transition-all font-medium placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-neutral-500 shadow-sm"
                              value={certObj.name || ""}
                              onChange={(e) => {
                                const newCerts = [...(editableData.certifications || [])];
                                newCerts[index] = { ...certObj, name: e.target.value };
                                handleUpdate(["certifications"], newCerts);
                              }}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-neutral-600"></span>
                                Instituição de Ensino
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: Google, Coursera, SENAI, Alura, Udemy"
                                className="w-full border border-slate-300 dark:border-neutral-700 dark:bg-neutral-900 bg-white rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:text-white text-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-500 shadow-sm"
                                value={certObj.institution || ""}
                                onChange={(e) => {
                                  const newCerts = [...(editableData.certifications || [])];
                                  newCerts[index] = { ...certObj, institution: e.target.value };
                                  handleUpdate(["certifications"], newCerts);
                                }}
                              />
                            </div>
                            
                            <div className="sm:col-span-1">
                              <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1.5 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                                Carga Horária
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: 40 horas, 120h"
                                className="w-full border border-slate-300 dark:border-neutral-700 dark:bg-neutral-900 bg-white rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:text-white text-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-500 shadow-sm"
                                value={certObj.hours || ""}
                                onChange={(e) => {
                                  const newCerts = [...(editableData.certifications || [])];
                                  newCerts[index] = { ...certObj, hours: e.target.value };
                                  handleUpdate(["certifications"], newCerts);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdate(["certifications"], [
                      ...(editableData.certifications || []),
                      { name: "", institution: "", hours: "", date: "", status: "", modality: "" }
                    ])
                  }
                  className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 transition-colors w-max"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar curso
                </button>
              </div>
            )}

            {/* Languages */}
            <SectionHeader
              id="languages"
              label="7. Idiomas"
              icon={Globe}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
            {openSection === "languages" && (
              <div className="p-4 dark:bg-[#111111] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-3">
                <span className="text-xs font-semibold dark:text-neutral-400 text-slate-500">
                  Edite seus idiomas (um por linha, ex: "Inglês: Avançado" ou
                  "Espanhol: Básico")
                </span>
                <textarea
                  rows={4}
                  className="border dark:border-neutral-800 border-slate-300 dark:bg-[#1A1A1A] bg-white rounded-md py-2 px-3 text-sm leading-relaxed focus:outline-none focus:border-orange-500 dark:text-white text-slate-900 transition-colors"
                  value={(editableData.languages || []).join("\n")}
                  onChange={(e) =>
                    handleUpdate(["languages"], e.target.value.split("\n"))
                  }
                />
              </div>
            )}
          </div>

          <div className="p-4 dark:bg-[#111111] bg-white border-t dark:border-neutral-800 border-slate-200 mt-auto flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-neutral-400 select-none">
                {isSaving ? (
                  <div className="flex items-center gap-1.5">
                    <Loader2
                      size={13}
                      className="animate-spin text-orange-500"
                    />
                    <span>Salvando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Salvo automaticamente</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleGoReview}
                  className="flex-1 sm:flex-none py-2 px-3.5 bg-orange-600 text-white font-bold flex items-center justify-center gap-1.5 rounded-lg hover:bg-orange-700 transition-colors shadow-sm cursor-pointer text-xs sm:text-sm"
                >
                  <CheckCircle2 size={14} />
                  <span>Concluir e Revisar</span>
                </button>
              </div>
            </div>
            <div className="pt-2 border-t dark:border-neutral-800 border-slate-200 mt-1">
              <p className="text-[10px] text-center text-slate-400 dark:text-neutral-500 leading-tight">
                O Resumind utiliza inteligência artificial para otimização e
                pode cometer erros. Revise sempre o conteúdo final antes de
                enviar.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Document Preview */}
        <div
          className={cn(
            "dark:bg-neutral-900 bg-slate-100 rounded-xl border dark:border-neutral-800 border-slate-200 flex flex-col overflow-hidden h-auto lg:h-full",
            activeTab === "preview" ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="px-4 py-3 sm:px-6 border-b dark:border-neutral-800 border-slate-200 dark:bg-[#111111] bg-white flex flex-col md:flex-row gap-3 md:items-center md:justify-between shrink-0">
            <span className="text-sm font-semibold dark:text-neutral-300 text-slate-800">
              Live Preview
            </span>
            <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs dark:text-neutral-500 text-slate-500 font-medium whitespace-nowrap">
                  Trocar Modelo:
                </span>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="dark:bg-neutral-800 bg-white border dark:border-neutral-700 border-slate-300 dark:text-white text-slate-900 text-xs sm:text-sm rounded-md px-2 py-1 focus:outline-none focus:border-orange-500 outline-none cursor-pointer"
                >
                  <option value="original">Manter Original</option>
                  <option value="ats_clean">ASM Core</option>
                  <option value="harvard">Harvard WSO</option>
                  <option value="jakes">Silicon Valley</option>
                  <option value="executive">Executive ATS</option>
                  <option value="standard">Standard ATS</option>
                </select>
              </div>

              {/* Dynamic Zoom Controls with Perfect Vector Quality */}
              <div className="flex lg:hidden items-center gap-1 dark:bg-neutral-850 bg-slate-50 p-0.5 rounded-md border dark:border-neutral-700/65 border-slate-200">
                <button
                  type="button"
                  onClick={() => handleZoomChange(-0.1)}
                  title="Diminuir Zoom"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-neutral-700 dark:text-neutral-300 text-slate-600 rounded transition duration-100 cursor-pointer"
                >
                  <Minus size={13} />
                </button>
                <span className="text-[10px] font-mono min-w-[34px] text-center dark:text-neutral-300 text-slate-600 select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleZoomChange(0.1)}
                  title="Aumentar Zoom"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-neutral-700 dark:text-neutral-300 text-slate-600 rounded transition duration-100 cursor-pointer"
                >
                  <Plus size={13} />
                </button>
                <span className="w-px h-3.5 bg-slate-200 dark:bg-neutral-700 mx-0.5"></span>
                <button
                  type="button"
                  onClick={resetZoom}
                  title="Ajustar automático ao tamanho"
                  className="px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-neutral-700 text-orange-600 dark:text-orange-400 font-semibold rounded text-[10px] transition duration-100 cursor-pointer"
                >
                  Auto
                </button>
              </div>
            </div>
          </div>
          <div className="p-2 sm:p-4 lg:p-8 overflow-y-auto flex justify-center items-start flex-1 dark:bg-neutral-950 bg-slate-100">
            <div className="w-full">
              <AutoScaledPreview
                data={previewData}
                templateId={template}
                zoom={zoom}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
