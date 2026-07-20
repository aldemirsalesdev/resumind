export interface AtsScoreResult {
  score: number;
  categories: {
    contact: { score: number; max: number; issues: string[] };
    summary: { score: number; max: number; issues: string[] };
    experience: { score: number; max: number; issues: string[] };
    projects: { score: number; max: number; issues: string[] };
    education: { score: number; max: number; issues: string[] };
    skills: { score: number; max: number; issues: string[] };
    courses: { score: number; max: number; issues: string[] };
    keywords: { score: number; max: number; issues: string[] };
    organization: { score: number; max: number; issues: string[] };
  };
  detectedIssues: {
    id: string;
    label: string;
    severity: "CRITICAL" | "IMPORTANT" | "LOW" | "SUGGESTION";
    pointsDeducted: number;
    category: "Erros" | "Atenções" | "Sugestões";
    type: "error" | "warning" | "info" | "success";
    message: string;
  }[];
}

export function normalizeContactInfo(resumeData: any) {
  if (!resumeData) return { name: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" };
  
  const pInfo = resumeData.personalInfo || {};
  const contact = resumeData.contact || {};

  const name = pInfo.fullName || pInfo.name || pInfo.nome || pInfo.nomeCompleto ||
               resumeData.fullName || resumeData.name || resumeData.nome || resumeData.nomeCompleto || "";
               
  const email = pInfo.email || pInfo['e-mail'] || pInfo.mail ||
                resumeData.email || resumeData['e-mail'] || resumeData.mail ||
                contact.email || contact['e-mail'] || contact.mail || "";
                
  const phone = pInfo.phone || pInfo.telefone || pInfo.celular || pInfo.mobile ||
                resumeData.phone || resumeData.telefone || resumeData.celular || resumeData.mobile ||
                contact.phone || contact.telefone || contact.celular || contact.mobile || "";
  
  const location = pInfo.location || pInfo.city || pInfo.address || pInfo.localizacao || pInfo.cidade || pInfo.region || pInfo.state ||
                   resumeData.location || resumeData.city || resumeData.address || resumeData.localizacao || resumeData.cidade || resumeData.region || resumeData.state ||
                   contact.location || contact.city || contact.address || contact.localizacao || contact.cidade || contact.region || contact.state || "";
  
  let linkedin = pInfo.linkedin || pInfo.LinkedIn ||
                 resumeData.linkedin || resumeData.LinkedIn ||
                 contact.linkedin || contact.LinkedIn || "";
                 
  let github = pInfo.github || pInfo.githubUrl || pInfo.GitHub || pInfo.GitHubUrl ||
               resumeData.github || resumeData.githubUrl || resumeData.GitHub || resumeData.GitHubUrl ||
               contact.github || contact.GitHub || "";
                  
  const portfolio = pInfo.website || pInfo.portfolio || pInfo.portfolioUrl || pInfo.site ||
                    resumeData.website || resumeData.portfolio || resumeData.portfolioUrl || resumeData.site ||
                    contact.website || contact.portfolio || contact.site || "";

  // Deep scan raw text of resumeData if not found
  const dataString = JSON.stringify(resumeData || {}).toLowerCase();
  
  if (!github) {
    if (portfolio && portfolio.toLowerCase().includes("github.com")) {
      github = portfolio;
    } else {
      const githubRegex = /(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+/i;
      const match = dataString.match(githubRegex);
      if (match) {
        github = match[0];
      }
    }
  }

  if (!linkedin) {
    if (portfolio && portfolio.toLowerCase().includes("linkedin.com")) {
      linkedin = portfolio;
    } else {
      const linkedinRegex = /(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i;
      const match = dataString.match(linkedinRegex);
      if (match) {
        linkedin = match[0];
      }
    }
  }

  return {
    name: typeof name === "string" ? name.trim() : "",
    email: typeof email === "string" ? email.trim() : "",
    phone: typeof phone === "string" ? phone.trim() : "",
    location: typeof location === "string" ? location.trim() : "",
    linkedin: typeof linkedin === "string" ? linkedin.trim() : "",
    github: typeof github === "string" ? github.trim() : "",
    portfolio: typeof portfolio === "string" ? portfolio.trim() : ""
  };
}

export function normalizeResumeData(rawData: any) {
  if (!rawData || typeof rawData !== "object") {
    rawData = {};
  }
  
  const contact = normalizeContactInfo(rawData);
  
  return {
    personalInfo: {
      fullName: contact.name,
      email: contact.email,
      phone: contact.phone,
      location: contact.location,
      linkedin: contact.linkedin,
      website: contact.portfolio,
      github: contact.github,
      hasPhoto: rawData.personalInfo?.hasPhoto ?? false,
    },
    summary: rawData.summary || "",
    experience: Array.isArray(rawData.experience) ? rawData.experience : [],
    projects: Array.isArray(rawData.projects) ? rawData.projects : [],
    education: Array.isArray(rawData.education) ? rawData.education : [],
    skills: Array.isArray(rawData.skills) ? rawData.skills : [],
    certifications: Array.isArray(rawData.certifications) ? rawData.certifications : (Array.isArray(rawData.courses) ? rawData.courses : []),
    languages: Array.isArray(rawData.languages) ? rawData.languages : [],
  };
}

// Out-of-place course platform checks helper
export const OUT_OF_PLACE_ORGS = [
  { id: "ciee", displayName: "CIEE", patterns: ["ciee", "centro de integração empresa-escola"] },
  { id: "nube", displayName: "NUBE", patterns: ["nube", "núcleo brasileiro de estágios"] },
  { id: "alura", displayName: "Alura", patterns: ["alura"] },
  { id: "udemy", displayName: "Udemy", patterns: ["udemy"] },
  { id: "coursera", displayName: "Coursera", patterns: ["coursera"] },
  { id: "rocketseat", displayName: "Rocketseat", patterns: ["rocketseat"] },
  { id: "dio", displayName: "DIO", patterns: ["dio.me", "digital innovation one", "dio"] },
  { id: "senai", displayName: "SENAI", patterns: ["senai", "serviço nacional de aprendizagem industrial"] },
  { id: "senac", displayName: "SENAC", patterns: ["senac", "serviço nacional de aprendizagem comercial"] },
  { id: "sebrae", displayName: "SEBRAE", patterns: ["sebrae"] },
  { id: "fundacao_bradesco", displayName: "Fundação Bradesco", patterns: ["fundação bradesco", "fundacao bradesco"] }
];

function matchesWord(text: string, pattern: string): boolean {
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

function isCourseInEducation(education: any[]): boolean {
  if (!Array.isArray(education)) return false;
  return education.some((edu: any) => {
    if (!edu || typeof edu !== "object") return false;
    const inst = typeof edu.institution === "string" ? edu.institution.toLowerCase() : "";
    const deg = typeof edu.degree === "string" ? edu.degree.toLowerCase() : "";
    const fld = typeof edu.field === "string" ? edu.field.toLowerCase() : "";
    return OUT_OF_PLACE_ORGS.some(org => 
      org.patterns.some(p => matchesWord(inst, p) || matchesWord(deg, p) || matchesWord(fld, p))
    );
  });
}

export function calculateDeterministicScore(rawData: any): AtsScoreResult {
  const resumeData = normalizeResumeData(rawData);
  const normalizedContact = normalizeContactInfo(rawData);
  const detectedIssues: AtsScoreResult["detectedIssues"] = [];

  // FIXED WEIGHTS (Total: 90 points)
  const maxContact = 15;
  const maxSummary = 10;
  const maxExperience = 25;
  const maxProjects = 10;
  const maxEducation = 10;
  const maxSkills = 10;
  const maxCourses = 5;
  const maxKeywords = 5;
  const maxOrganization = 5;

  let contactScore = maxContact;
  let summaryScore = maxSummary;
  let experienceScore = maxExperience;
  let projectsScore = maxProjects;
  let educationScore = maxEducation;
  let skillsScore = maxSkills;
  let coursesScore = maxCourses;
  let keywordsScore = maxKeywords;
  let organizationScore = maxOrganization;

  const contactIssues: string[] = [];
  const summaryIssues: string[] = [];
  const experienceIssues: string[] = [];
  const projectsIssues: string[] = [];
  const educationIssues: string[] = [];
  const skillsIssues: string[] = [];
  const coursesIssues: string[] = [];
  const keywordsIssues: string[] = [];
  const organizationIssues: string[] = [];

  const currentYear = new Date().getFullYear();

  function parseYear(dateStr: any): number | null {
    if (!dateStr) return null;
    const str = String(dateStr);
    const match = str.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : null;
  }

  // --- 1. Contato (15 pts) ---
  const emailRaw = normalizedContact.email.trim().toLowerCase();
  const hasEmail = emailRaw.length > 0;
  const emailRegex = /^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/;
  const isTypoEmail = emailRaw.endsWith('.con') || emailRaw.endsWith('.comm') || emailRaw.endsWith('.commm') || emailRaw.endsWith('.com.br.br');

  if (!hasEmail) {
    contactScore = Math.max(0, contactScore - 5);
    contactIssues.push("E-mail não informado");
    detectedIssues.push({
      id: "sem_email",
      label: "E-mail não informado",
      severity: "CRITICAL",
      pointsDeducted: 5,
      category: "Erros",
      type: "error",
      message: "Endereço de e-mail não foi fornecido. Adicione um e-mail válido para contatos."
    });
  } else if (!emailRegex.test(emailRaw) || isTypoEmail) {
    contactScore = Math.max(0, contactScore - 3);
    contactIssues.push("E-mail com formato inválido");
    detectedIssues.push({
      id: "email_invalido",
      label: "E-mail com formato inválido",
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: "O formato do e-mail parece inválido ou contém possíveis erros de digitação."
    });
  }

  const phoneClean = normalizedContact.phone.replace(/\D/g, '');
  if (phoneClean.length === 0) {
    contactScore = Math.max(0, contactScore - 5);
    contactIssues.push("Telefone não informado");
    detectedIssues.push({
      id: "sem_telefone",
      label: "Telefone não informado",
      severity: "CRITICAL",
      pointsDeducted: 5,
      category: "Erros",
      type: "error",
      message: "Adicione um número de telefone com DDD para que recrutadores entrem em contato."
    });
  } else if (phoneClean.length < 10) {
    contactScore = Math.max(0, contactScore - 2);
    contactIssues.push("Telefone incompleto");
    detectedIssues.push({
      id: "telefone_incompleto",
      label: "Telefone incompleto",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Atenções",
      type: "warning",
      message: "O número de telefone informado parece incompleto ou está sem o DDD."
    });
  }

  if (normalizedContact.linkedin.length === 0) {
    contactScore = Math.max(0, contactScore - 3);
    contactIssues.push("LinkedIn não informado");
    detectedIssues.push({
      id: "sem_linkedin",
      label: "LinkedIn não informado",
      severity: "IMPORTANT",
      pointsDeducted: 3,
      category: "Atenções",
      type: "warning",
      message: "O link para o perfil do LinkedIn está ausente. É altamente recomendável adicioná-lo."
    });
  } else {
    const linkedinRaw = normalizedContact.linkedin.toLowerCase().trim();
    const isLinkedinPlaceholder = linkedinRaw.includes("seu-nome") || 
                                  linkedinRaw.includes("seu_nome") || 
                                  linkedinRaw.includes("username") || 
                                  linkedinRaw.includes("seu-usuario") || 
                                  linkedinRaw.includes("link-aqui");
    const isLinkedinTooShort = linkedinRaw.length > 0 && linkedinRaw.length < 10;
    if (isLinkedinPlaceholder || isLinkedinTooShort) {
      contactScore = Math.max(0, contactScore - 2);
      contactIssues.push("LinkedIn incompleto ou incorreto");
      detectedIssues.push({
        id: "linkedin_invalido",
        label: "LinkedIn inválido ou incompleto",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Atenções",
        type: "warning",
        message: `O link do seu LinkedIn parece estar incompleto ou incorreto (atualmente está preenchido como "${normalizedContact.linkedin}"). Verifique o preenchimento para garantir que os recrutadores consigam acessar seu perfil.`
      });
    }
  }

  // GitHub validation
  if (normalizedContact.github.length > 0) {
    const githubRaw = normalizedContact.github.toLowerCase().trim();
    const isGithubPlaceholder = githubRaw.includes("seu-usuario") || 
                                githubRaw.includes("seu_usuario") || 
                                githubRaw.includes("username") || 
                                githubRaw.includes("seu-link") || 
                                githubRaw.includes("link-aqui");
    const isGithubTooShort = githubRaw.length < 8;
    if (isGithubPlaceholder || isGithubTooShort) {
      contactScore = Math.max(0, contactScore - 2);
      contactIssues.push("GitHub incompleto ou incorreto");
      detectedIssues.push({
        id: "github_invalido",
        label: "GitHub inválido ou incompleto",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Atenções",
        type: "warning",
        message: `O link do seu GitHub parece estar incompleto ou incorreto (atualmente está preenchido como "${normalizedContact.github}"). Verifique o preenchimento para garantir que os recrutadores consigam acessar seu perfil.`
      });
    }
  } else {
    // If GitHub is missing but this is a tech/IT profile (education or summary includes tech keywords)
    const resumeTextLower = JSON.stringify(resumeData).toLowerCase();
    const isTechProfile = 
      resumeTextLower.includes("informática") || 
      resumeTextLower.includes("informatica") || 
      resumeTextLower.includes("tecnologia") || 
      resumeTextLower.includes("programação") || 
      resumeTextLower.includes("programacao") || 
      resumeTextLower.includes("desenvolvedor") ||
      resumeTextLower.includes("software") ||
      resumeTextLower.includes("computação") ||
      resumeTextLower.includes("computacao");

    if (isTechProfile) {
      contactScore = Math.max(0, contactScore - 3);
      contactIssues.push("GitHub ausente para perfil de TI/Tecnologia");
      detectedIssues.push({
        id: "sem_github_tech",
        label: "GitHub ausente para perfil de TI/Tecnologia",
        severity: "IMPORTANT",
        pointsDeducted: 3,
        category: "Atenções",
        type: "warning",
        message: "Como seu perfil possui formação, interesse ou menções a TI/Tecnologia, a ausência de um link do GitHub reduz sua atratividade técnica. Recomendamos criar um perfil e listar seus projetos de código."
      });
    }
  }

  // Portfolio validation
  if (normalizedContact.portfolio.length > 0) {
    const portfolioRaw = normalizedContact.portfolio.toLowerCase().trim();
    const isPortfolioPlaceholder = portfolioRaw.includes("seu-site") || 
                                   portfolioRaw.includes("seu_site") || 
                                   portfolioRaw.includes("portfolio.com") || 
                                   portfolioRaw.includes("site-aqui") || 
                                   portfolioRaw.includes("exemplo.com");
    const isPortfolioTooShort = portfolioRaw.length < 5;
    if (isPortfolioPlaceholder || isPortfolioTooShort) {
      contactScore = Math.max(0, contactScore - 2);
      contactIssues.push("Portfólio incompleto ou incorreto");
      detectedIssues.push({
        id: "portfolio_invalido",
        label: "Portfólio inválido ou incompleto",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Atenções",
        type: "warning",
        message: `O link do seu Portfólio parece estar incompleto ou incorreto (atualmente está preenchido como "${normalizedContact.portfolio}"). Verifique o preenchimento para garantir que os visitantes consigam abri-lo.`
      });
    }
  }

  if (normalizedContact.location.length < 3) {
    contactScore = Math.max(0, contactScore - 2);
    contactIssues.push("Localização não informada");
    detectedIssues.push({
      id: "sem_localizacao",
      label: "Localização não informada",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Atenções",
      type: "warning",
      message: "Localização (cidade e estado) não foi informada. ATS frequentemente filtram por região."
    });
  }

  // --- 2. Resumo Profissional (10 pts) ---
  const summary = resumeData.summary || "";
  const summaryEvalIssues = evaluateProfessionalSummary(summary, resumeData);
  summaryEvalIssues.forEach(issue => {
    summaryScore = Math.max(0, summaryScore - issue.pointsDeducted);
    if (issue.severity === "CRITICAL" || issue.severity === "IMPORTANT") {
      if (!summaryIssues.includes(issue.label)) summaryIssues.push(issue.label);
    }
    detectedIssues.push(issue);
  });

  // --- 3. Experiência Profissional (25 pts) ---
  const expList = resumeData.experience || [];
  if (expList.length === 0) {
    experienceScore = 0;
    experienceIssues.push("Nenhuma experiência informada");
    detectedIssues.push({
      id: "sem_experiencia",
      label: "Ausência de experiência profissional",
      severity: "CRITICAL",
      pointsDeducted: 25,
      category: "Erros",
      type: "error",
      message: "A seção de experiência profissional está ausente. Adicione suas experiências ou use projetos para perfis iniciantes."
    });
  } else {
    let incompleteDescCount = 0;
    let hasMetrics = false;
    let formalExpCount = 0;
    let informalExpCount = 0;

    expList.forEach((e: any) => {
      if (!e || typeof e !== "object") return;
      const desc = typeof e.description === "string" ? e.description : "";
      if (desc.trim().length < 100) incompleteDescCount++;
      if (/\d+%?/.test(desc)) hasMetrics = true;

      const comp = typeof e.company === "string" ? e.company.toLowerCase() : "";
      const pos = typeof e.position === "string" ? e.position.toLowerCase() : "";
      if (
        comp.includes("informal") || comp.includes("informais") || 
        comp.includes("bico") || comp.includes("autônomo") || comp.includes("autonomo") ||
        comp.includes("escola") || comp.includes("trabalho escolar") || 
        pos.includes("escolar") || pos.includes("apresentação") || pos.includes("apresentacao")
      ) {
        informalExpCount++;
      } else if (comp.trim().length > 0) {
        formalExpCount++;
      }
    });

    if (formalExpCount === 0 && informalExpCount > 0) {
      experienceScore = Math.max(0, experienceScore - 10);
      experienceIssues.push("Apenas experiências informais ou escolares");
      detectedIssues.push({
        id: "experiencias_somente_informais",
        label: "Apenas experiências informais ou escolares listadas",
        severity: "IMPORTANT",
        pointsDeducted: 10,
        category: "Atenções",
        type: "warning",
        message: "Identificamos que seu histórico profissional possui apenas atividades informais, bicos ou trabalhos escolares. Se você busca seu primeiro emprego formal, destaque seus projetos acadêmicos e habilidades para compensar."
      });
    }

    if (incompleteDescCount > 0) {
      experienceScore = Math.max(0, experienceScore - 10);
      experienceIssues.push("Descrições de experiência curtas");
      detectedIssues.push({
        id: "descricoes_curtas",
        label: "Descrições de experiência curtas ou rasas",
        severity: "IMPORTANT",
        pointsDeducted: 10,
        category: "Atenções",
        type: "warning",
        message: "Algumas das descrições de suas experiências profissionais têm menos de 100 caracteres. Detalhe melhor suas responsabilidades."
      });
    }

    if (!hasMetrics) {
      // Metric absence is strictly a suggestion with 0 penalty, as requested
      detectedIssues.push({
        id: "adicionar_metricas",
        label: "Ausência de métricas e resultados",
        severity: "SUGGESTION",
        pointsDeducted: 0,
        category: "Sugestões",
        type: "info",
        message: "Adicione métricas quantitativas e resultados reais em suas conquistas (ex: porcentagens, valores, volumes de atendimento) para chamar mais atenção."
      });
    }
  }

  // --- 4. Projetos (10 pts) ---
  const projList = resumeData.projects || [];
  if (projList.length === 0) {
    projectsScore = Math.max(0, projectsScore - 7);
    projectsIssues.push("Sem projetos práticos cadastrados");
    detectedIssues.push({
      id: "sem_projetos_total",
      label: "Nenhum projeto prático cadastrado",
      severity: "IMPORTANT",
      pointsDeducted: 7,
      category: "Atenções",
      type: "warning",
      message: "Seu currículo não lista nenhum projeto prático ou pessoal. Projetos são cruciais para comprovar suas habilidades na prática, especialmente se você está em início de carreira ou transição."
    });
  } else {
    let missingTech = false;
    let shortDesc = false;
    projList.forEach((p: any) => {
      if (!p || typeof p !== "object") return;
      const tech = typeof p.technologies === "string" ? p.technologies : "";
      const desc = typeof p.description === "string" ? p.description : "";
      if (tech.trim().length === 0) missingTech = true;
      if (desc.trim().length < 50) shortDesc = true;
    });

    if (missingTech) {
      projectsScore = Math.max(0, projectsScore - 2);
      projectsIssues.push("Projetos sem tecnologias especificadas");
      detectedIssues.push({
        id: "projetos_sem_tech",
        label: "Projetos sem tecnologias especificadas",
        severity: "LOW",
        pointsDeducted: 2,
        category: "Atenções",
        type: "warning",
        message: "Especifique quais tecnologias, frameworks ou ferramentas você utilizou em cada um dos projetos listados."
      });
    } else {
      detectedIssues.push({
        id: "tecnologias_projetos",
        label: "Tecnologias incluídas nos projetos",
        severity: "SUGGESTION",
        pointsDeducted: 0,
        category: "Sugestões",
        type: "info",
        message: "É recomendável incluir tecnologias específicas nos títulos ou tags de seus projetos para melhor indexação."
      });
    }

    if (shortDesc) {
      projectsScore = Math.max(0, projectsScore - 2);
      projectsIssues.push("Projetos com descrições curtas");
      detectedIssues.push({
        id: "projetos_curtos",
        label: "Projetos cadastrados com descrições curtas",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Atenções",
        type: "warning",
        message: "Detalhe melhor os objetivos, seu papel e os resultados obtidos em seus projetos pessoais ou práticos."
      });
    }
  }

  // --- 5. Formação Acadêmica (10 pts) ---
  const eduList = resumeData.education || [];
  if (eduList.length === 0) {
    educationScore = 0;
    educationIssues.push("Educação ausente");
    detectedIssues.push({
      id: "sem_formacao",
      label: "Formação acadêmica não informada",
      severity: "CRITICAL",
      pointsDeducted: 10,
      category: "Erros",
      type: "error",
      message: "Seção de formação acadêmica está vazia. Adicione seus cursos de graduação, pós-graduação, técnico ou ensino médio."
    });
  } else {
    let incompleteEdu = false;
    eduList.forEach((edu: any) => {
      if (!edu || typeof edu !== "object") {
        incompleteEdu = true;
        return;
      }
      const inst = typeof edu.institution === "string" ? edu.institution : "";
      const deg = typeof edu.degree === "string" ? edu.degree : "";
      if (!inst || !deg) incompleteEdu = true;
    });
    if (incompleteEdu) {
      educationScore = Math.max(0, educationScore - 4);
      educationIssues.push("Formação incompleta");
      detectedIssues.push({
        id: "formacao_incompleta",
        label: "Formação acadêmica incompleta",
        severity: "IMPORTANT",
        pointsDeducted: 4,
        category: "Atenções",
        type: "warning",
        message: "Algumas das formações acadêmicas cadastradas estão sem o nome da instituição ou grau acadêmico."
      });
    }
  }

  // --- 6. Habilidades (10 pts) ---
  const skillsList = resumeData.skills || [];
  let skillsCount = 0;
  skillsList.forEach((s: any) => {
    if (typeof s !== "string") return;
    const cleanS = s.trim();
    if (!cleanS) return;
    let textToSplit = cleanS;
    if (cleanS.includes(":")) {
      const parts = cleanS.split(":");
      textToSplit = parts.slice(1).join(":");
    }
    const items = textToSplit.split(/[,;|]+/).map(item => item.trim()).filter(item => item.length > 0);
    skillsCount += items.length > 0 ? items.length : 1;
  });

  if (skillsCount === 0) {
    skillsScore = 0;
    skillsIssues.push("Habilidades profissionais ausentes");
    detectedIssues.push({
      id: "sem_habilidades",
      label: "Habilidades profissionais ausentes",
      severity: "CRITICAL",
      pointsDeducted: 10,
      category: "Erros",
      type: "error",
      message: "Insira uma lista de competências técnicas (Hard Skills) e comportamentais (Soft Skills) para otimização ATS."
    });
  } else if (skillsCount < 5) {
    skillsScore = Math.max(0, skillsScore - 5);
    skillsIssues.push("Poucas habilidades cadastradas");
    detectedIssues.push({
      id: "poucas_habilidades",
      label: "Poucas habilidades especificadas",
      severity: "IMPORTANT",
      pointsDeducted: 5,
      category: "Atenções",
      type: "warning",
      message: `Seu currículo possui poucas habilidades listadas (${skillsCount}). Recomenda-se preencher pelo menos 5 habilidades relevantes.`
    });
  }

  // --- 7. Cursos / Certificações (5 pts) ---
  const certList = resumeData.certifications || [];
  if (certList.length === 0) {
    coursesScore = Math.max(0, coursesScore - 2);
    coursesIssues.push("Nenhum curso cadastrado");
    detectedIssues.push({
      id: "sem_cursos",
      label: "Nenhum curso complementar cadastrado",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Atenções",
      type: "warning",
      message: "Considere adicionar cursos complementares, certificações ou bootcamps para enriquecer seu currículo."
    });
  }

  // --- 8. Palavras-Chave e Otimização ATS (5 pts) ---
  const totalSkillsText = skillsList.map((s: any) => typeof s === "string" ? s : "").join(" ");
  const individualKeywords = totalSkillsText.split(/[\s,;.://]+/).filter(w => w.trim().length > 2);
  const keywordCount = individualKeywords.length;

  if (keywordCount < 5) {
    keywordsScore = Math.max(0, keywordsScore - 3);
    keywordsIssues.push("Poucas palavras-chave técnicas");
    detectedIssues.push({
      id: "poucas_palavras_chave",
      label: "Poucas palavras-chave / compatibilidade ATS",
      severity: "IMPORTANT",
      pointsDeducted: 3,
      category: "Atenções",
      type: "warning",
      message: "O currículo possui poucas palavras-chave de tecnologias ou competências. Enriqueça seu perfil com termos técnicos."
    });
  }

  // --- 9. Organização e Consistência de Datas (5 pts) ---
  let dateConflict = false;
  
  // Experience dates check
  expList.forEach((e: any) => {
    if (!e || typeof e !== "object") return;
    const startY = parseYear(e.startDate);
    const endY = parseYear(e.endDate);
    
    // Future date check (> currentYear) unless marked current
    const endStr = typeof e.endDate === "string" ? e.endDate.toLowerCase() : "";
    const isCurrent = endStr.includes("atual") || 
                      endStr.includes("presente") || 
                      endStr.includes("now") ||
                      endStr.includes("present");

    if (startY && startY > currentYear) dateConflict = true;
    if (endY && endY > currentYear && !isCurrent) dateConflict = true;
    if (startY && endY && endY < startY && !isCurrent) dateConflict = true;
  });

  // Education dates check
  eduList.forEach((edu: any) => {
    if (!edu || typeof edu !== "object") return;
    const startY = parseYear(edu.startDate);
    const endY = parseYear(edu.graduationDate || edu.endDate);
    
    if (startY && startY > currentYear + 6) dateConflict = true; // Future study is fine but within reason
    if (startY && endY && endY < startY) dateConflict = true;
  });

  if (dateConflict) {
    organizationScore = Math.max(0, organizationScore - 3);
    organizationIssues.push("Datas inválidas ou inconsistentes");
    detectedIssues.push({
      id: "datas_invalidas",
      label: "Datas inválidas ou inconsistentes",
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: "Identificamos inconsistências nas datas de início e fim das experiências profissionais ou acadêmicas."
    });
  }

  if (!resumeData.personalInfo?.fullName) {
    organizationScore = Math.max(0, organizationScore - 2);
    organizationIssues.push("Nome não identificado");
    detectedIssues.push({
      id: "sem_nome",
      label: "Nome do candidato não identificado",
      severity: "CRITICAL",
      pointsDeducted: 2,
      category: "Erros",
      type: "error",
      message: "O nome completo do candidato não foi encontrado no cabeçalho ou dados pessoais."
    });
  }

  if (isCourseInEducation(eduList)) {
    organizationScore = Math.max(0, organizationScore - 3);
    organizationIssues.push("Instituições de cursos na Formação Formal");
    detectedIssues.push({
      id: "cursos_misturados_educacao",
      label: "Cursos misturados com Formação Acadêmica",
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: "Alguns cursos livres (Alura, Udemy, CIEE) foram detectados na seção Educação. Mova-os para Cursos e Certificações."
    });
  }

  // Compile standard Sugestões that don't reduce the score
  detectedIssues.push({
    id: "detalhar_projeto",
    label: "Melhor detalhamento de projetos",
    severity: "SUGGESTION",
    pointsDeducted: 0,
    category: "Sugestões",
    type: "info",
    message: "Detalhe melhor as responsabilidades, metas atingidas e seu papel em cada um de seus projetos."
  });

  detectedIssues.push({
    id: "fortalecer_resultados",
    label: "Fortalecer resultados",
    severity: "SUGGESTION",
    pointsDeducted: 0,
    category: "Sugestões",
    type: "info",
    message: "Fortaleça suas frases usando verbos de ação dinâmicos e focados em entrega de valor profissional."
  });

  detectedIssues.push({
    id: "impacto_descricoes",
    label: "Método STAR/CAR nas descrições",
    severity: "SUGGESTION",
    pointsDeducted: 0,
    category: "Sugestões",
    type: "info",
    message: "Procure organizar a descrição das atividades no formato de Contexto, Ação e Resultado para melhorar a legibilidade de sistemas ATS."
  });

  // SUM OF ENGINE SCORE (strictly between 0 and 90) before advanced checks
  
  // --- Advanced Quality & Spelling / Coherence Check ---
  const qualityIssues = checkResumeDataQuality(resumeData);
  qualityIssues.forEach(issue => {
    const points = issue.pointsDeducted;
    const msg = issue.message;

    if (msg.includes("Nome") || issue.id.includes("nome_")) {
      contactScore = Math.max(0, contactScore - points);
      if (!contactIssues.includes(issue.label)) contactIssues.push(issue.label);
    } else if (msg.includes("Resumo") || issue.id.includes("summary_")) {
      summaryScore = Math.max(0, summaryScore - points);
      if (!summaryIssues.includes(issue.label)) summaryIssues.push(issue.label);
    } else if (msg.includes("Experiência") || issue.id.includes("empresa_") || issue.id.includes("exp_")) {
      experienceScore = Math.max(0, experienceScore - points);
      if (!experienceIssues.includes(issue.label)) experienceIssues.push(issue.label);
    } else if (msg.includes("Projeto") || issue.id.includes("proj_")) {
      projectsScore = Math.max(0, projectsScore - points);
      if (!projectsIssues.includes(issue.label)) projectsIssues.push(issue.label);
    } else if (msg.includes("Formação") || issue.id.includes("instituicao_") || issue.id.includes("edu_")) {
      educationScore = Math.max(0, educationScore - points);
      if (!educationIssues.includes(issue.label)) educationIssues.push(issue.label);
    } else if (msg.includes("Habilidade") || issue.id.includes("skill_")) {
      skillsScore = Math.max(0, skillsScore - points);
      if (!skillsIssues.includes(issue.label)) skillsIssues.push(issue.label);
    } else if (msg.includes("Certificação") || issue.id.includes("cert_")) {
      coursesScore = Math.max(0, coursesScore - points);
      if (!coursesIssues.includes(issue.label)) coursesIssues.push(issue.label);
    } else {
      organizationScore = Math.max(0, organizationScore - points);
      if (!organizationIssues.includes(issue.label)) organizationIssues.push(issue.label);
    }

    detectedIssues.push(issue);
  });

  const totalEngineScore = contactScore + summaryScore + experienceScore + projectsScore + educationScore + skillsScore + coursesScore + keywordsScore + organizationScore;
  const finalEngineScore = Math.max(0, Math.min(Math.round(totalEngineScore), 90));

  return {
    score: finalEngineScore,
    categories: {
      contact: { score: contactScore, max: maxContact, issues: contactIssues },
      summary: { score: summaryScore, max: maxSummary, issues: summaryIssues },
      experience: { score: experienceScore, max: maxExperience, issues: experienceIssues },
      projects: { score: projectsScore, max: maxProjects, issues: projectsIssues },
      education: { score: educationScore, max: maxEducation, issues: educationIssues },
      skills: { score: skillsScore, max: maxSkills, issues: skillsIssues },
      courses: { score: coursesScore, max: maxCourses, issues: coursesIssues },
      keywords: { score: keywordsScore, max: maxKeywords, issues: keywordsIssues },
      organization: { score: organizationScore, max: maxOrganization, issues: organizationIssues }
    },
    detectedIssues
  };
}

// Advanced text and spelling validation dictionary & scanning functions
const PT_TYPOS = [
  { wrong: "atraz", correct: "atrás", explanation: "O correto é 'atrás' (com 's' e acento), indicando posição ou tempo decorrido." },
  { wrong: "atrazado", correct: "atrasado", explanation: "O correto é 'atrasado' (com 's')." },
  { wrong: "atrazar", correct: "atrasar", explanation: "O correto é 'atrasar' (com 's')." },
  { wrong: "paralizar", correct: "paralisar", explanation: "O correto é 'paralisar' (com 's')." },
  { wrong: "paralizado", correct: "paralisado", explanation: "O correto é 'paralisado' (com 's')." },
  { wrong: "paralizacao", correct: "paralisação", explanation: "O correto é 'paralisação' (com 's')." },
  { wrong: "ancioso", correct: "ansioso", explanation: "O correto é 'ansioso' (com 's')." },
  { wrong: "anciosa", correct: "ansiosa", explanation: "O correto é 'ansiosa' (com 's')." },
  { wrong: "compania", correct: "companhia", explanation: "O correto é 'companhia' (com 'nh')." },
  { wrong: "excessão", correct: "exceção", explanation: "O correto é 'exceção' (com 'c' e 'ç')." },
  { wrong: "excessoes", correct: "exceções", explanation: "O correto é 'exceções'." },
  { wrong: "previlégio", correct: "privilégio", explanation: "O correto é 'privilégio' (com 'i')." },
  { wrong: "previlegio", correct: "privilégio", explanation: "O correto é 'privilégio' (com 'i')." },
  { wrong: "concerteza", correct: "com certeza", explanation: "A expressão correta é escrita separada: 'com certeza'." },
  { wrong: "seje", correct: "seja", explanation: "A forma correta do verbo ser é 'seja'." },
  { wrong: "esteje", correct: "esteja", explanation: "A forma correta do verbo estar é 'esteja'." },
  { wrong: "menas", correct: "menos", explanation: "A palavra 'menas' não existe. Use sempre 'menos', mesmo para palavras femininas." },
  { wrong: "pobrema", correct: "problema", explanation: "O correto é 'problema'." },
  { wrong: "asterístico", correct: "asterisco", explanation: "O correto é 'asterisco'." },
  { wrong: "beneficiente", correct: "beneficente", explanation: "O correto é 'beneficente'." },
  { wrong: "cardaço", correct: "cadarço", explanation: "O correto é 'cadarço'." },
  { wrong: "frustado", correct: "frustrado", explanation: "O correto é 'frustrado' (com 'r')." },
  { wrong: "frustada", correct: "frustrada", explanation: "O correto é 'frustrada' (com 'r')." },
  { wrong: "reinvindicar", correct: "reivindicar", explanation: "O correto é 'reivindicar' (sem o primeiro 'n')." },
  { wrong: "reinvindicação", correct: "reivindicação", explanation: "O correto é 'reivindicação' (sem o primeiro 'n')." },
  { wrong: "mendingo", correct: "mendigo", explanation: "O correto é 'mendigo'." },
  { wrong: "desenvolvidor", correct: "desenvolvedor", explanation: "O correto é 'desenvolvedor'." },
  { wrong: "desenvolvidora", correct: "desenvolvedora", explanation: "O correto é 'desenvolvedora'." },
  { wrong: "geremte", correct: "gerente", explanation: "O correto é 'gerente' (com 'n')." },
  { wrong: "atendimeto", correct: "atendimento", explanation: "O correto é 'atendimento' (com 'n')." },
  { wrong: "comunicacao", correct: "comunicação", explanation: "O correto é 'comunicação' (com til e cedilha)." },
  { wrong: "organizacao", correct: "organização", explanation: "O correto é 'organização' (com til e cedilha)." },
  { wrong: "atencao", correct: "atenção", explanation: "O correto é 'atenção' (com til e cedilha)." },
  { wrong: "nao", correct: "não", explanation: "O correto é 'não' (com til)." },
  { wrong: "saude", correct: "saúde", explanation: "O correto é 'saúde' (com acento agudo)." },
  { wrong: "tecnico", correct: "técnico", explanation: "O correto é 'técnico' (com acento agudo)." },
  { wrong: "tecnica", correct: "técnica", explanation: "O correto é 'técnica' (com acento agudo)." },
  { wrong: "experiencia", correct: "experiência", explanation: "O correto é 'experiência' (com acento circunflexo)." },
  { wrong: "formacao", correct: "formação", explanation: "O correto é 'formação' (com til e cedilha)." },
  { wrong: "graduacao", correct: "graduação", explanation: "O correto é 'graduação' (com til e cedilha)." },
];

function checkSpellingErrorsInText(text: string, fieldName: string) {
  const textLower = text.toLowerCase();
  const found: any[] = [];

  PT_TYPOS.forEach((typo, idx) => {
    const escaped = typo.wrong.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(textLower)) {
      found.push({
        id: `spelling_${fieldName}_${typo.wrong}_${idx}`,
        label: `Erro ortográfico: "${typo.wrong}"`,
        severity: "CRITICAL",
        pointsDeducted: 2,
        category: "Erros",
        type: "error",
        message: `Identificamos um erro de português no campo de ${fieldName}. Foi encontrado o termo "${typo.wrong}". ${typo.explanation} Correção sugerida: "${typo.correct}".`
      });
    }
  });

  const aVsHaRegex = /\b(a|à)\s+(muito|alguns|\d+)\s+(ano|mes|mês|dia|semana|hora)s?\b/i;
  const match = text.match(aVsHaRegex);
  if (match) {
    found.push({
      id: `grammar_a_ha_${fieldName}`,
      label: `Erro gramatical: "${match[0]}"`,
      severity: "CRITICAL",
      pointsDeducted: 2,
      category: "Erros",
      type: "error",
      message: `No campo de ${fieldName}, o trecho "${match[0]}" está incorreto. Para indicar tempo decorrido no passado, deve-se usar o verbo haver: "há ${match[2]} ${match[3]}(s)".`
    });
  }

  const aTempoRegex = /\b(a|à)\s+tempo\b/i;
  if (aTempoRegex.test(textLower) && textLower.includes("tempo") && (textLower.includes("trabalho") || textLower.includes("estudo") || textLower.includes("moro") || textLower.includes("área") || textLower.includes("area"))) {
    found.push({
      id: `grammar_a_tempo_${fieldName}`,
      label: `Erro gramatical: "a/à tempo"`,
      severity: "CRITICAL",
      pointsDeducted: 2,
      category: "Erros",
      type: "error",
      message: `No campo de ${fieldName}, identificamos o uso de "a tempo" ou "à tempo" em contexto de tempo decorrido. O correto é "há tempo" ou "há muito tempo" (do verbo haver).`
    });
  }

  return found;
}

function checkNonsenseInText(text: string, fieldName: string) {
  const textLower = text.toLowerCase();
  const found: any[] = [];

  const placeholders = [
    "seu-nome", "seu_nome", "nome-completo", "nome_completo",
    "seu-email", "seu_email", "email-aqui", "email_aqui",
    "seu-telefone", "seu_telefone", "telefone-aqui", "telefone_aqui",
    "seu-link", "seu_link", "link-aqui", "link_aqui",
    "seu-site", "seu_site", "site-aqui", "site_aqui",
    "seu-usuario", "seu_usuario", "username", "usuario-aqui",
    "exemplo.com", "teste.com", "xxxx", "xxxxx", "xxxxxx",
    "asdf", "qwerty", "lorem ipsum", "dolor sit amet"
  ];

  placeholders.forEach((pl, idx) => {
    if (textLower.includes(pl)) {
      found.push({
        id: `nonsense_placeholder_${fieldName}_${idx}`,
        label: `Texto de marcador temporário (placeholder)`,
        severity: "CRITICAL",
        pointsDeducted: 4,
        category: "Erros",
        type: "error",
        message: `O campo de ${fieldName} contém o texto marcador "${pl}". Substitua-o por suas informações reais.`
      });
    }
  });

  const doubleWordRegex = /\b(o|a|que|para|de|em|com|um|uma|os|as|do|da|dos|das|no|na|nos|nas)\s+\1\b/i;
  const doubleMatch = text.match(doubleWordRegex);
  if (doubleMatch) {
    found.push({
      id: `nonsense_double_word_${fieldName}`,
      label: `Palavra repetida consecutiva: "${doubleMatch[0]}"`,
      severity: "CRITICAL",
      pointsDeducted: 2,
      category: "Erros",
      type: "error",
      message: `No campo de ${fieldName}, identificamos uma palavra duplicada consecutivamente: "${doubleMatch[0]}". Corrija para evitar problemas de digitação.`
    });
  }

  const repeatLetterRegex = /([a-z])\1{3,}/i;
  const repeatMatch = text.match(repeatLetterRegex);
  if (repeatMatch && !textLower.includes("https://") && !textLower.includes("http://")) {
    found.push({
      id: `nonsense_repeat_letter_${fieldName}`,
      label: `Repetição excessiva de caracteres`,
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: `No campo de ${fieldName}, identificamos uma repetição de caracteres suspeita: "${repeatMatch[0]}". Verifique se há algum erro de digitação.`
    });
  }

  const whitelist = new Set([
    "html", "css", "sql", "gcp", "aws", "pdf", "svg", "xml", "json", "docx", "http", "https", "github", "linkedin",
    "postgresql", "mysql", "mongodb", "graphql", "nestjs", "nodejs", "react", "redux", "scrum", "agile", "devops",
    "docker", "kubernetes", "typescript", "javascript", "python", "php", "java", "swift", "kotlin", "laravel", "django",
    "spring", "aspnet", "csharp", "cobol", "fortran", "delphi", "pascal", "nginx", "apache", "linux", "ubuntu", "debian",
    "centos", "fedora", "windows", "macos", "android", "ios", "vscode", "excel", "word", "powerpoint", "outlook", "office",
    "powerbi", "tableau", "jira", "trello", "slack", "zoom", "teams", "canva", "figma", "sketch", "photoshop", "illustrator",
    "indesign", "premiere", "aftereffects", "lightroom", "autocad", "revit", "sketchup", "solidworks", "blender", "unity",
    "unreal", "godot", "tensorflow", "pytorch", "keras", "opencv", "scikit-learn", "numpy", "pandas", "matplotlib", "seaborn",
    "scipy", "statsmodels", "nltk", "spacy", "gensim", "beautifulsoup", "selenium", "scrapy", "puppeteer", "playwright",
    "cypress", "jest", "mocha", "chai", "jasmine", "karma", "protractor", "eslint", "prettier", "webpack", "babel", "vite",
    "gulp", "grunt", "npm", "yarn", "pnpm", "composer", "pip", "maven", "gradle", "git", "subversion", "mercurial", "bitbucket",
    "gitlab", "heroku", "netlify", "vercel", "digitalocean", "cloudflare", "fastly", "datadog", "newrelic", "sentry", "logrocket",
    "postman", "swagger", "insomnia", "soapui", "fiddler", "wireshark", "nmap", "metasploit", "burpsuite", "owasp", "jenkins",
    "circleci", "travisci", "githubactions", "gitlabci", "bitbucketpipelines", "azuredevops", "awsdevops", "googlecloudbuild",
    "terragrunt", "pulumi", "ansible", "chef", "puppet", "saltstack", "vagrant", "virtualbox", "vmware", "hyperv", "qemu",
    "proxmox", "openshift", "rancher", "helm", "istio", "linkerd", "consul", "vault", "nomad", "waypoint", "boundary",
    "html5", "css3", "es6", "webgl", "webrtc", "websocket", "oauth", "jwt", "saml", "ldap", "active-directory", "okta",
    "auth0", "keycloak", "firebase", "supabase", "back4app", "parse", "nh", "sh", "ch", "lh", "bwc", "bpx", "cnpj", "cpf",
    "rg", "cep", "ddd", "ddi", "ctps", "cnh", "clt", "mei", "pj", "ltda", "s/a", "sa", "eireli", "epp", "me", "ong", "oscip",
    "osc", "ciee", "nube", "iel", "senai", "senac", "sebrae", "sesi", "sesc", "sest", "senat", "sindicato", "banco", "caixa",
    "bradesco", "itaú", "itau", "santander", "safra", "banrisul", "bmg", "pan", "inter", "nubank", "neon", "original", "c6",
    "bmg", "votorantim", "bndes", "fies", "prouni", "enem", "sisu", "fatec", "etec", "senai", "senac", "usp", "unicamp", "unesp",
    "ufrj", "ufmg", "ufrgs", "ufsc", "ufpr", "unb", "ufpe", "ufba", "ufc", "ufg", "ufms", "ufmt", "ufpa", "ufpb", "ufpe",
    "ufpi", "ufrn", "ufro", "ufrr", "ufse", "uft", "utfpr", "puc", "fgv", "insper", "mackenzie", "faap", "espm", "unip",
    "unisa", "uniceub", "unilasalle", "unisinos", "univali", "pucsp", "pucrio", "pucpr", "pucrs", "pucminas", "pucgo", "pucamp"
  ]);

  const words = text.split(/[\s,;.://"'()\-–—_]+/);
  for (const word of words) {
    const cleanWord = word.trim().toLowerCase();
    if (cleanWord.length > 5) {
      const hasVowels = /[aeiouáéíóúâêôãõàèìòù]/i.test(cleanWord);
      if (!hasVowels && /^[a-z]+$/i.test(cleanWord) && !whitelist.has(cleanWord)) {
        found.push({
          id: `nonsense_no_vowels_${fieldName}_${cleanWord}`,
          label: `Palavra sem vogais (possível erro de digitação)`,
          severity: "CRITICAL",
          pointsDeducted: 3,
          category: "Erros",
          type: "error",
          message: `No campo de ${fieldName}, encontramos a palavra "${word}" que parece não conter nenhuma vogal. Verifique se é uma palavra digitada incorretamente ou sem sentido.`
        });
        break;
      }

      const consonantCluster = /[^aeiouáéíóúâêôãõàèìòù]{5,}/i;
      if (consonantCluster.test(cleanWord) && !whitelist.has(cleanWord) && !cleanWord.includes("postgresql") && !cleanWord.includes("typescript") && !cleanWord.includes("javascript")) {
        found.push({
          id: `nonsense_consonants_${fieldName}_${cleanWord}`,
          label: `Sequência de consoantes inválida`,
          severity: "CRITICAL",
          pointsDeducted: 3,
          category: "Erros",
          type: "error",
          message: `No campo de ${fieldName}, a palavra "${word}" possui uma sequência incomum de consoantes. Verifique se há erros de digitação.`
        });
        break;
      }
    }
  }

  return found;
}

export function checkResumeDataQuality(resumeData: any) {
  const issues: any[] = [];

  const pInfo = resumeData.personalInfo || {};
  const fullName = pInfo.fullName || pInfo.name || "";
  const location = pInfo.location || "";

  if (fullName) {
    issues.push(...checkSpellingErrorsInText(fullName, "Nome"));
    issues.push(...checkNonsenseInText(fullName, "Nome"));

    const words = fullName.trim().split(/\s+/).filter((w: string) => w.length >= 3 && !["de", "da", "do", "das", "dos", "e"].includes(w.toLowerCase()));
    const hasLowercaseWord = words.some((w: string) => w[0] && w[0] === w[0].toLowerCase() && /[a-z]/i.test(w[0]));
    if (hasLowercaseWord) {
      issues.push({
        id: "nome_com_minuscula",
        label: "Nome próprio iniciado com letra minúscula",
        severity: "CRITICAL",
        pointsDeducted: 3,
        category: "Erros",
        type: "error",
        message: `O seu nome próprio "${fullName}" possui palavras iniciadas com letras minúsculas. Nomes próprios devem sempre iniciar com letras maiúsculas.`
      });
    }
  }

  if (location) {
    issues.push(...checkSpellingErrorsInText(location, "Localização"));
    issues.push(...checkNonsenseInText(location, "Localização"));
  }

  const summary = resumeData.summary || "";
  if (summary) {
    issues.push(...checkSpellingErrorsInText(summary, "Resumo Profissional"));
    issues.push(...checkNonsenseInText(summary, "Resumo Profissional"));
  }

  const experiences = resumeData.experience || [];
  experiences.forEach((exp: any, idx: number) => {
    const company = exp.company || "";
    const position = exp.position || "";
    const description = exp.description || "";

    if (company) {
      issues.push(...checkSpellingErrorsInText(company, `Experiência (${idx + 1}): Empresa`));
      issues.push(...checkNonsenseInText(company, `Experiência (${idx + 1}): Empresa`));
      
      const isGeneral = company.toLowerCase().includes("informal") || company.toLowerCase().includes("autônomo") || company.toLowerCase().includes("freelance") || company.toLowerCase().includes("bico");
      if (company === company.toLowerCase() && company.length > 3 && !isGeneral) {
        issues.push({
          id: `empresa_minuscula_${idx}`,
          label: "Nome da empresa em letras minúsculas",
          severity: "IMPORTANT",
          pointsDeducted: 2,
          category: "Atenções",
          type: "warning",
          message: `O nome da empresa "${company}" está totalmente em letras minúsculas na experiência ${idx + 1}. Capitalize os nomes de empresas para maior profissionalismo.`
        });
      }
    }

    if (position) {
      issues.push(...checkSpellingErrorsInText(position, `Experiência (${idx + 1}): Cargo`));
      issues.push(...checkNonsenseInText(position, `Experiência (${idx + 1}): Cargo`));
    }

    if (description) {
      issues.push(...checkSpellingErrorsInText(description, `Experiência (${idx + 1}): Descrição`));
      issues.push(...checkNonsenseInText(description, `Experiência (${idx + 1}): Descrição`));

      if (description.toLowerCase().includes("coisas") || (description.toLowerCase().includes("etc") && (description.toLowerCase().match(/\betc\b/g) || []).length > 1)) {
        issues.push({
          id: `exp_desc_weak_words_${idx}`,
          label: "Termos vagos ou informais na descrição",
          severity: "IMPORTANT",
          pointsDeducted: 2,
          category: "Atenções",
          type: "warning",
          message: `Identificamos termos genéricos (como 'coisas', 'etc') na descrição da experiência ${idx + 1}. Substitua-os por descrições detalhadas e profissionais das suas tarefas.`
        });
      }
    }
  });

  const projects = resumeData.projects || [];
  projects.forEach((proj: any, idx: number) => {
    const name = proj.name || "";
    const description = proj.description || "";
    const technologies = proj.technologies || "";

    if (name) {
      issues.push(...checkSpellingErrorsInText(name, `Projeto (${idx + 1}): Nome`));
      issues.push(...checkNonsenseInText(name, `Projeto (${idx + 1}): Nome`));
    }
    if (description) {
      issues.push(...checkSpellingErrorsInText(description, `Projeto (${idx + 1}): Descrição`));
      issues.push(...checkNonsenseInText(description, `Projeto (${idx + 1}): Descrição`));
    }
    if (technologies) {
      issues.push(...checkSpellingErrorsInText(technologies, `Projeto (${idx + 1}): Tecnologias`));
      issues.push(...checkNonsenseInText(technologies, `Projeto (${idx + 1}): Tecnologias`));
    }
  });

  const education = resumeData.education || [];
  education.forEach((edu: any, idx: number) => {
    const institution = edu.institution || "";
    const degree = edu.degree || "";
    const field = edu.field || "";

    if (institution) {
      issues.push(...checkSpellingErrorsInText(institution, `Formação (${idx + 1}): Instituição`));
      issues.push(...checkNonsenseInText(institution, `Formação (${idx + 1}): Instituição`));

      if (institution === institution.toLowerCase() && institution.length > 3) {
        issues.push({
          id: `instituicao_minuscula_${idx}`,
          label: "Nome da instituição em letras minúsculas",
          severity: "IMPORTANT",
          pointsDeducted: 2,
          category: "Atenções",
          type: "warning",
          message: `O nome da instituição "${institution}" está totalmente em letras minúsculas na formação ${idx + 1}. Recomenda-se capitalizá-lo.`
        });
      }
    }
    if (degree) {
      issues.push(...checkSpellingErrorsInText(degree, `Formação (${idx + 1}): Grau`));
      issues.push(...checkNonsenseInText(degree, `Formação (${idx + 1}): Grau`));
    }
    if (field) {
      issues.push(...checkSpellingErrorsInText(field, `Formação (${idx + 1}): Área`));
      issues.push(...checkNonsenseInText(field, `Formação (${idx + 1}): Área`));
    }
  });

  const skills = resumeData.skills || [];
  skills.forEach((skill: string, idx: number) => {
    if (typeof skill === "string" && skill) {
      issues.push(...checkSpellingErrorsInText(skill, `Habilidade (${idx + 1})`));
      issues.push(...checkNonsenseInText(skill, `Habilidade (${idx + 1})`));
    }
  });

  const certifications = resumeData.certifications || [];
  certifications.forEach((cert: any, idx: number) => {
    const name = typeof cert === "string" ? cert : cert.name || cert.title || "";
    const institution = typeof cert === "object" ? cert.institution || "" : "";

    if (name) {
      issues.push(...checkSpellingErrorsInText(name, `Certificação (${idx + 1}): Nome`));
      issues.push(...checkNonsenseInText(name, `Certificação (${idx + 1}): Nome`));
    }
    if (institution) {
      issues.push(...checkSpellingErrorsInText(institution, `Certificação (${idx + 1}): Instituição`));
      issues.push(...checkNonsenseInText(institution, `Certificação (${idx + 1}): Instituição`));
    }
  });

  const seenMessages = new Set<string>();
  return issues.filter(issue => {
    if (seenMessages.has(issue.message)) {
      return false;
    }
    seenMessages.add(issue.message);
    return true;
  });
}

export function evaluateProfessionalSummary(summary: string, resumeData: any) {
  const issues: any[] = [];
  const summaryLower = summary.trim().toLowerCase();
  
  if (!summary || summary.trim().length === 0) {
    return [{
      id: "summary_empty",
      label: "Resumo profissional ausente",
      severity: "CRITICAL" as const,
      pointsDeducted: 10,
      category: "Erros" as const,
      type: "error" as const,
      message: "Seu resumo profissional está ausente. Esta seção é a primeira coisa que os recrutadores e sistemas ATS analisam para entender seu perfil. Adicione uma breve apresentação de sua carreira."
    }];
  }

  // 1. Muito curto
  if (summary.trim().length < 100) {
    issues.push({
      id: "summary_too_short",
      label: "Resumo profissional muito curto",
      severity: "CRITICAL" as const,
      pointsDeducted: 5,
      category: "Erros" as const,
      type: "error" as const,
      message: "Seu resumo profissional está muito curto e pode não transmitir informações suficientes ao recrutador. Utilize esse espaço para apresentar rapidamente quem você é e quais são seus principais pontos fortes."
    });
    return issues;
  }
  
  // 2. Muito longo
  if (summary.trim().length > 600) {
    issues.push({
      id: "summary_too_long",
      label: "Resumo profissional muito extenso",
      severity: "IMPORTANT" as const,
      pointsDeducted: 2,
      category: "Atenções" as const,
      type: "warning" as const,
      message: "O resumo profissional está extenso e pode dificultar a leitura. Procure destacar apenas as informações mais relevantes em até quatro ou cinco linhas."
    });
  }

  // 3. Muito informal
  const informalTerms = ["bico", "bicos", "trabalho informal", "trabalhos informais", "trampo", "trampos", "ganhar uma grana", "quebra-galho", "correria", "viração"];
  const hasInformal = informalTerms.some(term => {
    const regex = new RegExp(`\\b${term}s?\\b`, 'i');
    return regex.test(summaryLower);
  });
  if (hasInformal) {
    issues.push({
      id: "summary_informal",
      label: "Linguagem informal no resumo",
      severity: "CRITICAL" as const,
      pointsDeducted: 3,
      category: "Erros" as const,
      type: "error" as const,
      message: "Seu resumo profissional utiliza uma linguagem informal. Prefira uma escrita objetiva e profissional, transmitindo confiança e clareza."
    });
  }

  // 4. Falta experiência
  const declaresNoExp = /\b(não\s+tenho\s+experiência|sem\s+experiência|ainda\s+não\s+trabalhei|não\s+possuo\s+experiência|falta\s+de\s+experiência|ainda\s+não\s+tenho\s+experiência|primeiro\s+emprego)\b/i.test(summaryLower);
  const experiencesList = resumeData.experience || [];
  const hasNoExpInHistory = experiencesList.length === 0;
  if (declaresNoExp || hasNoExpInHistory) {
    issues.push({
      id: "summary_no_experience",
      label: "Falta de experiência profissional formal",
      severity: "IMPORTANT" as const,
      pointsDeducted: 3,
      category: "Atenções" as const,
      type: "warning" as const,
      message: "Caso você ainda não possua experiência profissional, destaque sua formação, projetos, certificações e conhecimentos técnicos relevantes para a vaga."
    });
  }

  // 5. Sem objetivo
  const objectiveKeywords = [
    "objetivo", "busco", "oportunidade", "desejo atuar", "foco em", "com foco em", 
    "pretendo atuar", "atuação na área", "almejo", "vaga de", "cargo de",
    "com interesse", "interesse em", "interessado em", "focado em", "focando em", 
    "buscando", "procurando", "desejo de", "pretendo", "vontade de atuar", "interesse de atuar"
  ];
  const hasObjective = objectiveKeywords.some(keyword => summaryLower.includes(keyword)) || 
                       summaryLower.includes("para atuar") || 
                       summaryLower.includes("buscar posição");
  if (!hasObjective) {
    issues.push({
      id: "summary_no_objective",
      label: "Objetivo profissional pouco claro",
      severity: "IMPORTANT" as const,
      pointsDeducted: 2,
      category: "Atenções" as const,
      type: "warning" as const,
      message: "O resumo apresenta sua experiência, mas não deixa claro seu objetivo profissional. Informar a área em que deseja atuar ajuda o recrutador a entender seu perfil."
    });
  }

  // 6. Muito genérico
  const genericClichés = ["em busca de novos desafios", "profissional dinâmico", "focado em resultados", "facilidade de aprendizado", "disposição para aprender", "vontade de aprender", "proativo", "perfil proativo"];
  const clicheCount = genericClichés.filter(cliche => summaryLower.includes(cliche)).length;
  if (clicheCount >= 2) {
    issues.push({
      id: "summary_generic",
      label: "Resumo profissional muito genérico",
      severity: "IMPORTANT" as const,
      pointsDeducted: 2,
      category: "Atenções" as const,
      type: "warning" as const,
      message: "Seu resumo profissional está muito genérico e não destaca seus principais diferenciais. Tente mencionar sua área de atuação, principais competências e objetivo profissional em poucas linhas.\n\nExemplo:\n\"Profissional de Suporte em TI com experiência em atendimento técnico, manutenção de computadores e redes. Atualmente aprofundando conhecimentos em Cibersegurança e buscando oportunidades para aplicar e desenvolver habilidades técnicas.\""
    });
  }

  // 7. Faltam tecnologias
  const isTIOrTech = JSON.stringify(resumeData).toLowerCase().match(/\b(ti|tecnologia|programador|desenvolvedor|computação|sistemas|software|web|analista de dados|it|cybersecurity|redes)\b/i);
  if (isTIOrTech) {
    const techWords = ["react", "node", "javascript", "python", "java", "sql", "html", "css", "git", "aws", "gcp", "docker", "excel", "figma", "c#", "php", "typescript", "linux", "windows", "scrum", "office"];
    const hasTech = techWords.some(tech => summaryLower.includes(tech));
    if (!hasTech) {
      issues.push({
        id: "summary_missing_tech",
        label: "Ausência de ferramentas/tecnologias no resumo",
        severity: "IMPORTANT" as const,
        pointsDeducted: 2,
        category: "Atenções" as const,
        type: "warning" as const,
        message: "Considere mencionar ferramentas ou tecnologias que fazem parte da sua rotina profissional. Isso facilita a identificação do seu perfil pelos sistemas ATS."
      });
    }
  }

  // 8. Foco muito amplo
  const areas = [
    { name: "TI", keywords: ["ti", "tecnologia", "desenvolvedor", "programador", "sistemas", "suporte", "redes", "computador", "ti", "it"] },
    { name: "Vendas/Comercial", keywords: ["vendas", "vendedor", "comercial", "atendimento", "balcão", "caixa", "clientes", "loja"] },
    { name: "Administrativo", keywords: ["administrativo", "administração", "auxiliar", "financeiro", "documentos", "planilhas", "escritório"] },
    { name: "Construção/Operacional", keywords: ["obras", "pedreiro", "ajudante", "construção", "operário", "estoque", "produção", "fábrica", "manutenção"] }
  ];
  let matchedAreasCount = 0;
  areas.forEach(area => {
    const matched = area.keywords.some(kw => {
      const r = new RegExp(`\\b${kw}\\b`, 'i');
      return r.test(summaryLower);
    });
    if (matched) matchedAreasCount++;
  });
  if (matchedAreasCount >= 3) {
    issues.push({
      id: "summary_too_broad",
      label: "Foco profissional muito amplo no resumo",
      severity: "IMPORTANT" as const,
      pointsDeducted: 2,
      category: "Atenções" as const,
      type: "warning" as const,
      message: "O resumo aborda diversos assuntos ao mesmo tempo. Tente direcionar o texto para a área em que realmente deseja atuar."
    });
  }

  // 9. Experiência sem resultados
  const actionVerbs = ["gerenciei", "liderei", "desenvolvi", "implementei", "otimizei", "reduzi", "aumentei", "alcancei", "conquistei", "desenvolver", "implementar", "otimizar", "reduzir", "gerenciar", "liderar", "estruturar", "estruturando", "otimizando", "gerando", "gerar", "reduzindo", "aumentando", "desenvolvendo"];
  const hasActionVerb = actionVerbs.some(verb => summaryLower.includes(verb));
  const listsJobs = summaryLower.includes("atuei como") || summaryLower.includes("trabalhei como") || summaryLower.includes("experiência como") || summaryLower.includes("experiência em");
  if (listsJobs && !hasActionVerb) {
    issues.push({
      id: "summary_no_results",
      label: "Resumo focado apenas em cargos (sem resultados)",
      severity: "IMPORTANT" as const,
      pointsDeducted: 1,
      category: "Atenções" as const,
      type: "warning" as const,
      message: "Você descreve sua experiência, mas não destaca resultados ou responsabilidades relevantes. Sempre que possível, mencione atividades, tecnologias utilizadas ou conquistas."
    });
  }

  // 10. Recém-formado
  const isStudyingOrRecent = /cursando|graduando|estudante|formando|formado em \d{4}/i.test(summaryLower) ||
                             (resumeData.education && resumeData.education.some((edu: any) => {
                               const end = String(edu.endDate || edu.graduationDate || "").toLowerCase();
                               return end.includes("cursando") || end.includes("2024") || end.includes("2025") || end.includes("2026");
                             }));
  if (isStudyingOrRecent && experiencesList.length <= 1) {
    issues.push({
      id: "summary_recently_graduated",
      label: "Destaque estratégico para recém-formados",
      severity: "SUGGESTION" as const,
      pointsDeducted: 0,
      category: "Sugestões" as const,
      type: "info" as const,
      message: "Para profissionais em início de carreira, é recomendável destacar formação, projetos acadêmicos, certificações e habilidades técnicas que demonstrem potencial."
    });
  }

  // 11. Mudança de carreira
  const inTransition = summaryLower.includes("transição") || summaryLower.includes("mudança de área") || summaryLower.includes("migrando") || summaryLower.includes("migração") || summaryLower.includes("nova carreira") || summaryLower.includes("nova área");
  if (inTransition) {
    issues.push({
      id: "summary_career_transition",
      label: "Sugestão para transição de carreira",
      severity: "SUGGESTION" as const,
      pointsDeducted: 0,
      category: "Sugestões" as const,
      type: "info" as const,
      message: "Seu resumo pode explicar brevemente sua transição de carreira e destacar competências que podem ser aproveitadas na nova área."
    });
  }

  // 12. Poucas palavras-chave
  const commonTechOrKeywords = ["react", "node", "javascript", "python", "sql", "excel", "vendas", "atendimento", "financeiro", "gestão", "projetos", "redes", "design", "figma", "suporte", "marketing", "rh", "recrutamento", "contabilidade", "logística", "estoque", "produção", "qualidade", "processos", "sistemas"];
  const matchedKeywordsCount = commonTechOrKeywords.filter(kw => summaryLower.includes(kw)).length;
  const isGeneric = issues.some(i => i.id === "summary_generic");
  if (matchedKeywordsCount < 2 && !isGeneric) {
    issues.push({
      id: "summary_few_keywords",
      label: "Poucas palavras-chave no resumo",
      severity: "IMPORTANT" as const,
      pointsDeducted: 2,
      category: "Atenções" as const,
      type: "warning" as const,
      message: "Seu resumo pode ser fortalecido com palavras-chave relacionadas à sua área de atuação. Isso aumenta as chances de compatibilidade com sistemas ATS."
    });
  }

  // 13. Casos positivos: Boa qualidade / Excelente / ATS Otimizado
  const criticalOrImportantIssues = issues.filter(i => i.severity === "CRITICAL" || i.severity === "IMPORTANT");
  
  if (criticalOrImportantIssues.length === 0) {
    const isVeryRich = summary.trim().length >= 200 && matchedKeywordsCount >= 3 && hasActionVerb && hasObjective;
    if (isVeryRich) {
      issues.push({
        id: "summary_excellent",
        label: "Excelente resumo profissional",
        severity: "SUGGESTION" as const,
        pointsDeducted: 0,
        category: "Sugestões" as const,
        type: "success" as const,
        message: "Excelente resumo profissional. O resumo apresenta sua experiência, competências e objetivo de forma clara, facilitando a leitura tanto para recrutadores quanto para sistemas ATS."
      });
      issues.push({
        id: "summary_ats_optimized",
        label: "Resumo otimizado para ATS",
        severity: "SUGGESTION" as const,
        pointsDeducted: 0,
        category: "Sugestões" as const,
        type: "success" as const,
        message: "Seu resumo apresenta uma boa estrutura e utiliza termos relevantes para processos seletivos. Apenas pequenos refinamentos podem aumentar ainda mais sua compatibilidade com sistemas ATS."
      });
    } else {
      issues.push({
        id: "summary_good_quality",
        label: "Resumo de boa qualidade",
        severity: "SUGGESTION" as const,
        pointsDeducted: 0,
        category: "Sugestões" as const,
        type: "success" as const,
        message: "Seu resumo profissional está claro, organizado e apresenta bem seu perfil. Pequenos ajustes podem deixá-lo ainda mais atrativo para sistemas ATS e recrutadores."
      });
    }
  }

  return issues;
}
