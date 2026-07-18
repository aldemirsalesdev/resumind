import { z } from "zod";
import DOMPurify from "dompurify";

// Helper for sanitizing strings to prevent XSS / script injection
const sanitizeString = (val: unknown) => {
  if (typeof val === "string") {
    return DOMPurify.sanitize(val, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  return val;
};

export const resumeSchema = z
  .object({
    personalInfo: z
      .object({
        fullName: z.preprocess(sanitizeString, z.string().default("")),
        email: z.preprocess(sanitizeString, z.string().default("")),
        phone: z.preprocess(sanitizeString, z.string().default("")),
        location: z.preprocess(sanitizeString, z.string().default("")),
        linkedin: z.preprocess(sanitizeString, z.string().default("")),
        github: z.preprocess(sanitizeString, z.string().default("")),
        website: z.preprocess(sanitizeString, z.string().default("")),
      })
      .passthrough(),
    summary: z.preprocess(sanitizeString, z.string().default("")),
    experience: z
      .array(
        z
          .object({
            company: z.preprocess(sanitizeString, z.string().default("")),
            position: z.preprocess(sanitizeString, z.string().default("")),
            startDate: z.preprocess(sanitizeString, z.string().default("")),
            endDate: z.preprocess(sanitizeString, z.string().default("")),
            description: z.preprocess(sanitizeString, z.string().default("")),
          })
          .passthrough(),
      )
      .default([]),
    projects: z
      .array(
        z
          .object({
            name: z.preprocess(sanitizeString, z.string().default("")),
            description: z.preprocess(sanitizeString, z.string().default("")),
            technologies: z.preprocess(sanitizeString, z.string().default("")),
            link: z.preprocess(sanitizeString, z.string().default("")),
          })
          .passthrough(),
      )
      .default([]),
    education: z
      .array(
        z
          .object({
            institution: z.preprocess(sanitizeString, z.string().default("")),
            degree: z.preprocess(sanitizeString, z.string().default("")),
            field: z.preprocess(sanitizeString, z.string().default("")),
            graduationDate: z.preprocess(
              sanitizeString,
              z.string().default(""),
            ),
          })
          .passthrough(),
      )
      .default([]),
    skills: z.array(z.preprocess(sanitizeString, z.string())).default([]),
    certifications: z
      .array(
        z.union([
          z.preprocess(sanitizeString, z.string()),
          z.object({
            name: z.preprocess(sanitizeString, z.string().default("")),
            institution: z.preprocess(sanitizeString, z.string().default("")),
            hours: z.preprocess(sanitizeString, z.string().default("")),
            date: z.preprocess(sanitizeString, z.string().default("")),
            status: z.preprocess(sanitizeString, z.string().default("")),
            modality: z.preprocess(sanitizeString, z.string().default("")),
          }).passthrough()
        ])
      )
      .default([]),
    languages: z.array(z.preprocess(sanitizeString, z.string())).default([]),
  })
  .passthrough();

export type ResumeSchemaType = z.infer<typeof resumeSchema>;
