import { calculateAtsScore } from "../src/lib/atsScore";
import {
  applyCors,
  parseRequestBody,
  runAiQuery,
  sanitizeLinkedinLink,
} from "../src/server/sharedAi";

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const body = parseRequestBody(req);
    const { structuredData } = body;
    if (!structuredData) {
      return res.status(400).json({ error: "structuredData ausente." });
    }

    if (structuredData?.personalInfo?.linkedin) {
      structuredData.personalInfo.linkedin = sanitizeLinkedinLink(
        structuredData.personalInfo.linkedin,
      );
    }

    const currentYear = new Date().getFullYear();

    const prompt = `Atue como um Especialista de Qualidade / QA de RH e Analista de ATS internacional.
Você receberá um currículo em formato JSON.

ATENÇÃO EXTREMA SOBRE O ANO CORRENTE: O ano é ${currentYear}. Qualquer data ATÉ ${currentYear} não é data futura nem erro. IMPORTANTE: Datas de formatura acadêmica ou conclusão de curso no futuro (como 2027, 2028, etc.) são perfeitamente normais e válidas para estudantes que estão atualmente cursando, e NÃO devem ser tratadas como erros, datas futuras impossíveis ou erros de digitação. Do mesmo modo, se o usuário escrever algo como "previsão para 2027" ou "conclusão em 2027", isso não é um erro.

CRITÉRIOS ADAPTATIVOS DE EXPERIÊNCIA E TOM (EMPATIA):
1. O TOM DOS FEEDBACKS DEVE SER EXTREMAMENTE POLIDO, PROFISSIONAL E CONSTRUTIVO. Avalie o candidato com respeito, sugira melhorias objetivas e EVITE elogios exagerados ou frases como "praticamente perfeito" se houver lacunas.
2. Se tem pouca experiência profissional (ex: estudante, bicos), NÃO COBRE E NÃO EXIJA métricas de faturamento empresarial ou impacto de sênior. Avalie puramente a clareza, dedicação e potencial!
3. EDUCAÇÃO BÁSICA: Se o nível de educação for "Ensino Médio" ou "Ensino Fundamental", JAMAIS sugira adicionar "temas estudados", "disciplinas" ou exigir atividades acadêmicas avançadas. Apenas valide a data e o nome da instituição.

AVALIAÇÃO DE LINKS E URLS (NOVO):
- Verifique rigorosamente a validade de URLs (como LinkedIn, GitHub, portfólio). Se detectar URLs falsas, de teste, incompletas ou com domínios inválidos (ex: '.teste', '.example', 'linkedin.com/in/seu-nome', URLs sem terminação real), gere um feedback de 'warning' ou 'error' apontando EXPLICITAMENTE qual link (ex: LinkedIn, GitHub ou Portfólio) está incorreto e qual é o valor inválido detectado.
- JAMAIS use a palavra "completude" nas suas respostas. Prefira termos simples e fáceis de compreender pelo usuário final, como "preenchimento correto" ou "link completo".

CLASSIFICAÇÃO EDUCAÇÃO vs CURSOS E CERTIFICAÇÕES (CRÍTICO):
- A seção "Educação" (education) DEVE SER EXCLUSIVA para formações acadêmicas formais e de grau (Ensino Fundamental, Ensino Médio, Graduação, Pós-graduação, Mestrado, Doutorado, Cursos Técnicos oficiais).
- Qualquer outro tipo de aprendizado (como "CIEE", cursos livres, cursos profissionalizantes, Jovem Aprendiz que inclui curso, bootcamps, Alura, Udemy) DEVE SER OBRIGATORIAMENTE colocado na seção "Cursos e Certificações" (certifications). NUNCA coloque instituições como CIEE ou cursos complementares em Educação.
- Cursos sem carga horária informada devem gerar um aviso ("warning") recomendando a inclusão das horas, caso aplicável.

AVALIAÇÃO DE FEEDBACKS (ATENÇÃO CRÍTICA):
A IA NUNCA gera ou opina sobre uma nota numérica (ex: NUNCA retorne "nota 88", "nota 93", "aumentaria a nota", etc.). A nota é calculada EXCLUSIVAMENTE pelo motor separado do sistema.
Sua função aqui é APENAS fornecer feedbacks qualitativos sobre o conteúdo existente e classificações objetivas de qualidade textual.

Gere feedbacks em:
- "atsAnalysis.feedback": feedbacks detalhados sobre o conteúdo do currículo (usando categories "Erros", "Atenções", "Sugestões" e types "error", "warning", "info").
  * "Erros" (type: "error") para problemas graves.
  * "Atenções" (type: "warning") para problemas médios.
  * "Sugestões" (type: "info") para melhorias que não penalizam a nota (ex: adicionar tecnologias, detalhar melhor um projeto, fortalecer resultados, etc.).
- "grammarErrors": erros gramaticais detalhados estruturados (ver abaixo).
- "aiEvaluations": classificação objetiva e qualitativa de 5 seções/aspectos exatamente nos valores especificados abaixo.

REGRAS DO PROMPT "aiEvaluations":
Forneça a classificação objetiva de qualidade para:
1. Resumo profissional ("summary"): valores possíveis: "Excelente", "Bom", "Regular", "Fraco"
2. Experiência profissional ("experience"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"
3. Projetos ("projects"): valores possíveis: "Excelente", "Bom", "Regular", "Fraco"
4. Gramática ("grammar"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"
5. Clareza textual ("clareza"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"

REGRAS DO PROMPT "grammarErrors" (MUITO IMPORTANTE):
Identifique e informe os erros gramaticais/ortográficos reais informando exatamente:
- "trecho": o trecho incorreto encontrado no texto.
- "motivo": explicação detalhada do erro.
- "correcao": a sugestão corrigida exata.
Nunca use mensagens genéricas do tipo "foram encontrados erros".

VALIDAÇÃO DE CONTATO:
Não ataque a formatação do telefone/celular se contiver uma cadeia válida de números (ex independente de DDD, +, etc). O mesmo para redes sociais válidas.

REGRAS DE CLASSIFICAÇÃO DOS AVISOS:
1. Identifique o Idioma do Currículo (Pt, En, Es).
2. ERROS GRAMATICAIS VERDADEIROS: Em 'grammarErrors', aponte APENAS erros reais de português (ortografia, concordância, grafia incorreta, digitação) no texto escrito pelo usuário. A ausência de uma informação (ex: "E-mail faltando") NÃO É UM ERRO GRAMATICAL e jamais deve constar aqui. NUNCA diga "Falta de preenchimento".
3. INFORMAÇÕES DE CONTATO E FALTANDO: Se faltar algum dado vital de contato (como E-mail, Telefone/Celular, LinkedIn), adicione O NOME COMUM em Português do campo (ex: "E-mail", "Telefone/Celular", "LinkedIn", "Cidade") APENAS na lista 'missingInfo'. 
   - NÃO USE NOMES TÉCNICOS como "email", "phone", "location". 
   - SE O CAMPO ESTIVER PRESENTE, não peça.
   - REGRA DE OURO (DEDUPLICAÇÃO): Tudo que for colocado na lista 'missingInfo' ou 'grammarErrors' NÃO DEVE SER REPETIDO como um novo objeto em 'atsAnalysis.feedback' para evitar avisos duplicados.
4. FEEDBACKS: Em atsAnalysis.feedback indique o 'type' que pode ser "success" (para pontos fortes), "warning" (para melhorias) ou "error" (para falhas graves). Forneça feedbacks claros e práticos. NUNCA junte ou misture "Cursos" e "Projetos" no mesmo aviso. Crie um aviso separado para "Cursos e Certificações" e outro para "Projetos". Nunca exija tecnologias em cursos.
5. "Jovem Aprendiz" é uma Experiência Profissional válida e DEVE constar em "Experiência Profissional". Cursos do CIEE devem constar em "Cursos".
6. Para o campo "skills" no JSON: Preserve a estrutura em linhas do usuário.

Você DEVE responder com um objeto JSON válido, aderente à seguinte estrutura:
{
  "aiEvaluations": {
    "summary": "Excelente" | "Bom" | "Regular" | "Fraco",
    "experience": "Excelente" | "Boa" | "Regular" | "Fraca",
    "projects": "Excelente" | "Bom" | "Regular" | "Fraco",
    "grammar": "Excelente" | "Boa" | "Regular" | "Fraca",
    "clareza": "Excelente" | "Boa" | "Regular" | "Fraca"
  },
  "grammarErrors": [
    { "trecho": "trecho com erro", "motivo": "explicacao do erro", "correcao": "sugestao corrigida" }
  ],
  "missingInfo": [""],
  "atsAnalysis": {
    "feedback": [
      { "category": "Erros" | "Atenções" | "Sugestões", "message": "", "severity": "high" | "medium" | "low", "type": "error" | "warning" | "info" }
    ],
    "suggestions": [""]
  }
}

JSON:
${JSON.stringify(structuredData)}`;

    const responseText = await runAiQuery(prompt, { jsonMode: true });
    const resDict = JSON.parse(responseText);

    const hasEmail = structuredData?.personalInfo?.email?.trim()?.length > 0;
    const hasPhone = structuredData?.personalInfo?.phone?.trim()?.length > 0;
    const hasLinkedin = structuredData?.personalInfo?.linkedin?.trim()?.length > 0;

    const pInfo = structuredData?.personalInfo || {};
    const contact = structuredData?.contact || {};
    const locVal =
      pInfo.location ||
      pInfo.city ||
      pInfo.address ||
      pInfo.localizacao ||
      pInfo.cidade ||
      pInfo.region ||
      pInfo.state ||
      structuredData?.location ||
      structuredData?.city ||
      structuredData?.address ||
      structuredData?.localizacao ||
      structuredData?.cidade ||
      structuredData?.region ||
      structuredData?.state ||
      contact.location ||
      contact.city ||
      contact.address ||
      contact.localizacao ||
      contact.cidade ||
      contact.region ||
      contact.state ||
      "";
    const hasLocation =
      typeof locVal === "string" &&
      locVal.trim().length >= 3 &&
      !/^[.,/\\#!$%^&*;:{}=\-_`~()\s]+$/.test(locVal);

    if (resDict?.missingInfo && Array.isArray(resDict.missingInfo)) {
      resDict.missingInfo = resDict.missingInfo.filter((info: string) => {
        const lInfo = info.toLowerCase();
        if (hasEmail && (lInfo.includes("email") || lInfo.includes("e-mail"))) return false;
        if (hasPhone && lInfo.includes("telefone")) return false;
        if (hasLinkedin && lInfo.includes("linkedin")) return false;
        if (
          hasLocation &&
          (lInfo.includes("cidade") ||
            lInfo.includes("localização") ||
            lInfo.includes("localizacao") ||
            lInfo.includes("endereço") ||
            lInfo.includes("endereco") ||
            lInfo.includes("bairro"))
        )
          return false;
        if (
          lInfo.includes("language") ||
          lInfo.includes("idioma") ||
          lInfo.includes("skill") ||
          lInfo.includes("habilidade")
        )
          return false;
        return true;
      });
    }

    if (resDict?.atsAnalysis?.feedback && Array.isArray(resDict.atsAnalysis.feedback)) {
      resDict.atsAnalysis.feedback = resDict.atsAnalysis.feedback.filter((fb: any) => {
        const msg = (fb?.message || "").toLowerCase();
        if (hasEmail && (msg.includes("e-mail") || msg.includes("email")) && (msg.includes("vazio") || msg.includes("falta")))
          return false;
        if (hasPhone && msg.includes("telefone") && (msg.includes("vazio") || msg.includes("falta")))
          return false;
        if (hasLinkedin && msg.includes("linkedin") && (msg.includes("vazio") || msg.includes("falta")))
          return false;
        if (
          hasLocation &&
          (msg.includes("cidade") ||
            msg.includes("localização") ||
            msg.includes("localizacao") ||
            msg.includes("endereço") ||
            msg.includes("endereco") ||
            msg.includes("bairro")) &&
          (msg.includes("vazio") ||
            msg.includes("falta") ||
            msg.includes("ausente") ||
            msg.includes("adicione") ||
            msg.includes("informado") ||
            msg.includes("informar"))
        )
          return false;
        return true;
      });
    }

    if (!resDict.atsAnalysis) {
      resDict.atsAnalysis = { score: 70, feedback: [], suggestions: [] };
    }
    if (!resDict.atsAnalysis.feedback) {
      resDict.atsAnalysis.feedback = [];
    }
    if (resDict.grammarErrors && Array.isArray(resDict.grammarErrors)) {
      resDict.grammarErrors.forEach((err: any) => {
        if (err && typeof err === "object" && err.trecho && err.motivo && err.correcao) {
          resDict.atsAnalysis.feedback.push({
            category: "Erros",
            message: `No trecho "${err.trecho}": ${err.motivo}. Sugestão: "${err.correcao}"`,
            severity: "high",
            type: "error",
          });
        } else if (
          err &&
          typeof err === "string" &&
          !err.toLowerCase().includes("string") &&
          !err.toLowerCase().includes("array") &&
          !err.toLowerCase().includes("json")
        ) {
          resDict.atsAnalysis.feedback.push({
            category: "Erros",
            message: err,
            severity: "high",
            type: "error",
          });
        }
      });
    }

    const finalAnalysis = calculateAtsScore(
      structuredData || resDict.structuredData,
      resDict.atsAnalysis.feedback,
      resDict.aiEvaluations,
    );
    resDict.atsAnalysis.score = finalAnalysis.score;
    resDict.atsAnalysis.feedback = finalAnalysis.feedback;
    resDict.atsAnalysis.aiEvaluations = resDict.aiEvaluations;

    if (resDict.atsAnalysis.feedback && Array.isArray(resDict.atsAnalysis.feedback)) {
      resDict.atsAnalysis.feedback = resDict.atsAnalysis.feedback.filter((fb: any) => {
        const cat = (fb?.category || "").toLowerCase();
        const msg = (fb?.message || "").toLowerCase();
        return (
          !cat.includes("legibilidade") &&
          !cat.includes("flesch") &&
          !cat.includes("readability") &&
          !msg.includes("legibilidade") &&
          !msg.includes("flesch") &&
          !msg.includes("readability")
        );
      });
    }

    res.status(200).json(resDict);
  } catch (e: any) {
    console.error("API /analyze-grammar Error:", e);
    res.status(500).json({
      error: e?.message || "Ocorreu um erro ao analisar a gramática.",
    });
  }
}
