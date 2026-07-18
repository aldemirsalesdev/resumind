import { pdf } from "@react-pdf/renderer";
import React from "react";
import { TemplatePdfDocument } from "../templates/standardATS/pdf";
import { generateStandardATSDocx } from "../templates/standardATS/docx";
import { resumeSchema } from "../lib/resumeSchema";

export function normalizeTemplateId(templateId: string | undefined): string {
  if (!templateId) {
    throw new Error("Validation Error: Template ID is empty or undefined");
  }
  const validTemplates = ["original", "ats_clean", "harvard", "jakes", "executive", "standard"];
  const normalized = templateId.trim().toLowerCase();
  
  if (validTemplates.includes(normalized)) {
    return normalized;
  }
  
  if (normalized === "standardats" || normalized === "standard_ats") return "standard";
  if (normalized === "harvardwso" || normalized === "harvard_wso") return "harvard";
  if (normalized === "executiveats" || normalized === "executive_ats") return "executive";
  if (normalized === "siliconvalley" || normalized === "silicon_valley") return "jakes";
  if (normalized === "asmcore" || normalized === "asm_core") return "ats_clean";

  throw new Error(`Validation Error: Unknown template ID "${templateId}"`);
}

export function getSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export function getCleanedDataHash(dataToClean: any): string {
  let sanitizedData = dataToClean || {};
  try {
    sanitizedData = resumeSchema.parse(sanitizedData);
  } catch (err) {
    console.warn("Schema validation failed during hash prep:", err);
  }
  
  const cleaned: any = {};
  
  // 1. Personal Info
  if (sanitizedData.personalInfo) {
    const pi = sanitizedData.personalInfo;
    cleaned.personalInfo = {
      fullName: pi.fullName || "",
      email: pi.email || "",
      phone: pi.phone || "",
      location: pi.location || "",
      linkedin: pi.linkedin || "",
      github: pi.github || "",
      website: pi.website || "",
    };
  } else {
    cleaned.personalInfo = {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      website: "",
    };
  }
  
  // 2. Summary
  cleaned.summary = sanitizedData.summary || "";
  
  // 3. Experience
  if (Array.isArray(sanitizedData.experience)) {
    cleaned.experience = sanitizedData.experience.map((exp: any) => ({
      company: exp.company || "",
      position: exp.position || "",
      startDate: exp.startDate || "",
      endDate: exp.endDate || "",
      description: exp.description || "",
    }));
  } else {
    cleaned.experience = [];
  }
  
  // 4. Projects
  if (Array.isArray(sanitizedData.projects)) {
    cleaned.projects = sanitizedData.projects.map((proj: any) => ({
      name: proj.name || "",
      description: proj.description || "",
      technologies: proj.technologies || "",
      link: proj.link || "",
    }));
  } else {
    cleaned.projects = [];
  }
  
  // 5. Education
  if (Array.isArray(sanitizedData.education)) {
    cleaned.education = sanitizedData.education.map((edu: any) => ({
      institution: edu.institution || "",
      degree: edu.degree || "",
      field: edu.field || "",
      graduationDate: edu.graduationDate || "",
    }));
  } else {
    cleaned.education = [];
  }
  
  // 6. Skills
  if (Array.isArray(sanitizedData.skills)) {
    cleaned.skills = sanitizedData.skills
      .map((s: any) => (typeof s === "string" ? s.trim() : ""))
      .filter((s: string) => s !== "");
  } else {
    cleaned.skills = [];
  }
  
  // 7. Certifications
  if (Array.isArray(sanitizedData.certifications)) {
    cleaned.certifications = sanitizedData.certifications
      .map((cert: any) => {
        if (typeof cert === "string") {
          return cert.trim();
        }
        if (cert && typeof cert === "object") {
          return {
            name: cert.name || "",
            institution: cert.institution || "",
            hours: cert.hours || "",
            date: cert.date || "",
            status: cert.status || "",
            modality: cert.modality || "",
          };
        }
        return null;
      })
      .filter(Boolean);
  } else {
    cleaned.certifications = [];
  }
  
  // 8. Languages
  if (Array.isArray(sanitizedData.languages)) {
    cleaned.languages = sanitizedData.languages
      .map((l: any) => (typeof l === "string" ? l.trim() : ""))
      .filter((l: string) => l !== "");
  } else {
    cleaned.languages = [];
  }

  // Sort keys to guarantee order independence
  const sortedCleaned: any = {};
  Object.keys(cleaned).sort().forEach(key => {
    sortedCleaned[key] = cleaned[key];
  });

  return JSON.stringify(sortedCleaned);
}

interface CachedBlobContext {
  userId: string;
  resumeId: string;
  templateId: string;
  dataHash: string;
  blob: Blob;
  format?: "pdf" | "docx";
}

interface ExportResumeParams {
  format: "pdf" | "docx";
  userId: string;
  resumeId: string;
  templateId: string;
  resumeData: any;
  cachedBlobContext?: CachedBlobContext | null;
  dataHash: string;
}

export const exportResume = async ({
  format,
  userId,
  resumeId,
  templateId,
  resumeData,
  cachedBlobContext,
  dataHash,
}: ExportResumeParams) => {
  // Rigorous validation against incorrect resume or template
  if (!format || (format !== "pdf" && format !== "docx")) {
    throw new Error(`Validation Error: Unsupported or missing format: "${format}"`);
  }
  if (!resumeId) {
    throw new Error("Validation Error: Missing resumeId");
  }
  if (!resumeData) {
    throw new Error("Validation Error: Missing resumeData");
  }
  if (!userId) {
    throw new Error("Validation Error: Missing userId");
  }
  
  const normalizedTemplate = normalizeTemplateId(templateId);

  // Assert resumeData belongs to the open resume
  const computedHash = getSimpleHash(JSON.stringify({
    resumeData: getCleanedDataHash(resumeData),
    templateId: normalizedTemplate
  }));

  if (computedHash !== dataHash) {
    console.error("HASH MISMATCH DETECTED!", { dataHash, computedHash });
    throw new Error(`Export Blocked: Stale data context detected! Expected hash ${dataHash}, got ${computedHash}.`);
  }

  // Validate the cached blob context if provided
  let blob: Blob | undefined;
  if (cachedBlobContext) {
    const cachedUserId = cachedBlobContext.userId;
    const cachedResumeId = cachedBlobContext.resumeId;
    const cachedTemplateNormalized = normalizeTemplateId(cachedBlobContext.templateId);
    const cachedDataHash = cachedBlobContext.dataHash;
    const cachedFormat = cachedBlobContext.format;

    if (
      cachedUserId === userId &&
      cachedResumeId === resumeId &&
      cachedTemplateNormalized === normalizedTemplate &&
      cachedDataHash === dataHash &&
      cachedFormat === format
    ) {
      console.log(`[exportResume] Valid cached ${format.toUpperCase()} blob context found. Downloading directly.`);
      blob = cachedBlobContext.blob;
    } else {
      console.warn(`[exportResume] Cached blob context mismatch! It will be ignored and a new file will be generated.`, {
        expected: { userId, resumeId, templateId: normalizedTemplate, dataHash, format },
        actual: { userId: cachedUserId, resumeId: cachedResumeId, templateId: cachedTemplateNormalized, dataHash: cachedDataHash, format: cachedFormat }
      });
    }
  }

  // Mandatory Debug Logs
  console.log("REAL EXPORT FUNCTION CALLED");
  console.log("EXPORT RESUME ID:", resumeId);
  console.log("TEMPLATE USED IN EXPORT:", normalizedTemplate);
  console.log("EXPORT FORMAT:", format);
  console.log("FINAL RESUME DATA:", resumeData);
  console.log("SUMMARY:", resumeData.summary);
  console.log("EMAIL:", resumeData.personalInfo?.email);
  console.log("PHONE:", resumeData.personalInfo?.phone);
  console.log("LINKEDIN:", resumeData.personalInfo?.linkedin);
  console.log("GITHUB:", resumeData.personalInfo?.github);
  console.log("EXPERIENCES:", resumeData.experience || resumeData.experiences);
  console.log("EDUCATION:", resumeData.education);
  console.log("CERTIFICATIONS:", resumeData.certifications);

  const personalInfo = resumeData?.personalInfo || {};
  const fullName = personalInfo.fullName || personalInfo.name || "Curriculo";
  const filenameBase = fullName.replace(/\s+/g, "_");

  if (format === "pdf") {
    try {
      if (!blob) {
        console.log("[exportResume] Generating fresh PDF blob...");
        blob = await pdf(<TemplatePdfDocument data={resumeData} templateId={normalizedTemplate} />).toBlob();
      }
      const url = URL.createObjectURL(blob);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = url;
      fileDownload.download = `${filenameBase}.pdf`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF inside exportResume:", error);
      throw error;
    }
  } else if (format === "docx") {
    try {
      if (!blob) {
        console.log("[exportResume] Generating fresh DOCX blob...");
        blob = await generateStandardATSDocx(resumeData, normalizedTemplate);
      }
      const url = URL.createObjectURL(blob);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = url;
      fileDownload.download = `${filenameBase}.docx`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating DOCX inside exportResume:", error);
      throw error;
    }
  }
};
