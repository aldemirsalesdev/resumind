import { 
  calculateDeterministicScore, 
  normalizeContactInfo, 
  normalizeResumeData,
  AtsScoreResult
} from "./atsEngine";

export { normalizeContactInfo, normalizeResumeData };

export interface AtsFeedback { 
  id?: string; 
  label?: string; 
  category: "Erros" | "Atenções" | "Sugestões";
  message: string;
  severity: "high" | "medium" | "low";
  type: "success" | "warning" | "error" | "info";
  actionable?: string;
  source?: 'system' | 'ai';
}

import { detectLanguage } from "./languageUtils";

export interface AtsAnalysisResult {
  score: number;
  feedback: AtsFeedback[];
  missingInfo?: string[];
}

export interface OutOfPlaceMatch {
  section: "education" | "experience";
  index: number;
  orgName: string;
  itemName: string;
  orgId: string;
  item: any;
}

export const OUT_OF_PLACE_ORGS = [
  {
    id: "ciee",
    displayName: "CIEE",
    type: "agent",
    patterns: ["ciee", "centro de integração empresa-escola", "centro de integracao"]
  },
  {
    id: "nube",
    displayName: "NUBE",
    type: "agent",
    patterns: ["nube", "núcleo brasileiro de estágios", "nucleo brasileiro de estagios"]
  },
  {
    id: "alura",
    displayName: "Alura",
    type: "course_platform",
    patterns: ["alura"]
  },
  {
    id: "udemy",
    displayName: "Udemy",
    type: "course_platform",
    patterns: ["udemy"]
  },
  {
    id: "coursera",
    displayName: "Coursera",
    type: "course_platform",
    patterns: ["coursera"]
  },
  {
    id: "rocketseat",
    displayName: "Rocketseat",
    type: "course_platform",
    patterns: ["rocketseat"]
  },
  {
    id: "dio",
    displayName: "DIO (Digital Innovation One)",
    type: "course_platform",
    patterns: ["dio.me", "digital innovation one", "dio"]
  },
  {
    id: "senai",
    displayName: "SENAI",
    type: "course_platform",
    patterns: ["senai", "serviço nacional de aprendizagem industrial", "servico nacional de aprendizagem industrial"]
  },
  {
    id: "senac",
    displayName: "SENAC",
    type: "course_platform",
    patterns: ["senac", "serviço nacional de aprendizagem comercial", "servico nacional de aprendizagem comercial"]
  },
  {
    id: "sebrae",
    displayName: "SEBRAE",
    type: "course_platform",
    patterns: ["sebrae", "serviço brasileiro de apoio às micro e pequenas empresas", "servico brasileiro de apoio as micro"]
  },
  {
    id: "curso_em_video",
    displayName: "Curso em Vídeo",
    type: "course_platform",
    patterns: ["curso em vídeo", "curso em video", "cursos em video", "cursos em vídeo"]
  },
  {
    id: "fundacao_bradesco",
    displayName: "Fundação Bradesco",
    type: "course_platform",
    patterns: ["fundação bradesco", "fundacao bradesco"]
  },
  {
    id: "ebac",
    displayName: "EBAC",
    type: "course_platform",
    patterns: ["ebac", "escola britânica de artes criativas", "escola britanica de artes criativas"]
  },
  {
    id: "digital_house",
    displayName: "Digital House",
    type: "course_platform",
    patterns: ["digital house"]
  },
  {
    id: "iel",
    displayName: "IEL",
    type: "agent",
    patterns: ["iel", "instituto euvaldo lodi"]
  },
  {
    id: "super_estagios",
    displayName: "Super Estágios",
    type: "agent",
    patterns: ["super estágios", "super estagios", "superestagios", "superestágios"]
  },
  {
    id: "abre",
    displayName: "ABRE",
    type: "agent",
    patterns: ["abre", "associação brasileira de estágios", "associacao brasileira de estagios"]
  }
];

export function matchesWord(text: string, pattern: string): boolean {
  if (!text || !pattern) return false;
  
  const textLower = text.toLowerCase().trim();
  const patternLower = pattern.toLowerCase().trim();
  
  if (patternLower.includes('.') || patternLower.includes(' ')) {
    return textLower.includes(patternLower);
  }
  
  const patternEscaped = patternLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(?<=^|[^a-záéíóúâêôãõç])${patternEscaped}(?=$|[^a-záéíóúâêôãõç])`, 'i');
  return regex.test(textLower);
}

export function findOutOfPlaceItems(resumeData: any): OutOfPlaceMatch[] {
  const matches: OutOfPlaceMatch[] = [];
  if (!resumeData) return matches;

  const education = resumeData.education || [];
  education.forEach((edu: any, idx: number) => {
    const inst = typeof edu.institution === "string" ? edu.institution.toLowerCase().trim() : "";
    const deg = typeof edu.degree === "string" ? edu.degree.toLowerCase().trim() : "";
    const field = typeof edu.field === "string" ? edu.field.toLowerCase().trim() : "";

    for (const org of OUT_OF_PLACE_ORGS) {
      const match = org.patterns.some(p => 
        matchesWord(inst, p) || 
        matchesWord(deg, p) || 
        matchesWord(field, p)
      );
      if (match) {
        matches.push({
          section: "education",
          index: idx,
          orgName: org.displayName,
          itemName: edu.degree || edu.field || edu.institution || org.displayName,
          orgId: org.id,
          item: edu
        });
        break;
      }
    }
  });

  return matches;
}

export function calculateAtsScore(
  rawData: any, 
  backendAiFeedback: any[] = [], 
  aiEvaluations?: any
): AtsAnalysisResult {
  const resumeData = normalizeResumeData(rawData);
  if (!resumeData) return { score: 0, feedback: [] };

  const engineResult = calculateDeterministicScore(rawData);
  
  // Resolve aiEvaluations from parameter, rawData or rawData.atsAnalysis
  let evals = aiEvaluations || rawData?.atsAnalysis?.aiEvaluations || rawData?.aiEvaluations;

  // Let's compute the AI weight modifier based on 5 criteria:
  // Excelente = +2, Bom = +1, Regular = 0, Fraco = -2
  const evalWeight: { [key: string]: number } = {
    "excelente": 2,
    "bom": 1,
    "boa": 1,
    "regular": 0,
    "fraco": -2,
    "fraca": -2
  };

  let aiModifier = 0;
  if (evals) {
    const summaryVal = String(evals.summary || evals.summary_profissional || evals.resumo_profissional || "").toLowerCase().trim();
    const expVal = String(evals.experience || evals.experience_profissional || evals.experiencia_profissional || "").toLowerCase().trim();
    const projVal = String(evals.projects || evals.projetos || "").toLowerCase().trim();
    const gramVal = String(evals.grammar || evals.gramatica || "").toLowerCase().trim();
    const clarVal = String(evals.clareza || evals.clarity || evals.clareza_textual || "").toLowerCase().trim();

    if (summaryVal && evalWeight[summaryVal] !== undefined) aiModifier += evalWeight[summaryVal];
    if (expVal && evalWeight[expVal] !== undefined) aiModifier += evalWeight[expVal];
    if (projVal && evalWeight[projVal] !== undefined) aiModifier += evalWeight[projVal];
    if (gramVal && evalWeight[gramVal] !== undefined) aiModifier += evalWeight[gramVal];
    if (clarVal && evalWeight[clarVal] !== undefined) aiModifier += evalWeight[clarVal];
  }

  // Final score is purely the deterministic engineResult.score (strictly between 0 and 90).
  // The AI is not calculating the score, so we do not add any AI modifier.
  const finalScore = engineResult.score;

  const feedback: AtsFeedback[] = [];

  // Add deterministic issues as feedback (they are already categorized as "Erros", "Atenções", or "Sugestões")
  engineResult.detectedIssues.forEach(issue => {
    feedback.push({
      id: issue.id,
      label: issue.label || "Aviso estrutural",
      type: issue.type,
      category: issue.category,
      message: issue.message || issue.label,
      severity: (issue.severity === "CRITICAL" || issue.severity === "IMPORTANT") ? "high" : "medium",
      source: "system"
    });
  });

  // Filter backend AI feedback to remove things checked deterministically
  const deduplicatedAiFeedback = backendAiFeedback.filter(fb => {
    if (fb.source === "system") return false;

    const msg = (fb.message || "").toLowerCase();
    
    // 1. Filter out missing or general contact info warnings
    if (msg.includes("e-mail") || msg.includes("telefone") || msg.includes("celular") || msg.includes("contato")) {
      if (msg.includes("ausent") || msg.includes("falt") || msg.includes("valid") || msg.includes("complet") || msg.includes("verificar") || msg.includes("format") || msg.includes("correto") || msg.includes("atualiz")) {
        return false;
      }
    }
    
    if (msg.includes("resumo") && (msg.includes("ausent") || msg.includes("falt"))) return false;
    if (msg.includes("experiência") && (msg.includes("ausent") || msg.includes("falt"))) return false;
    if (msg.includes("formação") && (msg.includes("ausent") || msg.includes("falt"))) return false;
    if (msg.includes("habilidade") && (msg.includes("ausent") || msg.includes("falt"))) return false;

    // Filter out generic link or "completude" feedback from AI
    if (msg.includes("completude") || msg.includes("redes sociais") || (msg.includes("link") && (msg.includes("verifique") || msg.includes("inválido") || msg.includes("formato") || msg.includes("formatação") || msg.includes("acessibilidade") || msg.includes("validade") || msg.includes("completo")))) {
      return false;
    }

    // 2. Filter out duplicated warnings about out-of-place courses/certifications/agents like CIEE, Alura, Udemy, Nube, etc.
    const isAboutCourseOrInstitution = 
      msg.includes("ciee") || 
      msg.includes("nube") || 
      msg.includes("alura") || 
      msg.includes("udemy") || 
      msg.includes("coursera") || 
      msg.includes("rocketseat") || 
      msg.includes("dio") || 
      msg.includes("senai") || 
      msg.includes("senac") || 
      msg.includes("sebrae") || 
      msg.includes("bradesco") || 
      msg.includes("ebac") ||
      msg.includes("cursos livres") ||
      msg.includes("curso livre");

    const isAboutEducationOrCertifications = 
      msg.includes("educação") || 
      msg.includes("formação") || 
      msg.includes("acadêmica") || 
      msg.includes("certificações") || 
      msg.includes("cursos") || 
      msg.includes("seção");

    if (isAboutCourseOrInstitution && isAboutEducationOrCertifications) {
      return false;
    }

    // Check if the user has already resolved any out-of-place orgs in their actual education data.
    // If they have no matching out-of-place org in the education section, we should filter out any AI warning about that org.
    for (const org of OUT_OF_PLACE_ORGS) {
      const orgMatchedInMsg = org.patterns.some(p => msg.includes(p));
      if (orgMatchedInMsg) {
        const isStillInEducation = resumeData.education?.some((edu: any) => {
          const inst = (edu.institution || "").toLowerCase();
          const deg = (edu.degree || "").toLowerCase();
          const fld = (edu.field || "").toLowerCase();
          return org.patterns.some(p => matchesWord(inst, p) || matchesWord(deg, p) || matchesWord(fld, p));
        });

        if (!isStillInEducation) {
          const mentionsEducation = 
            msg.includes("educação") || 
            msg.includes("formação") || 
            msg.includes("acadêmica") || 
            msg.includes("certificações") || 
            msg.includes("cursos") || 
            msg.includes("seção") ||
            msg.includes("ensino") ||
            msg.includes("mova") ||
            msg.includes("mover") ||
            msg.includes("instituição") ||
            msg.includes("escola");
          
          if (mentionsEducation) {
            return false;
          }
        }
      }
    }

    if (fb.type === "success") return false;

    return true;
  });

  // Add remaining AI feedback mapped strictly to the three categories
  deduplicatedAiFeedback.forEach(fb => {
    let type: AtsFeedback["type"] = "warning";
    let category: AtsFeedback["category"] = "Atenções";
    let severity: AtsFeedback["severity"] = "medium";

    if (fb.type === "error" || fb.severity === "high") {
      type = "error";
      category = "Erros";
      severity = "high";
    } else if (fb.type === "success" || fb.type === "info" || fb.severity === "low") {
      type = "info";
      category = "Sugestões";
      severity = "low";
    }

    feedback.push({
      id: "ai_" + Math.random().toString(36).substring(7),
      label: fb.label || "Revisão Qualitativa",
      type,
      category,
      message: fb.message,
      severity,
      source: "ai"
    });
  });

  // Generate missingInfoList
  const missingInfoList = engineResult.detectedIssues
    .filter(i => ["sem_email", "sem_telefone", "sem_resumo", "sem_experiencia"].includes(i.id))
    .map(i => i.label);

  return { score: finalScore, feedback, missingInfo: missingInfoList };
}
