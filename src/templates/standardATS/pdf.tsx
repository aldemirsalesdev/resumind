import React from "react";
import { Document, Page, Text, View, Link, Font } from "@react-pdf/renderer";
import { detectLanguage, sectionTitles } from "../../lib/languageUtils";
import {
  pdfStyles,
  atsCleanStyles,
  harvardStyles,
  jakesStyles,
  executiveStyles,
  originalStyles,
} from "./styles";

Font.registerHyphenationCallback((word) => [word]);

interface TemplatePdfDocumentProps {
  data: any;
  templateId?: string;
}

export const TemplatePdfDocument = ({ data, templateId = "standard" }: TemplatePdfDocumentProps) => {
  if (!data) return null;

  const lang = detectLanguage(data);
  const titles = sectionTitles[lang];

  // Seleciona a folha de estilos correspondente ao modelo selecionado
  let styles: any = pdfStyles;
  if (templateId === "ats_clean") styles = atsCleanStyles;
  else if (templateId === "harvard") styles = harvardStyles;
  else if (templateId === "jakes") styles = jakesStyles;
  else if (templateId === "executive") styles = executiveStyles;
  else if (templateId === "original") styles = originalStyles;

  const rawPersonalInfo = data.personalInfo || {};
  const name = rawPersonalInfo.fullName || "NOME DO CANDIDATO";

  const sanitizeContactField = (val: any) => {
    if (typeof val !== "string") return val;
    let clean = val.trim();
    clean = clean.replace(/^[\s|/\\•\-–—,]+|[\s|/\\•\-–—,]+$/g, "");
    return clean.trim();
  };

  // Formatar o LinkedIn para um padrão limpo
  const formatLinkedinForPDF = (linkedin: string) => {
    if (!linkedin) return "";
    let clean = linkedin.trim();
    clean = clean.replace(/^[\s|/\\•\-–—,]+|[\s|/\\•\-–—,]+$/g, "");
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
    if (!clean.toLowerCase().includes("linkedin")) {
      const handle = clean.replace(/^\//, "");
      clean = `linkedin.com/in/${handle}`;
    }
    return clean;
  };

  // Formatar o GitHub para um padrão limpo
  const formatGithubForPDF = (github: string) => {
    if (!github) return "";
    let clean = github.trim();
    clean = clean.replace(/^[\s|/\\•\-–—,]+|[\s|/\\•\-–—,]+$/g, "");
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
    if (!clean.toLowerCase().includes("github")) {
      const handle = clean.replace(/^\//, "");
      clean = `github.com/${handle}`;
    }
    return clean;
  };

  const personalInfo = {
    ...rawPersonalInfo,
    linkedin: rawPersonalInfo.linkedin ? formatLinkedinForPDF(rawPersonalInfo.linkedin) : "",
    github: rawPersonalInfo.github ? formatGithubForPDF(rawPersonalInfo.github) : "",
  };

  const isNotEmpty = (obj: any) =>
    obj &&
    (typeof obj === "string"
      ? obj.trim() !== ""
      : Object.values(obj).some(
          (val) => val && typeof val === "string" && val.trim() !== ""
        ));

  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  const experience = (data.experience || []).filter(isNotEmpty);
  const education = (data.education || [])
    .filter(isNotEmpty)
    .map((edu: any) => {
      const field = typeof edu.field === "string" ? edu.field.trim() : edu.field || "";
      const degree = typeof edu.degree === "string" ? edu.degree.trim() : edu.degree || "";
      const isGeral = typeof field === "string" ? ["geral", "em geral", "general", "gerais"].includes(field.toLowerCase()) : false;
      const isSame = typeof degree === "string" && typeof field === "string" ? degree.toLowerCase() === field.toLowerCase() : false;
      return {
        ...edu,
        field: isGeral || isSame ? "" : edu.field,
      };
    });

  const skills = (data.skills || []).filter(isNotEmpty);
  const certifications = (data.certifications || []).filter(isNotEmpty);
  const projects = (data.projects || []).filter(isNotEmpty);
  const languages = (data.languages || []).filter(isNotEmpty);

  // Group and format contact items into elegant lines
  const getContactLines = () => {
    const isOriginal = templateId === "original";
    if (isOriginal) {
      const items = [
        personalInfo.age ? `Idade: ${personalInfo.age}` : null,
        personalInfo.location ? `Localização: ${personalInfo.location}` : null,
        personalInfo.phone ? `Contatos: ${personalInfo.phone}` : null,
        personalInfo.email ? `E-mail: ${personalInfo.email}` : null,
        personalInfo.linkedin ? `LinkedIn: ${personalInfo.linkedin}` : null,
        personalInfo.website ? `Website: ${personalInfo.website}` : null,
      ].filter((item) => typeof item === "string" && item.trim() !== "");
      
      if (items.length > 3) {
        const half = Math.ceil(items.length / 2);
        return [items.slice(0, half).join("  |  "), items.slice(half).join("  |  ")];
      }
      return [items.join("  |  ")];
    }

    // Modern layout models (standard, harvard, jakes, executive, ats_clean)
    const line1Items = [
      sanitizeContactField(personalInfo.location),
      sanitizeContactField(personalInfo.email),
      sanitizeContactField(personalInfo.phone),
    ].filter((item) => typeof item === "string" && item.trim() !== "");

    const rawLine2 = [
      sanitizeContactField(personalInfo.linkedin),
      sanitizeContactField(personalInfo.github || (personalInfo.website?.includes("github.com") ? personalInfo.website : null)),
      sanitizeContactField(personalInfo.website),
    ];

    const seen = new Set<string>();
    const line2Items: string[] = [];

    rawLine2.forEach((item) => {
      if (typeof item === "string") {
        const trimmed = sanitizeContactField(item);
        if (trimmed === "") return;
        const normalized = trimmed.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
        if (!seen.has(normalized)) {
          seen.add(normalized);
          line2Items.push(trimmed);
        }
      }
    });

    return [
      line1Items.join(" | "),
      line2Items.join(" | "),
    ].filter(Boolean);
  };

  const contactLines = getContactLines();

  const parseCertificationLine = (cert: any) => {
    if (typeof cert === "object" && cert !== null) {
      let main = cert.name || "";
      if (cert.institution) {
        main += main ? ` – ${cert.institution}` : cert.institution;
      }
      const date = cert.hours || null;
      return { main, date };
    }
    const s = String(cert).trim();
    const isDateOrDuration = (str: string) => {
      const sVal = str.trim();
      if (!sVal) return false;
      if (/\b\d+\s*(h|hr|hrs|hora|horas|hras|hs|d|dia|dias|day|days)\b/i.test(sVal)) return true;
      if (/^\d{4}$/.test(sVal) || /^\d{4}[-–]\d{4}$/.test(sVal) || /^'\d{2}$/.test(sVal)) return true;
      if (/^\d{1,2}[\/\-]\d{2,4}$/.test(sVal)) return true;
      if (/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|set\.)/i.test(sVal)) return true;
      if (/^(conclu[íi]do|cursando|incompleto)/i.test(sVal)) return true;
      return false;
    };
    const dashIndex = Math.max(
      s.lastIndexOf(" - "),
      s.lastIndexOf(" – "),
      s.lastIndexOf(" — ")
    );
    if (dashIndex !== -1) {
      const mainPart = s.substring(0, dashIndex).trim();
      const datePart = s.substring(dashIndex + 3).trim();
      if (isDateOrDuration(datePart)) {
        return { main: mainPart, date: datePart };
      }
    }
    return { main: s, date: null };
  };

  const formatEduTitle = (degree: any, field: any) => {
    return [degree, field].filter(Boolean).join(" - ");
  };

  const renderDescription = (description: any) => {
    if (!description) return null;
    let lines: string[] = [];
    if (Array.isArray(description)) {
      lines = description.map((l) => String(l).trim()).filter(Boolean);
    } else if (typeof description === "string") {
      lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
    } else if (typeof description === "object") {
      const extracted = Object.values(description).flat().map(v => typeof v === 'object' ? JSON.stringify(v) : String(v));
      lines = extracted.map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) lines = [JSON.stringify(description)];
    } else {
      lines = [String(description).trim()];
    }

    const content = lines.map((line, index) => {
      const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
      const cleanLine = isBullet ? line.replace(/^[•\-*]\s*/, "") : line;

      if (isBullet) {
        return (
          <View key={index} style={styles.bulletPoint}>
            <Text style={styles.bulletSign}>•</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bulletContent}>{cleanLine}</Text>
            </View>
          </View>
        );
      }
      return (
        <Text key={index} style={styles.descriptionText}>
          {line}
        </Text>
      );
    });

    if (templateId === "executive") {
      return (
        <View style={{ borderLeftWidth: 1.5, borderLeftColor: "#e5e7eb", paddingLeft: 8, marginLeft: 4, marginBottom: 4, marginTop: 2 }}>
          {content}
        </View>
      );
    }
    return content;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.name}>{name}</Text>
      {contactLines.length > 0 ? (
        <View style={styles.contactContainer}>
          {contactLines.map((line, index) => (
            <Text key={index} style={styles.contactLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderSummary = () => {
    if (!summary) return null;
    return (
      <View style={styles.section} wrap={false}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{titles.summary}</Text>
        </View>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>
    );
  };

  const renderExperience = () => {
    if (experience.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{titles.experience}</Text>
        </View>
        {experience.map((exp: any, index: number) => {
          const dateLine = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
          const isAtsClean = templateId === "ats_clean";
          
          return (
            <View key={index} style={styles.entryContainer} wrap={false}>
              {isAtsClean ? (
                <View style={{ marginBottom: 2 }}>
                  <Text style={styles.entryTitle}>
                    {exp.position || ""}{exp.company ? ` | ${exp.company}` : ""}
                  </Text>
                  {dateLine ? <Text style={{ fontSize: 9, fontFamily: "Helvetica-Oblique", color: "#4a4a4a", marginTop: 1, marginBottom: 2 }}>{dateLine}</Text> : null}
                </View>
              ) : templateId === "harvard" ? (
                <>
                  <View style={styles.rowJustified}>
                    <Text style={styles.entryTitle}>{exp.company || ""}</Text>
                    {dateLine ? <Text style={styles.entryDate}>{dateLine}</Text> : null}
                  </View>
                  <View style={[styles.rowJustified, { marginTop: 1 }]}>
                    <Text style={styles.entrySubtitle}>{exp.position || ""}</Text>
                    {personalInfo?.location ? (
                      <Text style={[styles.entryDate, { fontFamily: "Times-Roman", color: "#666666" }]}>
                        {personalInfo.location}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.rowJustified}>
                    <Text style={styles.entryTitle}>{exp.position || ""}</Text>
                    {dateLine ? <Text style={styles.entryDate}>{dateLine}</Text> : null}
                  </View>
                  {exp.company ? <Text style={styles.entrySubtitle}>{exp.company}</Text> : null}
                </>
              )}
              {renderDescription(exp.description)}
            </View>
          );
        })}
      </View>
    );
  };

  const renderProjects = () => {
    if (projects.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{titles.projects}</Text>
        </View>
        {projects.map((proj: any, index: number) => {
          const cleanName = (proj.name || "").replace(/\*/g, "");
          const cleanTech = (proj.technologies || "").replace(/\*/g, "");
          const isJakes = templateId === "jakes";
          const isAtsClean = templateId === "ats_clean";

          return (
            <View key={index} style={styles.entryContainer} wrap={false}>
              {isJakes ? (
                <View style={styles.rowJustified}>
                  <Text style={styles.entryTitle}>
                    {cleanName}{cleanTech ? ` | ${cleanTech}` : ""}
                  </Text>
                  {proj.link ? <Text style={styles.entryDate}>{proj.link}</Text> : null}
                </View>
              ) : isAtsClean ? (
                <View style={{ marginBottom: 2 }}>
                  <Text style={styles.entryTitle}>
                    {cleanName}{proj.link ? ` – ${proj.link}` : ""}
                  </Text>
                  {cleanTech ? <Text style={{ fontSize: 9, fontFamily: "Helvetica-Oblique", color: "#4a4a4a", marginTop: 1 }}>{cleanTech}</Text> : null}
                </View>
              ) : (
                <>
                  <View style={styles.rowJustified}>
                    <Text style={styles.entryTitle}>{cleanName}</Text>
                    {proj.link ? <Text style={styles.entryDate}>{proj.link}</Text> : null}
                  </View>
                  {cleanTech ? <Text style={styles.entrySubtitle}>{cleanTech}</Text> : null}
                </>
              )}
              {renderDescription(proj.description)}
            </View>
          );
        })}
      </View>
    );
  };

  const renderEducation = () => {
    if (education.length === 0) return null;
    const isAtsClean = templateId === "ats_clean";
    const isExecutive = templateId === "executive";
    const isOriginal = templateId === "original";

    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>
            {isAtsClean || isOriginal ? "Formação Acadêmica" : titles.education}
          </Text>
        </View>
        {education.map((edu: any, index: number) => {
          const eduTitle = formatEduTitle(edu.degree, edu.field);
          const rightLine = edu.graduationDate || edu.endDate || edu.startDate || "";

          if (isAtsClean) {
            return (
              <View key={index} style={{ marginBottom: 4 }} wrap={false}>
                <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#000" }}>
                  • {eduTitle ? eduTitle : ""}{eduTitle && edu.institution ? " – " : ""}{edu.institution}{rightLine ? ` (${rightLine})` : ""}
                </Text>
              </View>
            );
          }

          if (isExecutive) {
            return (
              <View key={index} style={{ marginBottom: 6 }} wrap={false}>
                {eduTitle ? <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#000000" }}>{eduTitle}</Text> : null}
                <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#4a4a4a", marginTop: 1 }}>{edu.institution}</Text>
                {rightLine ? <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#666666", marginTop: 1 }}>{rightLine}</Text> : null}
              </View>
            );
          }

          if (isOriginal) {
            return (
              <View key={index} style={{ flexDirection: "row", marginBottom: 4 }} wrap={false}>
                <Text style={{ fontSize: 9.5, fontFamily: "Helvetica", marginRight: 4 }}>•</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9.5, fontFamily: "Helvetica" }}>
                    {eduTitle ? <Text style={{ fontFamily: "Helvetica-Bold" }}>{eduTitle}</Text> : null}
                    {eduTitle && edu.institution ? " – " : ""}
                    {edu.institution}
                    {rightLine ? ` (${rightLine})` : ""}
                  </Text>
                </View>
              </View>
            );
          }

          const leftLine = [edu.institution, eduTitle].filter(Boolean).join(" - ");
          return (
            <View key={index} style={styles.entryContainer} wrap={false}>
              <View style={styles.rowJustified}>
                <Text style={styles.entryTitle}>{leftLine}</Text>
                {rightLine ? <Text style={styles.entryDate}>{rightLine}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSkills = () => {
    if (skills.length === 0) return null;
    return (
      <View style={styles.section} wrap={false}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{titles.skills}</Text>
        </View>
        {skills.map((skill: string, index: number) => (
          <Text key={index} style={styles.skillLine}>
            {skill}
          </Text>
        ))}
      </View>
    );
  };

  const renderLanguages = () => {
    if (languages.length === 0) return null;
    return (
      <View style={styles.section} wrap={false}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{titles.languages}</Text>
        </View>
        {languages.map((lang: string, index: number) => (
          <Text key={index} style={styles.skillLine}>
            {lang}
          </Text>
        ))}
      </View>
    );
  };

  const renderCertifications = () => {
    if (certifications.length === 0) return null;
    const isAtsClean = templateId === "ats_clean";
    const isOriginal = templateId === "original";

    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{titles.certifications}</Text>
        </View>
        {certifications.map((cert: any, index: number) => {
          const { main, date } = parseCertificationLine(cert);
          if (!main) return null;

          if (isAtsClean || isOriginal) {
            return (
              <View key={index} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }} wrap={false}>
                <View style={{ flexDirection: "row", flex: 1, alignItems: "flex-start" }}>
                  <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", marginRight: 4 }}>•</Text>
                  <Text style={{ fontSize: 9.5, fontFamily: "Helvetica" }}>{main}</Text>
                </View>
                {date ? <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" }}>{date}</Text> : null}
              </View>
            );
          }

          return (
            <View key={index} style={styles.certificationRow} wrap={false}>
              <View style={{ flexDirection: "row", flex: 1, alignItems: "flex-start" }}>
                <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", marginRight: 4 }}>•</Text>
                <Text style={styles.certificationMain}>{main}</Text>
              </View>
              {date ? <Text style={styles.certificationDate}>{date}</Text> : null}
            </View>
          );
        })}
      </View>
    );
  };

  // Determinar a ordem de renderização das seções baseada no modelo
  const isJakes = templateId === "jakes";

  return (
    <Document title={`${name}_Resume`}>
      <Page size="A4" style={styles.page}>
        {renderHeader()}
        {renderSummary()}
        
        {isJakes ? (
          <>
            {renderEducation()}
            {renderExperience()}
            {renderProjects()}
          </>
        ) : (
          <>
            {renderExperience()}
            {renderProjects()}
            {renderEducation()}
          </>
        )}

        {renderSkills()}
        {renderLanguages()}
        {renderCertifications()}
      </Page>
    </Document>
  );
};

export const ResumePdfDocument = TemplatePdfDocument;
export const StandardATSPdfDocument = TemplatePdfDocument;

