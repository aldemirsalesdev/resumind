import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, Timestamp, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Download,
  Loader2,
  Table as TableIcon,
  MessageSquare,
  Star,
  User,
  Calendar,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";

interface FeedbackData {
  id: string;
  feedback: string;
  rating: number;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: Timestamp | null;
  context: string;
  isPublic?: boolean;
  approved?: boolean;
}

const adminEmail = (import.meta as any).env.VITE_ADMIN_EMAIL || "";

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeedbacks() {
      if (!auth.currentUser || auth.currentUser.email !== adminEmail) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, "feedbacks"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FeedbackData[];
        setFeedbacks(data);
      } catch (error) {
        console.error("Erro ao buscar feedbacks:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeedbacks();
  }, []);

  const exportToCSV = () => {
    if (!auth.currentUser || auth.currentUser.email !== adminEmail) {
      alert("Acesso negado.");
      return;
    }
    const headers = ["Data", "Nome", "E-mail", "Nota", "Mensagem", "Contexto"];
    const csvContent = [
      headers.join(","),
      ...feedbacks.map(f => {
        const data = f.createdAt ? format(f.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "";
        const mensagem = `"${(f.feedback || "").replace(/"/g, '""')}"`;
        const email = f.userEmail || "";
        const name = `"${(f.userName || "").replace(/"/g, '""')}"`;
        const contexto = f.context || "";
        return `${data},${name},${email},${f.rating},${mensagem},${contexto}`;
      })
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `feedbacks_resumind_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleApproval = async (id: string, currentStatus: boolean | undefined) => {
    try {
      await updateDoc(doc(db, "feedbacks", id), {
        approved: !currentStatus
      });
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, approved: !currentStatus } : f));
    } catch (err) {
      console.error("Error toggling approval:", err);
      alert("Erro ao alterar aprovação");
    }
  };

  const togglePublic = async (id: string, currentStatus: boolean | undefined) => {
    try {
      await updateDoc(doc(db, "feedbacks", id), {
        isPublic: !currentStatus
      });
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, isPublic: !currentStatus } : f));
    } catch (err) {
      console.error("Error toggling public status:", err);
      alert("Erro ao alterar status público");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-600">
            <TableIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">
              Feedbacks
            </h1>
            <p className="text-sm dark:text-neutral-400 text-slate-500 font-medium">
              Gestão de avaliações e mensagens recebidas
            </p>
          </div>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 dark:bg-neutral-800 bg-white border dark:border-neutral-700 border-slate-200 dark:hover:bg-neutral-700 hover:bg-slate-50 dark:text-white text-slate-900 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="dark:bg-neutral-900/50 bg-slate-50 border-b dark:border-neutral-800 border-slate-200">
                <th className="px-4 py-3 font-semibold dark:text-neutral-300 text-slate-600">
                  <div className="flex items-center gap-2 whitespace-nowrap"><Calendar size={14} /> Data</div>
                </th>
                <th className="px-4 py-3 font-semibold dark:text-neutral-300 text-slate-600">
                  <div className="flex items-center gap-2 whitespace-nowrap"><User size={14} /> Usuário</div>
                </th>
                <th className="px-4 py-3 font-semibold dark:text-neutral-300 text-slate-600">
                  <div className="flex items-center gap-2 whitespace-nowrap"><Star size={14} /> Nota</div>
                </th>
                <th className="px-4 py-3 font-semibold dark:text-neutral-300 text-slate-600">
                  <div className="flex items-center gap-2 whitespace-nowrap"><MessageSquare size={14} /> Mensagem</div>
                </th>
                <th className="px-4 py-3 font-semibold dark:text-neutral-300 text-slate-600">
                  <div className="flex items-center gap-2 whitespace-nowrap"><LinkIcon size={14} /> Contexto</div>
                </th>
                <th className="px-4 py-3 font-semibold dark:text-neutral-300 text-slate-600">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-neutral-800 divide-slate-200">
              {feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center dark:text-neutral-500 text-slate-500">
                    Nenhum feedback encontrado.
                  </td>
                </tr>
              ) : (
                feedbacks.map((item) => (
                  <tr key={item.id} className="dark:hover:bg-neutral-900 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap dark:text-neutral-400 text-slate-600">
                      {item.createdAt ? format(item.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "--"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium dark:text-white text-slate-900">{item.userName || "Anônimo"}</span>
                        {item.userEmail && <span className="text-xs dark:text-neutral-500 text-slate-500">{item.userEmail}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-bold text-orange-500 bg-orange-500/10 w-fit px-2.5 py-1 rounded-md">
                        <Star size={12} className="fill-current" />
                        {item.rating}
                      </div>
                    </td>
                    <td className="px-4 py-3 dark:text-neutral-300 text-slate-700 min-w-[300px]">
                      {item.feedback ? (
                        <p className="line-clamp-3">{item.feedback}</p>
                      ) : (
                        <span className="italic dark:text-neutral-600 text-slate-400">Sem mensagem</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs dark:text-neutral-500 text-slate-500 font-mono">
                      {item.context || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleApproval(item.id, item.approved)}
                          className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${item.approved ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-neutral-800 dark:border-neutral-700'}`}
                          title={item.approved ? "Aprovado" : "Pendente"}
                        >
                          {item.approved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </button>
                        <button 
                          onClick={() => togglePublic(item.id, item.isPublic)}
                          className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${item.isPublic ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-neutral-800 dark:border-neutral-700'}`}
                          title={item.isPublic ? "Público" : "Privado"}
                        >
                          {item.isPublic ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-3 border-t dark:border-neutral-800 border-slate-200 dark:bg-neutral-900/50 bg-slate-50 dark:text-neutral-400 text-slate-500 text-xs flex justify-between items-center">
          <span>{feedbacks.length} avaliações recebidas</span>
        </div>
      </div>
    </div>
  );
}
