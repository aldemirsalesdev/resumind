// src/lib/atsEngine.ts
function normalizeContactInfo(resumeData) {
  if (!resumeData) return { name: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" };
  const pInfo = resumeData.personalInfo || {};
  const contact = resumeData.contact || {};
  const name = pInfo.fullName || pInfo.name || pInfo.nome || pInfo.nomeCompleto || resumeData.fullName || resumeData.name || resumeData.nome || resumeData.nomeCompleto || "";
  const email = pInfo.email || pInfo["e-mail"] || pInfo.mail || resumeData.email || resumeData["e-mail"] || resumeData.mail || contact.email || contact["e-mail"] || contact.mail || "";
  const phone = pInfo.phone || pInfo.telefone || pInfo.celular || pInfo.mobile || resumeData.phone || resumeData.telefone || resumeData.celular || resumeData.mobile || contact.phone || contact.telefone || contact.celular || contact.mobile || "";
  const location = pInfo.location || pInfo.city || pInfo.address || pInfo.localizacao || pInfo.cidade || pInfo.region || pInfo.state || resumeData.location || resumeData.city || resumeData.address || resumeData.localizacao || resumeData.cidade || resumeData.region || resumeData.state || contact.location || contact.city || contact.address || contact.localizacao || contact.cidade || contact.region || contact.state || "";
  let linkedin = pInfo.linkedin || pInfo.LinkedIn || resumeData.linkedin || resumeData.LinkedIn || contact.linkedin || contact.LinkedIn || "";
  let github = pInfo.github || pInfo.githubUrl || pInfo.GitHub || pInfo.GitHubUrl || resumeData.github || resumeData.githubUrl || resumeData.GitHub || resumeData.GitHubUrl || contact.github || contact.GitHub || "";
  const portfolio = pInfo.website || pInfo.portfolio || pInfo.portfolioUrl || pInfo.site || resumeData.website || resumeData.portfolio || resumeData.portfolioUrl || resumeData.site || contact.website || contact.portfolio || contact.site || "";
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
function normalizeResumeData(rawData) {
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
      hasPhoto: rawData.personalInfo?.hasPhoto ?? false
    },
    summary: rawData.summary || "",
    experience: Array.isArray(rawData.experience) ? rawData.experience : [],
    projects: Array.isArray(rawData.projects) ? rawData.projects : [],
    education: Array.isArray(rawData.education) ? rawData.education : [],
    skills: Array.isArray(rawData.skills) ? rawData.skills : [],
    certifications: Array.isArray(rawData.certifications) ? rawData.certifications : Array.isArray(rawData.courses) ? rawData.courses : [],
    languages: Array.isArray(rawData.languages) ? rawData.languages : []
  };
}
var OUT_OF_PLACE_ORGS = [
  { id: "ciee", displayName: "CIEE", patterns: ["ciee", "centro de integra\xE7\xE3o empresa-escola"] },
  { id: "nube", displayName: "NUBE", patterns: ["nube", "n\xFAcleo brasileiro de est\xE1gios"] },
  { id: "alura", displayName: "Alura", patterns: ["alura"] },
  { id: "udemy", displayName: "Udemy", patterns: ["udemy"] },
  { id: "coursera", displayName: "Coursera", patterns: ["coursera"] },
  { id: "rocketseat", displayName: "Rocketseat", patterns: ["rocketseat"] },
  { id: "dio", displayName: "DIO", patterns: ["dio.me", "digital innovation one", "dio"] },
  { id: "senai", displayName: "SENAI", patterns: ["senai", "servi\xE7o nacional de aprendizagem industrial"] },
  { id: "senac", displayName: "SENAC", patterns: ["senac", "servi\xE7o nacional de aprendizagem comercial"] },
  { id: "sebrae", displayName: "SEBRAE", patterns: ["sebrae"] },
  { id: "fundacao_bradesco", displayName: "Funda\xE7\xE3o Bradesco", patterns: ["funda\xE7\xE3o bradesco", "fundacao bradesco"] }
];
function matchesWord(text, pattern) {
  if (!text || !pattern) return false;
  const textLower = text.toLowerCase().trim();
  const patternLower = pattern.toLowerCase().trim();
  if (patternLower.includes(".") || patternLower.includes(" ")) {
    return textLower.includes(patternLower);
  }
  const patternEscaped = patternLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(?<=^|[^a-z\xE1\xE9\xED\xF3\xFA\xE2\xEA\xF4\xE3\xF5\xE7])${patternEscaped}(?=$|[^a-z\xE1\xE9\xED\xF3\xFA\xE2\xEA\xF4\xE3\xF5\xE7])`, "i");
  return regex.test(textLower);
}
function isCourseInEducation(education) {
  if (!Array.isArray(education)) return false;
  return education.some((edu) => {
    if (!edu || typeof edu !== "object") return false;
    const inst = typeof edu.institution === "string" ? edu.institution.toLowerCase() : "";
    const deg = typeof edu.degree === "string" ? edu.degree.toLowerCase() : "";
    const fld = typeof edu.field === "string" ? edu.field.toLowerCase() : "";
    return OUT_OF_PLACE_ORGS.some(
      (org) => org.patterns.some((p) => matchesWord(inst, p) || matchesWord(deg, p) || matchesWord(fld, p))
    );
  });
}
function calculateDeterministicScore(rawData) {
  const resumeData = normalizeResumeData(rawData);
  const normalizedContact = normalizeContactInfo(rawData);
  const detectedIssues = [];
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
  const contactIssues = [];
  const summaryIssues = [];
  const experienceIssues = [];
  const projectsIssues = [];
  const educationIssues = [];
  const skillsIssues = [];
  const coursesIssues = [];
  const keywordsIssues = [];
  const organizationIssues = [];
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  function parseYear(dateStr) {
    if (!dateStr) return null;
    const str = String(dateStr);
    const match = str.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : null;
  }
  const emailRaw = normalizedContact.email.trim().toLowerCase();
  const hasEmail = emailRaw.length > 0;
  const emailRegex = /^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/;
  const isTypoEmail = emailRaw.endsWith(".con") || emailRaw.endsWith(".comm") || emailRaw.endsWith(".commm") || emailRaw.endsWith(".com.br.br");
  if (!hasEmail) {
    contactScore = Math.max(0, contactScore - 5);
    contactIssues.push("E-mail n\xE3o informado");
    detectedIssues.push({
      id: "sem_email",
      label: "E-mail n\xE3o informado",
      severity: "CRITICAL",
      pointsDeducted: 5,
      category: "Erros",
      type: "error",
      message: "Endere\xE7o de e-mail n\xE3o foi fornecido. Adicione um e-mail v\xE1lido para contatos."
    });
  } else if (!emailRegex.test(emailRaw) || isTypoEmail) {
    contactScore = Math.max(0, contactScore - 3);
    contactIssues.push("E-mail com formato inv\xE1lido");
    detectedIssues.push({
      id: "email_invalido",
      label: "E-mail com formato inv\xE1lido",
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: "O formato do e-mail parece inv\xE1lido ou cont\xE9m poss\xEDveis erros de digita\xE7\xE3o."
    });
  }
  const phoneClean = normalizedContact.phone.replace(/\D/g, "");
  if (phoneClean.length === 0) {
    contactScore = Math.max(0, contactScore - 5);
    contactIssues.push("Telefone n\xE3o informado");
    detectedIssues.push({
      id: "sem_telefone",
      label: "Telefone n\xE3o informado",
      severity: "CRITICAL",
      pointsDeducted: 5,
      category: "Erros",
      type: "error",
      message: "Adicione um n\xFAmero de telefone com DDD para que recrutadores entrem em contato."
    });
  } else if (phoneClean.length < 10) {
    contactScore = Math.max(0, contactScore - 2);
    contactIssues.push("Telefone incompleto");
    detectedIssues.push({
      id: "telefone_incompleto",
      label: "Telefone incompleto",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "O n\xFAmero de telefone informado parece incompleto ou est\xE1 sem o DDD."
    });
  }
  if (normalizedContact.linkedin.length === 0) {
    contactScore = Math.max(0, contactScore - 3);
    contactIssues.push("LinkedIn n\xE3o informado");
    detectedIssues.push({
      id: "sem_linkedin",
      label: "LinkedIn n\xE3o informado",
      severity: "IMPORTANT",
      pointsDeducted: 3,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "O link para o perfil do LinkedIn est\xE1 ausente. \xC9 altamente recomend\xE1vel adicion\xE1-lo."
    });
  } else {
    const linkedinRaw = normalizedContact.linkedin.toLowerCase().trim();
    const isLinkedinPlaceholder = linkedinRaw.includes("seu-nome") || linkedinRaw.includes("seu_nome") || linkedinRaw.includes("username") || linkedinRaw.includes("seu-usuario") || linkedinRaw.includes("link-aqui");
    const isLinkedinTooShort = linkedinRaw.length > 0 && linkedinRaw.length < 10;
    if (isLinkedinPlaceholder || isLinkedinTooShort) {
      contactScore = Math.max(0, contactScore - 2);
      contactIssues.push("LinkedIn incompleto ou incorreto");
      detectedIssues.push({
        id: "linkedin_invalido",
        label: "LinkedIn inv\xE1lido ou incompleto",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: `O link do seu LinkedIn parece estar incompleto ou incorreto (atualmente est\xE1 preenchido como "${normalizedContact.linkedin}"). Verifique o preenchimento para garantir que os recrutadores consigam acessar seu perfil.`
      });
    }
  }
  if (normalizedContact.github.length > 0) {
    const githubRaw = normalizedContact.github.toLowerCase().trim();
    const isGithubPlaceholder = githubRaw.includes("seu-usuario") || githubRaw.includes("seu_usuario") || githubRaw.includes("username") || githubRaw.includes("seu-link") || githubRaw.includes("link-aqui");
    const isGithubTooShort = githubRaw.length < 8;
    if (isGithubPlaceholder || isGithubTooShort) {
      contactScore = Math.max(0, contactScore - 2);
      contactIssues.push("GitHub incompleto ou incorreto");
      detectedIssues.push({
        id: "github_invalido",
        label: "GitHub inv\xE1lido ou incompleto",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: `O link do seu GitHub parece estar incompleto ou incorreto (atualmente est\xE1 preenchido como "${normalizedContact.github}"). Verifique o preenchimento para garantir que os recrutadores consigam acessar seu perfil.`
      });
    }
  } else {
    const resumeTextLower = JSON.stringify(resumeData).toLowerCase();
    const isTechProfile = resumeTextLower.includes("inform\xE1tica") || resumeTextLower.includes("informatica") || resumeTextLower.includes("tecnologia") || resumeTextLower.includes("programa\xE7\xE3o") || resumeTextLower.includes("programacao") || resumeTextLower.includes("desenvolvedor") || resumeTextLower.includes("software") || resumeTextLower.includes("computa\xE7\xE3o") || resumeTextLower.includes("computacao");
    if (isTechProfile) {
      contactScore = Math.max(0, contactScore - 3);
      contactIssues.push("GitHub ausente para perfil de TI/Tecnologia");
      detectedIssues.push({
        id: "sem_github_tech",
        label: "GitHub ausente para perfil de TI/Tecnologia",
        severity: "IMPORTANT",
        pointsDeducted: 3,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: "Como seu perfil possui forma\xE7\xE3o, interesse ou men\xE7\xF5es a TI/Tecnologia, a aus\xEAncia de um link do GitHub reduz sua atratividade t\xE9cnica. Recomendamos criar um perfil e listar seus projetos de c\xF3digo."
      });
    }
  }
  if (normalizedContact.portfolio.length > 0) {
    const portfolioRaw = normalizedContact.portfolio.toLowerCase().trim();
    const isPortfolioPlaceholder = portfolioRaw.includes("seu-site") || portfolioRaw.includes("seu_site") || portfolioRaw.includes("portfolio.com") || portfolioRaw.includes("site-aqui") || portfolioRaw.includes("exemplo.com");
    const isPortfolioTooShort = portfolioRaw.length < 5;
    if (isPortfolioPlaceholder || isPortfolioTooShort) {
      contactScore = Math.max(0, contactScore - 2);
      contactIssues.push("Portf\xF3lio incompleto ou incorreto");
      detectedIssues.push({
        id: "portfolio_invalido",
        label: "Portf\xF3lio inv\xE1lido ou incompleto",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: `O link do seu Portf\xF3lio parece estar incompleto ou incorreto (atualmente est\xE1 preenchido como "${normalizedContact.portfolio}"). Verifique o preenchimento para garantir que os visitantes consigam abri-lo.`
      });
    }
  }
  if (normalizedContact.location.length < 3) {
    contactScore = Math.max(0, contactScore - 2);
    contactIssues.push("Localiza\xE7\xE3o n\xE3o informada");
    detectedIssues.push({
      id: "sem_localizacao",
      label: "Localiza\xE7\xE3o n\xE3o informada",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "Localiza\xE7\xE3o (cidade e estado) n\xE3o foi informada. ATS frequentemente filtram por regi\xE3o."
    });
  }
  const summary = resumeData.summary || "";
  const summaryEvalIssues = evaluateProfessionalSummary(summary, resumeData);
  summaryEvalIssues.forEach((issue) => {
    summaryScore = Math.max(0, summaryScore - issue.pointsDeducted);
    if (issue.severity === "CRITICAL" || issue.severity === "IMPORTANT") {
      if (!summaryIssues.includes(issue.label)) summaryIssues.push(issue.label);
    }
    detectedIssues.push(issue);
  });
  const expList = resumeData.experience || [];
  if (expList.length === 0) {
    experienceScore = 0;
    experienceIssues.push("Nenhuma experi\xEAncia informada");
    detectedIssues.push({
      id: "sem_experiencia",
      label: "Aus\xEAncia de experi\xEAncia profissional",
      severity: "CRITICAL",
      pointsDeducted: 25,
      category: "Erros",
      type: "error",
      message: "A se\xE7\xE3o de experi\xEAncia profissional est\xE1 ausente. Adicione suas experi\xEAncias ou use projetos para perfis iniciantes."
    });
  } else {
    let incompleteDescCount = 0;
    let hasMetrics = false;
    let formalExpCount = 0;
    let informalExpCount = 0;
    expList.forEach((e) => {
      if (!e || typeof e !== "object") return;
      const desc = typeof e.description === "string" ? e.description : "";
      if (desc.trim().length < 100) incompleteDescCount++;
      if (/\d+%?/.test(desc)) hasMetrics = true;
      const comp = typeof e.company === "string" ? e.company.toLowerCase() : "";
      const pos = typeof e.position === "string" ? e.position.toLowerCase() : "";
      if (comp.includes("informal") || comp.includes("informais") || comp.includes("bico") || comp.includes("aut\xF4nomo") || comp.includes("autonomo") || comp.includes("escola") || comp.includes("trabalho escolar") || pos.includes("escolar") || pos.includes("apresenta\xE7\xE3o") || pos.includes("apresentacao")) {
        informalExpCount++;
      } else if (comp.trim().length > 0) {
        formalExpCount++;
      }
    });
    if (formalExpCount === 0 && informalExpCount > 0) {
      experienceScore = Math.max(0, experienceScore - 10);
      experienceIssues.push("Apenas experi\xEAncias informais ou escolares");
      detectedIssues.push({
        id: "experiencias_somente_informais",
        label: "Apenas experi\xEAncias informais ou escolares listadas",
        severity: "IMPORTANT",
        pointsDeducted: 10,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: "Identificamos que seu hist\xF3rico profissional possui apenas atividades informais, bicos ou trabalhos escolares. Se voc\xEA busca seu primeiro emprego formal, destaque seus projetos acad\xEAmicos e habilidades para compensar."
      });
    }
    if (incompleteDescCount > 0) {
      experienceScore = Math.max(0, experienceScore - 10);
      experienceIssues.push("Descri\xE7\xF5es de experi\xEAncia curtas");
      detectedIssues.push({
        id: "descricoes_curtas",
        label: "Descri\xE7\xF5es de experi\xEAncia curtas ou rasas",
        severity: "IMPORTANT",
        pointsDeducted: 10,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: "Algumas das descri\xE7\xF5es de suas experi\xEAncias profissionais t\xEAm menos de 100 caracteres. Detalhe melhor suas responsabilidades."
      });
    }
    if (!hasMetrics) {
      detectedIssues.push({
        id: "adicionar_metricas",
        label: "Aus\xEAncia de m\xE9tricas e resultados",
        severity: "SUGGESTION",
        pointsDeducted: 0,
        category: "Sugest\xF5es",
        type: "info",
        message: "Adicione m\xE9tricas quantitativas e resultados reais em suas conquistas (ex: porcentagens, valores, volumes de atendimento) para chamar mais aten\xE7\xE3o."
      });
    }
  }
  const projList = resumeData.projects || [];
  if (projList.length === 0) {
    projectsScore = Math.max(0, projectsScore - 7);
    projectsIssues.push("Sem projetos pr\xE1ticos cadastrados");
    detectedIssues.push({
      id: "sem_projetos_total",
      label: "Nenhum projeto pr\xE1tico cadastrado",
      severity: "IMPORTANT",
      pointsDeducted: 7,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "Seu curr\xEDculo n\xE3o lista nenhum projeto pr\xE1tico ou pessoal. Projetos s\xE3o cruciais para comprovar suas habilidades na pr\xE1tica, especialmente se voc\xEA est\xE1 em in\xEDcio de carreira ou transi\xE7\xE3o."
    });
  } else {
    let missingTech = false;
    let shortDesc = false;
    projList.forEach((p) => {
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
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: "Especifique quais tecnologias, frameworks ou ferramentas voc\xEA utilizou em cada um dos projetos listados."
      });
    }
    if (shortDesc) {
      projectsScore = Math.max(0, projectsScore - 2);
      projectsIssues.push("Projetos com descri\xE7\xF5es curtas");
      detectedIssues.push({
        id: "projetos_curtos",
        label: "Projetos cadastrados com descri\xE7\xF5es curtas",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: "Detalhe melhor os objetivos, seu papel e os resultados obtidos em seus projetos pessoais ou pr\xE1ticos."
      });
    }
  }
  const eduList = resumeData.education || [];
  if (eduList.length === 0) {
    educationScore = 0;
    educationIssues.push("Educa\xE7\xE3o ausente");
    detectedIssues.push({
      id: "sem_formacao",
      label: "Forma\xE7\xE3o acad\xEAmica n\xE3o informada",
      severity: "CRITICAL",
      pointsDeducted: 10,
      category: "Erros",
      type: "error",
      message: "Se\xE7\xE3o de forma\xE7\xE3o acad\xEAmica est\xE1 vazia. Adicione seus cursos de gradua\xE7\xE3o, p\xF3s-gradua\xE7\xE3o, t\xE9cnico ou ensino m\xE9dio."
    });
  } else {
    let incompleteEdu = false;
    eduList.forEach((edu) => {
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
      educationIssues.push("Forma\xE7\xE3o incompleta");
      detectedIssues.push({
        id: "formacao_incompleta",
        label: "Forma\xE7\xE3o acad\xEAmica incompleta",
        severity: "IMPORTANT",
        pointsDeducted: 4,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: "Algumas das forma\xE7\xF5es acad\xEAmicas cadastradas est\xE3o sem o nome da institui\xE7\xE3o ou grau acad\xEAmico."
      });
    }
  }
  const skillsList = resumeData.skills || [];
  let skillsCount = 0;
  skillsList.forEach((s) => {
    if (typeof s !== "string") return;
    const cleanS = s.trim();
    if (!cleanS) return;
    let textToSplit = cleanS;
    if (cleanS.includes(":")) {
      const parts = cleanS.split(":");
      textToSplit = parts.slice(1).join(":");
    }
    const items = textToSplit.split(/[,;|]+/).map((item) => item.trim()).filter((item) => item.length > 0);
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
      message: "Insira uma lista de compet\xEAncias t\xE9cnicas (Hard Skills) e comportamentais (Soft Skills) para otimiza\xE7\xE3o ATS."
    });
  } else if (skillsCount < 5) {
    skillsScore = Math.max(0, skillsScore - 5);
    skillsIssues.push("Poucas habilidades cadastradas");
    detectedIssues.push({
      id: "poucas_habilidades",
      label: "Poucas habilidades especificadas",
      severity: "IMPORTANT",
      pointsDeducted: 5,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: `Seu curr\xEDculo possui poucas habilidades listadas (${skillsCount}). Recomenda-se preencher pelo menos 5 habilidades relevantes.`
    });
  }
  const certList = resumeData.certifications || [];
  if (certList.length === 0) {
    coursesScore = Math.max(0, coursesScore - 2);
    coursesIssues.push("Nenhum curso cadastrado");
    detectedIssues.push({
      id: "sem_cursos",
      label: "Nenhum curso complementar cadastrado",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "Considere adicionar cursos complementares, certifica\xE7\xF5es ou bootcamps para enriquecer seu curr\xEDculo."
    });
  }
  const totalSkillsText = skillsList.map((s) => typeof s === "string" ? s : "").join(" ");
  const individualKeywords = totalSkillsText.split(/[\s,;.://]+/).filter((w) => w.trim().length > 2);
  const keywordCount = individualKeywords.length;
  if (keywordCount < 5) {
    keywordsScore = Math.max(0, keywordsScore - 3);
    keywordsIssues.push("Poucas palavras-chave t\xE9cnicas");
    detectedIssues.push({
      id: "poucas_palavras_chave",
      label: "Poucas palavras-chave / compatibilidade ATS",
      severity: "IMPORTANT",
      pointsDeducted: 3,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "O curr\xEDculo possui poucas palavras-chave de tecnologias ou compet\xEAncias. Enrique\xE7a seu perfil com termos t\xE9cnicos."
    });
  }
  let dateConflict = false;
  expList.forEach((e) => {
    if (!e || typeof e !== "object") return;
    const startY = parseYear(e.startDate);
    const endY = parseYear(e.endDate);
    const endStr = typeof e.endDate === "string" ? e.endDate.toLowerCase() : "";
    const isCurrent = endStr.includes("atual") || endStr.includes("presente") || endStr.includes("now") || endStr.includes("present");
    if (startY && startY > currentYear) dateConflict = true;
    if (endY && endY > currentYear && !isCurrent) dateConflict = true;
    if (startY && endY && endY < startY && !isCurrent) dateConflict = true;
  });
  eduList.forEach((edu) => {
    if (!edu || typeof edu !== "object") return;
    const startY = parseYear(edu.startDate);
    const endY = parseYear(edu.graduationDate || edu.endDate);
    if (startY && startY > currentYear + 6) dateConflict = true;
    if (startY && endY && endY < startY) dateConflict = true;
  });
  if (dateConflict) {
    organizationScore = Math.max(0, organizationScore - 3);
    organizationIssues.push("Datas inv\xE1lidas ou inconsistentes");
    detectedIssues.push({
      id: "datas_invalidas",
      label: "Datas inv\xE1lidas ou inconsistentes",
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: "Identificamos inconsist\xEAncias nas datas de in\xEDcio e fim das experi\xEAncias profissionais ou acad\xEAmicas."
    });
  }
  if (!resumeData.personalInfo?.fullName) {
    organizationScore = Math.max(0, organizationScore - 2);
    organizationIssues.push("Nome n\xE3o identificado");
    detectedIssues.push({
      id: "sem_nome",
      label: "Nome do candidato n\xE3o identificado",
      severity: "CRITICAL",
      pointsDeducted: 2,
      category: "Erros",
      type: "error",
      message: "O nome completo do candidato n\xE3o foi encontrado no cabe\xE7alho ou dados pessoais."
    });
  }
  if (isCourseInEducation(eduList)) {
    organizationScore = Math.max(0, organizationScore - 3);
    organizationIssues.push("Institui\xE7\xF5es de cursos na Forma\xE7\xE3o Formal");
    detectedIssues.push({
      id: "cursos_misturados_educacao",
      label: "Cursos misturados com Forma\xE7\xE3o Acad\xEAmica",
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: "Alguns cursos livres (Alura, Udemy, CIEE) foram detectados na se\xE7\xE3o Educa\xE7\xE3o. Mova-os para Cursos e Certifica\xE7\xF5es."
    });
  }
  const qualityIssues = checkResumeDataQuality(resumeData);
  qualityIssues.forEach((issue) => {
    const points = issue.pointsDeducted;
    const msg = issue.message;
    if (msg.includes("Nome") || issue.id.includes("nome_")) {
      contactScore = Math.max(0, contactScore - points);
      if (!contactIssues.includes(issue.label)) contactIssues.push(issue.label);
    } else if (msg.includes("Resumo") || issue.id.includes("summary_")) {
      summaryScore = Math.max(0, summaryScore - points);
      if (!summaryIssues.includes(issue.label)) summaryIssues.push(issue.label);
    } else if (msg.includes("Experi\xEAncia") || issue.id.includes("empresa_") || issue.id.includes("exp_")) {
      experienceScore = Math.max(0, experienceScore - points);
      if (!experienceIssues.includes(issue.label)) experienceIssues.push(issue.label);
    } else if (msg.includes("Projeto") || issue.id.includes("proj_")) {
      projectsScore = Math.max(0, projectsScore - points);
      if (!projectsIssues.includes(issue.label)) projectsIssues.push(issue.label);
    } else if (msg.includes("Forma\xE7\xE3o") || issue.id.includes("instituicao_") || issue.id.includes("edu_")) {
      educationScore = Math.max(0, educationScore - points);
      if (!educationIssues.includes(issue.label)) educationIssues.push(issue.label);
    } else if (msg.includes("Habilidade") || issue.id.includes("skill_")) {
      skillsScore = Math.max(0, skillsScore - points);
      if (!skillsIssues.includes(issue.label)) skillsIssues.push(issue.label);
    } else if (msg.includes("Certifica\xE7\xE3o") || issue.id.includes("cert_")) {
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
var PT_TYPOS = [
  // Gramática e grafia comum
  { wrong: "atraz", correct: "atr\xE1s", explanation: "O correto \xE9 'atr\xE1s' (com 's' e acento), indicando posi\xE7\xE3o ou tempo decorrido." },
  { wrong: "atrazado", correct: "atrasado", explanation: "O correto \xE9 'atrasado' (com 's')." },
  { wrong: "atrazar", correct: "atrasar", explanation: "O correto \xE9 'atrasar' (com 's')." },
  { wrong: "paralizar", correct: "paralisar", explanation: "O correto \xE9 'paralisar' (com 's')." },
  { wrong: "paralizado", correct: "paralisado", explanation: "O correto \xE9 'paralisado' (com 's')." },
  { wrong: "paralizacao", correct: "paralisa\xE7\xE3o", explanation: "O correto \xE9 'paralisa\xE7\xE3o' (com 's')." },
  { wrong: "ancioso", correct: "ansioso", explanation: "O correto \xE9 'ansioso' (com 's')." },
  { wrong: "anciosa", correct: "ansiosa", explanation: "O correto \xE9 'ansiosa' (com 's')." },
  { wrong: "compania", correct: "companhia", explanation: "O correto \xE9 'companhia' (com 'nh')." },
  { wrong: "excess\xE3o", correct: "exce\xE7\xE3o", explanation: "O correto \xE9 'exce\xE7\xE3o' (com 'c' e '\xE7')." },
  { wrong: "excessoes", correct: "exce\xE7\xF5es", explanation: "O correto \xE9 'exce\xE7\xF5es'." },
  { wrong: "previl\xE9gio", correct: "privil\xE9gio", explanation: "O correto \xE9 'privil\xE9gio' (com 'i')." },
  { wrong: "previlegio", correct: "privil\xE9gio", explanation: "O correto \xE9 'privil\xE9gio' (com 'i')." },
  { wrong: "concerteza", correct: "com certeza", explanation: "A express\xE3o correta \xE9 escrita separada: 'com certeza'." },
  { wrong: "seje", correct: "seja", explanation: "A forma correta do verbo ser \xE9 'seja'." },
  { wrong: "esteje", correct: "esteja", explanation: "A forma correta do verbo estar \xE9 'esteja'." },
  { wrong: "menas", correct: "menos", explanation: "A palavra 'menas' n\xE3o existe. Use sempre 'menos'." },
  { wrong: "pobrema", correct: "problema", explanation: "O correto \xE9 'problema'." },
  { wrong: "aster\xEDstico", correct: "asterisco", explanation: "O correto \xE9 'asterisco'." },
  { wrong: "beneficiente", correct: "beneficente", explanation: "O correto \xE9 'beneficente'." },
  { wrong: "carda\xE7o", correct: "cadar\xE7o", explanation: "O correto \xE9 'cadar\xE7o'." },
  { wrong: "frustado", correct: "frustrado", explanation: "O correto \xE9 'frustrado' (com 'r')." },
  { wrong: "frustada", correct: "frustrada", explanation: "O correto \xE9 'frustrada' (com 'r')." },
  { wrong: "reinvindicar", correct: "reivindicar", explanation: "O correto \xE9 'reivindicar' (sem o primeiro 'n')." },
  { wrong: "reinvindica\xE7\xE3o", correct: "reivindica\xE7\xE3o", explanation: "O correto \xE9 'reivindica\xE7\xE3o' (sem o primeiro 'n')." },
  { wrong: "mendingo", correct: "mendigo", explanation: "O correto \xE9 'mendigo'." },
  { wrong: "desenvolvidor", correct: "desenvolvedor", explanation: "O correto \xE9 'desenvolvedor'." },
  { wrong: "desenvolvidora", correct: "desenvolvedora", explanation: "O correto \xE9 'desenvolvedora'." },
  { wrong: "geremte", correct: "gerente", explanation: "O correto \xE9 'gerente' (com 'n')." },
  { wrong: "atendimeto", correct: "atendimento", explanation: "O correto \xE9 'atendimento' (com 'n')." },
  { wrong: "progeto", correct: "projeto", explanation: "O correto \xE9 'projeto' (com 'j')." },
  { wrong: "progetos", correct: "projetos", explanation: "O correto \xE9 'projetos' (com 'j')." },
  // Falta de acentuação e ç em palavras corporativas/profissionais
  { wrong: "comunicacao", correct: "comunica\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'comunica\xE7\xE3o'." },
  { wrong: "comunicacoes", correct: "comunica\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'comunica\xE7\xF5es'." },
  { wrong: "organizacao", correct: "organiza\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'organiza\xE7\xE3o'." },
  { wrong: "organizacoes", correct: "organiza\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'organiza\xE7\xF5es'." },
  { wrong: "atencao", correct: "aten\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'aten\xE7\xE3o'." },
  { wrong: "nao", correct: "n\xE3o", explanation: "Falta acentua\xE7\xE3o (til) em 'n\xE3o'." },
  { wrong: "saude", correct: "sa\xFAde", explanation: "Falta acento agudo em 'sa\xFAde'." },
  { wrong: "tecnico", correct: "t\xE9cnico", explanation: "Falta acento agudo em 't\xE9cnico'." },
  { wrong: "tecnica", correct: "t\xE9cnica", explanation: "Falta acento agudo em 't\xE9cnica'." },
  { wrong: "tecnicos", correct: "t\xE9cnicos", explanation: "Falta acento agudo em 't\xE9cnicos'." },
  { wrong: "tecnicas", correct: "t\xE9cnicas", explanation: "Falta acento agudo em 't\xE9cnicas'." },
  { wrong: "experiencia", correct: "experi\xEAncia", explanation: "Falta acento circunflexo em 'experi\xEAncia'." },
  { wrong: "experiencias", correct: "experi\xEAncias", explanation: "Falta acento circunflexo em 'experi\xEAncias'." },
  { wrong: "formacao", correct: "forma\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'forma\xE7\xE3o'." },
  { wrong: "formacoes", correct: "forma\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'forma\xE7\xF5es'." },
  { wrong: "graduacao", correct: "gradua\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'gradua\xE7\xE3o'." },
  { wrong: "graduacoes", correct: "gradua\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'gradua\xE7\xF5es'." },
  { wrong: "pos-graduacao", correct: "p\xF3s-gradua\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o em 'p\xF3s-gradua\xE7\xE3o'." },
  { wrong: "producao", correct: "produ\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'produ\xE7\xE3o'." },
  { wrong: "producoes", correct: "produ\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'produ\xE7\xF5es'." },
  { wrong: "gestao", correct: "gest\xE3o", explanation: "Falta acentua\xE7\xE3o (til) em 'gest\xE3o'." },
  { wrong: "solucao", correct: "solu\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'solu\xE7\xE3o'." },
  { wrong: "solucoes", correct: "solu\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'solu\xE7\xF5es'." },
  { wrong: "avaliacao", correct: "avalia\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'avalia\xE7\xE3o'." },
  { wrong: "avaliacoes", correct: "avalia\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'avalia\xE7\xF5es'." },
  { wrong: "automatizacao", correct: "automatiza\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'automatiza\xE7\xE3o'." },
  { wrong: "otimizacao", correct: "otimiza\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'otimiza\xE7\xE3o'." },
  { wrong: "otimizacoes", correct: "otimiza\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'otimiza\xE7\xF5es'." },
  { wrong: "implementacao", correct: "implementa\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'implementa\xE7\xE3o'." },
  { wrong: "implementacoes", correct: "implementa\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'implementa\xE7\xF5es'." },
  { wrong: "integracao", correct: "integra\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'integra\xE7\xE3o'." },
  { wrong: "integracoes", correct: "integra\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'integra\xE7\xF5es'." },
  { wrong: "migracao", correct: "migra\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'migra\xE7\xE3o'." },
  { wrong: "migracoes", correct: "migra\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'migra\xE7\xF5es'." },
  { wrong: "documentacao", correct: "documenta\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'documenta\xE7\xE3o'." },
  { wrong: "validacao", correct: "valida\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'valida\xE7\xE3o'." },
  { wrong: "validacoes", correct: "valida\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'valida\xE7\xF5es'." },
  { wrong: "inovacao", correct: "inova\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'inova\xE7\xE3o'." },
  { wrong: "inovacoes", correct: "inova\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'inova\xE7\xF5es'." },
  { wrong: "execucao", correct: "execu\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'execu\xE7\xE3o'." },
  { wrong: "execucoes", correct: "execu\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'execu\xE7\xF5es'." },
  { wrong: "participacao", correct: "participa\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'participa\xE7\xE3o'." },
  { wrong: "participacoes", correct: "participa\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'participa\xE7\xF5es'." },
  { wrong: "elaboracao", correct: "elabora\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'elabora\xE7\xE3o'." },
  { wrong: "construcao", correct: "constru\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'constru\xE7\xE3o'." },
  { wrong: "construcoes", correct: "constru\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'constru\xE7\xF5es'." },
  { wrong: "distribuicao", correct: "distribui\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'distribui\xE7\xE3o'." },
  { wrong: "orientacao", correct: "orienta\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'orienta\xE7\xE3o'." },
  { wrong: "instalacao", correct: "instala\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'instala\xE7\xE3o'." },
  { wrong: "instalacoes", correct: "instala\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'instala\xE7\xF5es'." },
  { wrong: "configuracao", correct: "configura\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'configura\xE7\xE3o'." },
  { wrong: "configuracoes", correct: "configura\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'configura\xE7\xF5es'." },
  { wrong: "manutencao", correct: "manuten\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'manuten\xE7\xE3o'." },
  { wrong: "manutencoes", correct: "manuten\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'manuten\xE7\xF5es'." },
  { wrong: "administracao", correct: "administra\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'administra\xE7\xE3o'." },
  { wrong: "qualificacao", correct: "qualifica\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'qualifica\xE7\xE3o'." },
  { wrong: "qualificacoes", correct: "qualifica\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'qualifica\xE7\xF5es'." },
  { wrong: "certificacao", correct: "certifica\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'certifica\xE7\xE3o'." },
  { wrong: "certificacoes", correct: "certifica\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'certifica\xE7\xF5es'." },
  { wrong: "direcao", correct: "dire\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'dire\xE7\xE3o'." },
  { wrong: "operacao", correct: "opera\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'opera\xE7\xE3o'." },
  { wrong: "operacoes", correct: "opera\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'opera\xE7\xF5es'." },
  { wrong: "coordenacao", correct: "coordena\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'coordena\xE7\xE3o'." },
  { wrong: "supervisao", correct: "supervis\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'supervis\xE3o'." },
  { wrong: "supervisoes", correct: "supervis\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'supervis\xF5es'." },
  { wrong: "funcao", correct: "fun\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'fun\xE7\xE3o'." },
  { wrong: "funcoes", correct: "fun\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'fun\xE7\xF5es'." },
  { wrong: "promocao", correct: "promo\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'promo\xE7\xE3o'." },
  { wrong: "promocoes", correct: "promo\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'promo\xE7\xF5es'." },
  { wrong: "definicao", correct: "defini\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'defini\xE7\xE3o'." },
  { wrong: "definicoes", correct: "defini\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'defini\xE7\xF5es'." },
  { wrong: "negociacao", correct: "negocia\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'negocia\xE7\xE3o'." },
  { wrong: "negociacoes", correct: "negocia\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'negocia\xE7\xF5es'." },
  { wrong: "revisao", correct: "revis\xE3o", explanation: "Falta acentua\xE7\xE3o em 'revis\xE3o'." },
  { wrong: "revisoes", correct: "revis\xF5es", explanation: "Falta acentua\xE7\xE3o em 'revis\xF5es'." },
  { wrong: "apresentacao", correct: "apresenta\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'apresenta\xE7\xE3o'." },
  { wrong: "apresentacoes", correct: "apresenta\xE7\xF5es", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'apresenta\xE7\xF5es'." },
  { wrong: "captacao", correct: "capta\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'capta\xE7\xE3o'." },
  { wrong: "retencao", correct: "reten\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'reten\xE7\xE3o'." },
  { wrong: "alocacao", correct: "aloca\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'aloca\xE7\xE3o'." },
  { wrong: "padronizacao", correct: "padroniza\xE7\xE3o", explanation: "Falta acentua\xE7\xE3o e \xE7 em 'padroniza\xE7\xE3o'." },
  { wrong: "analise", correct: "an\xE1lise", explanation: "Falta acento agudo em 'an\xE1lise'." },
  { wrong: "analises", correct: "an\xE1lises", explanation: "Falta acento agudo em 'an\xE1lises'." },
  { wrong: "area", correct: "\xE1rea", explanation: "Falta acento agudo em '\xE1rea'." },
  { wrong: "areas", correct: "\xE1reas", explanation: "Falta acento agudo em '\xE1reas'." },
  { wrong: "nivel", correct: "n\xEDvel", explanation: "Falta acento agudo em 'n\xEDvel'." },
  { wrong: "niveis", correct: "n\xEDveis", explanation: "Falta acento agudo em 'n\xEDveis'." },
  { wrong: "periodo", correct: "per\xEDodo", explanation: "Falta acento agudo em 'per\xEDodo'." },
  { wrong: "periodos", correct: "per\xEDodos", explanation: "Falta acento agudo em 'per\xEDodos'." },
  { wrong: "codigo", correct: "c\xF3digo", explanation: "Falta acento agudo em 'c\xF3digo'." },
  { wrong: "codigos", correct: "c\xF3digos", explanation: "Falta acento agudo em 'c\xF3digos'." },
  { wrong: "modulo", correct: "m\xF3dulo", explanation: "Falta acento agudo em 'm\xF3dulo'." },
  { wrong: "modulos", correct: "m\xF3dulos", explanation: "Falta acento agudo em 'm\xF3dulos'." },
  { wrong: "relatorio", correct: "relat\xF3rio", explanation: "Falta acento agudo em 'relat\xF3rio'." },
  { wrong: "relatorios", correct: "relat\xF3rios", explanation: "Falta acento agudo em 'relat\xF3rios'." },
  { wrong: "estrategia", correct: "estrat\xE9gia", explanation: "Falta acento agudo em 'estrat\xE9gia'." },
  { wrong: "estrategias", correct: "estrat\xE9gias", explanation: "Falta acento agudo em 'estrat\xE9gias'." },
  { wrong: "estrategico", correct: "estrat\xE9gico", explanation: "Falta acento agudo em 'estrat\xE9gico'." },
  { wrong: "estrategica", correct: "estrat\xE9gica", explanation: "Falta acento agudo em 'estrat\xE9gica'." },
  { wrong: "estrategicos", correct: "estrat\xE9gicos", explanation: "Falta acento agudo em 'estrat\xE9gicos'." },
  { wrong: "estrategicas", correct: "estrat\xE9gicas", explanation: "Falta acento agudo em 'estrat\xE9gicas'." },
  { wrong: "logistica", correct: "log\xEDstica", explanation: "Falta acento agudo em 'log\xEDstica'." },
  { wrong: "politica", correct: "pol\xEDtica", explanation: "Falta acento agudo em 'pol\xEDtica'." },
  { wrong: "politicas", correct: "pol\xEDticas", explanation: "Falta acento agudo em 'pol\xEDticas'." },
  { wrong: "estatistica", correct: "estat\xEDstica", explanation: "Falta acento agudo em 'estat\xEDstica'." },
  { wrong: "estatisticas", correct: "estat\xEDsticas", explanation: "Falta acento agudo em 'estat\xEDsticas'." },
  { wrong: "metrica", correct: "m\xE9trica", explanation: "Falta acento agudo em 'm\xE9trica'." },
  { wrong: "metricas", correct: "m\xE9tricas", explanation: "Falta acento agudo em 'm\xE9tricas'." },
  { wrong: "especifico", correct: "espec\xEDfico", explanation: "Falta acento agudo em 'espec\xEDfico'." },
  { wrong: "especifica", correct: "espec\xEDfica", explanation: "Falta acento agudo em 'espec\xEDfica'." },
  { wrong: "especificos", correct: "espec\xEDficos", explanation: "Falta acento agudo em 'espec\xEDficos'." },
  { wrong: "especificas", correct: "espec\xEDficas", explanation: "Falta acento agudo em 'espec\xEDficas'." },
  { wrong: "critico", correct: "cr\xEDtico", explanation: "Falta acento agudo em 'cr\xEDtico'." },
  { wrong: "critica", correct: "cr\xEDtica", explanation: "Falta acento agudo em 'cr\xEDtica'." },
  { wrong: "diagnostico", correct: "diagn\xF3stico", explanation: "Falta acento agudo em 'diagn\xF3stico'." },
  { wrong: "diagnosticos", correct: "diagn\xF3sticos", explanation: "Falta acento agudo em 'diagn\xF3sticos'." },
  { wrong: "autonomo", correct: "aut\xF4nomo", explanation: "Falta acento circunflexo em 'aut\xF4nomo'." },
  { wrong: "autonoma", correct: "aut\xF4noma", explanation: "Falta acento circunflexo em 'aut\xF4noma'." },
  { wrong: "publico", correct: "p\xFAblico", explanation: "Falta acento agudo em 'p\xFAblico'." },
  { wrong: "publicos", correct: "p\xFAblicos", explanation: "Falta acento agudo em 'p\xFAblicos'." },
  { wrong: "fisico", correct: "f\xEDsico", explanation: "Falta acento agudo em 'f\xEDsico'." },
  { wrong: "fisica", correct: "f\xEDsica", explanation: "Falta acento agudo em 'f\xEDsica'." },
  { wrong: "quimico", correct: "qu\xEDmico", explanation: "Falta acento agudo em 'qu\xEDmico'." },
  { wrong: "quimica", correct: "qu\xEDmica", explanation: "Falta acento agudo em 'qu\xEDmica'." },
  { wrong: "biologico", correct: "biol\xF3gico", explanation: "Falta acento agudo em 'biol\xF3gico'." },
  { wrong: "unico", correct: "\xFAnico", explanation: "Falta acento agudo em '\xFAnico'." },
  { wrong: "unica", correct: "\xFAnica", explanation: "Falta acento agudo em '\xFAnica'." },
  { wrong: "numero", correct: "n\xFAmero", explanation: "Falta acento agudo em 'n\xFAmero'." },
  { wrong: "numeros", correct: "n\xFAmeros", explanation: "Falta acento agudo em 'n\xFAmeros'." },
  { wrong: "maximo", correct: "m\xE1ximo", explanation: "Falta acento agudo em 'm\xE1ximo'." },
  { wrong: "minimo", correct: "m\xEDnimo", explanation: "Falta acento agudo em 'm\xEDnimo'." },
  { wrong: "proximo", correct: "pr\xF3ximo", explanation: "Falta acento agudo em 'pr\xF3ximo'." },
  { wrong: "proximos", correct: "pr\xF3ximos", explanation: "Falta acento agudo em 'pr\xF3ximos'." },
  { wrong: "ultimo", correct: "\xFAltimo", explanation: "Falta acento agudo em '\xFAltimo'." },
  { wrong: "ultima", correct: "\xFAltima", explanation: "Falta acento agudo em '\xFAltima'." },
  { wrong: "ultimos", correct: "\xFAltimos", explanation: "Falta acento agudo em '\xFAltimos'." },
  { wrong: "ultimas", correct: "\xFAltimas", explanation: "Falta acento agudo em '\xFAltimas'." },
  { wrong: "rapido", correct: "r\xE1pido", explanation: "Falta acento agudo em 'r\xE1pido'." },
  { wrong: "rapida", correct: "r\xE1pida", explanation: "Falta acento agudo em 'r\xE1pida'." },
  { wrong: "facil", correct: "f\xE1cil", explanation: "Falta acento agudo em 'f\xE1cil'." },
  { wrong: "dificil", correct: "dif\xEDcil", explanation: "Falta acento agudo em 'dif\xEDcil'." },
  { wrong: "agil", correct: "\xE1gil", explanation: "Falta acento agudo em '\xE1gil'." },
  { wrong: "util", correct: "\xFAtil", explanation: "Falta acento agudo em '\xFAtil'." },
  { wrong: "gerencia", correct: "ger\xEAncia", explanation: "Falta acento circunflexo em 'ger\xEAncia' (substantivo)." },
  { wrong: "gerencias", correct: "ger\xEAncias", explanation: "Falta acento circunflexo em 'ger\xEAncias'." },
  { wrong: "exigencia", correct: "exig\xEAncia", explanation: "Falta acento circunflexo em 'exig\xEAncia'." },
  { wrong: "exigencias", correct: "exig\xEAncias", explanation: "Falta acento circunflexo em 'exig\xEAncias'." },
  { wrong: "eficiencia", correct: "efici\xEAncia", explanation: "Falta acento circunflexo em 'efici\xEAncia'." },
  { wrong: "tendencia", correct: "tend\xEAncia", explanation: "Falta acento circunflexo em 'tend\xEAncia'." },
  { wrong: "tendencias", correct: "tend\xEAncias", explanation: "Falta acento circunflexo em 'tend\xEAncias'." },
  { wrong: "sequencia", correct: "sequ\xEAncia", explanation: "Falta acento circunflexo em 'sequ\xEAncia'." },
  { wrong: "referencia", correct: "refer\xEAncia", explanation: "Falta acento circunflexo em 'refer\xEAncia'." },
  { wrong: "referencias", correct: "refer\xEAncias", explanation: "Falta acento circunflexo em 'refer\xEAncias'." },
  { wrong: "frequencia", correct: "frequ\xEAncia", explanation: "Falta acento circunflexo em 'frequ\xEAncia'." },
  { wrong: "conferencia", correct: "confer\xEAncia", explanation: "Falta acento circunflexo em 'confer\xEAncia'." },
  { wrong: "assistencia", correct: "assist\xEAncia", explanation: "Falta acento circunflexo em 'assist\xEAncia'." },
  { wrong: "residencia", correct: "resid\xEAncia", explanation: "Falta acento circunflexo em 'resid\xEAncia'." },
  { wrong: "competencia", correct: "compet\xEAncia", explanation: "Falta acento circunflexo em 'compet\xEAncia'." },
  { wrong: "competencias", correct: "compet\xEAncias", explanation: "Falta acento circunflexo em 'compet\xEAncias'." },
  { wrong: "permanencia", correct: "perman\xEAncia", explanation: "Falta acento circunflexo em 'perman\xEAncia'." },
  { wrong: "urgencia", correct: "urg\xEAncia", explanation: "Falta acento circunflexo em 'urg\xEAncia'." },
  { wrong: "emergencia", correct: "emerg\xEAncia", explanation: "Falta acento circunflexo em 'emerg\xEAncia'." },
  { wrong: "agencia", correct: "ag\xEAncia", explanation: "Falta acento circunflexo em 'ag\xEAncia'." },
  { wrong: "agencias", correct: "ag\xEAncias", explanation: "Falta acento circunflexo em 'ag\xEAncias'." },
  { wrong: "historico", correct: "hist\xF3rico", explanation: "Falta acento agudo em 'hist\xF3rico'." },
  { wrong: "historicos", correct: "hist\xF3ricos", explanation: "Falta acento agudo em 'hist\xF3ricos'." },
  { wrong: "negocio", correct: "neg\xF3cio", explanation: "Falta acento agudo em 'neg\xF3cio'." },
  { wrong: "negocios", correct: "neg\xF3cios", explanation: "Falta acento agudo em 'neg\xF3cios'." },
  { wrong: "inicio", correct: "in\xEDcio", explanation: "Falta acento agudo em 'in\xEDcio'." },
  { wrong: "inicios", correct: "in\xEDcios", explanation: "Falta acento agudo em 'in\xEDcios'." },
  { wrong: "usuario", correct: "usu\xE1rio", explanation: "Falta acento agudo em 'usu\xE1rio'." },
  { wrong: "usuarios", correct: "usu\xE1rios", explanation: "Falta acento agudo em 'usu\xE1rios'." },
  { wrong: "servico", correct: "servi\xE7o", explanation: "Falta cedilha em 'servi\xE7o'." },
  { wrong: "servicos", correct: "servi\xE7os", explanation: "Falta cedilha em 'servi\xE7os'." },
  { wrong: "grafico", correct: "gr\xE1fico", explanation: "Falta acento agudo em 'gr\xE1fico'." },
  { wrong: "graficos", correct: "gr\xE1ficos", explanation: "Falta acento agudo em 'gr\xE1ficos'." },
  { wrong: "pagina", correct: "p\xE1gina", explanation: "Falta acento agudo em 'p\xE1gina'." },
  { wrong: "paginas", correct: "p\xE1ginas", explanation: "Falta acento agudo em 'p\xE1ginas'." },
  { wrong: "conteudo", correct: "conte\xFAdo", explanation: "Falta acento agudo em 'conte\xFAdo'." },
  { wrong: "conteudos", correct: "conte\xFAdos", explanation: "Falta acento agudo em 'conte\xFAdos'." },
  { wrong: "veiculo", correct: "ve\xEDculo", explanation: "Falta acento agudo em 've\xEDculo'." },
  { wrong: "veiculos", correct: "ve\xEDculos", explanation: "Falta acento agudo em 've\xEDculos'." },
  { wrong: "curriculo", correct: "curr\xEDculo", explanation: "Falta acento agudo em 'curr\xEDculo'." },
  { wrong: "curriculos", correct: "curr\xEDculos", explanation: "Falta acento agudo em 'curr\xEDculos'." },
  { wrong: "ingles", correct: "ingl\xEAs", explanation: "Falta acento circunflexo em 'ingl\xEAs'." },
  { wrong: "portugues", correct: "portugu\xEAs", explanation: "Falta acento circunflexo em 'portugu\xEAs'." },
  { wrong: "frances", correct: "franc\xEAs", explanation: "Falta acento circunflexo em 'franc\xEAs'." },
  { wrong: "japones", correct: "japon\xEAs", explanation: "Falta acento circunflexo em 'japon\xEAs'." },
  { wrong: "chines", correct: "chin\xEAs", explanation: "Falta acento circunflexo em 'chin\xEAs'." },
  { wrong: "alemao", correct: "alem\xE3o", explanation: "Falta acentua\xE7\xE3o (til) em 'alem\xE3o'." },
  { wrong: "voce", correct: "voc\xEA", explanation: "Falta acento circunflexo em 'voc\xEA'." },
  { wrong: "tambem", correct: "tamb\xE9m", explanation: "Falta acento agudo em 'tamb\xE9m'." },
  { wrong: "porem", correct: "por\xE9m", explanation: "Falta acento agudo em 'por\xE9m'." },
  { wrong: "alem", correct: "al\xE9m", explanation: "Falta acento agudo em 'al\xE9m'." },
  { wrong: "ate", correct: "at\xE9", explanation: "Falta acento agudo em 'at\xE9'." },
  { wrong: "lider", correct: "l\xEDder", explanation: "Falta acento agudo em 'l\xEDder'." },
  { wrong: "lideres", correct: "l\xEDderes", explanation: "Falta acento agudo em 'l\xEDderes'." },
  { wrong: "lideranca", correct: "lideran\xE7a", explanation: "Falta cedilha em 'lideran\xE7a'." },
  { wrong: "liderancas", correct: "lideran\xE7as", explanation: "Falta cedilha em 'lideran\xE7as'." },
  { wrong: "visao", correct: "vis\xE3o", explanation: "Falta til em 'vis\xE3o'." },
  { wrong: "missao", correct: "miss\xE3o", explanation: "Falta til em 'miss\xE3o'." }
];
function checkSpellingErrorsInText(text, fieldName) {
  const textLower = text.toLowerCase();
  const found = [];
  PT_TYPOS.forEach((typo, idx) => {
    const escaped = typo.wrong.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(textLower)) {
      found.push({
        id: `spelling_${fieldName}_${typo.wrong}_${idx}`,
        label: `Erro ortogr\xE1fico: "${typo.wrong}"`,
        severity: "CRITICAL",
        pointsDeducted: 2,
        category: "Erros",
        type: "error",
        message: `Identificamos um erro de portugu\xEAs no campo de ${fieldName}. Foi encontrado o termo "${typo.wrong}". ${typo.explanation} Corre\xE7\xE3o sugerida: "${typo.correct}".`
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
      message: `No campo de ${fieldName}, o trecho "${match[0]}" est\xE1 incorreto. Para indicar tempo decorrido no passado, deve-se usar o verbo haver: "h\xE1 ${match[2]} ${match[3]}(s)".`
    });
  }
  const aTempoRegex = /\b(a|à)\s+tempo\b/i;
  if (aTempoRegex.test(textLower) && textLower.includes("tempo") && (textLower.includes("trabalho") || textLower.includes("estudo") || textLower.includes("moro") || textLower.includes("\xE1rea") || textLower.includes("area"))) {
    found.push({
      id: `grammar_a_tempo_${fieldName}`,
      label: `Erro gramatical: "a/\xE0 tempo"`,
      severity: "CRITICAL",
      pointsDeducted: 2,
      category: "Erros",
      type: "error",
      message: `No campo de ${fieldName}, identificamos o uso de "a tempo" ou "\xE0 tempo" em contexto de tempo decorrido. O correto \xE9 "h\xE1 tempo" ou "h\xE1 muito tempo" (do verbo haver).`
    });
  }
  return found;
}
function checkNonsenseInText(text, fieldName) {
  const textLower = text.toLowerCase();
  const found = [];
  const placeholders = [
    "seu-nome",
    "seu_nome",
    "nome-completo",
    "nome_completo",
    "seu-email",
    "seu_email",
    "email-aqui",
    "email_aqui",
    "seu-telefone",
    "seu_telefone",
    "telefone-aqui",
    "telefone_aqui",
    "seu-link",
    "seu_link",
    "link-aqui",
    "link_aqui",
    "seu-site",
    "seu_site",
    "site-aqui",
    "site_aqui",
    "seu-usuario",
    "seu_usuario",
    "username",
    "usuario-aqui",
    "exemplo.com",
    "teste.com",
    "xxxx",
    "xxxxx",
    "xxxxxx",
    "asdf",
    "qwerty",
    "lorem ipsum",
    "dolor sit amet"
  ];
  placeholders.forEach((pl, idx) => {
    if (textLower.includes(pl)) {
      found.push({
        id: `nonsense_placeholder_${fieldName}_${idx}`,
        label: `Texto de marcador tempor\xE1rio (placeholder)`,
        severity: "CRITICAL",
        pointsDeducted: 4,
        category: "Erros",
        type: "error",
        message: `O campo de ${fieldName} cont\xE9m o texto marcador "${pl}". Substitua-o por suas informa\xE7\xF5es reais.`
      });
    }
  });
  const gibberishWordRegex = /\b(aaa|bbb|ccc|ddd|eee|fff|ggg|hhh|iii|jjj|kkk|lll|mmm|nnn|ooo|ppp|qqq|rrr|sss|ttt|uuu|vvv|www|xxx|yyy|zzz|asdf|qwerty|zxcv|123|1234|teste|test)\b/i;
  const gibberishMatch = text.match(gibberishWordRegex);
  if (gibberishMatch) {
    found.push({
      id: `nonsense_gibberish_${fieldName}`,
      label: `Texto sem sentido ou de teste ("${gibberishMatch[0]}")`,
      severity: "CRITICAL",
      pointsDeducted: 4,
      category: "Erros",
      type: "error",
      message: `No campo de ${fieldName}, identificamos o termo de teste/preenchimento "${gibberishMatch[0]}". Preencha com informa\xE7\xF5es profissionais reais.`
    });
  }
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
      message: `No campo de ${fieldName}, identificamos uma palavra duplicada consecutivamente: "${doubleMatch[0]}". Corrija para evitar problemas de digita\xE7\xE3o.`
    });
  }
  const repeatLetterRegex = /([a-z])\1{2,}/i;
  const repeatMatch = text.match(repeatLetterRegex);
  if (repeatMatch && !textLower.includes("https://") && !textLower.includes("http://") && !found.some((f) => f.id.startsWith(`nonsense_gibberish_${fieldName}`))) {
    found.push({
      id: `nonsense_repeat_letter_${fieldName}`,
      label: `Repeti\xE7\xE3o de caracteres ("${repeatMatch[0]}")`,
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: `No campo de ${fieldName}, identificamos uma repeti\xE7\xE3o de caracteres suspeita: "${repeatMatch[0]}". Verifique se h\xE1 algum erro de digita\xE7\xE3o.`
    });
  }
  const whitelist = /* @__PURE__ */ new Set([
    "html",
    "css",
    "sql",
    "gcp",
    "aws",
    "pdf",
    "svg",
    "xml",
    "json",
    "docx",
    "http",
    "https",
    "github",
    "linkedin",
    "postgresql",
    "mysql",
    "mongodb",
    "graphql",
    "nestjs",
    "nodejs",
    "react",
    "redux",
    "scrum",
    "agile",
    "devops",
    "docker",
    "kubernetes",
    "typescript",
    "javascript",
    "python",
    "php",
    "java",
    "swift",
    "kotlin",
    "laravel",
    "django",
    "spring",
    "aspnet",
    "csharp",
    "cobol",
    "fortran",
    "delphi",
    "pascal",
    "nginx",
    "apache",
    "linux",
    "ubuntu",
    "debian",
    "centos",
    "fedora",
    "windows",
    "macos",
    "android",
    "ios",
    "vscode",
    "excel",
    "word",
    "powerpoint",
    "outlook",
    "office",
    "powerbi",
    "tableau",
    "jira",
    "trello",
    "slack",
    "zoom",
    "teams",
    "canva",
    "figma",
    "sketch",
    "photoshop",
    "illustrator",
    "indesign",
    "premiere",
    "aftereffects",
    "lightroom",
    "autocad",
    "revit",
    "sketchup",
    "solidworks",
    "blender",
    "unity",
    "unreal",
    "godot",
    "tensorflow",
    "pytorch",
    "keras",
    "opencv",
    "scikit-learn",
    "numpy",
    "pandas",
    "matplotlib",
    "seaborn",
    "scipy",
    "statsmodels",
    "nltk",
    "spacy",
    "gensim",
    "beautifulsoup",
    "selenium",
    "scrapy",
    "puppeteer",
    "playwright",
    "cypress",
    "jest",
    "mocha",
    "chai",
    "jasmine",
    "karma",
    "protractor",
    "eslint",
    "prettier",
    "webpack",
    "babel",
    "vite",
    "gulp",
    "grunt",
    "npm",
    "yarn",
    "pnpm",
    "composer",
    "pip",
    "maven",
    "gradle",
    "git",
    "subversion",
    "mercurial",
    "bitbucket",
    "gitlab",
    "heroku",
    "netlify",
    "vercel",
    "digitalocean",
    "cloudflare",
    "fastly",
    "datadog",
    "newrelic",
    "sentry",
    "logrocket",
    "postman",
    "swagger",
    "insomnia",
    "soapui",
    "fiddler",
    "wireshark",
    "nmap",
    "metasploit",
    "burpsuite",
    "owasp",
    "jenkins",
    "circleci",
    "travisci",
    "githubactions",
    "gitlabci",
    "bitbucketpipelines",
    "azuredevops",
    "awsdevops",
    "googlecloudbuild",
    "terragrunt",
    "pulumi",
    "ansible",
    "chef",
    "puppet",
    "saltstack",
    "vagrant",
    "virtualbox",
    "vmware",
    "hyperv",
    "qemu",
    "proxmox",
    "openshift",
    "rancher",
    "helm",
    "istio",
    "linkerd",
    "consul",
    "vault",
    "nomad",
    "waypoint",
    "boundary",
    "html5",
    "css3",
    "es6",
    "webgl",
    "webrtc",
    "websocket",
    "oauth",
    "jwt",
    "saml",
    "ldap",
    "active-directory",
    "okta",
    "auth0",
    "keycloak",
    "firebase",
    "supabase",
    "back4app",
    "parse",
    "nh",
    "sh",
    "ch",
    "lh",
    "bwc",
    "bpx",
    "cnpj",
    "cpf",
    "rg",
    "cep",
    "ddd",
    "ddi",
    "ctps",
    "cnh",
    "clt",
    "mei",
    "pj",
    "ltda",
    "s/a",
    "sa",
    "eireli",
    "epp",
    "me",
    "ong",
    "oscip",
    "osc",
    "ciee",
    "nube",
    "iel",
    "senai",
    "senac",
    "sebrae",
    "sesi",
    "sesc",
    "sest",
    "senat",
    "sindicato",
    "banco",
    "caixa",
    "bradesco",
    "ita\xFA",
    "itau",
    "santander",
    "safra",
    "banrisul",
    "bmg",
    "pan",
    "inter",
    "nubank",
    "neon",
    "original",
    "c6",
    "bmg",
    "votorantim",
    "bndes",
    "fies",
    "prouni",
    "enem",
    "sisu",
    "fatec",
    "etec",
    "senai",
    "senac",
    "usp",
    "unicamp",
    "unesp",
    "ufrj",
    "ufmg",
    "ufrgs",
    "ufsc",
    "ufpr",
    "unb",
    "ufpe",
    "ufba",
    "ufc",
    "ufg",
    "ufms",
    "ufmt",
    "ufpa",
    "ufpb",
    "ufpe",
    "ufpi",
    "ufrn",
    "ufro",
    "ufrr",
    "ufse",
    "uft",
    "utfpr",
    "puc",
    "fgv",
    "insper",
    "mackenzie",
    "faap",
    "espm",
    "unip",
    "unisa",
    "uniceub",
    "unilasalle",
    "unisinos",
    "univali",
    "pucsp",
    "pucrio",
    "pucpr",
    "pucrs",
    "pucminas",
    "pucgo",
    "pucamp"
  ]);
  const words = text.split(/[\s,;.://"'()\-–—_]+/);
  for (const word of words) {
    const cleanWord = word.trim().toLowerCase();
    if (cleanWord.length > 5) {
      const hasVowels = /[aeiouáéíóúâêôãõàèìòù]/i.test(cleanWord);
      if (!hasVowels && /^[a-z]+$/i.test(cleanWord) && !whitelist.has(cleanWord)) {
        found.push({
          id: `nonsense_no_vowels_${fieldName}_${cleanWord}`,
          label: `Palavra sem vogais (poss\xEDvel erro de digita\xE7\xE3o)`,
          severity: "CRITICAL",
          pointsDeducted: 3,
          category: "Erros",
          type: "error",
          message: `No campo de ${fieldName}, encontramos a palavra "${word}" que parece n\xE3o conter nenhuma vogal. Verifique se \xE9 uma palavra digitada incorretamente ou sem sentido.`
        });
        break;
      }
      const consonantCluster = /[^aeiouáéíóúâêôãõàèìòù]{5,}/i;
      if (consonantCluster.test(cleanWord) && !whitelist.has(cleanWord) && !cleanWord.includes("postgresql") && !cleanWord.includes("typescript") && !cleanWord.includes("javascript")) {
        found.push({
          id: `nonsense_consonants_${fieldName}_${cleanWord}`,
          label: `Sequ\xEAncia de consoantes inv\xE1lida`,
          severity: "CRITICAL",
          pointsDeducted: 3,
          category: "Erros",
          type: "error",
          message: `No campo de ${fieldName}, a palavra "${word}" possui uma sequ\xEAncia incomum de consoantes. Verifique se h\xE1 erros de digita\xE7\xE3o.`
        });
        break;
      }
    }
  }
  return found;
}
function checkResumeDataQuality(resumeData) {
  const issues = [];
  const pInfo = resumeData.personalInfo || {};
  const fullName = pInfo.fullName || pInfo.name || "";
  const location = pInfo.location || "";
  if (fullName) {
    issues.push(...checkSpellingErrorsInText(fullName, "Nome"));
    issues.push(...checkNonsenseInText(fullName, "Nome"));
    const words = fullName.trim().split(/\s+/).filter((w) => w.length >= 3 && !["de", "da", "do", "das", "dos", "e"].includes(w.toLowerCase()));
    const hasLowercaseWord = words.some((w) => w[0] && w[0] === w[0].toLowerCase() && /[a-z]/i.test(w[0]));
    if (hasLowercaseWord) {
      issues.push({
        id: "nome_com_minuscula",
        label: "Nome pr\xF3prio iniciado com letra min\xFAscula",
        severity: "CRITICAL",
        pointsDeducted: 3,
        category: "Erros",
        type: "error",
        message: `O seu nome pr\xF3prio "${fullName}" possui palavras iniciadas com letras min\xFAsculas. Nomes pr\xF3prios devem sempre iniciar com letras mai\xFAsculas.`
      });
    }
  }
  if (location) {
    issues.push(...checkSpellingErrorsInText(location, "Localiza\xE7\xE3o"));
    issues.push(...checkNonsenseInText(location, "Localiza\xE7\xE3o"));
  }
  const summary = resumeData.summary || "";
  if (summary) {
    issues.push(...checkSpellingErrorsInText(summary, "Resumo Profissional"));
    issues.push(...checkNonsenseInText(summary, "Resumo Profissional"));
  }
  const experiences = resumeData.experience || [];
  experiences.forEach((exp, idx) => {
    const company = exp.company || "";
    const position = exp.position || "";
    const description = exp.description || "";
    if (company) {
      issues.push(...checkSpellingErrorsInText(company, `Experi\xEAncia (${idx + 1}): Empresa`));
      issues.push(...checkNonsenseInText(company, `Experi\xEAncia (${idx + 1}): Empresa`));
      const isGeneral = company.toLowerCase().includes("informal") || company.toLowerCase().includes("aut\xF4nomo") || company.toLowerCase().includes("freelance") || company.toLowerCase().includes("bico");
      if (company === company.toLowerCase() && company.length > 3 && !isGeneral) {
        issues.push({
          id: `empresa_minuscula_${idx}`,
          label: "Nome da empresa em letras min\xFAsculas",
          severity: "IMPORTANT",
          pointsDeducted: 2,
          category: "Aten\xE7\xF5es",
          type: "warning",
          message: `O nome da empresa "${company}" est\xE1 totalmente em letras min\xFAsculas na experi\xEAncia ${idx + 1}. Capitalize os nomes de empresas para maior profissionalismo.`
        });
      }
    }
    if (position) {
      issues.push(...checkSpellingErrorsInText(position, `Experi\xEAncia (${idx + 1}): Cargo`));
      issues.push(...checkNonsenseInText(position, `Experi\xEAncia (${idx + 1}): Cargo`));
    }
    if (description) {
      issues.push(...checkSpellingErrorsInText(description, `Experi\xEAncia (${idx + 1}): Descri\xE7\xE3o`));
      issues.push(...checkNonsenseInText(description, `Experi\xEAncia (${idx + 1}): Descri\xE7\xE3o`));
      if (description.toLowerCase().includes("coisas") || description.toLowerCase().includes("etc") && (description.toLowerCase().match(/\betc\b/g) || []).length > 1) {
        issues.push({
          id: `exp_desc_weak_words_${idx}`,
          label: "Termos vagos ou informais na descri\xE7\xE3o",
          severity: "IMPORTANT",
          pointsDeducted: 2,
          category: "Aten\xE7\xF5es",
          type: "warning",
          message: `Identificamos termos gen\xE9ricos (como 'coisas', 'etc') na descri\xE7\xE3o da experi\xEAncia ${idx + 1}. Substitua-os por descri\xE7\xF5es detalhadas e profissionais das suas tarefas.`
        });
      }
    }
  });
  const projects = resumeData.projects || [];
  projects.forEach((proj, idx) => {
    const name = proj.name || "";
    const description = proj.description || "";
    const technologies = proj.technologies || "";
    if (name) {
      issues.push(...checkSpellingErrorsInText(name, `Projeto (${idx + 1}): Nome`));
      issues.push(...checkNonsenseInText(name, `Projeto (${idx + 1}): Nome`));
    }
    if (description) {
      issues.push(...checkSpellingErrorsInText(description, `Projeto (${idx + 1}): Descri\xE7\xE3o`));
      issues.push(...checkNonsenseInText(description, `Projeto (${idx + 1}): Descri\xE7\xE3o`));
    }
    if (technologies) {
      issues.push(...checkSpellingErrorsInText(technologies, `Projeto (${idx + 1}): Tecnologias`));
      issues.push(...checkNonsenseInText(technologies, `Projeto (${idx + 1}): Tecnologias`));
    }
  });
  const education = resumeData.education || [];
  education.forEach((edu, idx) => {
    const institution = edu.institution || "";
    const degree = edu.degree || "";
    const field = edu.field || "";
    if (institution) {
      issues.push(...checkSpellingErrorsInText(institution, `Forma\xE7\xE3o (${idx + 1}): Institui\xE7\xE3o`));
      issues.push(...checkNonsenseInText(institution, `Forma\xE7\xE3o (${idx + 1}): Institui\xE7\xE3o`));
      if (institution === institution.toLowerCase() && institution.length > 3) {
        issues.push({
          id: `instituicao_minuscula_${idx}`,
          label: "Nome da institui\xE7\xE3o em letras min\xFAsculas",
          severity: "IMPORTANT",
          pointsDeducted: 2,
          category: "Aten\xE7\xF5es",
          type: "warning",
          message: `O nome da institui\xE7\xE3o "${institution}" est\xE1 totalmente em letras min\xFAsculas na forma\xE7\xE3o ${idx + 1}. Recomenda-se capitaliz\xE1-lo.`
        });
      }
    }
    if (degree) {
      issues.push(...checkSpellingErrorsInText(degree, `Forma\xE7\xE3o (${idx + 1}): Grau`));
      issues.push(...checkNonsenseInText(degree, `Forma\xE7\xE3o (${idx + 1}): Grau`));
    }
    if (field) {
      issues.push(...checkSpellingErrorsInText(field, `Forma\xE7\xE3o (${idx + 1}): \xC1rea`));
      issues.push(...checkNonsenseInText(field, `Forma\xE7\xE3o (${idx + 1}): \xC1rea`));
    }
  });
  const skills = resumeData.skills || [];
  skills.forEach((skill, idx) => {
    if (typeof skill === "string" && skill) {
      issues.push(...checkSpellingErrorsInText(skill, `Habilidade (${idx + 1})`));
      issues.push(...checkNonsenseInText(skill, `Habilidade (${idx + 1})`));
    }
  });
  const certifications = resumeData.certifications || [];
  certifications.forEach((cert, idx) => {
    const name = typeof cert === "string" ? cert : cert.name || cert.title || "";
    const institution = typeof cert === "object" ? cert.institution || "" : "";
    if (name) {
      issues.push(...checkSpellingErrorsInText(name, `Certifica\xE7\xE3o (${idx + 1}): Nome`));
      issues.push(...checkNonsenseInText(name, `Certifica\xE7\xE3o (${idx + 1}): Nome`));
    }
    if (institution) {
      issues.push(...checkSpellingErrorsInText(institution, `Certifica\xE7\xE3o (${idx + 1}): Institui\xE7\xE3o`));
      issues.push(...checkNonsenseInText(institution, `Certifica\xE7\xE3o (${idx + 1}): Institui\xE7\xE3o`));
    }
  });
  const seenMessages = /* @__PURE__ */ new Set();
  return issues.filter((issue) => {
    if (seenMessages.has(issue.message)) {
      return false;
    }
    seenMessages.add(issue.message);
    return true;
  });
}
function evaluateProfessionalSummary(summary, resumeData) {
  const issues = [];
  const summaryLower = summary.trim().toLowerCase();
  if (!summary || summary.trim().length === 0) {
    return [{
      id: "summary_empty",
      label: "Resumo profissional ausente",
      severity: "CRITICAL",
      pointsDeducted: 10,
      category: "Erros",
      type: "error",
      message: "Seu resumo profissional est\xE1 ausente. Esta se\xE7\xE3o \xE9 a primeira coisa que os recrutadores e sistemas ATS analisam para entender seu perfil. Adicione uma breve apresenta\xE7\xE3o de sua carreira."
    }];
  }
  if (summary.trim().length < 100) {
    issues.push({
      id: "summary_too_short",
      label: "Resumo profissional muito curto",
      severity: "CRITICAL",
      pointsDeducted: 5,
      category: "Erros",
      type: "error",
      message: "Seu resumo profissional est\xE1 muito curto e pode n\xE3o transmitir informa\xE7\xF5es suficientes ao recrutador. Utilize esse espa\xE7o para apresentar rapidamente quem voc\xEA \xE9 e quais s\xE3o seus principais pontos fortes."
    });
    return issues;
  }
  if (summary.trim().length > 600) {
    issues.push({
      id: "summary_too_long",
      label: "Resumo profissional muito extenso",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "O resumo profissional est\xE1 extenso e pode dificultar a leitura. Procure destacar apenas as informa\xE7\xF5es mais relevantes em at\xE9 quatro ou cinco linhas."
    });
  }
  const informalTerms = ["bico", "bicos", "trabalho informal", "trabalhos informais", "trampo", "trampos", "ganhar uma grana", "quebra-galho", "correria", "vira\xE7\xE3o"];
  const hasInformal = informalTerms.some((term) => {
    const regex = new RegExp(`\\b${term}s?\\b`, "i");
    return regex.test(summaryLower);
  });
  if (hasInformal) {
    issues.push({
      id: "summary_informal",
      label: "Linguagem informal no resumo",
      severity: "CRITICAL",
      pointsDeducted: 3,
      category: "Erros",
      type: "error",
      message: "Seu resumo profissional utiliza uma linguagem informal. Prefira uma escrita objetiva e profissional, transmitindo confian\xE7a e clareza."
    });
  }
  const declaresNoExp = /\b(não\s+tenho\s+experiência|sem\s+experiência|ainda\s+não\s+trabalhei|não\s+possuo\s+experiência|falta\s+de\s+experiência|ainda\s+não\s+tenho\s+experiência|primeiro\s+emprego)\b/i.test(summaryLower);
  const experiencesList = resumeData.experience || [];
  const hasNoExpInHistory = experiencesList.length === 0;
  if (declaresNoExp || hasNoExpInHistory) {
    issues.push({
      id: "summary_no_experience",
      label: "Falta de experi\xEAncia profissional formal",
      severity: "IMPORTANT",
      pointsDeducted: 3,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "Caso voc\xEA ainda n\xE3o possua experi\xEAncia profissional, destaque sua forma\xE7\xE3o, projetos, certifica\xE7\xF5es e conhecimentos t\xE9cnicos relevantes para a vaga."
    });
  }
  const objectiveKeywords = [
    "objetivo",
    "busco",
    "oportunidade",
    "desejo atuar",
    "foco em",
    "com foco em",
    "pretendo atuar",
    "atua\xE7\xE3o na \xE1rea",
    "almejo",
    "vaga de",
    "cargo de",
    "com interesse",
    "interesse em",
    "interessado em",
    "focado em",
    "focando em",
    "buscando",
    "procurando",
    "desejo de",
    "pretendo",
    "vontade de atuar",
    "interesse de atuar"
  ];
  const hasObjective = objectiveKeywords.some((keyword) => summaryLower.includes(keyword)) || summaryLower.includes("para atuar") || summaryLower.includes("buscar posi\xE7\xE3o");
  if (!hasObjective) {
    issues.push({
      id: "summary_no_objective",
      label: "Objetivo profissional pouco claro",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "O resumo apresenta sua experi\xEAncia, mas n\xE3o deixa claro seu objetivo profissional. Informar a \xE1rea em que deseja atuar ajuda o recrutador a entender seu perfil."
    });
  }
  const genericClich\u00E9s = ["em busca de novos desafios", "profissional din\xE2mico", "focado em resultados", "facilidade de aprendizado", "disposi\xE7\xE3o para aprender", "vontade de aprender", "proativo", "perfil proativo"];
  const clicheCount = genericClich\u00E9s.filter((cliche) => summaryLower.includes(cliche)).length;
  if (clicheCount >= 2) {
    issues.push({
      id: "summary_generic",
      label: "Resumo profissional muito gen\xE9rico",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: 'Seu resumo profissional est\xE1 muito gen\xE9rico e n\xE3o destaca seus principais diferenciais. Tente mencionar sua \xE1rea de atua\xE7\xE3o, principais compet\xEAncias e objetivo profissional em poucas linhas.\n\nExemplo:\n"Profissional de Suporte em TI com experi\xEAncia em atendimento t\xE9cnico, manuten\xE7\xE3o de computadores e redes. Atualmente aprofundando conhecimentos em Ciberseguran\xE7a e buscando oportunidades para aplicar e desenvolver habilidades t\xE9cnicas."'
    });
  }
  const isTIOrTech = JSON.stringify(resumeData).toLowerCase().match(/\b(ti|tecnologia|programador|desenvolvedor|computação|sistemas|software|web|analista de dados|it|cybersecurity|redes)\b/i);
  if (isTIOrTech) {
    const techWords = ["react", "node", "javascript", "python", "java", "sql", "html", "css", "git", "aws", "gcp", "docker", "excel", "figma", "c#", "php", "typescript", "linux", "windows", "scrum", "office"];
    const hasTech = techWords.some((tech) => summaryLower.includes(tech));
    if (!hasTech) {
      issues.push({
        id: "summary_missing_tech",
        label: "Aus\xEAncia de ferramentas/tecnologias no resumo",
        severity: "IMPORTANT",
        pointsDeducted: 2,
        category: "Aten\xE7\xF5es",
        type: "warning",
        message: "Considere mencionar ferramentas ou tecnologias que fazem parte da sua rotina profissional. Isso facilita a identifica\xE7\xE3o do seu perfil pelos sistemas ATS."
      });
    }
  }
  const areas = [
    { name: "TI", keywords: ["ti", "tecnologia", "desenvolvedor", "programador", "sistemas", "suporte", "redes", "computador", "ti", "it"] },
    { name: "Vendas/Comercial", keywords: ["vendas", "vendedor", "comercial", "atendimento", "balc\xE3o", "caixa", "clientes", "loja"] },
    { name: "Administrativo", keywords: ["administrativo", "administra\xE7\xE3o", "auxiliar", "financeiro", "documentos", "planilhas", "escrit\xF3rio"] },
    { name: "Constru\xE7\xE3o/Operacional", keywords: ["obras", "pedreiro", "ajudante", "constru\xE7\xE3o", "oper\xE1rio", "estoque", "produ\xE7\xE3o", "f\xE1brica", "manuten\xE7\xE3o"] }
  ];
  let matchedAreasCount = 0;
  areas.forEach((area) => {
    const matched = area.keywords.some((kw) => {
      const r = new RegExp(`\\b${kw}\\b`, "i");
      return r.test(summaryLower);
    });
    if (matched) matchedAreasCount++;
  });
  if (matchedAreasCount >= 3) {
    issues.push({
      id: "summary_too_broad",
      label: "Foco profissional muito amplo no resumo",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "O resumo aborda diversos assuntos ao mesmo tempo. Tente direcionar o texto para a \xE1rea em que realmente deseja atuar."
    });
  }
  const actionVerbs = ["gerenciei", "liderei", "desenvolvi", "implementei", "otimizei", "reduzi", "aumentei", "alcancei", "conquistei", "desenvolver", "implementar", "otimizar", "reduzir", "gerenciar", "liderar", "estruturar", "estruturando", "otimizando", "gerando", "gerar", "reduzindo", "aumentando", "desenvolvendo"];
  const hasActionVerb = actionVerbs.some((verb) => summaryLower.includes(verb));
  const listsJobs = summaryLower.includes("atuei como") || summaryLower.includes("trabalhei como") || summaryLower.includes("experi\xEAncia como") || summaryLower.includes("experi\xEAncia em");
  if (listsJobs && !hasActionVerb) {
    issues.push({
      id: "summary_no_results",
      label: "Resumo focado apenas em cargos (sem resultados)",
      severity: "IMPORTANT",
      pointsDeducted: 1,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "Voc\xEA descreve sua experi\xEAncia, mas n\xE3o destaca resultados ou responsabilidades relevantes. Sempre que poss\xEDvel, mencione atividades, tecnologias utilizadas ou conquistas."
    });
  }
  const isStudyingOrRecent = /cursando|graduando|estudante|formando|formado em \d{4}/i.test(summaryLower) || resumeData.education && resumeData.education.some((edu) => {
    const end = String(edu.endDate || edu.graduationDate || "").toLowerCase();
    return end.includes("cursando") || end.includes("2024") || end.includes("2025") || end.includes("2026");
  });
  if (isStudyingOrRecent && experiencesList.length <= 1) {
    issues.push({
      id: "summary_recently_graduated",
      label: "Destaque estrat\xE9gico para rec\xE9m-formados",
      severity: "SUGGESTION",
      pointsDeducted: 0,
      category: "Sugest\xF5es",
      type: "info",
      message: "Para profissionais em in\xEDcio de carreira, \xE9 recomend\xE1vel destacar forma\xE7\xE3o, projetos acad\xEAmicos, certifica\xE7\xF5es e habilidades t\xE9cnicas que demonstrem potencial."
    });
  }
  const inTransition = summaryLower.includes("transi\xE7\xE3o") || summaryLower.includes("mudan\xE7a de \xE1rea") || summaryLower.includes("migrando") || summaryLower.includes("migra\xE7\xE3o") || summaryLower.includes("nova carreira") || summaryLower.includes("nova \xE1rea");
  if (inTransition) {
    issues.push({
      id: "summary_career_transition",
      label: "Sugest\xE3o para transi\xE7\xE3o de carreira",
      severity: "SUGGESTION",
      pointsDeducted: 0,
      category: "Sugest\xF5es",
      type: "info",
      message: "Seu resumo pode explicar brevemente sua transi\xE7\xE3o de carreira e destacar compet\xEAncias que podem ser aproveitadas na nova \xE1rea."
    });
  }
  const commonTechOrKeywords = ["react", "node", "javascript", "python", "sql", "excel", "vendas", "atendimento", "financeiro", "gest\xE3o", "projetos", "redes", "design", "figma", "suporte", "marketing", "rh", "recrutamento", "contabilidade", "log\xEDstica", "estoque", "produ\xE7\xE3o", "qualidade", "processos", "sistemas"];
  const matchedKeywordsCount = commonTechOrKeywords.filter((kw) => summaryLower.includes(kw)).length;
  const isGeneric = issues.some((i) => i.id === "summary_generic");
  if (matchedKeywordsCount < 2 && !isGeneric) {
    issues.push({
      id: "summary_few_keywords",
      label: "Poucas palavras-chave no resumo",
      severity: "IMPORTANT",
      pointsDeducted: 2,
      category: "Aten\xE7\xF5es",
      type: "warning",
      message: "Seu resumo pode ser fortalecido com palavras-chave relacionadas \xE0 sua \xE1rea de atua\xE7\xE3o. Isso aumenta as chances de compatibilidade com sistemas ATS."
    });
  }
  const criticalOrImportantIssues = issues.filter((i) => i.severity === "CRITICAL" || i.severity === "IMPORTANT");
  if (criticalOrImportantIssues.length === 0) {
    const isVeryRich = summary.trim().length >= 200 && matchedKeywordsCount >= 3 && hasActionVerb && hasObjective;
    if (isVeryRich) {
      issues.push({
        id: "summary_excellent",
        label: "Excelente resumo profissional",
        severity: "SUGGESTION",
        pointsDeducted: 0,
        category: "Sugest\xF5es",
        type: "success",
        message: "Excelente resumo profissional. O resumo apresenta sua experi\xEAncia, compet\xEAncias e objetivos de forma clara, facilitando a leitura por recrutadores e sistemas ATS."
      });
    } else {
      issues.push({
        id: "summary_good_quality",
        label: "Resumo de boa qualidade",
        severity: "SUGGESTION",
        pointsDeducted: 0,
        category: "Sugest\xF5es",
        type: "success",
        message: "Seu resumo profissional est\xE1 claro, organizado e apresenta bem seu perfil. Pequenos ajustes podem deix\xE1-lo ainda mais atrativo para sistemas ATS e recrutadores."
      });
    }
  }
  return issues;
}

// src/lib/atsScore.ts
var OUT_OF_PLACE_ORGS2 = [
  {
    id: "ciee",
    displayName: "CIEE",
    type: "agent",
    patterns: ["ciee", "centro de integra\xE7\xE3o empresa-escola", "centro de integracao"]
  },
  {
    id: "nube",
    displayName: "NUBE",
    type: "agent",
    patterns: ["nube", "n\xFAcleo brasileiro de est\xE1gios", "nucleo brasileiro de estagios"]
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
    patterns: ["senai", "servi\xE7o nacional de aprendizagem industrial", "servico nacional de aprendizagem industrial"]
  },
  {
    id: "senac",
    displayName: "SENAC",
    type: "course_platform",
    patterns: ["senac", "servi\xE7o nacional de aprendizagem comercial", "servico nacional de aprendizagem comercial"]
  },
  {
    id: "sebrae",
    displayName: "SEBRAE",
    type: "course_platform",
    patterns: ["sebrae", "servi\xE7o brasileiro de apoio \xE0s micro e pequenas empresas", "servico brasileiro de apoio as micro"]
  },
  {
    id: "curso_em_video",
    displayName: "Curso em V\xEDdeo",
    type: "course_platform",
    patterns: ["curso em v\xEDdeo", "curso em video", "cursos em video", "cursos em v\xEDdeo"]
  },
  {
    id: "fundacao_bradesco",
    displayName: "Funda\xE7\xE3o Bradesco",
    type: "course_platform",
    patterns: ["funda\xE7\xE3o bradesco", "fundacao bradesco"]
  },
  {
    id: "ebac",
    displayName: "EBAC",
    type: "course_platform",
    patterns: ["ebac", "escola brit\xE2nica de artes criativas", "escola britanica de artes criativas"]
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
    displayName: "Super Est\xE1gios",
    type: "agent",
    patterns: ["super est\xE1gios", "super estagios", "superestagios", "superest\xE1gios"]
  },
  {
    id: "abre",
    displayName: "ABRE",
    type: "agent",
    patterns: ["abre", "associa\xE7\xE3o brasileira de est\xE1gios", "associacao brasileira de estagios"]
  }
];
function matchesWord2(text, pattern) {
  if (!text || !pattern) return false;
  const textLower = text.toLowerCase().trim();
  const patternLower = pattern.toLowerCase().trim();
  if (patternLower.includes(".") || patternLower.includes(" ")) {
    return textLower.includes(patternLower);
  }
  const patternEscaped = patternLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(?<=^|[^a-z\xE1\xE9\xED\xF3\xFA\xE2\xEA\xF4\xE3\xF5\xE7])${patternEscaped}(?=$|[^a-z\xE1\xE9\xED\xF3\xFA\xE2\xEA\xF4\xE3\xF5\xE7])`, "i");
  return regex.test(textLower);
}
function calculateAtsScore(rawData, backendAiFeedback = [], aiEvaluations) {
  const resumeData = normalizeResumeData(rawData);
  if (!resumeData) return { score: 0, feedback: [] };
  const engineResult = calculateDeterministicScore(rawData);
  let evals = aiEvaluations || rawData?.atsAnalysis?.aiEvaluations || rawData?.aiEvaluations;
  const evalWeight = {
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
    if (summaryVal && evalWeight[summaryVal] !== void 0) aiModifier += evalWeight[summaryVal];
    if (expVal && evalWeight[expVal] !== void 0) aiModifier += evalWeight[expVal];
    if (projVal && evalWeight[projVal] !== void 0) aiModifier += evalWeight[projVal];
    if (gramVal && evalWeight[gramVal] !== void 0) aiModifier += evalWeight[gramVal];
    if (clarVal && evalWeight[clarVal] !== void 0) aiModifier += evalWeight[clarVal];
  }
  const finalScore = engineResult.score;
  const feedback = [];
  engineResult.detectedIssues.forEach((issue) => {
    feedback.push({
      id: issue.id,
      label: issue.label || "Aviso estrutural",
      type: issue.type,
      category: issue.category,
      message: issue.message || issue.label,
      severity: issue.severity === "CRITICAL" || issue.severity === "IMPORTANT" ? "high" : "medium",
      source: "system"
    });
  });
  const deduplicatedAiFeedback = (Array.isArray(backendAiFeedback) ? backendAiFeedback : []).filter((fb) => {
    if (!fb || typeof fb !== "object") return false;
    if (fb.source === "system") return false;
    const msg = typeof fb.message === "string" ? fb.message.toLowerCase() : "";
    const isAboutFutureGraduation = (msg.includes("2027") || msg.includes("2028") || msg.includes("2029") || msg.includes("data futura") || msg.includes("futuro")) && (msg.includes("conclus\xE3o") || msg.includes("conclusao") || msg.includes("previs\xE3o") || msg.includes("previsao") || msg.includes("prevista") || msg.includes("forma\xE7\xE3o") || msg.includes("gradua\xE7\xE3o") || msg.includes("curso"));
    const mentionsTypoOrErrorWithDate = msg.includes("erro de digita\xE7\xE3o") && (msg.includes("2027") || msg.includes("2028") || msg.includes("ano de") || msg.includes("conclus\xE3o") || msg.includes("conclusao") || msg.includes("prevista") || msg.includes("previs\xE3o") || msg.includes("previsao") || msg.includes("data"));
    if (isAboutFutureGraduation || mentionsTypoOrErrorWithDate) {
      return false;
    }
    if (msg.includes("e-mail") || msg.includes("telefone") || msg.includes("celular") || msg.includes("contato")) {
      if (msg.includes("ausent") || msg.includes("falt") || msg.includes("valid") || msg.includes("complet") || msg.includes("verificar") || msg.includes("format") || msg.includes("correto") || msg.includes("atualiz")) {
        return false;
      }
    }
    if (msg.includes("resumo") && (msg.includes("ausent") || msg.includes("falt"))) return false;
    if (msg.includes("experi\xEAncia") && (msg.includes("ausent") || msg.includes("falt"))) return false;
    if (msg.includes("forma\xE7\xE3o") && (msg.includes("ausent") || msg.includes("falt"))) return false;
    if (msg.includes("habilidade") && (msg.includes("ausent") || msg.includes("falt"))) return false;
    if (msg.includes("completude") || msg.includes("redes sociais") || msg.includes("link") && (msg.includes("verifique") || msg.includes("inv\xE1lido") || msg.includes("formato") || msg.includes("formata\xE7\xE3o") || msg.includes("acessibilidade") || msg.includes("validade") || msg.includes("completo"))) {
      return false;
    }
    const isAboutCourseOrInstitution = msg.includes("ciee") || msg.includes("nube") || msg.includes("alura") || msg.includes("udemy") || msg.includes("coursera") || msg.includes("rocketseat") || msg.includes("dio") || msg.includes("senai") || msg.includes("senac") || msg.includes("sebrae") || msg.includes("bradesco") || msg.includes("ebac") || msg.includes("cursos livres") || msg.includes("curso livre");
    const isAboutEducationOrCertifications = msg.includes("educa\xE7\xE3o") || msg.includes("forma\xE7\xE3o") || msg.includes("acad\xEAmica") || msg.includes("certifica\xE7\xF5es") || msg.includes("cursos") || msg.includes("se\xE7\xE3o");
    if (isAboutCourseOrInstitution && isAboutEducationOrCertifications) {
      return false;
    }
    for (const org of OUT_OF_PLACE_ORGS2) {
      const orgMatchedInMsg = org.patterns.some((p) => msg.includes(p));
      if (orgMatchedInMsg) {
        const isStillInEducation = resumeData.education?.some((edu) => {
          if (!edu || typeof edu !== "object") return false;
          const inst = typeof edu.institution === "string" ? edu.institution.toLowerCase() : "";
          const deg = typeof edu.degree === "string" ? edu.degree.toLowerCase() : "";
          const fld = typeof edu.field === "string" ? edu.field.toLowerCase() : "";
          return org.patterns.some((p) => matchesWord2(inst, p) || matchesWord2(deg, p) || matchesWord2(fld, p));
        });
        if (!isStillInEducation) {
          const mentionsEducation = msg.includes("educa\xE7\xE3o") || msg.includes("forma\xE7\xE3o") || msg.includes("acad\xEAmica") || msg.includes("certifica\xE7\xF5es") || msg.includes("cursos") || msg.includes("se\xE7\xE3o") || msg.includes("ensino") || msg.includes("mova") || msg.includes("mover") || msg.includes("institui\xE7\xE3o") || msg.includes("escola");
          if (mentionsEducation) {
            return false;
          }
        }
      }
    }
    if (fb.type === "success") return false;
    return true;
  });
  deduplicatedAiFeedback.forEach((fb) => {
    if (!fb || typeof fb !== "object") return;
    let type = "warning";
    let category = "Aten\xE7\xF5es";
    let severity = "medium";
    if (fb.type === "error" || fb.severity === "high") {
      type = "error";
      category = "Erros";
      severity = "high";
    } else if (fb.type === "success" || fb.type === "info" || fb.severity === "low") {
      type = "info";
      category = "Sugest\xF5es";
      severity = "low";
    }
    feedback.push({
      id: "ai_" + Math.random().toString(36).substring(7),
      label: typeof fb.label === "string" ? fb.label : "Revis\xE3o Qualitativa",
      type,
      category,
      message: typeof fb.message === "string" ? fb.message : "",
      severity,
      source: "ai"
    });
  });
  const missingInfoList = engineResult.detectedIssues.filter((i) => ["sem_email", "sem_telefone", "sem_resumo", "sem_experiencia"].includes(i.id)).map((i) => i.label);
  return { score: finalScore, feedback, missingInfo: missingInfoList };
}

// src/server/sharedAi.ts
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { execSync } from "child_process";
import dotenv from "dotenv";
dotenv.config();
var getGeminiClient = () => {
  const key = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
var getGroqClient = () => {
  const key = process.env.GROQ_API_KEY || process.env.groq_api_key;
  if (!key)
    throw new Error(
      "GROQ_API_KEY n\xE3o est\xE1 configurada. Adicione a chave GROQ_API_KEY nas vari\xE1veis de ambiente."
    );
  return new Groq({ apiKey: key });
};
var runAiQuery = async (prompt, options = {}) => {
  const groqModels = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it"
  ];
  try {
    const client = getGroqClient();
    for (const model of groqModels) {
      try {
        console.log(`[AI Runner] Attempting Groq query with model: ${model}...`);
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          seed: 42,
          response_format: options.jsonMode ? { type: "json_object" } : void 0
        });
        const responseText = response.choices[0]?.message?.content || "";
        if (responseText) {
          console.log(`[AI Runner] Groq query succeeded with model: ${model}!`);
          return responseText;
        }
      } catch (groqError) {
        const errMsg = groqError?.message || String(groqError);
        console.warn(`[AI Runner] Groq model ${model} failed (${errMsg}). Trying next model...`);
        if (groqError?.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      }
    }
  } catch (groqFinalError) {
    console.warn(
      `[AI Runner] Groq client not available or unconfigured. Falling back to Gemini...`,
      groqFinalError?.message || groqFinalError
    );
  }
  console.warn("[AI Runner] Falling back to Gemini models sequentially...");
  const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
  let lastGeminiError = null;
  for (const modelName of geminiModels) {
    let retries = 2;
    let attempt = 0;
    while (retries > 0) {
      attempt++;
      try {
        console.log(
          `[AI Runner] Attempting Gemini fallback query with model: ${modelName} (attempt ${attempt})...`
        );
        const ai = getGeminiClient();
        const geminiResponse = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: options.jsonMode ? {
            responseMimeType: "application/json",
            temperature: 0,
            seed: 42
          } : {
            temperature: 0,
            seed: 42
          }
        });
        if (geminiResponse.text) {
          console.log(
            `[AI Runner] Gemini fallback succeeded with model ${modelName} on attempt ${attempt}!`
          );
          return geminiResponse.text;
        }
      } catch (geminiError) {
        lastGeminiError = geminiError;
        console.warn(
          `[AI Runner] Gemini API error with model ${modelName} (attempt ${attempt}): ${geminiError?.message || geminiError}`
        );
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      }
    }
  }
  throw lastGeminiError || new Error("Ambos os servi\xE7os Groq e Gemini falharam ao processar a requisi\xE7\xE3o.");
};
var sanitizeLinkedinLink = (linkedin) => {
  if (!linkedin || typeof linkedin !== "string") return "";
  let str = linkedin.trim();
  if (str.toLowerCase().includes("linkedin") && !str.toLowerCase().includes(".com")) {
    if (str.toLowerCase().includes("linkedin/in/")) {
      const parts = str.toLowerCase().split("linkedin/in/");
      return str.includes("://") ? `https://linkedin.com/in/${parts[1] || ""}` : `linkedin.com/in/${parts[1] || ""}`;
    }
    return str.replace(/linkedin/i, "linkedin.com");
  } else if (!str.toLowerCase().includes("linkedin") && !str.toLowerCase().includes(".com") && !str.includes("/")) {
    const username = str.replace("@", "").trim();
    if (username) return `linkedin.com/in/${username}`;
  }
  return str;
};
var runPythonAnalyzer = (rawText) => {
  try {
    const pythonCmd = process.platform === "win32" ? "python core_analyzer/cli.py" : "python3 core_analyzer/cli.py";
    const stdout = execSync(pythonCmd, {
      input: rawText,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024
    });
    return JSON.parse(stdout);
  } catch (error) {
    return null;
  }
};
var extractEmailFromRawText = (raw) => {
  const normalized = raw.replace(/\s*@\s*/g, "@").replace(/\s*\.\s*(com|br|org|net|comm|commm)\b/gi, ".$1");
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
  const match = normalized.match(emailRegex);
  if (match) {
    return match[1].replace(/[^\w]+$/, "");
  }
  return null;
};
var extractPhoneFromRawText = (raw) => {
  const phoneRegex = /(?:(?:\+|00)?55[\s-]?)?(?:\(?0?\d{2}\)?[\s-]?)?(?:9[\s-]?\d{4}|\d{4})[\s-]*\d{4}/g;
  const matches = raw.match(phoneRegex);
  if (matches && matches.length > 0) {
    const validMatches = matches.filter((m) => m.replace(/\D/g, "").length >= 8);
    if (validMatches.length > 0) {
      return validMatches[0].trim();
    }
  }
  return null;
};
async function parseRequestBody(req) {
  if (req.body) {
    if (typeof req.body === "object") return req.body;
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }
  if (typeof req[Symbol.asyncIterator] === "function" || typeof req.on === "function") {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      if (chunks.length > 0) {
        const raw = Buffer.concat(chunks).toString("utf-8");
        return JSON.parse(raw);
      }
    } catch {
    }
  }
  return {};
}
function applyCors(req, res) {
  const origin = req.headers?.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

// src/server/api/analyze-resume.ts
var config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  },
  maxDuration: 60
};
var sanitizeResult = (data) => {
  if (!data) return null;
  const deepSanitize = (obj) => {
    if (typeof obj === "string") {
      let cleaned = obj.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
      cleaned = cleaned.replace(/[\uFFFD\uFFFE\uFFFF]/g, "");
      return cleaned.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(deepSanitize);
    }
    if (obj !== null && typeof obj === "object") {
      const newObj = {};
      for (const key of Object.keys(obj)) {
        newObj[key] = deepSanitize(obj[key]);
      }
      return newObj;
    }
    return obj;
  };
  return deepSanitize(data);
};
async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const body = await parseRequestBody(req);
    const { rawText = "" } = body;
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ error: "Texto do curr\xEDculo n\xE3o fornecido ou inv\xE1lido." });
    }
    const systemPrompt = `Voc\xEA \xE9 um extrator sem\xE2ntico de curr\xEDculos para o mercado brasileiro de tecnologia e corporativo.
Analise com extrema precis\xE3o o texto fornecido e retorne estritamente um JSON v\xE1lido no seguinte formato:
{
  "structuredData": {
    "personalInfo": {
      "fullName": string,
      "email": string,
      "phone": string,
      "location": string,
      "linkedin": string,
      "portfolio": string
    },
    "summary": string,
    "experience": [
      {
        "company": string,
        "position": string,
        "startDate": string,
        "endDate": string,
        "current": boolean,
        "description": string,
        "achievements": string[]
      }
    ],
    "education": [
      {
        "institution": string,
        "degree": string,
        "field": string,
        "startDate": string,
        "endDate": string,
        "current": boolean
      }
    ],
    "skills": {
      "technical": string[],
      "soft": string[],
      "languages": [
        {
          "language": string,
          "level": string
        }
      ]
    },
    "certifications": [
      {
        "name": string,
        "issuer": string,
        "date": string
      }
    ]
  },
  "atsAnalysis": {
    "score": number,
    "feedback": {
      "strengths": string[],
      "improvements": string[]
    }
  }
}
Retorne exclusivamente o JSON, sem formata\xE7\xE3o markdown em torno do texto.`;
    const userPrompt = `Texto extra\xEDdo do curr\xEDculo:

${rawText.slice(0, 3e4)}`;
    let parsedResult = null;
    try {
      const aiResponse = await runAiQuery(systemPrompt, userPrompt, true);
      let cleanJson = aiResponse.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsedResult = JSON.parse(cleanJson);
    } catch (aiError) {
      console.warn("AI LLM analysis failed, attempting Python/deterministic fallback:", aiError?.message);
    }
    if (!parsedResult || !parsedResult.structuredData) {
      const pythonData = runPythonAnalyzer(rawText);
      if (pythonData) {
        parsedResult = {
          structuredData: pythonData,
          atsAnalysis: {
            score: 75,
            feedback: {
              strengths: ["Conte\xFAdo extra\xEDdo com sucesso atrav\xE9s de an\xE1lise sint\xE1tica."],
              improvements: ["Revise as se\xE7\xF5es para enriquecer os detalhes profissionais."]
            }
          }
        };
      }
    }
    if (!parsedResult) {
      return res.status(500).json({
        error: "N\xE3o foi poss\xEDvel analisar o curr\xEDculo com os modelos de IA dispon\xEDveis."
      });
    }
    if (!parsedResult.structuredData) parsedResult.structuredData = {};
    if (!parsedResult.structuredData.personalInfo) parsedResult.structuredData.personalInfo = {};
    const extractedEmail = extractEmailFromRawText(rawText);
    const extractedPhone = extractPhoneFromRawText(rawText);
    if (!parsedResult.structuredData.personalInfo.email && extractedEmail) {
      parsedResult.structuredData.personalInfo.email = extractedEmail;
    }
    if (!parsedResult.structuredData.personalInfo.phone && extractedPhone) {
      parsedResult.structuredData.personalInfo.phone = extractedPhone;
    }
    if (parsedResult.structuredData.personalInfo.linkedin) {
      parsedResult.structuredData.personalInfo.linkedin = sanitizeLinkedinLink(
        parsedResult.structuredData.personalInfo.linkedin
      );
    }
    if (parsedResult.structuredData) {
      if (!parsedResult.atsAnalysis) parsedResult.atsAnalysis = {};
      const calculatedScore = calculateAtsScore(
        parsedResult.structuredData,
        parsedResult.atsAnalysis?.feedback
      );
      parsedResult.atsAnalysis.score = calculatedScore.score;
      parsedResult.atsAnalysis.feedback = calculatedScore.feedback;
    }
    const sanitizedData = sanitizeResult(parsedResult);
    return res.status(200).json(sanitizedData);
  } catch (err) {
    console.error("API /analyze-resume Error:", err);
    return res.status(500).json({
      error: err?.message || "Erro interno ao processar a an\xE1lise do curr\xEDculo."
    });
  }
}
export {
  config,
  handler as default
};
