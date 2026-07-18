import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { calculateAtsScore } from "../lib/atsScore";
import {
  FilePlus,
  FileText,
  Clock,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  PenSquare,
  LayoutDashboard,
  Download,
  ImageIcon,
  FileCode,
  Check,
  HelpCircle,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export default function Dashboard() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    import("firebase/auth").then(({ onAuthStateChanged }) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setLoading(false);
          return;
        }

        try {
          const q = query(
            collection(db, "resumes"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(10),
          );
          let snapshot;
          try {
            snapshot = await getDocs(q);
          } catch (err) {
            handleFirestoreError(err, OperationType.LIST, "resumes");
            throw err;
          }
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          let uniqueData = data;
          if (data.length > 0) {
            const analysesQ = query(
              collection(db, "analyses"),
              where("userId", "==", user.uid),
            );
            let aSnapshot;
            try {
              aSnapshot = await getDocs(analysesQ);
            } catch (err) {
              handleFirestoreError(err, OperationType.LIST, "analyses");
              throw err;
            }
            const analysesMap = new Map();
            const hashToResume = new Map();
            
            aSnapshot.docs.forEach((d) => {
              const ad = d.data();
              analysesMap.set(ad.resumeId, ad);
            });
            
            // Deduplicate by dataHash
            const deduplicated = [];
            for (const r of data as any[]) {
              const analysis = analysesMap.get(r.id);
              if (analysis && analysis.dataHash) {
                if (hashToResume.has(analysis.dataHash)) {
                  // Duplicate content found, skip keeping this one (since data is ordered by createdAt desc, we keep the newest)
                  continue;
                }
                hashToResume.set(analysis.dataHash, r.id);
              }
              deduplicated.push(r);
            }
            uniqueData = deduplicated;

            const nameCounts = {};
            const resumesData = uniqueData as any[];
            [...resumesData].reverse().forEach(r => {
              const name = r.personalInfo?.fullName || "Sem Nome";
              if (!nameCounts[name]) nameCounts[name] = 0;
              nameCounts[name]++;
              r.version = nameCounts[name];
            });
            resumesData.forEach(r => {
              const name = r.personalInfo?.fullName || "Sem Nome";
              r.hasMultipleVersions = nameCounts[name] > 1;
            });
            
            resumesData.forEach((r) => {
              const ad = analysesMap.get(r.id);
              r.score = ad?.score || r.atsScore || r.score || 0;
            });
          }

          setResumes(uniqueData);
        } catch (err) {
          console.error("Error fetching resumes:", err);
        } finally {
          setLoading(false);
        }
      });
      return () => unsubscribe();
    });
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, "resumes", id));

      const q = query(
        collection(db, "analyses"),
        where("userId", "==", user.uid),
        where("resumeId", "==", id),
      );
      const s = await getDocs(q);
      if (!s.empty) {
        const batch = writeBatch(db);
        s.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      setResumes(resumes.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const calculateAverage = () => {
    if (resumes.length === 0) return 0;
    const total = resumes.reduce((acc, curr) => acc + (curr.score || 0), 0);
    return Math.round(total / resumes.length);
  };

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto w-full px-4 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 dark:text-neutral-400 text-slate-500">
            <LayoutDashboard size={20} />
            <span className="font-semibold text-sm uppercase tracking-wider">
              Painel
            </span>
          </div>
          <h1 className="text-3xl font-bold dark:text-white text-slate-900 tracking-tight">
            Meus Currículos
          </h1>
          <p className="dark:text-neutral-400 text-slate-500 text-sm">
            Gerencie, edite ou otimize novos currículos a partir dos seus
            arquivos.
          </p>
        </div>
        <Link
          to="/analyze"
          className="px-6 py-3 bg-orange-600 text-white font-semibold text-sm rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 shadow-sm"
        >
          <FilePlus size={18} />
          Analisar Currículo
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<TrendingUp className="text-orange-600" />}
          label="Média de Pontuação"
          value={`${calculateAverage()}%`}
          desc="Com os sistemas de recrutamento"
        />
        <StatCard
          icon={<FileText className="text-emerald-500" />}
          label="Currículos Salvos"
          value={resumes.length.toString()}
          desc="Na sua conta"
        />
        <StatCard
          icon={<ShieldCheck className="text-amber-500" />}
          label="Status de Otimização"
          value={calculateAverage() >= 80 ? "Ótimo" : "Pendente"}
          desc="Avaliando seu resultado final"
        />
      </div>

      <div className="mt-4">
        <section className="flex flex-col dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b dark:border-neutral-800 border-slate-200 dark:bg-neutral-900/50 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 dark:text-neutral-300 text-slate-600">
              <Clock size={18} />
              <h2 className="font-semibold text-sm">Documentos Recentes</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 dark:bg-neutral-900 bg-slate-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : resumes.length > 0 ? (
            <div className="flex flex-col divide-y dark:divide-neutral-800 divide-slate-200">
              {resumes.map((resume, idx) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() =>
                    navigate(`/editor`, {
                      state: { resumeId: resume.id, template: resume.template },
                    })
                  }
                  className="group flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 dark:hover:bg-neutral-900 hover:bg-slate-50 cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-600 group-hover:bg-orange-600 group-hover:text-white shadow-sm">
                      <FileText size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-bold dark:text-white text-slate-900">
                        {resume.personalInfo?.fullName || "Sem Nome"}{resume.hasMultipleVersions ? ` - Versão ${resume.version}` : ""}
                      </span>
                      <span className="text-xs dark:text-neutral-400 text-slate-500 font-medium">
                        Atualizado em{" "}
                        {new Date(resume.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 justify-between sm:justify-end w-full sm:w-auto">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-[10px] uppercase font-bold text-neutral-500">
                          ATS Score
                        </span>
                        <span
                          className={cn(
                            "font-bold text-lg",
                            getScoreColor(resume.score || 0),
                          )}
                        >
                          {resume.score || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-l dark:border-neutral-800 border-slate-200 pl-6">
                      <button
                        onClick={(e) => handleDelete(e, resume.id)}
                        className={cn(
                          "p-2 rounded-md flex items-center justify-center transition-colors",
                          confirmDeleteId === resume.id
                            ? "dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60 bg-red-50 text-red-600 border border-red-200"
                            : "dark:text-neutral-500 text-slate-400 dark:hover:bg-neutral-800 hover:bg-slate-200 hover:text-red-500",
                        )}
                        title="Deletar"
                      >
                        {confirmDeleteId === resume.id ? (
                          <span className="text-xs font-bold px-1">
                            Confirma?
                          </span>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/editor`, {
                            state: {
                              resumeId: resume.id,
                              template: resume.template,
                            },
                          });
                        }}
                        className="p-2 rounded-md dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 dark:text-neutral-400 text-slate-500 dark:hover:bg-neutral-900 hover:bg-slate-50 dark:hover:text-white hover:text-slate-900 shadow-sm"
                        title="Editar"
                      >
                        <PenSquare size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500/100 flex items-center justify-center mb-2">
                <FilePlus size={32} />
              </div>
              <div className="max-w-sm flex flex-col gap-2">
                <h3 className="font-bold text-lg dark:text-white text-slate-900">
                  Nenhum currículo encontrado
                </h3>
                <p className="text-sm dark:text-neutral-400 text-slate-500 leading-relaxed">
                  Você ainda não analisou nenhum documento. Clique no botão
                  abaixo para fazer o upload e otimizar seu currículo.
                </p>
              </div>
              <Link
                to="/analyze"
                className="px-6 py-3 bg-orange-600 text-white font-semibold text-sm rounded-lg hover:bg-orange-700 mt-2 shadow-sm"
              >
                Fazer Upload do Currículo
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="p-6 dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 rounded-xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm dark:text-neutral-400 text-slate-500">
          {label}
        </span>
        <div className="w-10 h-10 rounded-lg dark:bg-neutral-900 bg-slate-100 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-bold dark:text-white text-slate-900">
          {value}
        </span>
        <span className="text-xs dark:text-neutral-400 text-slate-500 font-medium">
          {desc}
        </span>
      </div>
    </div>
  );
}
