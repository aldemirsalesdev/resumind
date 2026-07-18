import React from "react";
import { detectLanguage, sectionTitles } from "../../lib/languageUtils";

interface StandardATSPreviewProps {
  data: any;
}

export const StandardATSPreview = ({ data }: StandardATSPreviewProps) => {
  if (!data) return null;

  const lang = detectLanguage(data);
  const titles = sectionTitles[lang];

  const rawPersonalInfo = data.personalInfo || {};
  const name = rawPersonalInfo.fullName || "NOME DO CANDIDATO";

  const isNotEmpty = (obj: any) =>
    obj &&
    (typeof obj === "string"
      ? obj.trim() !== ""
      : Object.values(obj).some(
          (val) => val && typeof val === "string" && val.trim() !== ""
        ));

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
    if (/\b\d+\s*(h|hr|hrs|hora|horas|hras|hs|d|dia|dias|day|days)\b/i.test(s))
      return true;
    if (/^\d{4}$/.test(s) || /^\d{4}[-–]\d{4}$/.test(s) || /^'\d{2}$/.test(s))
      return true;
    if (/^\d{1,2}[\/\-]\d{2,4}$/.test(s)) return true;
    if (
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|set\.)/i.test(
        s,
      )
    )
      return true;
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

  const formatGithubForPreview = (github: string) => {
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

  const formatWebsiteForPreview = (website: string) => {
    if (!website) return "";
    let clean = website.trim();
    clean = clean.replace(/^[\s|/\\•\-–—,]+|[\s|/\\•\-–—,]+$/g, "");
    const lower = clean.toLowerCase();
    if (
      lower.startsWith("portfólio:") ||
      lower.startsWith("portfolio:") ||
      lower.startsWith("site:") ||
      lower.startsWith("website:")
    ) {
      return clean;
    }
    let displayUrl = clean;
    if (displayUrl.match(/^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/)) {
      displayUrl = displayUrl.replace(/^(https?:\/\/)?(www\.)?/, "");
    }
    return `Portfólio: ${displayUrl}`;
  };

  const personalInfo = {
    ...rawPersonalInfo,
    linkedin: rawPersonalInfo.linkedin
      ? formatLinkedinForPreview(rawPersonalInfo.linkedin)
      : "",
    github: rawPersonalInfo.github
      ? formatGithubForPreview(rawPersonalInfo.github)
      : (rawPersonalInfo.website?.toLowerCase().includes("github.com")
          ? formatGithubForPreview(rawPersonalInfo.website)
          : ""),
    website: rawPersonalInfo.website
      ? (rawPersonalInfo.website?.toLowerCase().includes("github.com")
          ? ""
          : formatWebsiteForPreview(rawPersonalInfo.website))
      : "",
  };

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
    const line1Items = [
      sanitizeContactField(personalInfo.location),
      sanitizeContactField(personalInfo.email),
      sanitizeContactField(personalInfo.phone),
    ].filter((item) => (typeof item === "string" && item.trim() !== "") || React.isValidElement(item));

    const rawLine2 = [
      sanitizeContactField(personalInfo.linkedin),
      sanitizeContactField(personalInfo.github),
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

    const joinElements = (arr: any[]) => {
      if (arr.length === 0) return null;
      return arr.map((curr, i) => (
        <span key={i} className="inline-flex items-center whitespace-nowrap">
          {curr}
          {i < arr.length - 1 && (
            <span className="mx-2 select-none text-gray-400 font-normal">
              |
            </span>
          )}
        </span>
      ));
    };

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
          <div key={index} className="flex flex-row items-start pl-2 mb-0.5">
            <span className="w-3 select-none text-left font-bold">•</span>
            <span className="flex-1 text-gray-800 text-justify">{cleanLine}</span>
          </div>
        );
      }
      return (
        <p key={index} className="pl-2 mb-0.5 text-justify text-gray-800">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="leading-[1.35] text-black font-sans text-[12.6px]">
      {/* Header */}
      <div className="flex flex-col pb-2 mb-2 items-start">
        <h1 className="text-[22px] font-black uppercase tracking-tight text-black leading-none mb-1">
          {name}
        </h1>
        <div className="text-[11.3px] font-bold text-gray-600 flex flex-col gap-0.5">
          {contactLines.map((line, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-y-0.5">{line}</div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="flex flex-col mb-[10px]">
          <div className="text-[14.6px] font-black uppercase text-black border-b-2 border-black pb-[1px] mb-[6px]">
            {titles.summary}
          </div>
          <div className="text-[12.6px] leading-[1.35] text-gray-850 font-medium whitespace-pre-wrap text-justify">
            {summary}
          </div>
        </div>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <div className="flex flex-col mb-[10px]">
          <div className="text-[14.6px] font-black uppercase text-black border-b-2 border-black pb-[1px] mb-[6px]">
            {titles.experience}
          </div>
          <div className="flex flex-col gap-[8px]">
            {experience.map((exp: any, i: number) => (
              <div key={i} className="flex flex-col">
                <div className="flex justify-between items-baseline font-bold text-[13.3px]">
                  <span className="mr-4">{exp.position}</span>
                  <span className="text-[12px] font-bold whitespace-nowrap shrink-0 ml-4">
                    {exp.startDate}
                    {exp.startDate && exp.endDate && " - "}
                    {exp.endDate}
                  </span>
                </div>
                <div className="text-[12.6px] font-bold text-gray-600 mb-1">
                  {exp.company}
                </div>
                <div className="text-[12.6px] leading-[1.35] whitespace-pre-wrap">
                  {renderDescription(exp.description)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div className="flex flex-col mb-[10px]">
          <div className="text-[14.6px] font-black uppercase text-black border-b-2 border-black pb-[1px] mb-[6px]">
            {titles.projects}
          </div>
          <div className="flex flex-col gap-[8px]">
            {projects.map((proj: any, i: number) => (
              <div key={i} className="flex flex-col">
                <div className="flex justify-between items-baseline font-bold text-[13.3px]">
                  <span>{proj.name}</span>
                  {proj.link && (
                    <span className="text-[12px] font-bold">{proj.link}</span>
                  )}
                </div>
                {proj.technologies && (
                  <div className="text-[12.6px] font-bold text-gray-600 mb-1">
                    {proj.technologies}
                  </div>
                )}
                <div className="text-[12.6px] leading-[1.35] whitespace-pre-wrap">
                  {renderDescription(proj.description)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <div className="flex flex-col mb-[10px]">
          <div className="text-[14.6px] font-black uppercase text-black border-b-2 border-black pb-[1px] mb-[6px]">
            {titles.education}
          </div>
          <div className="flex flex-col gap-[4px]">
            {education.map((edu: any, i: number) => {
              const eduTitle = formatEduTitle(edu.degree, edu.field);
              return (
                <div
                  key={i}
                  className="flex justify-between items-baseline text-[12.6px]"
                >
                  <span className="font-bold text-[13px] mr-4">
                    {edu.institution}
                    {edu.institution && eduTitle && " - "}
                    {eduTitle && (
                      <span className="font-semibold text-gray-600 italic">{eduTitle}</span>
                    )}
                  </span>
                  <span className="font-bold text-[12px] whitespace-nowrap shrink-0 ml-4">{edu.graduationDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <div className="flex flex-col mb-[10px]">
          <div className="text-[14.6px] font-black uppercase text-black border-b-2 border-black pb-[1px] mb-[6px]">
            {titles.skills}
          </div>
          <div className="flex flex-col gap-[2px]">
            {skills.map((item: string, i: number) => (
              <div key={i} className="text-[12.6px] whitespace-pre-wrap leading-[1.3]">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {languages && languages.length > 0 && (
        <div className="flex flex-col mb-[10px]">
          <div className="text-[14.6px] font-black uppercase text-black border-b-2 border-black pb-[1px] mb-[6px]">
            {titles.languages}
          </div>
          <div className="flex flex-col gap-[2px]">
            {languages.map((item: string, i: number) => (
              <div key={i} className="text-[12.6px] whitespace-pre-wrap leading-[1.3]">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div className="flex flex-col mb-[10px]">
          <div className="text-[14.6px] font-black uppercase text-black border-b-2 border-black pb-[1px] mb-[6px]">
            {titles.certifications}
          </div>
          <div className="flex flex-col gap-[4px]">
            {certifications.map((cert: any, i: number) => {
              const { main, date } = parseCertificationLine(cert);
              return (
                <div
                  key={i}
                  className="text-[12.6px] font-medium leading-[1.3] flex justify-between items-baseline"
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
  );
};
