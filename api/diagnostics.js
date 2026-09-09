// src/server/sharedAi.ts
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { execSync } from "child_process";
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
var getGroqClient = () => {
  const key = process.env.GROQ_API_KEY || process.env.groq_api_key;
  if (!key)
    throw new Error(
      "GROQ_API_KEY n\xE3o est\xE1 configurada. Adicione a chave GROQ_API_KEY nas vari\xE1veis de ambiente."
    );
  return new Groq({ apiKey: key });
};
var runPythonAnalyzer = (rawText) => {
  try {
    const pythonCmd = process.platform === "win32" ? "python core_analyzer/cli.py" : "python3 core_analyzer/cli.py";
    const stdout = execSync(pythonCmd, {
      input: rawText,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024
    });
    return JSON.parse(stdout);
  } catch (error) {
    return null;
  }
};
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

// src/server/api/diagnostics.ts
var config = {
  maxDuration: 30
};
async function handler(req, res) {
  if (applyCors(req, res)) return;
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    nodeEnv: process.env.NODE_ENV || "unknown",
    isVercel: !!process.env.VERCEL,
    services: {}
  };
  try {
    const groq = getGroqClient();
    const start = Date.now();
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Ping" }],
      model: "llama-3.1-8b-instant",
      max_tokens: 5
    });
    results.services.groq = {
      status: "online",
      latencyMs: Date.now() - start,
      reply: completion.choices[0]?.message?.content?.trim()
    };
  } catch (e) {
    results.services.groq = {
      status: "offline",
      error: e?.message || "Groq unreachable"
    };
  }
  try {
    const gemini = getGeminiClient();
    const start = Date.now();
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Ping"
    });
    results.services.gemini = {
      status: "online",
      latencyMs: Date.now() - start,
      reply: response.text?.trim()
    };
  } catch (e) {
    results.services.gemini = {
      status: "offline",
      error: e?.message || "Gemini unreachable"
    };
  }
  try {
    const sample = runPythonAnalyzer("Contato: joao@gmail.com. Telefone: 11 99999-9999");
    results.services.pythonAnalyzer = {
      status: sample ? "online" : "offline",
      sampleExtracted: !!sample
    };
  } catch (e) {
    results.services.pythonAnalyzer = {
      status: "offline",
      error: e?.message
    };
  }
  return res.status(200).json(results);
}
export {
  config,
  handler as default
};
