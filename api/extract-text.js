// src/server/sharedAi.ts
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
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
var extractTextFromPdf = async (fileBuffer) => {
  try {
    const pdfModule = await import("pdf-parse").catch(() => null);
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
    console.warn("Local PDF extraction library failed, proceeding to fallback:", err);
  }
  try {
    const rawStr = fileBuffer.toString("binary");
    const textChunks = [];
    const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(rawStr)) !== null) {
      const decoded = match[1].replace(/\\([()\\])/g, "$1");
      textChunks.push(decoded);
    }
    const joined = textChunks.join(" ").trim();
    if (joined.length > 30) {
      return joined;
    }
  } catch (regexErr) {
    console.warn("Regex fallback PDF parser failed:", regexErr);
  }
  return "";
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

// src/server/api/extract-text.ts
import mammoth from "mammoth";
import path from "path";
var config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  },
  maxDuration: 60
};
async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const body = await parseRequestBody(req);
    const { filename = "", mimetype = "", data = "" } = body;
    if (!filename || !data) {
      return res.status(400).json({ error: "Nome do arquivo ou dados ausentes na requisi\xE7\xE3o." });
    }
    const ext = path.extname(filename).toLowerCase();
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: `Formato de arquivo ${ext} n\xE3o suportado. Envie PDF, DOCX ou TXT.`
      });
    }
    const base64Data = data.includes(",") ? data.split(",")[1] : data;
    const fileBuffer = Buffer.from(base64Data, "base64");
    if (fileBuffer.length === 0) {
      return res.status(400).json({ error: "O arquivo enviado est\xE1 vazio." });
    }
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "O arquivo excede o limite m\xE1ximo permitido de 10MB." });
    }
    let rawText = "";
    if (ext === ".pdf") {
      try {
        rawText = await extractTextFromPdf(fileBuffer);
      } catch (pdfErr) {
        console.warn("Local PDF extraction error:", pdfErr);
      }
    } else if (ext === ".docx") {
      try {
        const mammothResult = await mammoth.extractRawText({ buffer: fileBuffer });
        rawText = mammothResult.value;
      } catch (docxErr) {
        return res.status(400).json({
          error: "N\xE3o foi poss\xEDvel ler o documento Word (DOCX). Verifique se o arquivo est\xE1 corrompido."
        });
      }
    } else if (ext === ".txt") {
      rawText = fileBuffer.toString("utf-8");
    }
    let textStripped = rawText.replace(/\0/g, "").trim();
    if (!textStripped && mimetype) {
      try {
        const client = getGeminiClient();
        let response;
        try {
          response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimetype
                    }
                  },
                  {
                    text: "Voc\xEA \xE9 um extrator OCR especializado em curr\xEDculos profissionais. Transcreva todo o conte\xFAdo textual leg\xEDvel deste documento de forma fiel, preservando a ordem das se\xE7\xF5es e informa\xE7\xF5es de contato. Retorne APENAS o texto puro transcrito, sem introdu\xE7\xF5es ou coment\xE1rios."
                  }
                ]
              }
            ]
          });
        } catch (flashErr) {
          response = await client.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimetype
                    }
                  },
                  {
                    text: "Extraia todo o texto deste curr\xEDculo exatamente como escrito."
                  }
                ]
              }
            ]
          });
        }
        if (response && response.text) {
          textStripped = response.text.replace(/\0/g, "").trim();
        }
      } catch (fallbackError) {
        console.warn("OCR Fallback extraction failed:", fallbackError?.message);
      }
    }
    if (!textStripped) {
      return res.status(400).json({
        error: "O arquivo parece estar vazio, protegido por senha ou n\xE3o cont\xE9m texto leg\xEDvel. Tente salv\xE1-lo novamente em PDF padr\xE3o ou formato DOCX."
      });
    }
    return res.status(200).json({
      success: true,
      text: textStripped,
      filename,
      charCount: textStripped.length
    });
  } catch (e) {
    console.error("API /extract-text Error:", e);
    return res.status(500).json({
      error: e?.message || "Falha interna ao processar o arquivo no servidor."
    });
  }
}
export {
  config,
  handler as default
};
