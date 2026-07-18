import React from "react";
import { cn } from "../lib/utils";
import { StandardATSPreview } from "../templates/standardATS/preview";

export const ResumeA4Preview = React.memo(function ResumeA4Preview({
  data,
  templateId,
}: {
  data: any;
  templateId: string;
}) {
  if (!data)
    return <div className="w-full h-full bg-[#E4E3E0] animate-pulse"></div>;

  const sanitizeContactField = (val: any) => {
    if (typeof val !== "string") return val;
    let clean = val.trim();
    clean = clean.replace(/^[\s|/\\•\-–—,]+|[\s|/\\•\-–—,]+$/g, "");
    return clean.trim();
  };

  const formatLinkedinForPreview = (linkedin: string) => {
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

  const rawPersonalInfo = (data.structuredData || data).personalInfo || {};
  const personalInfo = {
    ...rawPersonalInfo,
    linkedin: rawPersonalInfo.linkedin
      ? formatLinkedinForPreview(rawPersonalInfo.linkedin)
      : "",
  };
  const parsedData = data.structuredData || data || {};
  const summary = typeof parsedData.summary === "string" ? parsedData.summary.trim() : (parsedData.summary ? parsedData.summary : "");
  const name = personalInfo?.fullName || "NOME DO CANDIDATO";

  const isNotEmpty = (obj: any) =>
    obj &&
    (typeof obj === "string"
      ? obj.trim() !== ""
      : Object.values(obj).some(
          (val) => val && typeof val === "string" && val.trim() !== "",
        ));

  const experience = parsedData.experience?.filter(isNotEmpty) || [];
  const education = (parsedData.education || [])
    ?.filter(isNotEmpty)
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
  const skills = parsedData.skills?.filter(isNotEmpty) || [];
  const certifications = parsedData.certifications?.filter(isNotEmpty) || [];
  const projects = parsedData.projects?.filter(isNotEmpty) || [];
  const languages = parsedData.languages?.filter(isNotEmpty) || [];

  const formatEduTitle = (degree: any, field: any) => {
    if (typeof degree === "string" && typeof field === "string") {
      return [degree, field].filter(Boolean).join(" - ");
    }
    return (
      <>
        {degree}
        {degree && field && " - "}
        {field}
      </>
    );
  };

  const isDateOrDuration = (str: string) => {
    const s = str.trim();
    if (!s) return false;
    // Match hours/duration: e.g. "40h", "120h", "40 horas", "40 hrs", "380 dias", "380h"
    if (/\b\d+\s*(h|hr|hrs|hora|horas|hras|hs|d|dia|dias|day|days)\b/i.test(s))
      return true;
    // Match years/periods: e.g. "2023", "2026", "2024-2025", "'23", "23"
    if (/^\d{4}$/.test(s) || /^\d{4}[-–]\d{4}$/.test(s) || /^'\d{2}$/.test(s))
      return true;
    // Match date formats: e.g. "05/2024", "12-2025"
    if (/^\d{1,2}[\/\-]\d{2,4}$/.test(s)) return true;
    // Match month names (case-insensitive) plus optional year
    if (
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|set\.)/i.test(
        s,
      )
    )
      return true;
    // Match "Concluído" or "Cursando"
    if (/^(conclu[íi]do|cursando|incompleto)/i.test(s)) return true;
    return false;
  };

  const parseCertificationLine = (cert: any) => {
    if (typeof cert === "object" && cert !== null) {
      let main = cert.name || "";
      if (cert.institution) {
        main += main ? ` – ${cert.institution}` : cert.institution;
      }
      let date = cert.hours || null;
      return { main, date };
    }
    const s = String(cert).trim();
    // Try to find dashes
    const dashIndex = Math.max(
      s.lastIndexOf(" - "),
      s.lastIndexOf(" – "),
      s.lastIndexOf(" — "),
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

  const getContactLines = () => {
    const isOriginal = templateId === "original";
    const joinElements = (arr: any[], separator = " | ") => {
      if (arr.length === 0) return null;
      return arr.map((curr, i) => (
        <span key={i} className="inline-flex items-center whitespace-nowrap">
          {curr}
          {i < arr.length - 1 && (
            <span className="mx-2 select-none text-gray-400 font-normal">
              {separator.trim()}
            </span>
          )}
        </span>
      ));
    };

    if (isOriginal) {
      const items = [
        personalInfo.age ? <span key="age">Idade: {personalInfo.age}</span> : null,
        personalInfo.location ? <span key="loc">Localização: {personalInfo.location}</span> : null,
        personalInfo.phone ? <span key="phone">Contatos: {personalInfo.phone}</span> : null,
        personalInfo.email ? <span key="email">E-mail: {personalInfo.email}</span> : null,
        personalInfo.linkedin ? <span key="linkedin">LinkedIn: {personalInfo.linkedin}</span> : null,
        personalInfo.website ? <span key="website">Website: {personalInfo.website}</span> : null,
      ].filter(Boolean);
      
      return [joinElements(items, "  |  ")];
    }

    // Modern layout models (standard, harvard, jakes, executive, ats_clean)
    const line1Items = [
      sanitizeContactField(personalInfo.location),
      sanitizeContactField(personalInfo.email),
      sanitizeContactField(personalInfo.phone),
    ].filter((item) => (typeof item === "string" && item.trim() !== "") || React.isValidElement(item));

    const rawLine2 = [
      sanitizeContactField(personalInfo.linkedin),
      sanitizeContactField(personalInfo.github || (personalInfo.website?.includes("github.com") ? personalInfo.website : null)),
      sanitizeContactField(personalInfo.website),
    ];

    const seen = new Set<string>();
    const line2Items: any[] = [];

    rawLine2.forEach((item) => {
      if (!item) return;
      if (typeof item === "string") {
        const trimmed = sanitizeContactField(item);
        if (trimmed === "") return;
        const normalized = trimmed.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
        if (!seen.has(normalized)) {
          seen.add(normalized);
          line2Items.push(trimmed);
        }
      } else if (React.isValidElement(item)) {
        line2Items.push(item);
      }
    });
    
    return [
      joinElements(line1Items),
      joinElements(line2Items),
    ].filter(Boolean);
  };

  const contactLines = getContactLines();

  const renderDescription = (description: any) => {
    if (!description) return null;
    if (React.isValidElement(description)) return <div className="text-gray-800 text-justify">{description}</div>;
    let lines: string[] = [];
    if (Array.isArray(description)) {
      lines = description.map((l) => String(l).trim()).filter(Boolean);
    } else if (typeof description === "string") {
      lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
    } else {
      lines = [String(description).trim()];
    }
    return lines.map((line, index) => {
      const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
      const cleanLine = isBullet ? line.replace(/^[•\-*]\s*/, "") : line;

      if (isBullet) {
        return (
          <div key={index} className="flex flex-row items-start pl-2 mb-0.5 leading-relaxed">
            <span className="w-3 select-none text-left font-bold">•</span>
            <span className="flex-1 text-gray-800 text-justify">{cleanLine}</span>
          </div>
        );
      }
      return (
        <p key={index} className="pl-2 mb-0.5 text-justify text-gray-800 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div
      className={cn(
        "w-[794px] min-w-[794px] max-w-[794px] bg-white shadow-xl mx-auto text-black pt-[32px] pb-[32px] px-[48px] sm:pt-[32px] sm:pb-[32px] sm:px-[48px] whitespace-pre-wrap print:shadow-none print:border-none print:bg-white",
        "min-h-[1123px] text-[12.6px] leading-[1.35] text-justify",
        templateId === "harvard" && "font-serif",
        templateId === "jakes" && "font-sans",
        templateId === "executive" && "font-sans",
        templateId === "standard" && "font-sans",
        templateId === "original" && "font-sans",
        templateId === "ats_clean" && "font-sans",
      )}
    >
      {/* ORIGINAL (RAW TEXT) MATCHING PDF */}
      {templateId === "original" && (
        <div className="leading-[1.35] text-black">
          <h1 className="text-[29.3px] font-extrabold mb-[4px] uppercase tracking-tight">
            {name}
          </h1>
          <div className="mb-[16px] text-[12.6px] text-gray-800 leading-normal">
            <div className="flex flex-col gap-[2px]">
              {contactLines.map((line, idx) => (
                <div key={idx} className="font-semibold flex flex-wrap items-center gap-y-0.5">{line}</div>
              ))}
            </div>
          </div>

          {summary && (
            <>
              <h2 className="text-[16px] font-bold mb-[4px] uppercase tracking-wide">
                Resumo Profissional
              </h2>
              <div className="mb-[12px] whitespace-pre-wrap text-[12.6px] text-justify leading-relaxed">
                {summary}
              </div>
            </>
          )}

          {experience.length > 0 && (
            <>
              <h2 className="text-[16px] font-bold mb-[4px] uppercase tracking-wide">
                Experiência Profissional
              </h2>
              <div className="flex flex-col gap-[6px]">
                {experience.map((exp: any, i: number) => (
                  <div key={i} className="break-inside-avoid">
                    <div className="font-bold text-[13.3px] mb-[2px]">
                      {exp.position}
                      {exp.position && exp.company && " – "}
                      {exp.company}
                    </div>
                    <div className="italic text-[12px] text-gray-700 mb-[4px]">
                      {exp.startDate}
                      {exp.startDate && exp.endDate && " – "}
                      {exp.endDate}
                    </div>
                    <div className="whitespace-pre-wrap text-justify text-[12.6px]">
                      {renderDescription(exp.description)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {projects.length > 0 && (
            <>
              <h2 className="text-[16px] font-bold mb-[4px] uppercase tracking-wide break-after-avoid mt-2">
                Projetos
              </h2>
              <div className="flex flex-col gap-[6px]">
                {projects.map((proj: any, i: number) => (
                  <div key={i} className="break-inside-avoid">
                    <div className="font-bold text-[13.3px] mb-[2px]">
                      {proj.name} {proj.link && `| ${proj.link}`}
                    </div>
                    {proj.technologies && (
                      <div className="italic text-[12px] text-gray-700 mb-[4px]">
                        {proj.technologies}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-justify text-[12.6px]">
                      {renderDescription(proj.description)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {education.length > 0 && (
            <>
              <h2 className="text-[16px] font-bold mb-[4px] uppercase tracking-wide break-after-avoid mt-2">
                Formação Acadêmica
              </h2>
              <div className="flex flex-col gap-[4px]">
                {education.map((edu: any, i: number) => {
                  const eduTitle = formatEduTitle(edu.degree, edu.field);
                  return (
                    <div
                      key={i}
                      className="text-[12.6px] flex gap-[4px] break-inside-avoid"
                    >
                      <span>•</span>
                      <div>
                        {eduTitle && (
                          <span className="font-bold">{eduTitle}</span>
                        )}
                        {eduTitle && edu.institution && " – "}
                        {edu.institution}
                        {edu.graduationDate && ` (${edu.graduationDate})`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {skills.length > 0 && (
            <>
              <h2 className="text-[16px] font-bold mb-[4px] uppercase tracking-wide mt-2">
                Habilidades
              </h2>
              <div className="flex flex-col gap-[2px]">
                {skills.map((item: string, i: number) => (
                  <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.3]">
                    {item}
                  </div>
                ))}
              </div>
            </>
          )}

          {languages.length > 0 && (
            <>
              <h2 className="text-[16px] font-bold mb-[4px] uppercase tracking-wide mt-2">
                Idiomas
              </h2>
              <div className="flex flex-col gap-[2px]">
                {languages.map((item: string, i: number) => (
                  <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.3]">
                    {item}
                  </div>
                ))}
              </div>
            </>
          )}

          {certifications.length > 0 && (
            <>
              <h2 className="text-[16px] font-bold mb-[4px] uppercase tracking-wide mt-2">
                Cursos e Certificações
              </h2>
              <div className="flex flex-col gap-[2px]">
                {certifications.map((cert: any, i: number) => {
                  const { main, date } = parseCertificationLine(cert);
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-baseline break-inside-avoid"
                    >
                      <div className="flex gap-[4px]">
                        <span>•</span>
                        <span>{main}</span>
                      </div>
                      {date && (
                        <span className="text-[12px] text-gray-700 shrink-0 ml-4 font-semibold">
                          {date}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* HARVARD WSO */}
      {templateId === "harvard" && (
        <div className="leading-[1.35] text-black font-serif">
          <div className="text-center pb-2 mb-2">
            <h1 className="text-[29.3px] font-bold uppercase tracking-wider leading-none mb-1">
              {name}
            </h1>
            <div className="text-[11.3px] mt-1 flex flex-wrap justify-center items-center gap-x-2 text-gray-800">
              {contactLines.map((line, idx, arr) => (
                <React.Fragment key={idx}>
                  <span className="flex flex-wrap justify-center items-center gap-y-1">{line}</span>
                  {idx < arr.length - 1 && (
                    <span className="text-gray-450">•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {summary && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px]">
                Resumo Profissional
              </div>
              <div className="text-[12.6px] leading-[1.35] text-justify whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          )}

          {experience.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px]">
                Experiência Profissional
              </div>
              <div className="flex flex-col gap-[6px]">
                {experience.map((exp: any, i: number) => (
                  <div key={i} className="break-inside-avoid flex flex-col">
                    <div className="flex justify-between items-baseline font-bold text-[13.3px]">
                      <span className="mr-4">{exp.company}</span>
                      <span className="font-normal text-[12px] whitespace-nowrap shrink-0 ml-4">
                        {exp.startDate}
                        {exp.startDate && exp.endDate && " – "}
                        {exp.endDate}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline italic text-[12px] mb-1">
                      <span className="mr-4">{exp.position}</span>
                      <span className="font-normal not-italic text-gray-500 whitespace-nowrap shrink-0 ml-4">
                        {personalInfo?.location}
                      </span>
                    </div>
                    <div className="text-[12.6px] leading-[1.35]">
                      {renderDescription(exp.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Projetos
              </div>
              <div className="flex flex-col gap-[6px]">
                {projects.map((proj: any, i: number) => (
                  <div key={i} className="break-inside-avoid flex flex-col">
                    <div className="flex justify-between items-baseline font-bold text-[13.3px]">
                      <span>{proj.name}</span>
                      {proj.link && (
                        <span className="font-normal text-[12px]">
                          {proj.link}
                        </span>
                      )}
                    </div>
                    {proj.technologies && (
                      <div className="italic text-[12px] mb-1">
                        {proj.technologies}
                      </div>
                    )}
                    <div className="text-[12.6px] leading-[1.35]">
                      {renderDescription(proj.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Educação
              </div>
              <div className="flex flex-col gap-[4px]">
                {education.map((edu: any, i: number) => {
                  const eduTitle = formatEduTitle(edu.degree, edu.field);
                  return (
                    <div
                      key={i}
                      className="break-inside-avoid flex justify-between items-baseline text-[12.6px]"
                    >
                      <div className="mr-4">
                        <span className="font-bold">{edu.institution}</span>
                        {eduTitle && <div className="italic text-[12px] text-gray-600">{eduTitle}</div>}
                      </div>
                      <span className="text-right font-bold text-[12px] whitespace-nowrap shrink-0 ml-4">{edu.graduationDate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {skills.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Habilidades
              </div>
              <div className="flex flex-col gap-[2px]">
                {skills.map((item: string, i: number) => (
                  <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.3]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {languages.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Idiomas
              </div>
              <div className="flex flex-col gap-[2px]">
                {languages.map((item: string, i: number) => (
                  <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.3]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Cursos e Certificações
              </div>
              <div className="text-[12.6px] flex flex-col gap-[4px]">
                {certifications.map((cert: any, i: number) => {
                  const { main, date } = parseCertificationLine(cert);
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-baseline break-inside-avoid"
                    >
                      <span>{main}</span>
                      {date && (
                        <span className="font-bold shrink-0 ml-4 text-[12px]">
                          {date}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* JAKE'S RESUME (Tech Standard) */}
      {templateId === "jakes" && (
        <div className="leading-[1.35] text-black font-sans">
          <div className="text-center pb-2 mb-2">
            <h1 className="text-[29.3px] font-bold uppercase tracking-wider leading-none mb-1">
              {name}
            </h1>
            <div className="text-[11.3px] mt-1 flex flex-wrap justify-center items-center gap-x-2 text-gray-800">
              {contactLines.map((line, idx, arr) => (
                <React.Fragment key={idx}>
                  <span className="flex flex-wrap justify-center items-center gap-y-1">{line}</span>
                  {idx < arr.length - 1 && (
                    <span className="text-gray-450">|</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {summary && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px]">
                Resumo Profissional
              </div>
              <div className="text-[12.6px] leading-[1.35] text-justify whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Educação
              </div>
              <div className="flex flex-col gap-[6px]">
                {education.map((edu: any, i: number) => {
                  const eduTitle = formatEduTitle(edu.degree, edu.field);
                  return (
                    <div
                      key={i}
                      className="break-inside-avoid flex flex-col"
                    >
                      <div className="flex justify-between font-bold text-[13.3px]">
                        <span className="mr-4">{edu.institution}</span>
                        <span className="font-bold text-[12px] whitespace-nowrap shrink-0 ml-4">{edu.graduationDate}</span>
                      </div>
                      {eduTitle && (
                        <div className="flex justify-between italic text-[12px] text-gray-600">
                          <span>{eduTitle}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {experience.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px]">
                Experiência Profissional
              </div>
              <div className="flex flex-col gap-[6px]">
                {experience.map((exp: any, i: number) => (
                  <div key={i} className="break-inside-avoid flex flex-col">
                    <div className="flex justify-between font-bold text-[13.3px]">
                      <span className="mr-4">{exp.position}</span>
                      <span className="font-bold text-[12px] whitespace-nowrap shrink-0 ml-4">
                        {exp.startDate}
                        {exp.startDate && exp.endDate && " – "}
                        {exp.endDate}
                      </span>
                    </div>
                    <div className="flex justify-between italic text-[12px] text-gray-600 mb-1">
                      <span>{exp.company}</span>
                    </div>
                    <div className="text-[12.6px] leading-[1.35]">
                      {renderDescription(exp.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Projetos
              </div>
              <div className="flex flex-col gap-[6px]">
                {projects.map((proj: any, i: number) => (
                  <div key={i} className="break-inside-avoid flex flex-col">
                    <div className="flex justify-between font-bold text-[13.3px]">
                      <span>
                        {proj.name}{" "}
                        {proj.technologies && `| ${proj.technologies}`}
                      </span>
                      <span className="font-bold text-[12px]">{proj.link}</span>
                    </div>
                    <div className="text-[12.6px] leading-[1.35] mt-1">
                      {renderDescription(proj.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {skills.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Habilidades
              </div>
              <div className="flex flex-col gap-[2px]">
                {skills.map((item: string, i: number) => (
                  <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.3]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {languages.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Idiomas
              </div>
              <div className="flex flex-col gap-[2px]">
                {languages.map((item: string, i: number) => (
                  <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.3]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="border-b border-black text-[14.6px] font-bold uppercase pb-[1px] mb-[6px] break-after-avoid">
                Cursos e Certificações
              </div>
              <div className="text-[12.6px] flex flex-col gap-[4px]">
                {certifications.map((cert: any, i: number) => {
                  const { main, date } = parseCertificationLine(cert);
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-baseline break-inside-avoid"
                    >
                      <span>{main}</span>
                      {date && (
                        <span className="font-bold shrink-0 ml-4 text-[12px]">
                          {date}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ATS CLEAN (USER'S PDF) */}
      {templateId === "ats_clean" && (
        <div className="leading-[1.35] text-black font-sans">
          <div className="pb-4">
            <h1 className="text-[22px] font-bold uppercase tracking-tight leading-none mb-1 text-black">
              {name}
            </h1>
            <div className="text-[11.3px] font-bold mt-1 text-gray-700 flex flex-col gap-[2px]">
              {contactLines.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-y-0.5">{line}</div>
              ))}
            </div>
          </div>

          {summary && (
            <div className="flex flex-col mb-[10px]">
              <div className="text-[14.6px] font-bold uppercase text-black border-b border-black pb-[2px] mb-[6px] break-after-avoid">
                Resumo Profissional
              </div>
              <div className="text-[12.6px] leading-[1.35] text-gray-900 whitespace-pre-wrap text-justify">
                {summary}
              </div>
            </div>
          )}

          {experience.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="text-[14.6px] font-bold uppercase text-black border-b border-black pb-[2px] mb-[6px] break-after-avoid">
                Experiência Profissional
              </div>
              <div className="flex flex-col gap-[8px]">
                {experience.map((exp: any, i: number) => (
                  <div key={i} className="break-inside-avoid flex flex-col">
                    <div className="text-[13.3px]">
                      <span className="font-bold">{exp.position}</span>
                      {exp.company && <span className="font-bold"> | </span>}
                      {exp.company && (
                        <span className="font-bold italic">{exp.company}</span>
                      )}
                    </div>
                    <div className="italic text-[12px] text-gray-700 mb-1">
                      {exp.startDate}
                      {exp.startDate && exp.endDate && " – "}
                      {exp.endDate}
                    </div>
                    <div className="text-[12.6px] leading-[1.35] text-gray-900 mt-1">
                      {renderDescription(exp.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="text-[14.6px] font-bold uppercase text-black border-b border-black pb-[2px] mb-[6px] break-after-avoid">
                Projetos
              </div>
              <div className="flex flex-col gap-[8px]">
                {projects.map((proj: any, i: number) => (
                  <div key={i} className="break-inside-avoid flex flex-col">
                    <div className="text-[13.3px]">
                      <span className="font-bold">{proj.name}</span>
                      {proj.link && (
                        <span className="font-normal italic"> – {proj.link}</span>
                      )}
                    </div>
                    {proj.technologies && (
                      <div className="italic text-[12px] text-gray-700 mb-1">
                        {proj.technologies}
                      </div>
                    )}
                    <div className="text-[12.6px] leading-[1.35] text-gray-900">
                      {renderDescription(proj.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="text-[14.6px] font-bold uppercase text-black border-b border-black pb-[2px] mb-[6px] break-after-avoid">
                Formação Acadêmica
              </div>
              <div className="flex flex-col gap-[4px]">
                {education.map((edu: any, i: number) => {
                  const eduTitle = formatEduTitle(edu.degree, edu.field);
                  return (
                    <div
                      key={i}
                      className="break-inside-avoid flex flex-col text-[12.6px]"
                    >
                      <div>
                        <span className="font-bold text-[13px]">
                          • {eduTitle ? eduTitle : ""}
                        </span>
                        {eduTitle && edu.institution && " – "}
                        {!eduTitle && edu.institution && " "}
                        {edu.institution}
                        {edu.graduationDate && ` (${edu.graduationDate})`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {skills.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="text-[14.6px] font-bold uppercase text-black border-b border-black pb-[2px] mb-[6px] break-after-avoid">
                Habilidades
              </div>
              <div className="flex flex-col gap-[2px]">
                {skills.map((item: string, i: number) => (
                  <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.3]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {languages.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="text-[14.6px] font-bold uppercase text-black border-b border-black pb-[2px] mb-[6px] break-after-avoid">
                Idiomas
              </div>
              <div className="flex flex-col gap-[2px]">
                {languages.map((item: string, i: number) => (
                  <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.3]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="flex flex-col mb-[10px]">
              <div className="text-[14.6px] font-bold uppercase text-black border-b border-black pb-[2px] mb-[6px] break-after-avoid">
                Cursos e Certificações
              </div>
              <div className="flex flex-col gap-[2px]">
                {certifications.map((cert: any, i: number) => {
                  const { main, date } = parseCertificationLine(cert);
                  return (
                    <div
                      key={i}
                      className="text-[12.6px] leading-[1.3] flex justify-between items-baseline break-inside-avoid"
                    >
                      <div className="flex items-start gap-[4px]">
                        <span className="font-bold">•</span>
                        <span>{main}</span>
                      </div>
                      {date && (
                        <span className="font-bold shrink-0 ml-4 text-[12px]">{date}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EXECUTIVE ATS */}
      {templateId === "executive" && (
        <div className="leading-[1.35] text-black tracking-tight font-sans">
          <div className="border-b-2 border-black pb-2 mb-3">
            <h1 className="text-[22px] tracking-tight font-black uppercase mb-1 leading-none text-black">
              {name}
            </h1>
            <div className="text-[11.3px] mt-2 font-bold text-gray-600 flex flex-col gap-[2px]">
              {contactLines.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-y-0.5">{line}</div>
              ))}
            </div>
          </div>

          {summary && (
            <div className="flex flex-col mb-[8px]">
              <h2 className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-[2px] mb-[4px]">
                Resumo Profissional
              </h2>
              <div className="text-[12.6px] leading-[1.35] text-gray-850 text-justify whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          )}

          {experience.length > 0 && (
            <div className="flex flex-col mb-[8px]">
              <h2 className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-[2px] mb-[4px]">
                Experiência Profissional
              </h2>
              <div className="flex flex-col gap-[6px]">
                {experience.map((exp: any, i: number) => (
                  <div key={i} className="break-inside-avoid flex flex-col">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-extrabold text-[13.3px] text-black mr-4">
                        {exp.position}
                      </span>
                      <span className="font-bold text-gray-500 text-[12px] whitespace-nowrap shrink-0 ml-4">
                        {exp.startDate}
                        {exp.startDate && exp.endDate && " — "}
                        {exp.endDate}
                      </span>
                    </div>
                    <div className="font-bold text-gray-750 text-[12.6px] mb-1">
                      {exp.company}
                    </div>
                    <div className="text-[12.6px] leading-[1.35] text-gray-800 pl-3 border-l-2 border-gray-200 text-justify whitespace-pre-wrap">
                      {renderDescription(exp.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="flex flex-col mb-[8px]">
              <h2 className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-[2px] mb-[4px] break-after-avoid">
                Projetos
              </h2>
              <div className="flex flex-col gap-[6px]">
                {projects.map((proj: any, i: number) => (
                  <div key={i} className="break-inside-avoid flex flex-col">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-extrabold text-[13.3px] text-black">
                        {proj.name}
                      </span>
                      {proj.link && (
                        <span className="font-bold text-gray-500 text-[12px]">
                          {proj.link}
                        </span>
                      )}
                    </div>
                    {proj.technologies && (
                      <div className="font-bold text-gray-750 text-[12.6px] mb-1">
                        {proj.technologies}
                      </div>
                    )}
                    <div className="text-[12.6px] leading-[1.35] text-gray-800 pl-3 border-l-2 border-gray-200 text-justify whitespace-pre-wrap">
                      {renderDescription(proj.description)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col">
            {education.length > 0 && (
              <div className="flex flex-col mb-[8px]">
                <h2 className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-[2px] mb-[4px] break-after-avoid">
                  Educação
                </h2>
                <div className="flex flex-col gap-[6px]">
                  {education.map((edu: any, i: number) => {
                    const eduTitle = formatEduTitle(edu.degree, edu.field);
                    return (
                      <div key={i} className="flex flex-col">
                        {eduTitle && (
                          <span className="font-extrabold text-[13px] text-black">
                            {eduTitle}
                          </span>
                        )}
                        <span className="font-bold text-gray-750 text-[12.6px]">
                          {edu.institution}
                        </span>
                        <span className="font-bold text-gray-500 text-[12px]">
                          {edu.graduationDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {skills.length > 0 && (
              <div className="flex flex-col mb-[8px]">
                <h2 className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-[2px] mb-[4px]">
                  Habilidades
                </h2>
                <div className="flex flex-col gap-[2px]">
                  {skills.map((item: string, i: number) => (
                    <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.25]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {languages.length > 0 && (
              <div className="flex flex-col mb-[8px]">
                <h2 className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-[2px] mb-[4px]">
                  Idiomas
                </h2>
                <div className="flex flex-col gap-[2px]">
                  {languages.map((item: string, i: number) => (
                    <div key={i} className="whitespace-pre-wrap break-inside-avoid leading-[1.25]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {certifications.length > 0 && (
              <div className="flex flex-col mb-[8px]">
                <h2 className="text-[16px] font-extrabold uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-[2px] mb-[4px]">
                  Cursos e Certificações
                </h2>
                <div className="flex flex-col gap-[2px]">
                  {certifications.map((cert: any, i: number) => {
                    const { main, date } = parseCertificationLine(cert);
                    return (
                      <div
                        key={i}
                        className="text-[12.6px] font-medium leading-[1.3] flex justify-between items-baseline break-inside-avoid"
                      >
                        <div className="flex items-start">
                          <span>{main}</span>
                        </div>
                        {date && (
                          <span className="font-bold text-gray-500 shrink-0 ml-4 text-[12px]">
                            {date}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STANDARD ATS */}
      {templateId === "standard" && (
        <StandardATSPreview data={parsedData} />
      )}
    </div>
  );
});
