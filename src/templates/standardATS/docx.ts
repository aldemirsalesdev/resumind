import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  AlignmentType,
  BorderStyle,
  IBorderOptions,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { detectLanguage, sectionTitles } from "../../lib/languageUtils";

export const generateStandardATSDocx = async (structured: any, templateId = "standard") => {
  const lang = detectLanguage(structured);
  const titles = sectionTitles[lang];

  const personalInfo = structured.personalInfo || {};
  const fullName = personalInfo.fullName || "NOME DO CANDIDATO";

  const isNotEmpty = (obj: any) =>
    obj &&
    (typeof obj === "string"
      ? obj.trim() !== ""
      : Object.values(obj).some(
          (val) => val && typeof val === "string" && val.trim() !== ""
        ));

  // Clean data
  const summary = typeof structured.summary === "string" ? structured.summary.trim() : "";
  const experience = (structured.experience || []).filter(isNotEmpty);
  
  const education = (structured.education || [])
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

  const skills = (structured.skills || []).filter(isNotEmpty);
  const projects = (structured.projects || []).filter(isNotEmpty);
  const certifications = (structured.certifications || []).filter(isNotEmpty);
  const languages = (structured.languages || []).filter(isNotEmpty);

  // Formatar o LinkedIn para um padrão limpo
  const formatLinkedinForDocx = (linkedin: string) => {
    if (!linkedin) return "";
    let clean = linkedin.trim();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
    if (!clean.toLowerCase().includes("linkedin")) {
      const handle = clean.replace(/^\//, "");
      clean = `linkedin.com/in/${handle}`;
    }
    return clean;
  };

  // Formatar o GitHub para um padrão limpo
  const formatGithubForDocx = (github: string) => {
    if (!github) return "";
    let clean = github.trim();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
    if (!clean.toLowerCase().includes("github")) {
      const handle = clean.replace(/^\//, "");
      clean = `github.com/${handle}`;
    }
    return clean;
  };

  // Formatar o website/portfólio
  const formatWebsiteForDocx = (website: string) => {
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

  const rawWebsite = personalInfo.website || "";
  const isWebsiteGithub = rawWebsite.toLowerCase().includes("github.com");

  const cleanLinkedin = personalInfo.linkedin ? formatLinkedinForDocx(personalInfo.linkedin) : "";
  const cleanGithub = personalInfo.github
    ? formatGithubForDocx(personalInfo.github)
    : (isWebsiteGithub ? formatGithubForDocx(rawWebsite) : "");
  const cleanWebsite = rawWebsite && !isWebsiteGithub ? formatWebsiteForDocx(rawWebsite) : "";

  // Helper to join contact items into elegant lines
  const getContactLines = () => {
    const isOriginal = templateId === "original";
    if (isOriginal) {
      const items = [
        personalInfo.age ? `Idade: ${personalInfo.age}` : null,
        personalInfo.location ? `Localização: ${personalInfo.location}` : null,
        personalInfo.phone ? `Contatos: ${personalInfo.phone}` : null,
        personalInfo.email ? `E-mail: ${personalInfo.email}` : null,
        personalInfo.linkedin ? `LinkedIn: ${cleanLinkedin}` : null,
        cleanWebsite ? cleanWebsite : null,
      ].filter((item) => typeof item === "string" && item.trim() !== "");
      
      if (items.length > 3) {
        const half = Math.ceil(items.length / 2);
        return [items.slice(0, half).join("  |  "), items.slice(half).join("  |  ")];
      }
      return [items.join("  |  ")];
    }

    // Modern layout models (standard, harvard, jakes, executive, ats_clean)
    const line1Items = [
      personalInfo.location,
      personalInfo.email,
      personalInfo.phone,
    ].filter((item) => typeof item === "string" && item.trim() !== "");

    const rawLine2 = [
      cleanLinkedin,
      cleanGithub,
      cleanWebsite,
    ];

    const seen = new Set<string>();
    const line2Items: string[] = [];

    rawLine2.forEach((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
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

  const sectionBottomBorder: IBorderOptions = {
    color: "000000",
    space: 3,
    style: BorderStyle.SINGLE,
    size: 12, // 1.5 pt
  };

  const mainFont = templateId === "harvard" ? "Times New Roman" : "Arial";
  const headerAlignment = (templateId === "harvard" || templateId === "jakes")
    ? AlignmentType.CENTER
    : AlignmentType.LEFT;
  const hasSectionBorder = templateId !== "original";

  // Helper to create a heading with a solid bottom border
  const createSectionHeader = (title: string) => {
    let borderOpts: any = sectionBottomBorder;
    if (templateId === "executive") {
      borderOpts = { color: "CCCCCC", space: 3, style: BorderStyle.SINGLE, size: 8 };
    } else if (templateId === "ats_clean" || templateId === "original") {
      borderOpts = { color: "000000", space: 3, style: BorderStyle.SINGLE, size: 8 };
    }

    return new Paragraph({
      spacing: { before: 240, after: 120 }, // before 12pt, after 6pt
      border: hasSectionBorder ? { bottom: borderOpts } : undefined,
      children: [
        new TextRun({
          text: title.toUpperCase(),
          font: mainFont,
          size: templateId === "executive" ? 24 : 22, // 12pt for executive, 11pt others
          bold: true,
          color: "000000",
        }),
      ],
    });
  };

  // Helper to create a justified row for Position/Institution & Dates using an invisible Table
  const createJustifiedRow = (leftText: string, rightText: string, leftBold = true) => {
    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 40 },
                  children: [
                    new TextRun({
                      text: leftText,
                      font: mainFont,
                      size: 20, // 10pt
                      bold: leftBold,
                      color: "000000",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 40 },
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: rightText,
                      font: mainFont,
                      size: 18, // 9pt
                      bold: true,
                      color: "000000",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };

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

  // Process and format description blocks (supports clean bullet formatting)
  const processDescriptionParagraphs = (description: any) => {
    if (!description) return [];
    let lines: string[] = [];
    if (Array.isArray(description)) {
      lines = description.map((l) => typeof l === 'object' ? JSON.stringify(l) : String(l).trim()).filter(Boolean);
    } else if (typeof description === "string") {
      lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
    } else if (typeof description === "object") {
      const extracted = Object.values(description).flat().map(v => typeof v === 'object' ? JSON.stringify(v) : String(v));
      lines = extracted.map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) lines = [JSON.stringify(description)];
    } else {
      lines = [String(description).trim()];
    }

    const indentValue = templateId === "executive" ? 240 : 180;
    const leftBorder = templateId === "executive" ? {
      left: {
        color: "E5E7EB",
        space: 8,
        style: BorderStyle.SINGLE,
        size: 12, // 1.5pt
      }
    } : undefined;

    return lines.map((line) => {
      const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
      const cleanLine = isBullet ? line.replace(/^[•\-*]\s*/, "") : line;

      if (isBullet) {
        return new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 30, after: 30 },
          bullet: { level: 0 },
          border: leftBorder,
          children: [
            new TextRun({
              text: cleanLine,
              font: mainFont,
              size: 19, // 9.5pt
              color: "333333",
            }),
          ],
        });
      }

      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 40, after: 40 },
        indent: { left: indentValue },
        border: leftBorder,
        children: [
          new TextRun({
            text: line,
            font: mainFont,
            size: 19, // 9.5pt
            color: "333333",
          }),
        ],
      });
    });
  };

  // Build the list of document children elements
  const docChildren: any[] = [
    // Candidate Name
    new Paragraph({
      alignment: headerAlignment,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: fullName.toUpperCase(),
          font: mainFont,
          size: (templateId === "harvard" || templateId === "jakes" || templateId === "original") ? 44 : 36, // matches PDF sizes
          bold: true,
          color: "000000",
        }),
      ],
    }),
  ];

  // Contact info lines
  contactLines.forEach((line, index) => {
    const isLast = index === contactLines.length - 1;
    const contactBorder = (templateId === "executive" && isLast)
      ? { bottom: { color: "000000", space: 4, style: BorderStyle.SINGLE, size: 16 } }
      : undefined;

    docChildren.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { after: isLast ? 160 : 40 },
        border: contactBorder,
        children: [
          new TextRun({
            text: line,
            font: mainFont,
            size: 17, // 8.5pt
            bold: true,
            color: "4A4A4A",
          }),
        ],
      })
    );
  });

  const renderSummary = () => {
    if (!summary) return;
    docChildren.push(createSectionHeader(titles.summary));
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: summary,
            font: mainFont,
            size: 19, // 9.5pt
            color: "333333",
          }),
        ],
      })
    );
  };

  const renderExperience = () => {
    if (experience.length === 0) return;
    docChildren.push(createSectionHeader(titles.experience));
    experience.forEach((exp: any) => {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      const isAtsClean = templateId === "ats_clean";
      
      if (isAtsClean) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: `${exp.position || ""}${exp.company ? ` | ${exp.company}` : ""}`,
                font: mainFont,
                size: 20, // 10pt
                bold: true,
                color: "000000",
              }),
            ],
          })
        );
        if (dates) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({
                  text: dates,
                  font: mainFont,
                  size: 18, // 9pt
                  italics: true,
                  color: "4A4A4A",
                }),
              ],
            })
          );
        }
      } else if (templateId === "harvard") {
        // Row 1: Company (Bold) on Left, Dates (Plain) on Right
        docChildren.push(
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 20 },
                        children: [
                          new TextRun({
                            text: exp.company || "",
                            font: mainFont,
                            size: 20, // 10pt
                            bold: true,
                            color: "000000",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 20 },
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: dates,
                            font: mainFont,
                            size: 18, // 9pt
                            bold: false,
                            color: "000000",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );

        // Row 2: Position (Italic) on Left, Location (Plain, gray) on Right
        if (exp.position || personalInfo.location) {
          docChildren.push(
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 60, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          spacing: { before: 20, after: 40 },
                          children: [
                            new TextRun({
                              text: exp.position || "",
                              font: mainFont,
                              size: 19, // 9.5pt
                              italics: true,
                              color: "000000",
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          spacing: { before: 20, after: 40 },
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({
                              text: personalInfo.location || "",
                              font: mainFont,
                              size: 18, // 9pt
                              color: "666666",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            })
          );
        }
      } else {
        docChildren.push(createJustifiedRow(exp.position || "", dates));
        if (exp.company) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 20, after: 80 },
              children: [
                new TextRun({
                  text: exp.company,
                  font: mainFont,
                  size: 19, // 9.5pt
                  bold: true,
                  color: "4A4A4A",
                }),
              ],
            })
          );
        }
      }

      if (exp.description) {
        docChildren.push(...processDescriptionParagraphs(exp.description));
      }
    });
  };

  const renderProjects = () => {
    if (projects.length === 0) return;
    docChildren.push(createSectionHeader(titles.projects));
    projects.forEach((proj: any) => {
      const cleanName = (proj.name || "").replace(/\*/g, "");
      const cleanTech = (proj.technologies || "").replace(/\*/g, "");
      const isJakes = templateId === "jakes";
      const isAtsClean = templateId === "ats_clean";

      if (isJakes) {
        docChildren.push(createJustifiedRow(`${cleanName}${cleanTech ? ` | ${cleanTech}` : ""}`, proj.link || ""));
      } else if (isAtsClean) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: `${cleanName}${proj.link ? ` – ${proj.link}` : ""}`,
                font: mainFont,
                size: 20, // 10pt
                bold: true,
                color: "000000",
              }),
            ],
          })
        );
        if (cleanTech) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({
                  text: cleanTech,
                  font: mainFont,
                  size: 18, // 9pt
                  italics: true,
                  color: "4A4A4A",
                }),
              ],
            })
          );
        }
      } else {
        docChildren.push(createJustifiedRow(cleanName, proj.link || ""));
        if (proj.technologies) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 20, after: 80 },
              children: [
                new TextRun({
                  text: cleanTech,
                  font: mainFont,
                  size: 19,
                  bold: true,
                  color: "4A4A4A",
                }),
              ],
            })
          );
        }
      }

      if (proj.description) {
        docChildren.push(...processDescriptionParagraphs(proj.description));
      }
    });
  };

  const renderEducation = () => {
    if (education.length === 0) return;
    const isAtsClean = templateId === "ats_clean";
    const isExecutive = templateId === "executive";
    const isOriginal = templateId === "original";

    docChildren.push(createSectionHeader(isAtsClean || isOriginal ? "Formação Acadêmica" : titles.education));
    education.forEach((edu: any) => {
      const eduTitle = formatEduTitle(edu.degree, edu.field);
      const rightLine = (edu.graduationDate || edu.endDate || edu.startDate || "").replace(/\*/g, "");

      if (isAtsClean) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: `• ${eduTitle ? eduTitle : ""}${eduTitle && edu.institution ? " – " : ""}${edu.institution}${rightLine ? ` (${rightLine})` : ""}`,
                font: mainFont,
                size: 19, // 9.5pt
                bold: true,
                color: "000000",
              }),
            ],
          })
        );
      } else if (isExecutive) {
        if (eduTitle) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 60, after: 20 },
              children: [
                new TextRun({
                  text: eduTitle,
                  font: mainFont,
                  size: 20, // 10pt
                  bold: true,
                  color: "000000",
                }),
              ],
            })
          );
        }
        docChildren.push(
          new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: edu.institution,
                font: mainFont,
                size: 19, // 9.5pt
                bold: true,
                color: "4A4A4A",
              }),
            ],
          })
        );
        if (rightLine) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 20, after: 60 },
              children: [
                new TextRun({
                  text: rightLine,
                  font: mainFont,
                  size: 18, // 9pt
                  bold: true,
                  color: "666666",
                }),
              ],
            })
          );
        }
      } else if (isOriginal) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: "• ",
                font: mainFont,
                size: 19,
              }),
              new TextRun({
                text: eduTitle || "",
                font: mainFont,
                size: 19,
                bold: true,
              }),
              new TextRun({
                text: `${eduTitle && edu.institution ? " – " : ""}${edu.institution}${rightLine ? ` (${rightLine})` : ""}`,
                font: mainFont,
                size: 19,
              }),
            ],
          })
        );
      } else {
        const leftTextParts = [edu.institution];
        if (eduTitle) {
          leftTextParts.push(eduTitle);
        }
        const leftLine = leftTextParts.filter(Boolean).join(" - ").replace(/\*/g, "");
        docChildren.push(createJustifiedRow(leftLine, rightLine));
      }
    });
  };

  const renderSkills = () => {
    if (skills.length === 0) return;
    docChildren.push(createSectionHeader(titles.skills));
    skills.forEach((skill: string) => {
      docChildren.push(
        new Paragraph({
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({
              text: skill,
              font: mainFont,
              size: 19, // 9.5pt
              color: "333333",
            }),
          ],
        })
      );
    });
  };

  const renderLanguages = () => {
    if (languages.length === 0) return;
    docChildren.push(createSectionHeader(titles.languages));
    languages.forEach((lang: string) => {
      docChildren.push(
        new Paragraph({
          spacing: { before: 30, after: 30 },
          children: [
            new TextRun({
              text: lang,
              font: mainFont,
              size: 19, // 9.5pt
              color: "333333",
            }),
          ],
        })
      );
    });
  };

  const renderCertifications = () => {
    if (certifications.length === 0) return;
    const isAtsClean = templateId === "ats_clean";
    const isOriginal = templateId === "original";

    docChildren.push(createSectionHeader(titles.certifications));
    certifications.forEach((cert: any) => {
      const { main, date } = parseCertificationLine(cert);
      if (!main) return;

      if (isAtsClean || isOriginal) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({
                text: "• ",
                font: mainFont,
                size: 19,
                bold: true,
              }),
              new TextRun({
                text: main,
                font: mainFont,
                size: 19,
              }),
              new TextRun({
                text: date ? `  (${date})` : "",
                font: mainFont,
                size: 18,
                bold: true,
              }),
            ],
          })
        );
      } else {
        docChildren.push(createJustifiedRow(main, date || "", false));
      }
    });
  };

  // Build document according to the template ordering
  renderSummary();
  if (templateId === "jakes") {
    renderEducation();
    renderExperience();
    renderProjects();
  } else {
    renderExperience();
    renderProjects();
    renderEducation();
  }
  renderSkills();
  renderLanguages();
  renderCertifications();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 480, right: 720, bottom: 480, left: 720 }, // 24pt top/bottom, 36pt left/right (equivalent to HTML/PDF)
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
};
