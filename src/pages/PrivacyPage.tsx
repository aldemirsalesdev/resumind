import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
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
            <Shield size={14} className="text-[#f95b16]" />
            Privacidade e Segurança
          </div>
          <h1 className="text-3xl sm:text-4xl font-black dark:text-white text-slate-900 tracking-tight mb-4">
            Política de Privacidade
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
            A sua privacidade é importante para o Resumind. Esta Política de Privacidade explica, de forma simples, quais dados podem ser coletados, como são utilizados e quais cuidados são adotados na plataforma.
          </p>

          <hr className="dark:border-neutral-900 border-slate-100" />

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">01.</span> Dados que podemos coletar
            </h2>
            <p>
              Ao utilizar o Resumind, podemos coletar alguns dados necessários para funcionamento da plataforma, como:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2 dark:text-neutral-400 text-slate-600">
              <li>nome;</li>
              <li>e-mail;</li>
              <li>telefone, se informado no currículo;</li>
              <li>localização, se informada;</li>
              <li>links profissionais, como LinkedIn, GitHub ou portfólio;</li>
              <li>informações acadêmicas e profissionais presentes no currículo;</li>
              <li>arquivos enviados pelo usuário;</li>
              <li>dados inseridos no editor de currículo;</li>
              <li>pontuações, análises e sugestões geradas pela plataforma;</li>
              <li>feedbacks enviados pelo usuário;</li>
              <li>dados técnicos básicos, como data de acesso, navegador e informações necessárias para segurança e funcionamento do sistema.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">02.</span> Como usamos os dados
            </h2>
            <p>
              Os dados são utilizados para:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2 dark:text-neutral-400 text-slate-600">
              <li>permitir login e autenticação;</li>
              <li>ler e interpretar currículos enviados;</li>
              <li>preencher automaticamente o editor;</li>
              <li>gerar análises e sugestões de melhoria;</li>
              <li>calcular pontuação de compatibilidade ATS;</li>
              <li>salvar currículos e documentos do usuário;</li>
              <li>exibir o preview do currículo;</li>
              <li>melhorar a experiência da plataforma;</li>
              <li>receber e gerenciar feedbacks;</li>
              <li>manter a segurança e estabilidade do serviço.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">03.</span> Uso de inteligência artificial
            </h2>
            <p>
              O Resumind utiliza recursos de inteligência artificial para analisar, estruturar e sugerir melhorias no currículo. As respostas geradas por IA podem conter erros, por isso o usuário deve revisar cuidadosamente todas as informações antes de utilizar o currículo final.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">04.</span> Armazenamento e serviços utilizados
            </h2>
            <p>
              O Resumind pode utilizar serviços de nuvem, como Firebase e ferramentas relacionadas, para autenticação, armazenamento, banco de dados e funcionamento da aplicação.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">05.</span> Compartilhamento de dados
            </h2>
            <p>
              O Resumind não vende dados pessoais dos usuários. Os dados podem ser processados por serviços necessários ao funcionamento da plataforma, como autenticação, armazenamento, análise e infraestrutura.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">06.</span> Feedbacks e avaliações
            </h2>
            <p>
              Feedbacks enviados pelo usuário podem ser usados internamente para melhorar o produto. Comentários só devem aparecer publicamente se forem autorizados pelo usuário e aprovados previamente. E-mails, identificadores de usuário e dados sensíveis não devem ser exibidos publicamente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">07.</span> Segurança
            </h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger os dados, como autenticação, regras de acesso e restrição de informações administrativas. Ainda assim, nenhum sistema digital é totalmente livre de riscos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">08.</span> Responsabilidade no envio de currículos
            </h2>
            <p>
              Currículos podem conter dados pessoais. O usuário deve revisar o conteúdo antes de enviar e evitar incluir informações sensíveis desnecessárias.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">09.</span> Remoção e contato sobre dados
            </h2>
            <p>
              O usuário pode solicitar a remoção de dados ou documentos relacionados à sua conta, além de tirar dúvidas sobre privacidade e uso de dados, pelo e-mail:{" "}
              <a href="mailto:contato@resumind.site" className="text-[#f95b16] hover:underline font-semibold">
                contato@resumind.site
              </a>
              . A solicitação será analisada e atendida conforme as possibilidades técnicas e legais aplicáveis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span className="text-[#f95b16] font-mono text-sm">10.</span> Alterações nesta Política
            </h2>
            <p>
              Esta Política de Privacidade pode ser atualizada para refletir mudanças no funcionamento do Resumind, melhorias de segurança ou adequações legais.
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
