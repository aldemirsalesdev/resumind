import { calculateAtsScore } from "../lib/atsScore";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import mammoth from "mammoth";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

export const getGeminiClient = () => {
  const key = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

export const getGroqClient = () => {
  const key = process.env.GROQ_API_KEY || process.env.groq_api_key;
  if (!key)
    throw new Error(
      "GROQ_API_KEY não está configurada. Adicione a chave GROQ_API_KEY nas variáveis de ambiente.",
    );
  return new Groq({ apiKey: key });
};

// Resilient LLM runner helper with Groq as primary and Gemini as fallback
export const runAiQuery = async (
  prompt: string,
  options: { jsonMode?: boolean } = {}
) => {
  // 1. Try Groq as the primary engine across supported models
  const groqModels = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
  ];

  try {
    const client = getGroqClient();
    for (const model of groqModels) {
      try {
        console.log(`[AI Runner] Attempting Groq query with model: ${model}...`);
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.0,
          seed: 42,
          response_format: options.jsonMode ? { type: "json_object" } : undefined,
        });
        const responseText = response.choices[0]?.message?.content || "";
        if (responseText) {
          console.log(`[AI Runner] Groq query succeeded with model: ${model}!`);
          return responseText;
        }
      } catch (groqError: any) {
        const errMsg = groqError?.message || String(groqError);
        console.warn(`[AI Runner] Groq model ${model} failed (${errMsg}). Trying next model...`);
        if (groqError?.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  } catch (groqFinalError: any) {
    console.warn(
      `[AI Runner] Groq client not available or unconfigured. Falling back to Gemini...`,
      groqFinalError?.message || groqFinalError
    );
  }

  // 2. Fallback to Gemini if Groq fails or is not configured
  console.warn("[AI Runner] Falling back to Gemini models sequentially...");
  const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
  let lastGeminiError: any = null;

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
          config: options.jsonMode
            ? {
                responseMimeType: "application/json",
                temperature: 0.0,
                seed: 42,
              }
            : {
                temperature: 0.0,
                seed: 42,
              },
        });
        if (geminiResponse.text) {
          console.log(
            `[AI Runner] Gemini fallback succeeded with model ${modelName} on attempt ${attempt}!`
          );
          return geminiResponse.text;
        }
      } catch (geminiError: any) {
        lastGeminiError = geminiError;
        console.warn(
          `[AI Runner] Gemini API error with model ${modelName} (attempt ${attempt}): ${geminiError?.message || geminiError}`
        );
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }

  throw (
    lastGeminiError ||
    new Error("Ambos os serviços Groq e Gemini falharam ao processar a requisição.")
  );
};

export const extractTextFromPdf = async (fileBuffer: Buffer): Promise<string> => {
  try {
    const pdfModule: any = await import("pdf-parse").catch(() => null);
    if (pdfModule) {
      if (typeof pdfModule.PDFParse === "function") {
        const parser = new pdfModule.PDFParse({ data: fileBuffer });
        const textResult = await parser.getText();
        const text = textResult.text || "";
        await parser.destroy();
        if (text.trim()) return text;
      }
      const defaultExport = pdfModule.default || pdfModule;
      if (defaultExport && typeof defaultExport.PDFParse === "function") {
        const parser = new defaultExport.PDFParse({ data: fileBuffer });
        const textResult = await parser.getText();
        const text = textResult.text || "";
        await parser.destroy();
        if (text.trim()) return text;
      }
      if (typeof defaultExport === "function") {
        const pdfData = await defaultExport(fileBuffer, { max: 0 });
        if (pdfData && pdfData.text) return pdfData.text;
      }
    }
  } catch (err) {
    console.warn("Local PDF extraction library failed, proceeding to Gemini OCR fallback:", err);
  }
  return "";
};

export const sanitizeLinkedinLink = (linkedin: any) => {
  if (!linkedin || typeof linkedin !== "string") return "";
  let str = linkedin.trim();
  if (
    str.toLowerCase().includes("linkedin") &&
    !str.toLowerCase().includes(".com")
  ) {
    if (str.toLowerCase().includes("linkedin/in/")) {
      const parts = str.toLowerCase().split("linkedin/in/");
      return str.includes("://")
        ? `https://linkedin.com/in/${parts[1] || ""}`
        : `linkedin.com/in/${parts[1] || ""}`;
    }
    return str.replace(/linkedin/i, "linkedin.com");
  } else if (
    !str.toLowerCase().includes("linkedin") &&
    !str.toLowerCase().includes(".com") &&
    !str.includes("/")
  ) {
    const username = str.replace("@", "").trim();
    if (username) return `linkedin.com/in/${username}`;
  }
  return str;
};

export const runPythonAnalyzer = (rawText: string): any => {
  try {
    const pythonCmd =
      process.platform === "win32"
        ? "python core_analyzer/cli.py"
        : "python3 core_analyzer/cli.py";
    const stdout = execSync(pythonCmd, {
      input: rawText,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (error: any) {
    return null;
  }
};

export const extractEmailFromRawText = (raw: string) => {
  const normalized = raw
    .replace(/\s*@\s*/g, "@")
    .replace(/\s*\.\s*(com|br|org|net|comm|commm)\b/gi, ".$1");
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
  const match = normalized.match(emailRegex);
  if (match) {
    return match[1].replace(/[^\w]+$/, "");
  }
  return null;
};

export const extractPhoneFromRawText = (raw: string) => {
  const phoneRegex =
    /(?:(?:\+|00)?55[\s-]?)?(?:\(?0?\d{2}\)?[\s-]?)?(?:9[\s-]?\d{4}|\d{4})[\s-]*\d{4}/g;
  const matches = raw.match(phoneRegex);
  if (matches && matches.length > 0) {
    const validMatches = matches.filter((m) => m.replace(/\D/g, "").length >= 8);
    if (validMatches.length > 0) {
      return validMatches[0].trim();
    }
  }
  return null;
};

export function parseRequestBody(req: any): any {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export function applyCors(req: any, res: any): boolean {
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
