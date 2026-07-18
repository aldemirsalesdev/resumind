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

export const generateDocx = async (structured: any, templateId: string) => {
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

  const cleanLinkedin = personalInfo.linkedin ? formatLinkedinForDocx(personalInfo.linkedin) : "";

  // Helper to join contact items cleanly
  const contactItems: string[] = [];
  if (personalInfo.location) contactItems.push(personalInfo.location);
  if (personalInfo.email) contactItems.push(personalInfo.email);
  if (personalInfo.phone) contactItems.push(personalInfo.phone);
  if (cleanLinkedin) contactItems.push(cleanLinkedin);
  if (personalInfo.website) contactItems.push(personalInfo.website);

  const contactLine = contactItems.join("  |  ");

  const sectionBottomBorder: IBorderOptions = {
    color: "000000",
    space: 3,
    style: BorderStyle.SINGLE,
    size: 12, // 1.5 pt
  };

  const mainFont = "Arial";

  // Helper to create a heading with a solid bottom border
  const createSectionHeader = (title: string) => {
    return new Paragraph({
      spacing: { before: 240, after: 120 }, // before 12pt, after 6pt
      border: { bottom: sectionBottomBorder },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          font: mainFont,
          size: 22, // 11pt
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
              width: { size: 75, type: WidthType.PERCENTAGE },
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
              width: { size: 25, type: WidthType.PERCENTAGE },
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

  // Process and format description blocks (supports clean bullet formatting)
  const processDescriptionParagraphs = (description: string) => {
    if (!description) return [];
    const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
      const cleanLine = isBullet ? line.replace(/^[•\-*]\s*/, "") : line;

      if (isBullet) {
        return new Paragraph({
          spacing: { before: 30, after: 30 },
          bullet: { level: 0 },
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
        spacing: { before: 40, after: 40 },
        indent: { left: 180 }, // Indent non-bullet text slightly
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
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: fullName.toUpperCase(),
          font: mainFont,
          size: 44, // 22pt
          bold: true,
          color: "000000",
        }),
      ],
    }),
  ];

  // Contact info line
  if (contactLine) {
    docChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactLine,
            font: mainFont,
            size: 17, // 8.5pt
            bold: true,
            color: "4A4A4A",
          }),
        ],
      })
    );
  }

  // Summary
  if (summary) {
    docChildren.push(createSectionHeader("Resumo Profissional"));
    docChildren.push(
      new Paragraph({
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
  }

  // Experience
  if (experience.length > 0) {
    docChildren.push(createSectionHeader("Experiência Profissional"));
    experience.forEach((exp: any) => {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
      
      // Justified Table with Position and Dates
      docChildren.push(createJustifiedRow(exp.position || "", dates));

      // Subtitle with Company Name
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

      // Job description
      if (exp.description) {
        docChildren.push(...processDescriptionParagraphs(exp.description));
      }
    });
  }

  // Projects
  if (projects.length > 0) {
    docChildren.push(createSectionHeader("Projetos e Trabalhos Acadêmicos"));
    projects.forEach((proj: any) => {
      // Justified Table with Project Name and Link
      docChildren.push(createJustifiedRow(proj.name || "", proj.link || ""));

      // Subtitle with technologies
      if (proj.technologies) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 20, after: 80 },
            children: [
              new TextRun({
                text: proj.technologies,
                font: mainFont,
                size: 19, // 9.5pt
                bold: true,
                color: "4A4A4A",
              }),
            ],
          })
        );
      }

      // Project description
      if (proj.description) {
        docChildren.push(...processDescriptionParagraphs(proj.description));
      }
    });
  }

  // Education
  if (education.length > 0) {
    docChildren.push(createSectionHeader("Educação"));
    education.forEach((edu: any) => {
      const field = edu.field ? edu.field.trim() : "";
      const degree = edu.degree ? edu.degree.trim() : "";
      const eduTitleParts = [degree, field].filter(Boolean).join(" - ");
      
      const leftTextParts = [edu.institution];
      if (eduTitleParts) {
        leftTextParts.push(eduTitleParts);
      }
      const leftLine = leftTextParts.filter(Boolean).join(" - ");

      docChildren.push(createJustifiedRow(leftLine, edu.graduationDate || ""));
    });
  }

  // Skills
  if (skills.length > 0) {
    docChildren.push(createSectionHeader("Habilidades"));
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
  }

  // Languages
  if (languages.length > 0) {
    docChildren.push(createSectionHeader("Idiomas"));
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
  }

  // Certifications
  if (certifications.length > 0) {
    docChildren.push(createSectionHeader("Cursos e Certificações"));
    certifications.forEach((cert: any) => {
      const { main, date } = parseCertificationLine(cert);
      if (!main) return;

      docChildren.push(createJustifiedRow(main, date || "", false));
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
};
