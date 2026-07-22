import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User as FirebaseUser } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { cn } from "../lib/utils";
import {
  ShieldCheck,
  ScanSearch,
  FileCheck,
  LayoutDashboard,
  FilePlus,
  LogOut,
  ChevronDown,
  ChevronUp,
  User,
  Briefcase,
  Code,
  GraduationCap,
  Star,
  AlertTriangle,
  BarChart,
  Eye,
  Lock,
  CheckCircle2,
  MessageSquare,
  ThumbsUp,
  RefreshCw,
  Globe,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { ResumeA4Preview } from "../components/ResumeA4Preview";
import AuthModal from "../components/AuthModal";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function LandingPage({ user }: { user: FirebaseUser | null }) {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [displayedReviews, setDisplayedReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    async function fetchPublicReviews() {
      try {
        const q = query(
          collection(db, "feedbacks"),
          where("approved", "==", true),
          where("isPublic", "==", true),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const reviews = snapshot.docs
          .map(doc => {
            const data = doc.data();
            let publicName = "Usuário verificado";
            if (data.userName) {
              const parts = data.userName.trim().split(" ");
              if (parts.length > 1) {
                publicName = `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
              } else {
                publicName = parts[0];
              }
            }
            return {
              id: doc.id,
              rating: data.rating,
              feedback: data.feedback,
              userName: publicName,
              createdAt: data.createdAt,
              liked: data.liked
            };
          })
          .filter(r => r.rating >= 4)
          .slice(0, 6);

        if (reviews.length > 0) {
          const avg = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
          setAverageRating(Math.round(avg * 10) / 10);
        }
        setDisplayedReviews(reviews);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      }
    }
    fetchPublicReviews();
  }, []);

  const handleLogin = () => {
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen dark:bg-[#050505] bg-slate-50 flex flex-col items-center justify-start overflow-x-hidden pb-16 relative">
      {/* Background Dots */}
      <div className="absolute inset-x-0 top-0 bottom-0 bg-[radial-gradient(#f95b1633_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none"></div>

      {/* Hero Content */}
      <section className="max-w-[1400px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 items-center px-4 md:px-8 xl:px-12 pt-6 md:pt-10 z-10 relative">
        {/* Glow Left */}
        <div className="absolute top-0 -left-32 w-[600px] h-[600px] bg-[#f95b16] opacity-[0.05] blur-[120px] rounded-full pointer-events-none"></div>

        {/* Left Side (Marketing Text - Stays Fixed) */}
        <div className="flex flex-col items-start text-left gap-6 md:gap-8 max-w-[600px] self-start relative z-10 lg:col-span-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 dark:text-neutral-400 text-slate-500 text-[11px] font-semibold rounded-full uppercase tracking-widest shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f95b16]"></span>
            ATS INTELIGENTE
          </div>

          <h1 className="text-[40px] md:text-5xl lg:text-[56px] font-black tracking-tight dark:text-white text-slate-900 leading-[1.05]">
            Currículos que <br className="hidden md:block" />
            passam pelos filtros.
            <br />
            <span className="text-[#f95b16]">
              Você mais perto <br /> da entrevista.
            </span>
          </h1>

          <p className="text-base dark:text-neutral-400 text-slate-500 font-medium leading-relaxed max-w-[38rem]">
            O Resumind é uma plataforma de análise e otimização de currículos para sistemas ATS utilizando Inteligência Artificial. Faça upload do seu currículo, receba uma análise detalhada, identifique oportunidades de melhoria e exporte uma versão otimizada para aumentar suas chances em processos seletivos.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2 mb-2 relative z-20">
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-white bg-[#f95b16] border border-[#f95b16] shadow-[0_4px_14px_rgba(249,91,22,0.3)] hover:bg-[#ff6e2d] hover:border-[#ff6e2d] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-out cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Ir para o meu Painel
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300 ease-out" />
                </span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-white bg-[#f95b16] border border-[#f95b16] shadow-[0_4px_14px_rgba(249,91,22,0.3)] hover:bg-[#ff6e2d] hover:border-[#ff6e2d] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-out cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Começar agora
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300 ease-out" />
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-6 mt-4 w-full max-w-md">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
                <ScanSearch
                  size={22}
                  className="dark:text-white text-slate-900"
                />
              </div>
              <div>
                <h4 className="text-[#f95b16] font-bold mb-1 text-[15px]">
                  Score de compatibilidade
                </h4>
                <p className="text-sm dark:text-neutral-400 text-slate-500 leading-relaxed">
                  Veja o quanto seu currículo está alinhado com a vaga desejada.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
                <FileCheck
                  size={22}
                  className="dark:text-white text-slate-900"
                />
              </div>
              <div>
                <h4 className="text-[#f95b16] font-bold mb-1 text-[15px]">
                  Análise completa
                </h4>
                <p className="text-sm dark:text-neutral-400 text-slate-500 leading-relaxed">
                  Identificamos pontos fortes, palavras-chave e melhorias
                  práticas.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
                <BarChart
                  size={22}
                  className="dark:text-white text-slate-900"
                />
              </div>
              <div>
                <h4 className="text-[#f95b16] font-bold mb-1 text-[15px]">
                  Formato aprovado
                </h4>
                <p className="text-sm dark:text-neutral-400 text-slate-500 leading-relaxed">
                  Entrega no formato ideal para ATS e revisão humana.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 p-6 rounded-2xl w-full max-w-md relative overflow-hidden">
            <div className="absolute top-2 left-4 text-[#f95b16] text-6xl leading-none font-serif font-black mb-2 opacity-30">
              "
            </div>
            <p className="dark:text-neutral-300 text-slate-600 text-sm mb-4 leading-relaxed mt-2 relative z-10 pl-6">
              Depois que ajustei meu currículo com o Resumind, consegui destacar melhor meus conhecimentos em redes, Linux e segurança da informação. Em poucos dias, fui chamado para entrevistas de estágio na área.
            </p>
            <div className="pl-6 relative z-10 flex flex-col gap-0.5">
              <p className="dark:text-white text-slate-900 font-bold text-[13px]">
                ARTHUR S.
              </p>
              <p className="dark:text-neutral-500 text-slate-400 text-[11px]">
                Estudante de Segurança da Informação
              </p>
            </div>
          </div>
        </div>

        {/* Right Side (Dynamic View) - Hidden on Mobile */}
        <div className="relative w-full h-full min-h-[500px] xl:min-h-[600px] hidden lg:flex justify-end items-center lg:col-span-7">
          {/* Glow Right */}
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-[#f95b16] opacity-[0.05] blur-[100px] rounded-full pointer-events-none"></div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full xl:w-[110%] xl:-mr-12"
          >
            <div className="w-full dark:bg-[#0a0a0a] bg-white rounded-2xl shadow-2xl shadow-[#f95b16]/10 border dark:border-neutral-800 border-slate-200/60 overflow-hidden flex flex-col relative z-10">
              {/* Top Bar - Mockup Navbar */}
              <div className="h-14 dark:bg-[#0a0a0a] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex items-center px-6 w-full shrink-0 justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold dark:text-white text-slate-900 tracking-tight">
                    Resu<span className="text-[#f95b16]">mind</span>
                  </span>
                </div>

                <div className="hidden lg:flex items-center gap-8 ml-auto mr-8">
                  <div className="flex items-center gap-2 dark:text-neutral-400 text-slate-500 text-sm font-medium">
                    <LayoutDashboard size={16} />
                    <span>Painel</span>
                  </div>
                  <div className="flex items-center gap-2 dark:text-neutral-400 text-slate-500 text-sm font-medium">
                    <FilePlus size={16} />
                    <span>Analisar Currículo</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="dark:text-white text-slate-900 text-xs font-bold leading-tight">
                      ARTHUR SANTIAGO
                    </p>
                    <p className="dark:text-neutral-500 text-slate-400 text-[10px]">
                      arthur.santiago@g...
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full border dark:border-neutral-800 border-slate-200 flex items-center justify-center bg-slate-100 dark:bg-neutral-800 dark:text-neutral-300 text-slate-600 shadow-sm">
                    <LogOut size={14} />
                  </div>
                </div>
              </div>

              {/* App Content Body */}
              <div className="flex flex-col md:flex-row h-[500px] sm:h-[650px] dark:bg-[#0f0f0f] bg-slate-100 overflow-hidden">
                {/* Left Sidebar - Editor Tools */}
                <div className="hidden md:flex md:w-[280px] lg:w-[320px] dark:bg-[#111111] bg-white border-r dark:border-neutral-800 border-slate-200 flex-col shrink-0 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                  <div className="p-4 border-b dark:border-neutral-800 border-slate-200 shrink-0 dark:bg-[#111111] bg-[#fafafa] flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-lg dark:text-white text-slate-900 leading-tight">
                          Editor de Currículo
                        </h2>
                        <p className="text-xs dark:text-neutral-400 text-slate-500 mt-0.5">
                          Altere seus dados. O preview atualizará ao lado.
                        </p>
                      </div>

                      <button className="px-3 py-1.5 flex items-center gap-1.5 border border-slate-200/80 dark:border-neutral-700 rounded-lg text-xs font-semibold cursor-pointer select-none shrink-0 transition-colors duration-150 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-neutral-700">
                        <RefreshCw size={13} className="text-slate-500" />
                        <span>Atualizar Análise</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto overflow-x-hidden dark:bg-[#111111] bg-[#fafafa]">
                    {/* ATS Analysis Section */}
                    <div className="w-full flex items-center justify-between p-4 border-b rounded-sm cursor-pointer transition-colors duration-150 bg-white dark:bg-[#111111] text-slate-800 dark:text-white border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-950">
                      <div className="flex items-center gap-3 font-semibold text-sm">
                        <AlertTriangle size={18} className="text-neutral-500" />
                        Análise ATS
                      </div>
                      <ChevronUp size={18} className="text-neutral-500" />
                    </div>
                    
                    <div className="p-4 dark:bg-[#1A1A1A] bg-slate-50 border-b dark:border-neutral-800 border-slate-200 flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl font-black text-red-500">
                            42/100
                          </div>
                          <div className="text-xs font-semibold dark:text-white/70 text-slate-600">
                            Score de Compatibilidade ATS
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-3 mt-2">
                          <div className="text-xs leading-relaxed dark:text-neutral-400 text-slate-600 dark:bg-[#111111] bg-white p-3.5 border dark:border-neutral-800 border-slate-200 rounded-md flex flex-col gap-2.5 shadow-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="text-emerald-500 mt-0.5">
                                <CheckCircle size={14} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wide text-[10px]">CONFORMIDADE LGPD</div>
                                <div>O currículo não utiliza foto ou dados sensíveis desnecessários, mantendo boa compatibilidade com modelos ATS.</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs leading-relaxed dark:text-neutral-400 text-slate-600 dark:bg-[#111111] bg-white p-3.5 border dark:border-neutral-800 border-slate-200 rounded-md flex flex-col gap-2.5 shadow-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="text-red-500 mt-0.5">
                                <AlertCircle size={14} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wide text-[10px]">INFORMAÇÕES DE CONTATO</div>
                                <div>O e-mail parece conter um erro de digitação ('.con'). Revise o domínio para garantir que os recrutadores consigam contato.</div>
                              </div>
                            </div>
                          </div>

                          <div className="text-xs leading-relaxed dark:text-neutral-400 text-slate-600 dark:bg-[#111111] bg-white p-3.5 border dark:border-neutral-800 border-slate-200 rounded-md flex flex-col gap-2.5 shadow-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="text-amber-500 mt-0.5">
                                <AlertTriangle size={14} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wide text-[10px]">RESUMO PROFISSIONAL</div>
                                <div>O resumo está adequado, mas omite ferramentas específicas da sua área de interesse. Incluir palavras-chave (ex: Linux, Wireshark, Análise de Redes) aumentará a aderência da sua candidatura.</div>
                              </div>
                            </div>
                          </div>

                          <div className="text-xs leading-relaxed dark:text-neutral-400 text-slate-600 dark:bg-[#111111] bg-white p-3.5 border dark:border-neutral-800 border-slate-200 rounded-md flex flex-col gap-2.5 shadow-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="text-amber-500 mt-0.5">
                                <AlertTriangle size={14} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wide text-[10px]">EXPERIÊNCIA PROFISSIONAL</div>
                                <div>A descrição da experiência utiliza verbos fracos ("Atuava", "Criação"). Utilize verbos de ação mais fortes (ex: "Gerenciei", "Implementei") e tente destacar os resultados obtidos.</div>
                              </div>
                            </div>
                          </div>

                          <div className="text-xs leading-relaxed dark:text-neutral-400 text-slate-600 dark:bg-[#111111] bg-white p-3.5 border dark:border-neutral-800 border-slate-200 rounded-md flex flex-col gap-2.5 shadow-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="text-amber-500 mt-0.5">
                                <AlertTriangle size={14} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wide text-[10px]">PROJETOS</div>
                                <div>A descrição do projeto está superficial ("script para ver as portas"). Especifique as tecnologias utilizadas (ex: Python, Bash) e explique qual foi o problema resolvido.</div>
                              </div>
                            </div>
                          </div>

                          <div className="text-xs leading-relaxed dark:text-neutral-400 text-slate-600 dark:bg-[#111111] bg-white p-3.5 border dark:border-neutral-800 border-slate-200 rounded-md flex flex-col gap-2.5 shadow-xs">
                            <div className="flex items-start gap-2.5">
                              <div className="text-amber-500 mt-0.5">
                                <AlertTriangle size={14} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wide text-[10px]">CURSOS E CERTIFICAÇÕES</div>
                                <div>Alguns cursos estão sem carga horária. Adicione essa informação quando disponível para deixar a seção mais completa.</div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Collapsed Accordions */}
                    {[
                      { title: "1. Dados Pessoais", icon: User },
                      { title: "2. Experiência", icon: Briefcase },
                      { title: "3. Projetos", icon: Code },
                      { title: "4. Educação", icon: GraduationCap },
                      { title: "5. Habilidades", icon: Star },
                      { title: "6. Cursos e Certificações", icon: GraduationCap },
                      { title: "7. Idiomas", icon: Globe },
                    ].map((section, idx) => (
                      <div
                        key={idx}
                        className="w-full flex items-center justify-between p-4 border-b rounded-sm cursor-pointer transition-colors duration-150 bg-white dark:bg-[#111111] text-slate-800 dark:text-white border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-950"
                      >
                        <div className="flex items-center gap-3 font-semibold text-sm">
                          <section.icon
                            size={18}
                            className="text-neutral-500"
                          />
                          {section.title}
                        </div>
                        <ChevronDown size={18} className="text-neutral-500" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side - Document Preview Box Area */}
                <div className="flex-1 dark:bg-[#1a1a1a] bg-slate-200 p-4 sm:p-6 lg:p-8 relative overflow-hidden flex justify-center items-center">
                  <svg
                    viewBox="0 0 794 1123"
                    className="max-w-full max-h-full drop-shadow-2xl bg-white border border-neutral-300 pointer-events-none shrink-0"
                    style={{ shapeRendering: "crispEdges" }}
                  >
                    <foreignObject width="794" height="1123">
                      <div className="w-[794px] h-[1123px] bg-white text-slate-900 font-sans text-left">
                        <ResumeA4Preview
                          templateId="ats_clean"
                          data={{
                            structuredData: {
                              personalInfo: {
                                fullName: "ARTHUR SANTIAGO",
                                location: "Rio de Janeiro, RJ",
                                email: (
                                  <>
                                    arthursantiagodev@gmail.<span className="bg-[#ff4646]/15 border border-[#ff4646]/65 rounded-[3px] px-[3px] py-[1px] inline relative z-10 text-red-500">con</span>
                                  </>
                                ),
                                phone: "(21) 9817-27656",
                                linkedin:
                                  "https://linkedin.com/in/arthursantiagodev",
                                website:
                                  "https://github.com/arthursantiagodev",
                              },
                              summary: (
                                <>
                                  <span className="bg-[#ff4646]/15 border border-[#ff4646]/65 rounded-[3px] px-[3px] py-[1px] inline relative z-10 text-red-500">Profissional com quase 2 anos de experiência em suporte de TI e redes locais. Atualmente cursando Defesa Cibernética, busco minha primeira oportunidade na área de Segurança da Informação para aplicar conhecimentos adquiridos em projetos acadêmicos.</span>
                                </>
                              ),
                              experience: [
                                {
                                  company: "CyberTech Solutions",
                                  position: (
                                    <>
                                      Estagiário de TI
                                    </>
                                  ),
                                  startDate: "Janeiro de 2023",
                                  endDate: (
                                    <>
                                      <span className="bg-[#ff4646]/15 border border-[#ff4646]/65 rounded-[3px] px-[3px] py-[1px] inline relative z-10 text-red-500">16/2026</span>
                                    </>
                                  ),
                                  description: (
                                    <>
                                      <span className="bg-[#ff4646]/15 border border-[#ff4646]/65 rounded-[3px] px-[3px] py-[1px] inline relative z-10 text-red-500">• Atuava com suporte a usuários e manutenção de computadores.<br/>• Auxiliava na configuração de roteadores.<br/>• Criação de chamados de suporte técnico.</span>
                                    </>
                                  ),
                                },
                                {
                                  company: "Consultoria Tech B2B",
                                  position: "Jovem Aprendiz em Suporte",
                                  startDate: "Fevereiro de 2021",
                                  endDate: "Dezembro de 2022",
                                  description:
                                    "• Atendimento básico a clientes e triagem de problemas de TI.\n• Configuração de máquinas com Windows e pacote Office.\n• Organização de cabos e inventário de hardware.",
                                },
                              ],
                              projects: [
                                {
                                  name: "Análise de Vulnerabilidades em Rede",
                                  link: "GitHub Pessoal",
                                  description: (
                                    <>
                                      • Projeto acadêmico de segurança. <span className="bg-[#ff4646]/15 border border-[#ff4646]/65 rounded-[3px] px-[3px] py-[1px] inline relative z-10 text-red-500">Desenvolvimento de um script para ver as portas abertas na rede.</span>
                                    </>
                                  ),
                                },
                                {
                                  name: "Automação de Backup em Python",
                                  link: "https://github.com/arthursantiagodev/backup-automation",
                                  technologies: "Python, Bash, Cron",
                                  description: "• Desenvolvimento de scripts para backup diário de banco de dados e arquivos de configuração.\n• Integração com AWS S3 para armazenamento externo."
                                }
                              ],
                              education: [
                                {
                                  institution:
                                    "Universidade Tecnológica",
                                  degree:
                                    "Defesa Cibernética (2022 – 2025)",
                                },
                                {
                                  institution: "Udemy",
                                  degree: (
                                    <>
                                      Curso de Introdução a Redes <span className="bg-[#ff4646]/15 border border-[#ff4646]/65 rounded-[3px] px-[3px] py-[1px] inline relative z-10 text-red-500">Sem Carga Horária</span>
                                    </>
                                  ),
                                }
                              ],
                              skills: [
                                "Ferramentas: Linux, Wireshark, Nmap",
                                "Conhecimentos: Redes TCP/IP, Segurança da Informação, Troubleshooting",
                                "Soft Skills: Trabalho em equipe, Comunicação, Organização",
                              ],
                            },
                          }}
                        />
                      </div>
                    </foreignObject>
                  </svg>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section
        id="como-funciona"
        className="w-full bg-slate-50 dark:bg-[#0a0a0a] border-y border-slate-200 dark:border-neutral-900 py-16 md:py-24 z-10 relative"
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white tracking-tight mb-4">
              Como funciona
            </h2>
            <p className="text-slate-500 dark:text-neutral-400 max-w-2xl mx-auto">
              Em apenas três passos seu currículo estará pronto para ser notado
              pelos principais sistemas de recrutamento do mercado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Faça o upload",
                desc: "Envie seu currículo atual ou comece um do zero usando nosso editor guiado.",
              },
              {
                step: "02",
                title: "Análise inteligente",
                desc: "Nossa IA verifica as palavras-chave, formatação e compatibilidade com ATS.",
              },
              {
                step: "03",
                title: "Finalize seu currículo",
                desc: "Exporte a versão otimizada em um modelo limpo e pronto para revisão.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-900 p-8 rounded-2xl flex flex-col items-start relative overflow-hidden group hover:border-[#f95b16]/50"
              >
                <span className="text-6xl font-black text-[#f95b16] opacity-10 absolute -top-2 -right-2 group-hover:scale-110 transition-transform">
                  {item.step}
                </span>
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center font-black text-slate-900 dark:text-white mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-500 dark:text-neutral-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-8 md:h-24"></div>

      {/* Recursos Section */}
      <section
        id="recursos"
        className="w-full max-w-[1400px] mx-auto px-4 md:px-8 xl:px-12 py-16 md:py-24 z-10 relative"
      >
        <div className="text-center mb-16 gap-4">
          <h2 className="text-3xl md:text-4xl font-black dark:text-white text-slate-900 tracking-tight mb-4">
            Seu novo aliado na
            <br />
            busca pelo <span className="text-[#f95b16]">emprego</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Verificação ATS",
              desc: "Garante que robôs consigam ler seu PDF.",
              icon: FileCheck,
            },
            {
              title: "Sugestão de palavras",
              desc: "Otimização baseada na descrição da vaga.",
              icon: ScanSearch,
            },
            {
              title: "Design limpo",
              desc: "Templates profissionais, objetivos e fáceis de ler.",
              icon: Star,
            },
            {
              title: "Sem poluição visual",
              desc: "Foco no conteúdo, na leitura e na experiência do recrutador.",
              icon: Eye,
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 p-6 dark:bg-[#111111] bg-slate-50 rounded-2xl border dark:border-neutral-800 border-slate-200"
            >
              <div className="w-10 h-10 rounded-lg bg-[#f95b16]/10 flex items-center justify-center text-[#f95b16]">
                <feature.icon size={20} />
              </div>
              <h3 className="font-bold dark:text-white text-slate-900">
                {feature.title}
              </h3>
              <p className="text-sm dark:text-neutral-400 text-slate-500 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Avaliações dos Usuários Section */}
      {displayedReviews.length > 0 && (
        <section
          id="avaliacoes"
          className="w-full max-w-[1400px] mx-auto px-4 md:px-8 xl:px-12 py-16 md:py-24 border-t dark:border-neutral-900 border-slate-200 z-10 relative"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 dark:text-neutral-400 text-slate-500 text-[10px] font-semibold rounded-full uppercase tracking-widest mb-4">
                <Star
                  size={12}
                  className="text-amber-500 fill-amber-500 animate-pulse"
                />
                Avaliações da Comunidade
              </div>
              <h2 className="text-3xl md:text-4xl font-black dark:text-white text-slate-900 tracking-tight">
                O que dizem os{" "}
                <span className="text-[#f95b16]">profissionais</span>
              </h2>
              <p className="dark:text-neutral-400 text-slate-500 text-sm mt-3 max-w-xl">
                Confira a opinião de quem já utilizou o Resumind para otimizar o
                currículo e acelerar a busca pela vaga ideal.
              </p>
            </div>

            {/* Average Rating Block */}
            <div className="flex items-center gap-4 p-4 dark:bg-[#0a0a0a] bg-white border dark:border-neutral-800 border-slate-200 rounded-2xl shrink-0">
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white text-slate-900 leading-none">
                  {averageRating.toFixed(1)}
                </p>
                <p className="text-[10px] text-neutral-500 uppercase font-bold mt-1">
                  Média de Nota
                </p>
              </div>
              <div className="h-10 w-px dark:bg-neutral-800 bg-slate-200"></div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      className={s <= averageRating ? "text-amber-400 fill-amber-400" : "text-slate-200 dark:text-neutral-700"}
                    />
                  ))}
                </div>
                <p className="text-[11px] dark:text-neutral-400 text-slate-500 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />{" "}
                  Avaliações de Usuários
                </p>
              </div>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedReviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200/80 p-6 rounded-2xl flex flex-col justify-between gap-5 shadow-sm hover:border-[#f95b16]/30 transition-all group"
              >
                <div className="flex flex-col gap-3.5">
                  {/* Header info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm dark:text-white text-slate-900 tracking-tight">
                        {review.userName}
                      </h4>
                      <p className="text-[10px] dark:text-neutral-500 text-slate-400 font-medium">
                        Usuário
                      </p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={`${
                          review.rating >= star
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200 dark:text-neutral-700"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-xs dark:text-neutral-300 text-slate-600 leading-relaxed font-medium line-clamp-4">
                    "
                    {review.feedback}
                    "
                  </p>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between border-t dark:border-neutral-900 border-slate-100 pt-3.5">
                  <span className="text-[10px] font-mono dark:text-neutral-500 text-slate-400 font-semibold">
                    {review.createdAt?.seconds 
                      ? new Date(review.createdAt.seconds * 1000).toLocaleDateString("pt-BR")
                      : new Date().toLocaleDateString("pt-BR")}
                  </span>
                  {review.liked && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 dark:text-orange-400">
                      <ThumbsUp size={10} className="fill-current" /> Recomenda
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Small CTA at the bottom */}
          <div className="text-center mt-12 mb-8">
            <p className="text-xs dark:text-neutral-500 text-slate-400 font-medium">
              Quer ver sua opinião aqui? Use o botão flutuante de{" "}
              <span className="text-[#f95b16] font-bold">Feedback</span> no
              canto inferior direito a qualquer momento!
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="w-full max-w-[1400px] mx-auto px-4 md:px-8 xl:px-12 py-10 border-t dark:border-neutral-900 border-slate-200 z-10 relative flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <div className="flex items-center">
            <span className="font-extrabold text-lg tracking-tight dark:text-white text-slate-900">Resumind</span>
          </div>
          <p className="text-xs dark:text-neutral-500 text-slate-400 text-center md:text-left max-w-sm">
            Otimização profissional de currículos para sistemas ATS com Inteligência Artificial.
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link to="/termos" className="dark:text-neutral-400 text-slate-500 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors">
              Termos de Uso
            </Link>
            <span className="dark:text-neutral-700 text-slate-300">•</span>
            <Link to="/privacidade" className="dark:text-neutral-400 text-slate-500 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors">
              Política de Privacidade
            </Link>
          </div>
          <p className="text-xs dark:text-neutral-500 text-slate-400 font-medium text-center md:text-right mt-1">
            &copy; 2026 Resumind. Criado por Aldemir Sales.
          </p>
          <div className="flex items-center gap-3 text-xs font-medium mt-0.5">
            <a href="https://linkedin.com/in/aldemirsales" target="_blank" rel="noopener noreferrer" className="dark:text-neutral-300 text-slate-600 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors font-semibold">
              LinkedIn
            </a>
            <span className="dark:text-neutral-700 text-slate-300">•</span>
            <a href="https://github.com/aldemirsalesdev" target="_blank" rel="noopener noreferrer" className="dark:text-neutral-300 text-slate-600 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors font-semibold">
              GitHub
            </a>
            <span className="dark:text-neutral-700 text-slate-300">•</span>
            <a href="mailto:contato@resumind.site" className="dark:text-neutral-300 text-slate-600 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors font-semibold">
              contato@resumind.site
            </a>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab="register"
      />
    </div>
  );
}
