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
  if (summary.trim().length === 0) {
    summaryScore = 0;
    summaryIssues.push("Resumo ausente");
    detectedIssues.push({
      id: "sem_resumo",
      label: "Resumo profissional ausente",
      severity: "CRITICAL",
      pointsDeducted: 10,
      category: "Erros",
      type: "error",
      message: "A seção de resumo profissional está vazia. Adicione uma breve apresentação de sua carreira."
    });
  } else if (summary.trim().length < 150) {
    summaryScore = Math.max(0, summaryScore - 5);
    summaryIssues.push("Resumo muito curto");
    detectedIssues.push({
      id: "resumo_curto",
      label: "Resumo profissional muito curto",
      severity: "IMPORTANT",
      pointsDeducted: 5,
      category: "Atenções",
      type: "warning",
      message: "Seu resumo profissional possui menos de 150 caracteres. Tente detalhar melhor seus objetivos e competências."
    });
  }

  const cliches = ["em busca de novos desafios", "profissional dinâmico", "focado em resultados", "facilidade de aprendizado"];
  if (cliches.some(c => summary.toLowerCase().includes(c))) {
    summaryScore = Math.max(0, summaryScore - 2);
    summaryIssues.push("Resumo com clichês");
    detectedIssues.push({
      id: "cliches_resumo",
      label: "Resumo com clichês genéricos",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Atenções",
      type: "warning",
      message: "Seu resumo contém jargões e clichês comuns (como 'profissional dinâmico' ou 'busca de novos desafios'). Substitua por conquistas concretas."
    });
  }

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
    expList.forEach((e: any) => {
      if (!e || typeof e !== "object") return;
      const desc = typeof e.description === "string" ? e.description : "";
      if (desc.trim().length < 100) incompleteDescCount++;
      if (/\d+%?/.test(desc)) hasMetrics = true;
    });

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
    if (expList.length <= 1) {
      projectsScore = Math.max(0, projectsScore - 5);
      projectsIssues.push("Sem projetos práticos cadastrados");
      detectedIssues.push({
        id: "sem_projetos_beginner",
        label: "Nenhum projeto cadastrado",
        severity: "IMPORTANT",
        pointsDeducted: 5,
        category: "Atenções",
        type: "warning",
        message: "Para perfis em início de carreira, incluir projetos práticos ajuda muito na pontuação e atratividade do perfil."
      });
    }
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
  const skillsCount = skillsList.filter((s: any) => typeof s === "string" && s.trim().length > 0).length;

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
      message: "Seu currículo possui poucas habilidades listadas. Recomenda-se preencher pelo menos 5 habilidades relevantes."
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

  // SUM OF ENGINE SCORE (strictly between 0 and 90)
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
