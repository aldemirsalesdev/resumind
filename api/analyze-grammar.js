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
var getGroqClient = () => {
  const key = process.env.GROQ_API_KEY || process.env.groq_api_key;
  if (!key)
    throw new Error(
      "GROQ_API_KEY n\xE3o est\xE1 configurada. Adicione a chave GROQ_API_KEY nas vari\xE1veis de ambiente."
    );
  return new Groq({ apiKey: key });
};
var runAiQuery = async (prompt, options = {}) => {
  const groqModels = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it"
  ];
  try {
    const client = getGroqClient();
    for (const model of groqModels) {
      try {
        console.log(`[AI Runner] Attempting Groq query with model: ${model}...`);
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          seed: 42,
          response_format: options.jsonMode ? { type: "json_object" } : void 0
        });
        const responseText = response.choices[0]?.message?.content || "";
        if (responseText) {
          console.log(`[AI Runner] Groq query succeeded with model: ${model}!`);
          return responseText;
        }
      } catch (groqError) {
        const errMsg = groqError?.message || String(groqError);
        console.warn(`[AI Runner] Groq model ${model} failed (${errMsg}). Trying next model...`);
        if (groqError?.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      }
    }
  } catch (groqFinalError) {
    console.warn(
      `[AI Runner] Groq client not available or unconfigured. Falling back to Gemini...`,
      groqFinalError?.message || groqFinalError
    );
  }
  console.warn("[AI Runner] Falling back to Gemini models sequentially...");
  const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
  let lastGeminiError = null;
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
          config: options.jsonMode ? {
            responseMimeType: "application/json",
            temperature: 0,
            seed: 42
          } : {
            temperature: 0,
            seed: 42
          }
        });
        if (geminiResponse.text) {
          console.log(
            `[AI Runner] Gemini fallback succeeded with model ${modelName} on attempt ${attempt}!`
          );
          return geminiResponse.text;
        }
      } catch (geminiError) {
        lastGeminiError = geminiError;
        console.warn(
          `[AI Runner] Gemini API error with model ${modelName} (attempt ${attempt}): ${geminiError?.message || geminiError}`
        );
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      }
    }
  }
  throw lastGeminiError || new Error("Ambos os servi\xE7os Groq e Gemini falharam ao processar a requisi\xE7\xE3o.");
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

// src/server/api/analyze-grammar.ts
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
    const { structuredData } = body;
    if (!structuredData || typeof structuredData !== "object") {
      return res.status(400).json({ error: "Dados estruturados do curr\xEDculo ausentes ou inv\xE1lidos." });
    }
    const systemPrompt = `Voc\xEA \xE9 um especialista s\xEAnior em revis\xE3o lingu\xEDstica em portugu\xEAs, padr\xF5es ABNT e sistemas ATS (Applicant Tracking Systems).
Analise o curr\xEDculo estruturado fornecido e retorne ESTRITAMENTE um JSON no seguinte formato:
{
  "grammarIssues": [
    {
      "section": string,
      "original": string,
      "suggestion": string,
      "explanation": string
    }
  ],
  "missingInfo": [
    {
      "section": string,
      "recommendation": string
    }
  ],
  "atsImprovements": [
    {
      "title": string,
      "description": string
    }
  ]
}
Retorne exclusivamente o JSON, sem formata\xE7\xE3o markdown em torno do texto.`;
    const userPrompt = `Curr\xEDculo para an\xE1lise gramatical e completude:

${JSON.stringify(
      structuredData,
      null,
      2
    ).slice(0, 25e3)}`;
    let responseText = await runAiQuery(systemPrompt, userPrompt, true);
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const result = JSON.parse(cleanJson);
    return res.status(200).json(result);
  } catch (err) {
    console.error("API /analyze-grammar Error:", err);
    return res.status(500).json({
      error: err?.message || "Erro durante a an\xE1lise gramatical."
    });
  }
}
export {
  config,
  handler as default
};
