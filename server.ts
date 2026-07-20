import { calculateAtsScore } from "./src/lib/atsScore";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware, responseInterceptor } from "http-proxy-middleware";
import path from "path";
import { execSync } from "child_process";
import fs from "fs";
import helmet from "helmet";
import cors from "cors";

import * as pdfParseModule from "pdf-parse";

// --- SECURITY LOG AUDITING WRAPPERS ---
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

const sanitizeLogString = (str: string): string => {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/(AIzaSy[A-Za-z0-9-_]{35})/gi, "[MASKED_KEY]")
    .replace(/(gsk_[A-Za-z0-9]{48})/gi, "[MASKED_KEY]")
    .replace(/(eyJhbGciOi[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+=]*)/gi, "[MASKED_JWT]")
    .replace(/(Bearer\s+[A-Za-z0-9-_=.]+)/gi, "Bearer [MASKED_TOKEN]")
    .replace(/("Authorization"\s*:\s*")[^"]+(")/gi, '$1[MASKED]$2')
    .replace(/("apiKey"\s*:\s*")[^"]+(")/gi, '$1[MASKED]$2')
    .replace(/("api_key"\s*:\s*")[^"]+(")/gi, '$1[MASKED]$2')
    .replace(/(key=[A-Za-z0-9-_]{20,})/gi, "key=[MASKED]")
    .replace(/(AIza[0-9A-Za-z-_]{35})/gi, "[MASKED_KEY]");
};

const sanitizeLogArg = (arg: any): any => {
  if (arg === null || arg === undefined) return arg;
  if (typeof arg === "string") return sanitizeLogString(arg);
  if (arg instanceof Error) {
    const sanitizedErr = new Error(sanitizeLogString(arg.message));
    sanitizedErr.name = arg.name;
    sanitizedErr.stack = sanitizeLogString(arg.stack || "");
    return sanitizedErr;
  }
  try {
    const json = JSON.stringify(arg);
    return JSON.parse(sanitizeLogString(json));
  } catch {
    return String(arg);
  }
};

console.log = (...args: any[]) => {
  originalLog(...args.map(sanitizeLogArg));
};
console.warn = (...args: any[]) => {
  originalWarn(...args.map(sanitizeLogArg));
};
console.error = (...args: any[]) => {
  originalError(...args.map(sanitizeLogArg));
};
// --- END SECURITY LOG AUDITING WRAPPERS ---

// Robust helper to extract plain text from PDF under both ESM/CJS and newer class-based vs legacy function-based pdf-parse versions
const extractTextFromPdf = async (fileBuffer: Buffer): Promise<string> => {
  // 1. Try modern class-based API of pdf-parse v2+
  try {
    if (pdfParseModule && typeof pdfParseModule.PDFParse === "function") {
      const parser = new pdfParseModule.PDFParse({ data: fileBuffer });
      const textResult = await parser.getText();
      const text = textResult.text || "";
      await parser.destroy();
      return text;
    }
  } catch (err) {
    console.warn(
      "Class-based PDFParse instantiation failed, trying other paths:",
      err,
    );
  }

  // 2. Try default exported class
  try {
    const defaultExport = (pdfParseModule as any).default;
    if (defaultExport && typeof defaultExport.PDFParse === "function") {
      const parser = new defaultExport.PDFParse({ data: fileBuffer });
      const textResult = await parser.getText();
      const text = textResult.text || "";
      await parser.destroy();
      return text;
    }
  } catch (err) {
    console.warn("Default export PDFParse instantiation failed:", err);
  }

  // 3. Fallback to legacy function-based API
  try {
    let pdfParser: any = null;
    if (typeof pdfParseModule === "function") {
      pdfParser = pdfParseModule;
    } else if (
      pdfParseModule &&
      typeof (pdfParseModule as any).default === "function"
    ) {
      pdfParser = (pdfParseModule as any).default;
    }

    if (typeof pdfParser === "function") {
      const pdfData = await pdfParser(fileBuffer, { max: 0 });
      return pdfData.text || "";
    }
  } catch (err) {
    console.error("Legacy pdf-parse function approach failed:", err);
  }

  throw new Error(
    "Não foi possível processar o PDF com nenhuma das APIs disponíveis.",
  );
};

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import mammoth from "mammoth";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

// In-memory cache for Firebase Auth routes to make them load instantly and eliminate loading white-screen delay
const authCache = new Map<string, { body: Buffer; contentType: string }>();

async function preloadAuthCache() {
  const urls = [
    { path: "/__/auth/handler", url: "https://gen-lang-client-0799748527.firebaseapp.com/__/auth/handler", type: "text/html; charset=utf-8" },
    { path: "/__/auth/iframe", url: "https://gen-lang-client-0799748527.firebaseapp.com/__/auth/iframe", type: "text/html; charset=utf-8" },
    { path: "/__/auth/handler.js", url: "https://gen-lang-client-0799748527.firebaseapp.com/__/auth/handler.js", type: "text/javascript; charset=utf-8" },
    { path: "/__/auth/experiments.js", url: "https://gen-lang-client-0799748527.firebaseapp.com/__/auth/experiments.js", type: "text/javascript; charset=utf-8" },
    { path: "/__/auth/iframe.js", url: "https://gen-lang-client-0799748527.firebaseapp.com/__/auth/iframe.js", type: "text/javascript; charset=utf-8" }
  ];

  for (const item of urls) {
    try {
      if (typeof fetch === "undefined") {
        console.warn("[AuthCache] fetch is not defined in this Node environment, skipping preloading.");
        break;
      }
      const res = await fetch(item.url);
      if (res.ok) {
        let bodyBuffer = Buffer.from(await res.arrayBuffer());
        if (item.path.endsWith("handler") || item.path.endsWith("iframe")) {
          // Inject dark background and styles into the head to prevent any white flash
          const html = bodyBuffer.toString("utf8");
          const styledHtml = html.replace(
            "<head>",
            `<head>
  <meta name="color-scheme" content="dark">
  <style>
    html, body {
      background-color: #0c0a09 !important;
      background: #0c0a09 !important;
      color: #ffffff !important;
    }
  </style>`
          );
          bodyBuffer = Buffer.from(styledHtml, "utf8");
        }
        authCache.set(item.path, {
          body: bodyBuffer,
          contentType: item.type
        });
        console.log(`[AuthCache] Preloaded and styled ${item.path}`);
      }
    } catch (err) {
      console.error(`[AuthCache] Failed to preload ${item.path}:`, err);
    }
  }
}

async function startServer() {
  console.log("Starting Node.js Fullstack Server...");
  const app = express();
  app.disable("x-powered-by");
  const PORT = 3000;

  // 1. Kick off preloading immediately on startup
  preloadAuthCache().catch(console.error);

  // 2. Serve from in-memory cache if available to load instantly (0ms)
  app.get("/__/auth/:file?", (req, res, next) => {
    const cacheKey = req.path;
    if (authCache.has(cacheKey)) {
      const cached = authCache.get(cacheKey)!;
      res.setHeader("Content-Type", cached.contentType);
      // Aggressive caching header to tell browser to load instantly from cache next time
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(cached.body);
    }
    next();
  });

  // Proxy Firebase Auth custom domain routes to original Firebase handler domain to avoid serving our entire React app inside the popup/iframe
  // Registered BEFORE express.json() to prevent body-parsing streams from hanging the proxy request
  app.use(
    "/__/auth",
    createProxyMiddleware({
      target: "https://gen-lang-client-0799748527.firebaseapp.com",
      changeOrigin: true,
      pathRewrite: {
        "^/": "/__/auth/",
      },
      selfHandleResponse: true,
      on: {
        proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
          const contentType = proxyRes.headers["content-type"];
          let body = responseBuffer;
          if (contentType && contentType.includes("text/html")) {
            const html = responseBuffer.toString("utf8");
            // Inject dark background and styles into the head to prevent any white flash
            const styledHtml = html.replace(
              "<head>",
              `<head>
  <meta name="color-scheme" content="dark">
  <style>
    html, body {
      background-color: #0c0a09 !important;
      background: #0c0a09 !important;
      color: #ffffff !important;
    }
  </style>`
            );
            body = Buffer.from(styledHtml, "utf8");
          }
          
          // Dynamically cache the response if not already cached
          let reqPath = req.url ? req.url.split("?")[0] : "";
          if (reqPath) {
            if (!reqPath.startsWith("/__/auth")) {
              reqPath = "/__/auth" + (reqPath.startsWith("/") ? "" : "/") + reqPath;
            }
            authCache.set(reqPath, {
              body,
              contentType: contentType || "text/html"
            });
          }
          return body;
        })
      },
    })
  );

  // Parse larger JSON payloads since base64 docs might be big
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Trust proxy for rate limiting to work correctly behind reverse proxies
  app.set("trust proxy", 1);

  // Helmet global security middleware
  const isProduction = process.env.NODE_ENV === "production";
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'", 
            "'unsafe-inline'", 
            "'unsafe-eval'", 
            "https://apis.google.com",
            "https://*.firebaseapp.com",
            "https://auth.resumind.site",
            "https://*.gstatic.com",
            "https://accounts.google.com"
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          connectSrc: [
            "'self'", 
            "https://api.groq.com", 
            "https://generativelanguage.googleapis.com", 
            "https://*.supabase.co", 
            "https://*.run.app",
            "https://*.googleapis.com",
            "https://*.firebaseio.com",
            "https://*.firebaseapp.com",
            "https://auth.resumind.site",
            "https://*.gstatic.com",
            "https://accounts.google.com"
          ],
          frameSrc: ["'self'", "https://*.firebaseapp.com", "https://auth.resumind.site", "https://accounts.google.com"],
          childSrc: ["'self'", "https://*.firebaseapp.com", "https://auth.resumind.site", "https://accounts.google.com"]
        }
      } : false, // Desabilitado em desenvolvimento para evitar conflitos com o Vite HMR
      frameguard: isProduction ? { action: "sameorigin" } : false, // Habilitado apenas em produção para evitar quebras no iframe do AI Studio em desenvolvimento
      hsts: isProduction ? {
        maxAge: 31536000, // 1 ano (padrão recomendado para produção)
        includeSubDomains: true,
        preload: true
      } : false,
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin"
      },
      crossOriginOpenerPolicy: false, // Desabilitado para permitir que popups de autenticação (ex. Google/Firebase) se comuniquem com a janela principal e fechem sozinhos
      crossOriginEmbedderPolicy: false // Permite o carregamento de fontes/imagens externas de CDNs sem restrição de política COEP
    })
  );

  // CORS global security middleware
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.allowed_origins;
  const customOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(",").map((o) => o.trim())
    : [];

  const allowedOrigins = [
    "https://ais-dev-awobi5yquqdscb5miibfjn-128144762078.us-east5.run.app",
    "https://ais-pre-awobi5yquqdscb5miibfjn-128144762078.us-east5.run.app",
    "https://ai.studio",
    "https://ai.google",
    "https://resumind.site",
    "https://www.resumind.site",
    "https://resumind-5q3f.onrender.com",
    ...customOrigins
  ];

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      
      if (!isProduction) {
        return callback(null, true); // Permite tudo no ambiente de desenvolvimento local
      }
      
      const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".run.app");
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Acesso não permitido pelo CORS (produção)"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  };

  app.use(cors(corsOptions));

  const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: "Muitas requisições, tente novamente mais tarde." },
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit AI endpoints more strictly
    message: {
      error:
        "Limite de processamento de IA atingido. Tente novamente mais tarde.",
    },
  });

  // Helper for Gemini
  const getGeminiClient = () => {
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

  const getGroqClient = () => {
    const key = process.env.GROQ_API_KEY || process.env.groq_api_key;
    if (!key)
      throw new Error(
        "GROQ_API_KEY não está configurada. Adicione a chave GROQ_API_KEY nas variáveis de ambiente do sistema.",
      );
    return new Groq({ apiKey: key });
  };

  // Resilient LLM runner helper with Groq as primary and Gemini as fallback
  const runAiQuery = async (prompt: string, options: { jsonMode?: boolean } = {}) => {
    // 1. Try Groq as the primary engine
    try {
      console.log(`[AI Runner] Attempting primary query with Groq (llama-3.3-70b-versatile)...`);
      const client = getGroqClient();
      let groqRetries = 3;
      let groqAttempt = 0;
      while (groqRetries > 0) {
        groqAttempt++;
        try {
          const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.0,
            seed: 42,
            response_format: options.jsonMode ? { type: "json_object" } : undefined,
          });
          const responseText = response.choices[0]?.message?.content || "";
          if (responseText) {
            console.log(`[AI Runner] Groq query succeeded on attempt ${groqAttempt}!`);
            return responseText;
          }
        } catch (groqError: any) {
          console.error(`[AI Runner] Groq API error (attempt ${groqAttempt}): ${groqError?.message || groqError}`);
          groqRetries--;
          if (groqRetries > 0) {
            const delay = groqAttempt * 1500;
            console.warn(`[AI Runner] Retrying Groq in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw groqError; // Throw to trigger Gemini fallback
          }
        }
      }
    } catch (groqFinalError: any) {
      console.warn(`[AI Runner] Groq failed completely or is unconfigured. Falling back to Gemini...`, groqFinalError?.message || groqFinalError);
    }

    // 2. Fallback to Gemini if Groq fails or is not configured
    console.warn("[AI Runner] Falling back to Gemini models sequentially...");
    const geminiModels = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
    let lastGeminiError: any = null;

    for (const modelName of geminiModels) {
      let retries = 2; // try each model up to 2 times
      let attempt = 0;
      while (retries > 0) {
        attempt++;
        try {
          console.log(`[AI Runner] Attempting Gemini fallback query with model: ${modelName} (attempt ${attempt})...`);
          const ai = getGeminiClient();
          const geminiResponse = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: options.jsonMode ? {
              responseMimeType: "application/json",
              temperature: 0.0,
              seed: 42,
            } : {
              temperature: 0.0,
              seed: 42,
            }
          });
          if (geminiResponse.text) {
            console.log(`[AI Runner] Gemini fallback succeeded with model ${modelName} on attempt ${attempt}!`);
            return geminiResponse.text;
          }
        } catch (geminiError: any) {
          lastGeminiError = geminiError;
          console.warn(`[AI Runner] Gemini API error with model ${modelName} (attempt ${attempt}): ${geminiError?.message || geminiError}`);
          retries--;
          if (retries > 0) {
            console.warn(`[AI Runner] Retrying model ${modelName} in 1000ms...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }
    }

    // If both failed, propagate the last Gemini error or a clear generic message
    throw lastGeminiError || new Error("Ambos os serviços Groq e Gemini falharam ao processar a requisição.");
  };

  const sanitizeLinkedinLink = (linkedin: any) => {
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

  // API Routes
  app.post("/api/extract-text", generalApiLimiter, async (req, res) => {
    try {
      const { filename = "", mimetype = "", data = "" } = req.body;
      if (!filename || !data) {
        return res.status(400).json({ error: "Nome do arquivo ou dados ausentes." });
      }

      const lowerFile = filename.toLowerCase();
      const ext = path.extname(lowerFile);

      // 1. Validar extensões suportadas
      if (![".pdf", ".docx", ".txt"].includes(ext)) {
        return res.status(400).json({ error: "Formato de arquivo não suportado. Use apenas PDF, DOCX ou TXT." });
      }

      // 2. Descodificar base64 e validar tamanho de arquivo vazio
      const base64Str = data.includes(",") ? data.split(",")[1] : data;
      if (!base64Str.trim()) {
        return res.status(400).json({ error: "O arquivo enviado está vazio." });
      }

      const fileBuffer = Buffer.from(base64Str, "base64");
      const fileSize = fileBuffer.length;

      if (fileSize === 0) {
        return res.status(400).json({ error: "O arquivo enviado está vazio (0 bytes)." });
      }

      // 3. Validar limites de tamanho máximo
      const maxPdfSize = 10 * 1024 * 1024;  // 10MB
      const maxDocxSize = 10 * 1024 * 1024; // 10MB
      const maxTxtSize = 2 * 1024 * 1024;   // 2MB

      if (ext === ".pdf" && fileSize > maxPdfSize) {
        return res.status(400).json({ error: "O arquivo PDF excede o limite máximo permitido de 10MB." });
      }
      if (ext === ".docx" && fileSize > maxDocxSize) {
        return res.status(400).json({ error: "O arquivo DOCX excede o limite máximo permitido de 10MB." });
      }
      if (ext === ".txt" && fileSize > maxTxtSize) {
        return res.status(400).json({ error: "O arquivo TXT excede o limite máximo permitido de 2MB." });
      }

      // 4. Content Sniffing e proteção contra extensões falsas (MIME / Magic Bytes)
      if (ext === ".pdf") {
        const isPdfMagic = fileBuffer.slice(0, 4).toString() === "%PDF" || fileBuffer.toString("utf-8", 0, 1024).includes("%PDF");
        if (!isPdfMagic) {
          return res.status(400).json({ error: "Assinatura de arquivo inválida. O arquivo não é um PDF válido (extensão falsa)." });
        }
      } else if (ext === ".docx") {
        const isZipMagic = fileBuffer.slice(0, 4).toString("hex") === "504b0304";
        if (!isZipMagic) {
          return res.status(400).json({ error: "Assinatura de arquivo inválida. O arquivo não é um documento DOCX válido (extensão falsa)." });
        }
      } else if (ext === ".txt") {
        // Arquivo de texto simples não deve conter bytes nulos binários
        const hasNullByte = fileBuffer.includes(0x00);
        if (hasNullByte) {
          return res.status(400).json({ error: "Assinatura de arquivo inválida. O arquivo contém bytes binários e não é um arquivo TXT válido." });
        }
      }

      let text = "";

      if (ext === ".pdf") {
        try {
          text = await extractTextFromPdf(fileBuffer);
        } catch (e) {
          console.error("PDF parse error, falling back to Gemini OCR:", e);
        }
      } else if (ext === ".docx") {
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          text = result.value || "";
        } catch (e) {
          console.error("DOCX parse error:", e);
          return res.status(400).json({ error: "O arquivo DOCX está corrompido ou é inválido." });
        }
      } else if (ext === ".txt") {
        text = fileBuffer.toString("utf-8");
      }

      let textStripped = text.trim();

      // Fallback OCR Using Gemini if text parsing fails
      if (!textStripped && mimetype) {
        try {
          const client = getGeminiClient();
          let response;
          try {
            response = await client.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [
                {
                  inlineData: {
                    data: base64Str,
                    mimeType: mimetype,
                  },
                },
                "Extraia todo o texto contido neste documento legível. Mantenha a formatação original tanto quanto possível. Se não houver texto legível, retorne uma string vazia.",
              ],
              config: { temperature: 0.0 },
            });
          } catch (firstTryError) {
            console.warn("OCR fallback with gemini-2.5-flash failed, trying gemini-1.5-flash...", firstTryError);
            response = await client.models.generateContent({
              model: "gemini-1.5-flash",
              contents: [
                {
                  inlineData: {
                    data: base64Str,
                    mimeType: mimetype,
                  },
                },
                "Extraia todo o texto contido neste documento legível. Mantenha a formatação original tanto quanto possível. Se não houver texto legível, retorne uma string vazia.",
              ],
              config: { temperature: 0.0 },
            });
          }
          textStripped = (response.text || "").trim();
        } catch (fallbackError) {
          console.error("Gemini OCR fallback failed on both models", fallbackError);
        }
      }

      if (!textStripped) {
        return res.status(400).json({
          error: "O arquivo parece estar vazio, corrompido ou não contém texto legível.",
        });
      }

      res.json({ text: textStripped });
    } catch (e: any) {
      console.error(e);
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ error: "Falha interna ao processar ou extrair texto do documento." });
      } else {
        res.status(500).json({ error: `Erro interno: ${e?.message || "unknown"}` });
      }
    }
  });

  // Helper to execute Python resume analyzer and get structured heuristics
  const runPythonAnalyzer = (rawText: string): any => {
    try {
      const pythonCmd =
        process.platform === "win32"
          ? "python core_analyzer/cli.py"
          : "python3 core_analyzer/cli.py";
      const stdout = execSync(pythonCmd, {
        input: rawText,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      return JSON.parse(stdout);
    } catch (error: any) {
      console.error(
        "Erro ao executar analisador Python:",
        error.message || error,
      );
      return null;
    }
  };

  app.post("/api/analyze-resume", aiLimiter, async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText)
        return res.status(400).json({ error: "Parâmetro 'rawText' ausente." });

      const pythonAnalysis = runPythonAnalyzer(rawText);
      let pythonContextPrompt = "";
      if (pythonAnalysis) {
        pythonContextPrompt = `
DADOS ADICIONAIS DE ANÁLISE HEURÍSTICA (Calculados via Engine Python integrada):
- Estimativa de Pontuação ATS: ${pythonAnalysis.score_estimated} / 100
- Contatos identificados: ${JSON.stringify(pythonAnalysis.contacts)}
- Habilidades detectadas: ${JSON.stringify(pythonAnalysis.skills_detected)}
- Métricas textuais: Erros de espaçamento: ${pythonAnalysis.text_diagnostics?.formatting?.comma_spacing_errors}, Frases longas: ${pythonAnalysis.text_diagnostics?.formatting?.long_sentences_count}
- Sugestões heurísticas calculadas: ${JSON.stringify(pythonAnalysis.recommendations_pt || [])}

Por favor, leve em consideração essas métricas estruturais e os contatos identificados para complementar e enriquecer a sua resposta estruturada final e os feedbacks! Caso haja divergência gritante, priorize a precisão dos dados identificados pela engine.`;
      }

      const currentYear = new Date().getFullYear();

      const prompt = `Analise o texto abaixo e extraia as informações de forma estruturada como um currículo profissional (resume, CV).
Atenção MÁXIMA: Em hipótese alguma resuma, omita ou corte as descrições de experiências, resumo ou outras áreas. 
PRESERVE A ORIGINALIDADE EXATA das informações, transcrevendo frases completas do usuário para o JSON correspondente. Não mude a escrita ou sentido original.

REGRA ABSOLUTA DE NÃO ALTERAÇÃO E NÃO TRADUÇÃO:
1. NÃO TRADUZA O TEXTO EM HIPÓTESE ALGUMA! Se o currículo original estiver em Português, mantenha todos os termos, cargos, descrições, cursos e textos EXATAMENTE em Português. Se estiver em inglês, mantenha em inglês. NUNCA faça traduções espontâneas.
2. NÃO TENTE CORRIGIR OU MELHORAR O TEXTO EXTRAÍDO! Toda a extração na propriedade "structuredData" deve ser LITERAL ao que o usuário escreveu. Se houver erros ortográficos, termos fracos ou problemas de formatação, extraia-os exatamente como estão no texto e aponte os problemas APENAS no campo "grammarErrors" ou "atsAnalysis.feedback". Nunca altere o texto no "structuredData" por conta própria.
3. NÃO MUTE cargos, nomes, empresas ou descrições para soar mais profissional na extração. O "structuredData" deve ser um reflexo 100% fiel e exato do texto enviado pelo usuário.

ATENÇÃO EXTREMA SOBRE O ANO CORRENTE: O ano de referência atual é ${currentYear}. Datas até ${currentYear} não constituem datas futuras.

EXTRAÇÃO RIGOROSA DE CONTATOS:
- Extraia o E-mail, o Telefone, o LinkedIn e o GitHub (se existirem) com MUITA atenção! O sistema depende disso.
- Se a "Engine Python integrada" detectou e-mails e telefones, **COPIE EXATAMENTE** esses valores para "email" e "phone" (personalInfo) caso o LLM não os tenha achado no texto por conta própria.
- Se não contiver conexões explícitas, deixe vazio "".
- Não adivinhe URLs de LinkedIn, website, etc.

CRITÉRIOS ADAPTATIVOS DE EXPERIÊNCIA E TOM (EMPATIA):
1. O TOM DOS FEEDBACKS DEVE SER EXTREMAMENTE POLIDO, PROFISSIONAL E CONSTRUTIVO. Avalie o candidato com respeito, sugira melhorias objetivas e EVITE elogios exagerados.
2. Se tem pouca experiência profissional (ex: estudante, bicos), NÃO COBRE E NÃO EXIJA métricas de faturamento empresarial ou impacto de sênior. Avalie puramente a clareza, dedicação e potencial!
3. EDUCAÇÃO BÁSICA: Se o nível de educação for "Ensino Médio" ou "Ensino Fundamental", JAMAIS sugira adicionar "temas estudados", "disciplinas" ou exigir atividades acadêmicas avançadas. Apenas valide a data e o nome da instituição.

AVALIAÇÃO DE LINKS E URLS (NOVO):
- Verifique rigorosamente a validade de URLs (como LinkedIn, GitHub, portfólio). Se detectar URLs falsas, de teste, incompletas ou com domínios inválidos (ex: '.teste', '.example', 'linkedin.com/in/seu-nome', URLs sem terminação real), gere um feedback de 'warning' ou 'error' apontando EXPLICITAMENTE qual link (ex: LinkedIn, GitHub ou Portfólio) está incorreto e qual é o valor inválido detectado.
- JAMAIS use a palavra "completude" nas suas respostas. Prefira termos simples e fáceis de compreender pelo usuário final, como "preenchimento correto" ou "link completo".

CLASSIFICAÇÃO EDUCAÇÃO vs CURSOS E CERTIFICAÇÕES (CRÍTICO):
- A seção "Educação" (education) DEVE SER EXCLUSIVA para formações acadêmicas formais e de grau (Ensino Fundamental, Ensino Médio, Graduação, Pós-graduação, Mestrado, Doutorado, Cursos Técnicos oficiais).
- Qualquer outro tipo de aprendizado (como "CIEE", cursos livres, cursos profissionalizantes, Jovem Aprendiz que inclui curso, bootcamps, Alura, Udemy) DEVE SER OBRIGATORIAMENTE colocado na seção "Cursos e Certificações" (certifications). NUNCA coloque instituições como CIEE ou cursos complementares em Educação.
- Cursos sem carga horária informada devem gerar um aviso ("warning") recomendando a inclusão das horas, caso aplicável.

AVALIAÇÃO DE FEEDBACKS (ATENÇÃO CRÍTICA):
A IA NUNCA gera ou opina sobre uma nota numérica (ex: NUNCA retorne "nota 88", "nota 93", "aumentaria a nota", etc.). A nota é calculada EXCLUSIVAMENTE pelo motor separado do sistema.
Sua função aqui é APENAS fornecer feedbacks qualitativos sobre o conteúdo existente e classificações objetivas de qualidade textual.

Gere feedbacks em:
- "atsAnalysis.feedback": feedbacks detalhados sobre o conteúdo do currículo (usando categories "Erros", "Atenções", "Sugestões" e types "error", "warning", "info").
  * "Erros" (type: "error") para problemas graves.
  * "Atenções" (type: "warning") para problemas médios.
  * "Sugestões" (type: "info") para melhorias que não penalizam a nota (ex: adicionar tecnologias, detalhar melhor um projeto, fortalecer resultados, etc.).
- "grammarErrors": erros gramaticais detalhados estruturados (ver abaixo).
- "aiEvaluations": classificação objetiva e qualitativa de 5 seções/aspectos exatamente nos valores especificados abaixo.

REGRAS DO PROMPT "aiEvaluations":
Forneça a classificação objetiva de qualidade para:
1. Resumo profissional ("summary"): valores possíveis: "Excelente", "Bom", "Regular", "Fraco"
2. Experiência profissional ("experience"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"
3. Projetos ("projects"): valores possíveis: "Excelente", "Bom", "Regular", "Fraco"
4. Gramática ("grammar"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"
5. Clareza textual ("clareza"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"

REGRAS DO PROMPT "grammarErrors" (MUITO IMPORTANTE):
Identifique e informe os erros gramaticais/ortográficos reais informando exatamente:
- "trecho": o trecho incorreto encontrado no texto.
- "motivo": explicação detalhada do erro.
- "correcao": a sugestão corrigida exata.
Nunca use mensagens genéricas do tipo "foram encontrados erros".

${pythonContextPrompt}

REGRA ABSOLUTA DE NÃO RETORNAR FEEDBACK DE LEGIBILIDADE: JAMAIS adicione qualquer aviso, erro, warning ou feedback sobre "Legibilidade" (como Flesch, nível de legibilidade complexo/acadêmico, etc.) na lista de feedbacks ou sugestões. Esse tipo de feedback deve ser inteiramente ignorado e omitido.

REGRAS PARA EXTRAÇÃO E ORGANIZAÇÃO DE HABILIDADES (SKILLS):
- Você DEVE categorizar as habilidades encontradas no texto nas categorias de "Hard skills" e "Soft skills".
- Hard skills incluem: linguagens de programação, ferramentas, frameworks, bancos de dados, cloud, Office 365, sistemas, tecnologias. Agrupe-as com os seguintes prefixos (use apenas se houver itens):
  * "Ferramentas: "
  * "Banco de dados: "
  * "Cloud: "
  * "Office 365: "
  * Ou outros agrupamentos lógicos de Hard Skills que façam sentido, mas mantenha conciso.
- Soft skills incluem: comunicação, organização, trabalho em equipe, proatividade, etc.
- Retorne o array "skills" formatado onde CADA STRING do array é uma categoria completa. 
- Padronize os nomes (ex: github -> GitHub, python -> Python, aws -> AWS). Remova duplicatas.
- Exemplo de como deve retornar:
  "skills": [
    "Ferramentas: Python, Git, GitHub.",
    "Banco de dados: MySQL, PostgreSQL.",
    "Cloud: AWS.",
    "Soft Skills: Comunicação, trabalho em equipe, organização."
  ]
- Apenas inclua as categorias que possuem itens. A string de "Soft Skills" deve vir sempre por último, se houver.
- NUNCA retorne um item por string, as strings DEVEM ser os agrupamentos.

Você DEVE responder com um objeto JSON válido, aderente à seguinte estrutura:
{
  "structuredData": {
    "personalInfo": {
      "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "website": ""
    },
    "summary": "",
    "experience": [
      { "company": "", "position": "", "startDate": "", "endDate": "", "description": "" }
    ],
    "projects": [
      { "name": "", "description": "", "technologies": "", "link": "" }
    ],
    "education": [
      { "institution": "", "degree": "", "field": "", "graduationDate": "" }
    ],
    "skills": [""],
    "certifications": [
      { "name": "", "institution": "", "hours": "", "date": "", "status": "", "modality": "" }
    ],
    "languages": [""]
  },
  "aiEvaluations": {
    "summary": "Excelente" | "Bom" | "Regular" | "Fraco",
    "experience": "Excelente" | "Boa" | "Regular" | "Fraca",
    "projects": "Excelente" | "Bom" | "Regular" | "Fraco",
    "grammar": "Excelente" | "Boa" | "Regular" | "Fraca",
    "clareza": "Excelente" | "Boa" | "Regular" | "Fraca"
  },
  "grammarErrors": [
    { "trecho": "trecho com erro", "motivo": "explicacao do erro", "correcao": "sugestao corrigida" }
  ],
  "atsAnalysis": {
    "feedback": [
      { "category": "Erros" | "Atenções" | "Sugestões", "message": "", "severity": "high" | "medium" | "low", "type": "error" | "warning" | "info" }
    ],
    "suggestions": [""]
  }
}

Texto do currículo:
${rawText}`;

      const responseText = await runAiQuery(prompt, { jsonMode: true });

      const resDict = JSON.parse(responseText);

      // --- Fallback Regex for Contacts (OCR sometimes breaks spaces or AI misses it) ---
      const extractEmailFromRawText = (raw: string) => {
        const normalized = raw
          .replace(/\s*@\s*/g, '@')
          .replace(/\s*\.\s*(com|br|org|net|comm|commm)\b/gi, '.$1');
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
        const match = normalized.match(emailRegex);
        if (match) {
          return match[1].replace(/[^\w]+$/, '');
        }
        return null;
      };

      const extractPhoneFromRawText = (raw: string) => {
        const phoneRegex = /(?:(?:\+|00)?55[\s-]?)?(?:\(?0?\d{2}\)?[\s-]?)?(?:9[\s-]?\d{4}|\d{4})[\s-]*\d{4}/g;
        const matches = raw.match(phoneRegex);
        if (matches && matches.length > 0) {
          const validMatches = matches.filter(m => m.replace(/\D/g, '').length >= 8);
          if (validMatches.length > 0) {
             return validMatches[0].trim();
          }
        }
        return null;
      };

      if (!resDict.structuredData) resDict.structuredData = {};
      if (!resDict.structuredData.personalInfo) resDict.structuredData.personalInfo = {};

      const foundEmail = extractEmailFromRawText(rawText);
      const foundPhone = extractPhoneFromRawText(rawText);

      // console.log("[OCR Debug] E-mail encontrado por regex:", foundEmail);
      // console.log("[OCR Debug] Telefone encontrado por regex:", foundPhone);

      // Sempre use o regex se ele encontrar um email válido, pois o LLM pode errar formatação ou incluir markdown
      if (foundEmail) {
         resDict.structuredData.personalInfo.email = foundEmail;
      }

      // Sempre use o regex para o telefone se encontrar, para ter o dado mais original sem invenções do LLM
      if (foundPhone) {
         resDict.structuredData.personalInfo.phone = foundPhone;
      }
      // --- Fim Fallback Regex ---

      // Garantir que se o GitHub foi extraído no campo 'website' ou 'linkedin', nós o movemos para 'github'
      const pInfo = resDict.structuredData.personalInfo;
      if (pInfo) {
        if (!pInfo.github) {
          if (pInfo.website && pInfo.website.toLowerCase().includes("github.com")) {
            pInfo.github = pInfo.website;
            pInfo.website = "";
          } else if (pInfo.linkedin && pInfo.linkedin.toLowerCase().includes("github.com")) {
            pInfo.github = pInfo.linkedin;
            pInfo.linkedin = "";
          }
        }
      }

      if (resDict?.structuredData?.personalInfo?.linkedin) {
        resDict.structuredData.personalInfo.linkedin = sanitizeLinkedinLink(
          resDict.structuredData.personalInfo.linkedin,
        );
      }
      if (!resDict.atsAnalysis) {
        resDict.atsAnalysis = { score: 70, feedback: [], suggestions: [] };
      }
      if (!resDict.atsAnalysis.feedback) {
        resDict.atsAnalysis.feedback = [];
      }
      if (resDict.grammarErrors && Array.isArray(resDict.grammarErrors)) {
        resDict.grammarErrors.forEach(err => {
          if (err && typeof err === "object" && err.trecho && err.motivo && err.correcao) {
            resDict.atsAnalysis.feedback.push({
              category: 'Erros',
              message: `No trecho "${err.trecho}": ${err.motivo}. Sugestão: "${err.correcao}"`,
              severity: 'high',
              type: 'error'
            });
          } else if (err && typeof err === "string" && !err.toLowerCase().includes("string") && !err.toLowerCase().includes("array") && !err.toLowerCase().includes("json")) {
            resDict.atsAnalysis.feedback.push({
              category: 'Erros',
              message: err,
              severity: 'high',
              type: 'error'
            });
          }
        });
      }
      
      const finalAnalysis = calculateAtsScore(resDict.structuredData, resDict.atsAnalysis.feedback, resDict.aiEvaluations);
      resDict.atsAnalysis.score = finalAnalysis.score;
      resDict.atsAnalysis.feedback = finalAnalysis.feedback;
      resDict.atsAnalysis.aiEvaluations = resDict.aiEvaluations;
      if (resDict.atsAnalysis.feedback && Array.isArray(resDict.atsAnalysis.feedback)) {
        resDict.atsAnalysis.feedback = resDict.atsAnalysis.feedback.filter((fb: any) => {
          const cat = (fb?.category || "").toLowerCase();
          const msg = (fb?.message || "").toLowerCase();
          return !cat.includes("legibilidade") && !cat.includes("flesch") && !cat.includes("readability") &&
                 !msg.includes("legibilidade") && !msg.includes("flesch") && !msg.includes("readability");
        });
      }
      res.json(resDict);
    } catch (e: any) {
      console.error("ANALYZE_RESUME_ERROR:", e);
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ error: "Ocorreu um erro interno ao analisar o currículo. Por favor, tente novamente mais tarde." });
      } else {
        res.status(500).json({ error: e?.message || "Internal error in analyze_resume" });
      }
    }
  });

  app.post("/api/analyze-grammar", aiLimiter, async (req, res) => {
    try {
      const { structuredData } = req.body;
      if (!structuredData)
        return res.status(400).json({ error: "structuredData ausente." });

      if (structuredData?.personalInfo?.linkedin) {
        structuredData.personalInfo.linkedin = sanitizeLinkedinLink(
          structuredData.personalInfo.linkedin,
        );
      }

      const currentYear = new Date().getFullYear();

      const prompt = `Atue como um Especialista de Qualidade / QA de RH e Analista de ATS internacional.
Você receberá um currículo em formato JSON.

ATENÇÃO EXTREMA SOBRE O ANO CORRENTE: O ano é ${currentYear}. Qualquer data ATÉ ${currentYear} não é data futura nem erro.

CRITÉRIOS ADAPTATIVOS DE EXPERIÊNCIA E TOM (EMPATIA):
1. O TOM DOS FEEDBACKS DEVE SER EXTREMAMENTE POLIDO, PROFISSIONAL E CONSTRUTIVO. Avalie o candidato com respeito, sugira melhorias objetivas e EVITE elogios exagerados ou frases como "praticamente perfeito" se houver lacunas.
2. Se tem pouca experiência profissional (ex: estudante, bicos), NÃO COBRE E NÃO EXIJA métricas de faturamento empresarial ou impacto de sênior. Avalie puramente a clareza, dedicação e potencial!
3. EDUCAÇÃO BÁSICA: Se o nível de educação for "Ensino Médio" ou "Ensino Fundamental", JAMAIS sugira adicionar "temas estudados", "disciplinas" ou exigir atividades acadêmicas avançadas. Apenas valide a data e o nome da instituição.

AVALIAÇÃO DE LINKS E URLS (NOVO):
- Verifique rigorosamente a validade de URLs (como LinkedIn, GitHub, portfólio). Se detectar URLs falsas, de teste, incompletas ou com domínios inválidos (ex: '.teste', '.example', 'linkedin.com/in/seu-nome', URLs sem terminação real), gere um feedback de 'warning' ou 'error' apontando EXPLICITAMENTE qual link (ex: LinkedIn, GitHub ou Portfólio) está incorreto e qual é o valor inválido detectado.
- JAMAIS use a palavra "completude" nas suas respostas. Prefira termos simples e fáceis de compreender pelo usuário final, como "preenchimento correto" ou "link completo".

CLASSIFICAÇÃO EDUCAÇÃO vs CURSOS E CERTIFICAÇÕES (CRÍTICO):
- A seção "Educação" (education) DEVE SER EXCLUSIVA para formações acadêmicas formais e de grau (Ensino Fundamental, Ensino Médio, Graduação, Pós-graduação, Mestrado, Doutorado, Cursos Técnicos oficiais).
- Qualquer outro tipo de aprendizado (como "CIEE", cursos livres, cursos profissionalizantes, Jovem Aprendiz que inclui curso, bootcamps, Alura, Udemy) DEVE SER OBRIGATORIAMENTE colocado na seção "Cursos e Certificações" (certifications). NUNCA coloque instituições como CIEE ou cursos complementares em Educação.
- Cursos sem carga horária informada devem gerar um aviso ("warning") recomendando a inclusão das horas, caso aplicável.

AVALIAÇÃO DE FEEDBACKS (ATENÇÃO CRÍTICA):
A IA NUNCA gera ou opina sobre uma nota numérica (ex: NUNCA retorne "nota 88", "nota 93", "aumentaria a nota", etc.). A nota é calculada EXCLUSIVAMENTE pelo motor separado do sistema.
Sua função aqui é APENAS fornecer feedbacks qualitativos sobre o conteúdo existente e classificações objetivas de qualidade textual.

Gere feedbacks em:
- "atsAnalysis.feedback": feedbacks detalhados sobre o conteúdo do currículo (usando categories "Erros", "Atenções", "Sugestões" e types "error", "warning", "info").
  * "Erros" (type: "error") para problemas graves.
  * "Atenções" (type: "warning") para problemas médios.
  * "Sugestões" (type: "info") para melhorias que não penalizam a nota (ex: adicionar tecnologias, detalhar melhor um projeto, fortalecer resultados, etc.).
- "grammarErrors": erros gramaticais detalhados estruturados (ver abaixo).
- "aiEvaluations": classificação objetiva e qualitativa de 5 seções/aspectos exatamente nos valores especificados abaixo.

REGRAS DO PROMPT "aiEvaluations":
Forneça a classificação objetiva de qualidade para:
1. Resumo profissional ("summary"): valores possíveis: "Excelente", "Bom", "Regular", "Fraco"
2. Experiência profissional ("experience"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"
3. Projetos ("projects"): valores possíveis: "Excelente", "Bom", "Regular", "Fraco"
4. Gramática ("grammar"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"
5. Clareza textual ("clareza"): valores possíveis: "Excelente", "Boa", "Regular", "Fraca"

REGRAS DO PROMPT "grammarErrors" (MUITO IMPORTANTE):
Identifique e informe os erros gramaticais/ortográficos reais informando exatamente:
- "trecho": o trecho incorreto encontrado no texto.
- "motivo": explicação detalhada do erro.
- "correcao": a sugestão corrigida exata.
Nunca use mensagens genéricas do tipo "foram encontrados erros".

VALIDAÇÃO DE CONTATO:
Não ataque a formatação do telefone/celular se contiver uma cadeia válida de números (ex independente de DDD, +, etc). O mesmo para redes sociais válidas.

REGRAS DE CLASSIFICAÇÃO DOS AVISOS:
1. Identifique o Idioma do Currículo (Pt, En, Es).
2. ERROS GRAMATICAIS VERDADEIROS: Em 'grammarErrors', aponte APENAS erros reais de português (ortografia, concordância, grafia incorreta, digitação) no texto escrito pelo usuário. A ausência de uma informação (ex: "E-mail faltando") NÃO É UM ERRO GRAMATICAL e jamais deve constar aqui. NUNCA diga "Falta de preenchimento".
3. INFORMAÇÕES DE CONTATO E FALTANDO: Se faltar algum dado vital de contato (como E-mail, Telefone/Celular, LinkedIn), adicione O NOME COMUM em Português do campo (ex: "E-mail", "Telefone/Celular", "LinkedIn", "Cidade") APENAS na lista 'missingInfo'. 
   - NÃO USE NOMES TÉCNICOS como "email", "phone", "location". 
   - SE O CAMPO ESTIVER PRESENTE, não peça.
   - REGRA DE OURO (DEDUPLICAÇÃO): Tudo que for colocado na lista 'missingInfo' ou 'grammarErrors' NÃO DEVE SER REPETIDO como um novo objeto em 'atsAnalysis.feedback' para evitar avisos duplicados.
4. FEEDBACKS: Em atsAnalysis.feedback indique o 'type' que pode ser "success" (para pontos fortes), "warning" (para melhorias) ou "error" (para falhas graves). Forneça feedbacks claros e práticos. NUNCA junte ou misture "Cursos" e "Projetos" no mesmo aviso. Crie um aviso separado para "Cursos e Certificações" e outro para "Projetos". Nunca exija tecnologias em cursos.
5. "Jovem Aprendiz" é uma Experiência Profissional válida e DEVE constar em "Experiência Profissional". Cursos do CIEE devem constar em "Cursos".
6. Para o campo "skills" no JSON: Preserve a estrutura em linhas do usuário.

Você DEVE responder com um objeto JSON válido, aderente à seguinte estrutura:
{
  "aiEvaluations": {
    "summary": "Excelente" | "Bom" | "Regular" | "Fraco",
    "experience": "Excelente" | "Boa" | "Regular" | "Fraca",
    "projects": "Excelente" | "Bom" | "Regular" | "Fraco",
    "grammar": "Excelente" | "Boa" | "Regular" | "Fraca",
    "clareza": "Excelente" | "Boa" | "Regular" | "Fraca"
  },
  "grammarErrors": [
    { "trecho": "trecho com erro", "motivo": "explicacao do erro", "correcao": "sugestao corrigida" }
  ],
  "missingInfo": [""],
  "atsAnalysis": {
    "feedback": [
      { "category": "Erros" | "Atenções" | "Sugestões", "message": "", "severity": "high" | "medium" | "low", "type": "error" | "warning" | "info" }
    ],
    "suggestions": [""]
  }
}

JSON:
${JSON.stringify(structuredData)}`;

      const responseText = await runAiQuery(prompt, { jsonMode: true });

      const resDict = JSON.parse(responseText);

      // Post-process to ensure no false positives for missing info
      const hasEmail = structuredData?.personalInfo?.email?.trim()?.length > 0;
      const hasPhone = structuredData?.personalInfo?.phone?.trim()?.length > 0;
      const hasLinkedin = structuredData?.personalInfo?.linkedin?.trim()?.length > 0;

      const pInfo = structuredData?.personalInfo || {};
      const contact = structuredData?.contact || {};
      const locVal = pInfo.location || pInfo.city || pInfo.address || pInfo.localizacao || pInfo.cidade || pInfo.region || pInfo.state ||
                     structuredData?.location || structuredData?.city || structuredData?.address || structuredData?.localizacao || structuredData?.cidade || structuredData?.region || structuredData?.state ||
                     contact.location || contact.city || contact.address || contact.localizacao || contact.cidade || contact.region || contact.state || "";
      const hasLocation = typeof locVal === "string" && locVal.trim().length >= 3 && !/^[.,/\\#!$%^&*;:{}=\-_`~()\s]+$/.test(locVal);

      if (resDict?.missingInfo && Array.isArray(resDict.missingInfo)) {
        resDict.missingInfo = resDict.missingInfo.filter((info: string) => {
          const lInfo = info.toLowerCase();
          if (hasEmail && (lInfo.includes("email") || lInfo.includes("e-mail"))) return false;
          if (hasPhone && lInfo.includes("telefone")) return false;
          if (hasLinkedin && lInfo.includes("linkedin")) return false;
          if (hasLocation && (lInfo.includes("cidade") || lInfo.includes("localização") || lInfo.includes("localizacao") || lInfo.includes("endereço") || lInfo.includes("endereco") || lInfo.includes("bairro"))) return false;
          if (lInfo.includes("language") || lInfo.includes("idioma") || lInfo.includes("skill") || lInfo.includes("habilidade")) return false;
          return true;
        });
      }

      if (resDict?.atsAnalysis?.feedback && Array.isArray(resDict.atsAnalysis.feedback)) {
        resDict.atsAnalysis.feedback = resDict.atsAnalysis.feedback.filter((fb: any) => {
          const msg = (fb?.message || "").toLowerCase();
          if (hasEmail && (msg.includes("e-mail") || msg.includes("email")) && (msg.includes("vazio") || msg.includes("falta"))) return false;
          if (hasPhone && msg.includes("telefone") && (msg.includes("vazio") || msg.includes("falta"))) return false;
          if (hasLinkedin && msg.includes("linkedin") && (msg.includes("vazio") || msg.includes("falta"))) return false;
          if (hasLocation && (msg.includes("cidade") || msg.includes("localização") || msg.includes("localizacao") || msg.includes("endereço") || msg.includes("endereco") || msg.includes("bairro")) && (msg.includes("vazio") || msg.includes("falta") || msg.includes("ausente") || msg.includes("adicione") || msg.includes("informado") || msg.includes("informar"))) return false;
          return true;
        });
      }

      if (!resDict.atsAnalysis) {
        resDict.atsAnalysis = { score: 70, feedback: [], suggestions: [] };
      }
      if (!resDict.atsAnalysis.feedback) {
        resDict.atsAnalysis.feedback = [];
      }
      if (resDict.grammarErrors && Array.isArray(resDict.grammarErrors)) {
        resDict.grammarErrors.forEach(err => {
          if (err && typeof err === "object" && err.trecho && err.motivo && err.correcao) {
            resDict.atsAnalysis.feedback.push({
              category: 'Erros',
              message: `No trecho "${err.trecho}": ${err.motivo}. Sugestão: "${err.correcao}"`,
              severity: 'high',
              type: 'error'
            });
          } else if (err && typeof err === "string" && !err.toLowerCase().includes("string") && !err.toLowerCase().includes("array") && !err.toLowerCase().includes("json")) {
            resDict.atsAnalysis.feedback.push({
              category: 'Erros',
              message: err,
              severity: 'high',
              type: 'error'
            });
          }
        });
      }
      
      const finalAnalysis = calculateAtsScore(req.body.structuredData || resDict.structuredData, resDict.atsAnalysis.feedback, resDict.aiEvaluations);
      resDict.atsAnalysis.score = finalAnalysis.score;
      resDict.atsAnalysis.feedback = finalAnalysis.feedback;
      resDict.atsAnalysis.aiEvaluations = resDict.aiEvaluations;
      if (resDict.atsAnalysis.feedback && Array.isArray(resDict.atsAnalysis.feedback)) {
        resDict.atsAnalysis.feedback = resDict.atsAnalysis.feedback.filter((fb: any) => {
          const cat = (fb?.category || "").toLowerCase();
          const msg = (fb?.message || "").toLowerCase();
          return !cat.includes("legibilidade") && !cat.includes("flesch") && !cat.includes("readability") &&
                 !msg.includes("legibilidade") && !msg.includes("flesch") && !msg.includes("readability");
        });
      }
      res.json(resDict);
    } catch (e: any) {
      console.error("ANALYZE_GRAMMAR_ERROR:", e);
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ error: "Ocorreu um erro interno ao analisar a gramática do currículo. Por favor, tente novamente mais tarde." });
      } else {
        res.status(500).json({ error: e?.message || "Internal error in analyze_grammar" });
      }
    }
  });

  // Secure endpoint to send feedback to a Google Sheets Webhook (Apps Script)
  app.post("/api/feedback", generalApiLimiter, async (req, res) => {
    try {
      const { userId, userEmail, rating, liked, feedback, context } = req.body;
      
      const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
      
      if (!webhookUrl) {
        // Se não tiver webhook configurado, apenas retornamos sucesso (já foi salvo no Firestore pelo client)
        return res.json({ success: true, message: "Webhook não configurado, salvo apenas no DB." });
      }

      const safeFeedback = (feedback || "").toString().substring(0, 2000);
      const safeUserName = (req.body.userName || "Anônimo").toString().substring(0, 100);
      const safeUserEmail = (userEmail || "anonymous").toString().substring(0, 100);
      const safeUserId = (userId || "anonymous").toString().substring(0, 100);
      const safeContext = (context || "Geral").toString().substring(0, 50);

      // Payload to send to Google Apps Script
      const payload = {
        dataHora: new Date().toISOString(),
        userName: safeUserName,
        userEmail: safeUserEmail,
        userId: safeUserId,
        rating,
        liked: Boolean(liked),
        feedback: safeFeedback,
        context: safeContext,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("Erro ao enviar para Google Sheets:", await response.text());
        return res.status(500).json({ error: "Erro ao integrar com planilha." });
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("Feedback Webhook Error:", e);
      res.status(500).json({ error: "Erro interno ao processar feedback." });
    }
  });

  // Dedicated diagnostics endpoint
  app.get("/api/diagnostics", generalApiLimiter, async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).send();
    }
    const results: any = {
      groq: { status: "unknown", message: "" },
      gemini: { status: "unknown", message: "" },
      python: { status: "unknown", message: "" },
    };

    // 1. Check Groq API
    try {
      const groqKey = process.env.GROQ_API_KEY || process.env.groq_api_key;
      if (!groqKey) {
        results.groq = {
          status: "missing",
          message: "Chave GROQ_API_KEY não encontrada nas variáveis de ambiente do sistema",
        };
      } else {
        const client = getGroqClient();
        const start = Date.now();
        const response = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "user", content: "responder com apenas um caractere: K" },
          ],
          max_tokens: 5,
        });
        const duration = Date.now() - start;
        results.groq = {
          status: "online",
          message: `API Groq está ativa e respondendo! Latência: ${duration}ms.`,
          response: response.choices[0]?.message?.content?.trim(),
        };
      }
    } catch (e: any) {
      results.groq = {
        status: "error",
        message: `Erro ao conectar com Groq: ${e.message || String(e)}`,
      };
    }

    // 2. Check Gemini API
    try {
      const geminiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
      if (!geminiKey) {
        results.gemini = {
          status: "missing",
          message:
            "Chave GEMINI_API_KEY não encontrada nas variáveis de ambiente do sistema (Opcional se usar Groq)",
        };
      } else {
        const client = getGeminiClient();
        const start = Date.now();
        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: "responder com apenas um caractere: G",
        });
        const duration = Date.now() - start;
        results.gemini = {
          status: "online",
          message: `API Gemini está ativa e respondendo! Latência: ${duration}ms.`,
          response: response.text?.trim(),
        };
      }
    } catch (e: any) {
      results.gemini = {
        status: "error",
        message: `Erro ao conectar com Gemini: ${e.message || String(e)}`,
      };
    }

    // 3. Check Python 3
    try {
      const version = execSync("python3 --version").toString().trim();
      results.python = {
        status: "online",
        message: `Python está instalado e pronto para ser executado! Versão: ${version}.`,
      };
    } catch (e: any) {
      try {
        const version = execSync("python --version").toString().trim();
        results.python = {
          status: "online",
          message: `Python está instalado e pronto para ser executado! Versão: ${version}.`,
        };
      } catch (e2: any) {
        results.python = {
          status: "error",
          message: `Python não encontrado no ambiente do servidor: ${e.message || String(e)}`,
        };
      }
    }

    res.json(results);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handler
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error("EXPRESS_ERROR_HANDLER:", err?.message || err);
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ error: "Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde." });
      } else {
        res.status(500).json({ error: err?.message || "Internal server error" });
      }
    },
  );

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Node-Native Server actively listening on http://localhost:${PORT}`,
    );
  });
}

startServer().catch((err) => {
  console.error("FAILED TO START SERVER:", err);
});
