import { calculateAtsScore } from "../src/lib/atsScore";
import {
  applyCors,
  extractEmailFromRawText,
  extractPhoneFromRawText,
  parseRequestBody,
  runAiQuery,
  runPythonAnalyzer,
  sanitizeLinkedinLink,
} from "../src/server/sharedAi";

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const body = parseRequestBody(req);
    const { rawText } = body;
    if (!rawText) {
      return res.status(400).json({ error: "Parâmetro 'rawText' ausente." });
    }

    const pythonAnalysis = runPythonAnalyzer(rawText);
    let pythonContextPrompt = "";
    if (pythonAnalysis) {
      pythonContextPrompt = `
DADOS ADICIONAIS DE ANÁLISE HEURÍSTICA (Calculados via Engine Python integrada):
- Estimativa de Pontuação ATS: ${pythonAnalysis.score_estimated} / 100
- Contatos identificados: ${JSON.stringify(pythonAnalysis.contacts)}
- Habilidades detectadas: ${JSON.stringify(pythonAnalysis.skills_detected)}
- Métricas textuais: Erros de espaçamento: ${pythonAnalysis.text_diagnostics?.formatting?.comma_spacing_errors}, Frases longas: ${pythonAnalysis.text_diagnostics?.formatting?.long_sentences_count}
- Sugestões heurísticas calculadas: ${JSON.stringify(pythonAnalysis.recommendations_pt || [])}

Por favor, leve em consideração essas métricas estruturais e os contatos identificados para complementar e enriquecer a sua resposta estruturada final e os feedbacks! Caso haja divergência gritante, priorize a precisão dos dados identificados pela engine.`;
    }

    const currentYear = new Date().getFullYear();

    const prompt = `Analise o texto abaixo e extraia as informações de forma estruturada como um currículo profissional (resume, CV).
Atenção MÁXIMA: Em hipótese alguma resuma, omita ou corte as descrições de experiências, resumo ou outras áreas. 
PRESERVE A ORIGINALIDADE EXATA das informações, transcrevendo frases completas do usuário para o JSON correspondente. Não mude a escrita ou sentido original.

REGRA ABSOLUTA DE NÃO ALTERAÇÃO E NÃO TRADUÇÃO:
1. NÃO TRADUZA O TEXTO EM HIPÓTESE ALGUMA! Se o currículo original estiver em Português, mantenha todos os termos, cargos, descrições, cursos e textos EXATAMENTE em Português. Se estiver em inglês, mantenha em inglês. NUNCA faça traduções espontâneas.
2. NÃO TENTE CORRIGIR OU MELHORAR O TEXTO EXTRAÍDO! Toda a extração na propriedade "structuredData" deve ser LITERAL ao que o usuário escreveu. Se houver erros ortográficos, termos fracos ou problemas de formatação, extraia-os exatamente como estão no texto e aponte os problemas APENAS no campo "grammarErrors" ou "atsAnalysis.feedback". Nunca altere o texto no "structuredData" por conta própria.
3. NÃO MUTE cargos, nomes, empresas ou descrições para soar mais profissional na extração. O "structuredData" deve ser um reflexo 100% fiel e exato do texto enviado pelo usuário.

ATENÇÃO EXTREMA SOBRE O ANO CORRENTE: O ano de referência atual é ${currentYear}. Datas até ${currentYear} não constituem datas futuras. IMPORTANTE: Datas de formatura acadêmica ou conclusão de curso no futuro (como 2027, 2028, etc.) são perfeitamente normais e válidas para estudantes que estão atualmente cursando, e NÃO devem ser tratadas como erros, datas futuras impossíveis ou erros de digitação. Do mesmo modo, se o usuário escrever algo como "previsão para 2027" ou "conclusão em 2027", isso não é um erro.

EXTRAÇÃO RIGOROSA DE CONTATOS:
- Extraia o E-mail, o Telefone, o LinkedIn e o GitHub (se existirem) com MUITA atenção! O sistema depende disso.
- Se a "Engine Python integrada" detectou e-mails e telefones, **COPIE EXATAMENTE** esses valores para "email" e "phone" (personalInfo) caso o LLM não os tenha achado no texto por conta própria.
- Se não contiver conexões explícitas, deixe vazio "".
- Não adivinhe URLs de LinkedIn, website, etc.

CRITÉRIOS ADAPTATIVOS DE EXPERIÊNCIA E TOM (EMPATIA):
1. O TOM DOS FEEDBACKS DEVE SER EXTREMAMENTE POLIDO, PROFISSIONAL E CONSTRUTIVO. Avalie o candidato com respeito, sugira melhorias objetivas e EVITE elogios exagerados.
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

${pythonContextPrompt}

REGRA ABSOLUTA DE NÃO RETORNAR FEEDBACK DE LEGIBILIDADE: JAMAIS adicione qualquer aviso, erro, warning ou feedback sobre "Legibilidade" (como Flesch, nível de legibilidade complexo/acadêmico, etc.) na lista de feedbacks ou sugestões. Esse tipo de feedback deve ser inteiramente ignorado e omitido.

REGRAS PARA EXTRAÇÃO E ORGANIZAÇÃO DE HABILIDADES (SKILLS):
- Você DEVE categorizar as habilidades encontradas no texto nas categorias de "Hard skills" e "Soft skills".
- Hard skills incluem: linguagens de programação, ferramentas, frameworks, bancos de dados, cloud, Office 365, sistemas, tecnologias. Agrupe-as com os seguintes prefixos (use apenas se houver itens):
  * "Ferramentas: "
  * "Banco de dados: "
  * "Cloud: "
  * "Office 365: "
  * Ou outros agrupamentos lógicos de Hard Skills que façam sentido, mas mantenha conciso.
- Soft skills incluem: comunicação, organização, trabalho em equipe, proatividade, etc.
- Retorne o array "skills" formatado onde CADA STRING do array é uma categoria completa. 
- Padronize os nomes (ex: github -> GitHub, python -> Python, aws -> AWS). Remova duplicatas.
- Exemplo de como deve retornar:
  "skills": [
    "Ferramentas: Python, Git, GitHub.",
    "Banco de dados: MySQL, PostgreSQL.",
    "Cloud: AWS.",
    "Soft Skills: Comunicação, trabalho em equipe, organização."
  ]
- Apenas inclua as categorias que possuem itens. A string de "Soft Skills" deve vir sempre por último, se houver.
- NUNCA retorne um item por string, as strings DEVEM ser os agrupamentos.

Você DEVE responder com um objeto JSON válido, aderente à seguinte estrutura:
{
  "structuredData": {
    "personalInfo": {
      "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "website": ""
    },
    "summary": "",
    "experience": [
      { "company": "", "position": "", "startDate": "", "endDate": "", "description": "" }
    ],
    "projects": [
      { "name": "", "description": "", "technologies": "", "link": "" }
    ],
    "education": [
      { "institution": "", "degree": "", "field": "", "graduationDate": "" }
    ],
    "skills": [""],
    "certifications": [
      { "name": "", "institution": "", "hours": "", "date": "", "status": "", "modality": "" }
    ],
    "languages": [""]
  },
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
  "atsAnalysis": {
    "feedback": [
      { "category": "Erros" | "Atenções" | "Sugestões", "message": "", "severity": "high" | "medium" | "low", "type": "error" | "warning" | "info" }
    ],
    "suggestions": [""]
  }
}

Texto do currículo:
${rawText}`;

    const responseText = await runAiQuery(prompt, { jsonMode: true });
    const resDict = JSON.parse(responseText);

    // Fallback regex contacts
    if (!resDict.structuredData) resDict.structuredData = {};
    if (!resDict.structuredData.personalInfo) resDict.structuredData.personalInfo = {};

    const foundEmail = extractEmailFromRawText(rawText);
    const foundPhone = extractPhoneFromRawText(rawText);

    if (foundEmail) {
      resDict.structuredData.personalInfo.email = foundEmail;
    }
    if (foundPhone) {
      resDict.structuredData.personalInfo.phone = foundPhone;
    }

    const pInfo = resDict.structuredData.personalInfo;
    if (pInfo) {
      if (!pInfo.github) {
        if (pInfo.website && pInfo.website.toLowerCase().includes("github.com")) {
          pInfo.github = pInfo.website;
          pInfo.website = "";
        } else if (pInfo.linkedin && pInfo.linkedin.toLowerCase().includes("github.com")) {
          pInfo.github = pInfo.linkedin;
          pInfo.linkedin = "";
        }
      }
    }

    if (resDict?.structuredData?.personalInfo?.linkedin) {
      resDict.structuredData.personalInfo.linkedin = sanitizeLinkedinLink(
        resDict.structuredData.personalInfo.linkedin,
      );
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
      resDict.structuredData,
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
    console.error("API /analyze-resume Error:", e);
    res.status(500).json({
      error: e?.message || "Ocorreu um erro ao analisar o currículo.",
    });
  }
}
