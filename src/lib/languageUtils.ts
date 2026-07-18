export function detectLanguage(data: any): "pt-BR" | "en-US" {
  if (!data) return "pt-BR";
  
  // If resumeLanguage is explicitly set in data (like "pt-BR" or "en-US"), trust it
  if (data.resumeLanguage === "pt-BR" || data.resumeLanguage === "en-US") {
    return data.resumeLanguage;
  }
  
  let text = "";
  if (data.summary) text += " " + data.summary;
  if (data.personalInfo) {
    if (data.personalInfo.fullName) text += " " + data.personalInfo.fullName;
    if (data.personalInfo.location) text += " " + data.personalInfo.location;
  }
  
  if (Array.isArray(data.experience)) {
    data.experience.forEach((exp: any) => {
      if (exp.position) text += " " + exp.position;
      if (exp.company) text += " " + exp.company;
      if (exp.description) text += " " + exp.description;
    });
  }
  
  if (Array.isArray(data.education)) {
    data.education.forEach((edu: any) => {
      if (edu.institution) text += " " + edu.institution;
      if (edu.degree) text += " " + edu.degree;
      if (edu.field) text += " " + edu.field;
    });
  }
  
  if (Array.isArray(data.projects)) {
    data.projects.forEach((proj: any) => {
      if (proj.name) text += " " + proj.name;
      if (proj.description) text += " " + proj.description;
      if (proj.technologies) text += " " + proj.technologies;
    });
  }
  
  if (Array.isArray(data.skills)) {
    data.skills.forEach((skill: any) => {
      if (typeof skill === "string") text += " " + skill;
    });
  }
  
  if (Array.isArray(data.certifications)) {
    data.certifications.forEach((cert: any) => {
      if (typeof cert === "string") {
        text += " " + cert;
      } else if (cert && typeof cert === "object") {
        if (cert.name) text += " " + cert.name;
        if (cert.institution) text += " " + cert.institution;
      }
    });
  }
  
  if (Array.isArray(data.languages)) {
    data.languages.forEach((lang: any) => {
      if (typeof lang === "string") text += " " + lang;
    });
  }
  
  const tokens = text.toLowerCase().split(/[\s,.:;?!()\-\[\]"']+/).filter(Boolean);
  
  const ptWords = new Set([
    "de", "do", "da", "dos", "das", "em", "para", "com", "na", "no", "uma", "um", "o", "a", "os", "as",
    "experiencia", "experiência", "profissional", "resumo", "habilidades", "projetos", "educacao", "educação",
    "formacao", "formação", "desenvolvimento", "sistemas", "analista", "estudante", "gerente", "coordenador",
    "curso", "cursos", "certificacoes", "certificações", "idiomas", "tecnologias", "trabalho", "academico",
    "acadêmico", "concluido", "concluído", "cursando"
  ]);
  
  const enWords = new Set([
    "of", "the", "and", "in", "to", "for", "with", "on", "at", "by", "an", "as",
    "experience", "professional", "summary", "skills", "projects", "education",
    "development", "systems", "analyst", "student", "manager", "coordinator",
    "course", "courses", "certifications", "languages", "technologies", "work",
    "academic", "completed", "studying"
  ]);
  
  let ptCount = 0;
  let enCount = 0;
  
  tokens.forEach(token => {
    if (ptWords.has(token)) ptCount++;
    if (enWords.has(token)) enCount++;
  });
  
  return ptCount >= enCount ? "pt-BR" : "en-US";
}

export const sectionTitles = {
  "pt-BR": {
    summary: "Resumo Profissional",
    experience: "Experiência Profissional",
    projects: "Projetos e Trabalhos Acadêmicos",
    education: "Educação",
    skills: "Habilidades",
    languages: "Idiomas",
    certifications: "Cursos e Certificações"
  },
  "en-US": {
    summary: "Professional Summary",
    experience: "Work Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    certifications: "Certifications"
  }
};
