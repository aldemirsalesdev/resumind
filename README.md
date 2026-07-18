# Resumind — Plataforma de Currículos com Análise ATS e IA

O **Resumind** é uma plataforma web moderna para criação, análise, edição e exportação de currículos, focada em estrutura, clareza e conformidade com boas práticas de leitura por sistemas ATS (Applicant Tracking Systems). 

A aplicação visa guiar os profissionais a estruturar suas informações profissionais de modo legível para algoritmos de triagem e recrutadores, reduzindo os erros comuns de formatação e conteúdo.

---

## 🛠️ Principais Recursos

- **Validações de Estrutura ATS:** Verificações integradas baseadas em regras essenciais de formatação, campos obrigatórios, links válidos (LinkedIn, GitHub) e ausência de elementos problemáticos (gráficos complexos, tabelas aninhadas).
- **Inteligência Artificial & Análise de Conteúdo:** Integração via APIs para revisão textual profunda, classificação de senioridade, análise de seções (Resumo Profissional, Experiências, Projetos) e atribuição de pontuação (Score) com feedback detalhado.
- **Editor de Currículos Integrado:** Editor interativo com preenchimento assistido, atualização de análise em tempo real e visualização de PDF estruturado lado a lado.
- **Exportação Multiformato:** Download do currículo em formato **PDF** profissional estilizado para leitura ATS, além de suporte a exportações estruturadas.
- **Autenticação e Histórico:** Login seguro para salvamento, recuperação e acompanhamento das pontuações anteriores.

---

## 🧠 Desenvolvido em Parceria com IA

Este projeto foi desenvolvido lado a lado com Inteligência Artificial, atuando como uma verdadeira parceira durante todo o ciclo de vida do software. A plataforma serviu como um projeto prático para explorar a capacidade da IA no desenvolvimento ágil.

Desde a idealização e estruturação inicial do código até a implementação de funcionalidades complexas (como integrações full-stack, geração de PDFs, comunicação com APIs e autenticação), a IA foi utilizada ativamente como uma ferramenta de *pair programming* para acelerar a codificação, revisar arquiteturas, solucionar bugs e refatorar componentes. Essa abordagem demonstra o poder de se criar aplicações web modernas, robustas e prontas para uso real com o apoio de tecnologias generativas.

---

## 🚀 Principais Tecnologias

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React, React Router DOM.
- **Backend (Servidor local):** Node.js, Express, tsx, esbuild (para build otimizado).
- **Processamento & IA:** `@google/genai` (Google Gemini SDK), Groq SDK, `pdf-parse`, `mammoth`, `docx`.
- **Geração de PDF:** `@react-pdf/renderer` para criação robusta de documentos estruturados.
- **Banco de Dados & Autenticação:** Firebase Auth e Firebase Firestore.

---

## 🛠️ Como Instalar e Rodar Localmente

### 1. Clonar o repositório
```bash
git clone <url-do-repositorio>
cd resumind
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Crie um arquivo chamado `.env` na raiz do projeto (ele é automaticamente ignorado pelo Git via `.gitignore`, mantendo suas chaves e acessos seguros).

Basta copiar o nosso modelo de exemplo:
```bash
cp .env.example .env
```

Depois, abra o seu arquivo `.env` e preencha com as credenciais correspondentes:
```env
# Email do administrador para controle do painel
VITE_ADMIN_EMAIL=seu_email_admin@gmail.com

# Integrações com Inteligências Artificiais
GEMINI_API_KEY=sua_chave_gemini_aqui
GROQ_API_KEY=sua_chave_groq_aqui

# Conexões e integrações externas (Webhooks e Supabase)
GOOGLE_SHEETS_WEBHOOK_URL=sua_url_webhook_sheets
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_supabase

# Ambiente de execução
NODE_ENV=development
```

### ☁️ Configuração em Ambientes de Deploy (ex: Vercel, Cloud Run)

Ao realizar o deploy da aplicação em produção, configure as variáveis diretamente no painel administrativo da sua plataforma de hospedagem. Isso garante que nenhum dado sensível ou chave de acesso seja exposto no seu repositório de código.

---

## ⚙️ Scripts Disponíveis

Na pasta do projeto, você pode rodar os seguintes comandos através do seu gerenciador de pacotes:

### Iniciar o projeto em desenvolvimento (Frontend + Backend integrado)
```bash
npm run dev
```

### Compilar a aplicação para produção
```bash
npm run build
```
Gera a build estática do frontend na pasta `/dist` e o bundle compilado do servidor em `/dist/server.cjs` com esbuild.

### Iniciar o servidor de produção
```bash
npm run start
```
Executa a versão compilada e otimizada da aplicação servindo o frontend estático e as rotas de API.

### Rodar verificação de tipos (Linter)
```bash
npm run lint
```
Garante a integridade do código TypeScript por meio da checagem estática de tipos.

---

## 🔒 Boas Práticas de Segurança

1. **Proteção de Chaves de API:** Chaves confidenciais da Google Gemini API e Groq API são mantidas exclusivamente no ambiente do servidor (`server.ts`). Elas **nunca** são transmitidas ou expostas ao navegador.
2. **Uso de `.gitignore`:** Arquivos contendo dados de chaves de teste ou informações privadas (`.env`, `.env.local`, logs de depuração) estão permanentemente bloqueados para commit, prevenindo vazamentos de segurança acidentais no GitHub.
3. **Privacidade:** Nenhum dado textual de currículo real do usuário é persistido de forma insegura. O processamento ocorre em memória durante a sessão ou de forma segura nas coleções autorizadas de banco de dados.

---

## 📈 Status do Projeto

O **Resumind** está em desenvolvimento e evolução contínua, servindo como uma ferramenta prática e de referência técnica para demonstrar o potencial de aplicações web que combinam IA com regras de validação estruturada em prol da otimização profissional de currículos.
