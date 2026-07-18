import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen dark:bg-[#050505] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#f95b16] opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm dark:text-neutral-400 text-slate-600 hover:text-[#f95b16] dark:hover:text-[#f95b16] transition-colors font-medium group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar para a página inicial
          </Link>
        </div>

        {/* Content Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center sm:text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 dark:bg-[#111111] bg-white border dark:border-neutral-800 border-slate-200 dark:text-neutral-400 text-slate-500 text-xs font-semibold rounded-full uppercase tracking-widest mb-4">
            <FileText size={14} className="text-[#f95b16]" />
            Documentação Legal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black dark:text-white text-slate-900 tracking-tight mb-4">
            Termos de Uso
          </h1>
          <p className="text-sm dark:text-neutral-500 text-slate-500 font-medium">
            Última atualização: Julho de 2026
          </p>
        </motion.div>

        {/* Legal Text Body */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="dark:bg-[#0a0a0a] bg-white rounded-2xl border dark:border-neutral-900 border-slate-200/80 p-6 sm:p-10 shadow-sm leading-relaxed dark:text-neutral-300 text-slate-700 text-[15px] space-y-8"
        >
          <p className="font-medium text-base dark:text-white text-slate-900">
            Bem-vindo ao Resumind. Ao utilizar a plataforma, você concorda com estes Termos de Uso.
          </p>

          <hr className="dark:border-neutral-900 border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">01.</span> Sobre o Resumind
            </h2>
            <p>
              O Resumind é uma ferramenta digital criada para auxiliar usuários na análise, organização e otimização de currículos. A plataforma utiliza inteligência artificial para interpretar informações enviadas pelo usuário, sugerir melhorias e apresentar uma pontuação de compatibilidade com critérios de leitura automatizada, como sistemas ATS.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">02.</span> Uso da plataforma
            </h2>
            <p>
              O usuário pode enviar currículos, preencher informações, editar dados, visualizar modelos e receber sugestões de melhoria. O uso da plataforma deve ser feito de forma responsável, com informações verdadeiras e pertencentes ao próprio usuário.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">03.</span> Análise automatizada
            </h2>
            <p>
              As análises, pontuações e sugestões apresentadas pelo Resumind são geradas de forma automatizada e possuem caráter orientativo. Elas não substituem a revisão humana nem garantem que o currículo será aprovado por empresas, recrutadores ou sistemas ATS.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">04.</span> Responsabilidade do usuário
            </h2>
            <p>
              O usuário é responsável pelas informações inseridas, enviadas ou editadas na plataforma. Antes de utilizar qualquer currículo gerado ou revisado, o usuário deve revisar cuidadosamente todos os dados, textos, datas, contatos e informações profissionais.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">05.</span> Ausência de garantia de resultado
            </h2>
            <p>
              O Resumind não garante entrevistas, contratações, aprovações em processos seletivos ou qualquer resultado profissional. A plataforma tem como objetivo apoiar a melhoria da apresentação do currículo, mas a decisão final depende de recrutadores, empresas e demais critérios externos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">06.</span> Upload de arquivos
            </h2>
            <p>
              Ao enviar arquivos para análise, o usuário declara que possui direito de uso sobre o conteúdo enviado. O usuário não deve enviar documentos de terceiros sem autorização.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">07.</span> Uso indevido
            </h2>
            <p>
              É proibido utilizar a plataforma para fins ilegais, envio de conteúdo falso, abusivo, ofensivo, malicioso, fraudulento ou que viole direitos de terceiros.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">08.</span> Disponibilidade do serviço
            </h2>
            <p>
              O Resumind pode passar por ajustes, manutenções, instabilidades ou alterações. Não garantimos disponibilidade contínua ou livre de falhas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">09.</span> Alterações nos Termos
            </h2>
            <p>
              Estes Termos podem ser atualizados para refletir melhorias no serviço, mudanças legais ou ajustes de funcionamento da plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">10.</span> Contato
            </h2>
            <p>
              Em caso de dúvidas sobre estes Termos de Uso, entre em contato pelo e-mail:{" "}
              <a href="mailto:contato@resumind.site" className="text-[#f95b16] hover:underline font-semibold">
                contato@resumind.site
              </a>
            </p>
          </section>
        </motion.div>

        {/* Simple Footer under text */}
        <div className="mt-8 text-center text-xs dark:text-neutral-600 text-slate-400 font-medium">
          Resumind &copy; 2026 &bull; Criado por Aldemir Sales
        </div>
      </div>
    </div>
  );
}
