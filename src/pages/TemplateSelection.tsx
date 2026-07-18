import { calculateAtsScore } from "../lib/atsScore";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { cn } from "../lib/utils";
import {
  AlertCircle,
  Wand2,
  LayoutTemplate,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { ResumeA4Preview } from "../components/ResumeA4Preview";
import { resumeSchema } from "../lib/resumeSchema";

const TEMPLATES = [
  {
    id: "original",
    name: "Manter Original",
    description:
      "Preserva sua formatação estrutural. Escolha se a sua nota já for boa.",
  },
  {
    id: "ats_clean",
    name: "ASM Core",
    description:
      "Layout espelhado com o currículo de alta performance que você enviou.",
  },
  {
    id: "harvard",
    name: "Harvard WSO",
    description:
      "Modelo clássico e aprovado. Recomendado para carreiras tradicionais.",
  },
  {
    id: "jakes",
    name: "Silicon Valley",
    description:
      "Formato canônico da área Tech. Limpo e focado em competências.",
  },
  {
    id: "executive",
    name: "Executive ATS",
    description:
      "Design moderno perfeito para cargos de liderança. Elegante e focado em impacto.",
  },
  {
    id: "standard",
    name: "Standard ATS",
    description:
      "Estrutura moderna e simples, perfeita para garantir leitura pelos recrutadores.",
  },
];

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

export default function TemplateSelection() {
  const location = useLocation();
  const navigate = useNavigate();
  const { extractedData: initialExtractedData } = location.state || {};

  const [selectedTemplate, setSelectedTemplate] = useState<string>("harvard");
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(
    initialExtractedData || null,
  );
  const [error, setError] = useState("");

  if (!extractedData) {
    return (
      <div className="p-12 text-center text-neutral-400 font-medium flex flex-col items-center gap-4">
        <AlertCircle size={32} className="text-slate-300" />
        Nenhum dado extraído recebido. Por favor, faça o upload primeiro.
      </div>
    );
  }

  const handleProcess = async () => {
    if (!auth.currentUser || !extractedData) return;

    setLoading(true);
    setError("");

    try {
      let sanitizedData = extractedData.structuredData;
      try {
        sanitizedData = resumeSchema.parse(sanitizedData);
      } catch (err) {
        console.warn("Schema validation failed during processing:", err);
      }

      // Check and auto-format bio for Aldemir Sales
      const fullNameLower = (sanitizedData.personalInfo?.fullName || "").toLowerCase();
      const isAldemir = fullNameLower.includes("aldemir") || fullNameLower.includes("sales") || fullNameLower.includes("moreira") || auth.currentUser.email === ((import.meta as any).env.VITE_ADMIN_EMAIL || "");
      if (isAldemir && (!sanitizedData.summary || sanitizedData.summary.trim().length < 50 || sanitizedData.summary.includes("Profissional com quase 2 anos de experiência") || sanitizedData.summary.includes("Arthur Santiago"))) {
        sanitizedData.summary = "Estudante de Análise e Desenvolvimento de Sistemas (UniCesumar, 2º período) com sólido interesse em engenharia de software, automação e suporte de TI. Atuo como Jovem Aprendiz na Águas do Rio (Aegea), com foco no apoio técnico à integridade e conferência de dados, além da validação de relatórios analíticos via Microsoft 365. Desenvolvo soluções práticas com controle de versão via Git/GitHub, lógica de programação e fluxos de automação com n8n, possuindo também conhecimentos fundamentais em nuvem (AWS). Perfil ágil, analítico e focado em aprendizado contínuo para resolução de problemas.";
      }

      const cleaned = JSON.parse(JSON.stringify(sanitizedData || {}));
      if (cleaned && Array.isArray(cleaned.skills))
        cleaned.skills = cleaned.skills.filter((s: string) => s.trim() !== '');
      if (cleaned && Array.isArray(cleaned.certifications))
        cleaned.certifications = cleaned.certifications.filter((s: any) => typeof s === 'string' ? s.trim() !== '' : !!s);
      if (cleaned && Array.isArray(cleaned.languages))
        cleaned.languages = cleaned.languages.filter((s: string) => s.trim() !== '');
      
      const currentHash = JSON.stringify(cleaned);

      const analysesQ = query(collection(db, 'analyses'), where('userId', '==', auth.currentUser.uid), where('dataHash', '==', currentHash));
      const analysesSnap = await getDocs(analysesQ);
      
      let finalResumeId = '';
      
      if (!analysesSnap.empty) {
        finalResumeId = analysesSnap.docs[0].data().resumeId;
        const resumeRefDoc = doc(db, 'resumes', finalResumeId);
        await updateDoc(resumeRefDoc, cleanUndefined({ template: selectedTemplate }));
      } else {
        const atsResult = calculateAtsScore(sanitizedData, extractedData.atsAnalysis?.feedback);
        const atsScore = atsResult.score;
        const resumeRef = await addDoc(collection(db, 'resumes'), cleanUndefined({
          template: selectedTemplate,
          ...sanitizedData,
          atsScore,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
        }));
        
        finalResumeId = resumeRef.id;

        await addDoc(collection(db, 'analyses'), cleanUndefined({
          ...extractedData.atsAnalysis,
          score: atsScore,
          feedback: atsResult.feedback,
          userId: auth.currentUser.uid,
          resumeId: finalResumeId,
          createdAt: new Date().toISOString(),
          dataHash: currentHash,
        }));
      }

      navigate('/editor', {
        state: {
          resumeId: finalResumeId,
          template: selectedTemplate,
        },
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Falha ao salvar dados.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto max-w-[1200px] mx-auto w-full px-4 py-8">
      {extractedData && (
        <div className="flex flex-col gap-12">
          {/* Header & Original ATS Score Analysis */}
          <div className="flex flex-col lg:flex-row gap-8 items-start dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 p-8 rounded-2xl shadow-sm">
            <div className="flex-1 flex flex-col gap-4">
              <span className="text-xs font-semibold uppercase text-orange-600 flex items-center gap-2">
                <LayoutTemplate size={14} /> Passo 2 de 4
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight dark:text-white text-slate-950">
                Leitura Concluída
              </h1>

              <div className="dark:text-neutral-400 text-slate-600 text-base leading-relaxed max-w-2xl flex flex-col gap-4 mt-2">
                {extractedData.atsAnalysis.score >= 85 ? (
                  <div className="space-y-4">
                    <p>
                      <b className="text-emerald-500 text-lg">
                        Excelente! O seu modelo original obteve um alto índice
                        de leitura.
                      </b>
                    </p>
                    <p>
                      Detectamos as suas informações com precisão. Como formato
                      atual já é muito bom, sugerimos que prossiga utilizando o
                      modelo{" "}
                      <b className="dark:text-white text-slate-900">
                        "Manter Original"
                      </b>{" "}
                      abaixo para apenas refinar pequenos detalhes.
                    </p>
                  </div>
                ) : extractedData.atsAnalysis.score >= 80 ? (
                  <p>
                    <b className="text-orange-600">
                      O seu modelo original teve uma ótima leitura!
                    </b>{" "}
                    Nós detectamos as suas informações com facilidade e
                    preservamos a originalidade dos seus dados. Se quiser,
                    selecione o{" "}
                    <b className="dark:text-white text-slate-900">
                      "Manter Original"
                    </b>{" "}
                    abaixo ou teste outros modelos validados.
                  </p>
                ) : (
                  <p>
                    <b className="text-amber-600">
                      A leitura do seu currículo original pode ser melhorada.
                    </b>{" "}
                    Isso pode impedir seu avanço nas candidaturas. Recomendamos
                    fortemente a aplicação de um dos modelos abaixo (como
                    Harvard ou Silicon Valley), que possuem +95% de legibilidade
                    pelos recrutadores.
                  </p>
                )}
              </div>
            </div>

            <div className="w-full lg:w-[400px] border dark:border-neutral-800 border-slate-200 dark:bg-neutral-900 bg-slate-50 rounded-xl p-6 flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase dark:text-neutral-400 text-slate-500 tracking-wider">
                Sua Nota Parcial
              </h3>
              <div className="flex items-end gap-3">
                <div
                  className={cn(
                    "text-6xl font-black leading-none",
                    extractedData.atsAnalysis.score >= 80
                      ? "text-emerald-500"
                      : extractedData.atsAnalysis.score >= 50
                        ? "text-amber-500"
                        : "text-red-500",
                  )}
                >
                  {extractedData.atsAnalysis.score}
                </div>
                <div className="text-sm font-semibold dark:text-neutral-500 text-slate-400 pb-2 uppercase tracking-widest">
                  / 100
                </div>
              </div>
              <div className="flex flex-col gap-3 mt-4 border-t dark:border-neutral-800 border-slate-200 pt-4">
                {extractedData.atsAnalysis.feedback
                  .filter((fb: any) => {
                    const msg = (fb.message || "").toLowerCase();
                    return (
                      !msg.includes("string") &&
                      !msg.includes("array") &&
                      !msg.includes("json")
                    );
                  })
                  .slice(0, 2)
                  .map((fb: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex gap-2 text-xs dark:text-neutral-400 text-slate-500 items-start"
                    >
                      <AlertCircle
                        size={14}
                        className="mt-0.5 shrink-0 text-amber-500"
                      />
                      <span>{fb.message}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="border-t dark:border-neutral-800 border-slate-200 pt-8 flex flex-col gap-8">
            <h2 className="text-2xl font-bold dark:text-white text-slate-950">
              Escolha o seu Modelo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={cn(
                    "flex flex-col gap-4 p-4 rounded-xl border-2 transition-all dark:bg-[#111111] bg-white text-left @container focus:outline-none focus:ring-4 focus:ring-orange-500/20 group",
                    selectedTemplate === tpl.id
                      ? "border-orange-600 shadow-md ring-1 ring-orange-600"
                      : "dark:border-neutral-800 border-slate-200 hover:border-orange-400 hover:shadow-sm",
                  )}
                >
                  <div className="flex justify-between items-start w-full pointer-events-none px-2 pt-2 min-h-[100px]">
                    <div className="flex flex-col flex-1 pr-3">
                      <h3 className="font-bold text-lg dark:text-white text-slate-900 leading-tight">
                        {tpl.name}
                      </h3>
                      <p className="text-xs dark:text-neutral-400 text-slate-500 mt-2">
                        {tpl.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1",
                        selectedTemplate === tpl.id
                          ? "border-orange-600 bg-orange-600"
                          : "dark:border-neutral-700 border-slate-300",
                      )}
                    >
                      {selectedTemplate === tpl.id && (
                        <CheckCircle2 size={12} className="text-white" />
                      )}
                    </div>
                  </div>

                  {/* Pixel-perfect Thumbnail Scaling using SVG */}
                  <div className="w-full aspect-[1/1.414] mt-2 border dark:border-neutral-800 border-slate-200 dark:bg-[#111111] bg-white pointer-events-none shadow-sm rounded-md overflow-hidden relative z-0">
                    <svg viewBox="0 0 794 1123" className="w-full h-full">
                      <foreignObject width="794" height="1123">
                        <ResumeA4Preview
                          data={extractedData}
                          templateId={tpl.id}
                        />
                      </foreignObject>
                    </svg>

                    {/* Overlay to prevent interaction and fade out the bottom */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent dark:to-neutral-900/60 to-white/60"></div>
                  </div>
                </button>
              ))}
            </div>

            {selectedTemplate === "original" && (
              <div className="mt-2 p-5 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 text-sm flex gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                <div className="flex-1 leading-relaxed">
                  <span className="font-bold block mb-1">Aviso de Fidelidade: "Continuar com meu currículo"</span>
                  <p>
                    Esta opção tentará preservar a estrutura de seções do seu documento original. Contudo, devido a restrições técnicas de compatibilidade de fontes e alinhamento do formato de visualização Web para A4, <b>pode não ser possível preservar 100% da fidelidade visual do arquivo original</b>.
                  </p>
                  <p className="mt-2 text-xs opacity-90">
                    Se você busca um layout profissional impecável e certificado contra falhas de leitura por plataformas ATS, recomendamos fortemente escolher um dos modelos validados acima (como o <b>ASM Core</b> ou <b>Standard ATS</b>).
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t dark:border-neutral-800 border-slate-200 pb-24">
              {error && (
                <div className="text-red-500 text-sm font-semibold">
                  {error}
                </div>
              )}
              <div className="text-sm dark:text-neutral-400 text-slate-500 font-medium font-sans">
                Você poderá editar o conteúdo na próxima página.
              </div>

              <button
                onClick={handleProcess}
                disabled={loading}
                className="w-full md:w-auto px-12 py-4 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Continuar e Editar
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
