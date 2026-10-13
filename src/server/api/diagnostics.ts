import {
  applyCors,
  getGeminiClient,
  getGroqClient,
  runPythonAnalyzer,
} from "../sharedAi";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  const results: any = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || "unknown",
    isVercel: !!process.env.VERCEL,
    services: {},
  };

  // Check Groq
  try {
    const groq = getGroqClient();
    const start = Date.now();
    const groqCandidates = ["qwen/qwen3.8-27b", "groq/compound-mini", "groq/compound"];
    let reply = "";
    let activeModel = "";
    for (const model of groqCandidates) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: "Ping" }],
          model,
          max_tokens: 5,
        });
        reply = completion.choices[0]?.message?.content?.trim() || "";
        activeModel = model;
        if (reply) break;
      } catch {
        continue;
      }
    }
    if (activeModel) {
      results.services.groq = {
        status: "online",
        model: activeModel,
        latencyMs: Date.now() - start,
        reply,
      };
    } else {
      results.services.groq = {
        status: "offline",
        error: "Nenhum modelo Groq ativo respondeu",
      };
    }
  } catch (e: any) {
    results.services.groq = {
      status: "offline",
      error: e?.message || "Groq unreachable",
    };
  }

  // Check Gemini
  try {
    const gemini = getGeminiClient();
    const start = Date.now();
    const geminiCandidates = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-2.5-flash"];
    let reply = "";
    let activeModel = "";
    for (const model of geminiCandidates) {
      try {
        const response = await gemini.models.generateContent({
          model,
          contents: "Ping",
        });
        reply = response.text?.trim() || "";
        activeModel = model;
        if (reply) break;
      } catch {
        continue;
      }
    }
    if (activeModel) {
      results.services.gemini = {
        status: "online",
        model: activeModel,
        latencyMs: Date.now() - start,
        reply,
      };
    } else {
      results.services.gemini = {
        status: "offline",
        error: "Nenhum modelo Gemini ativo respondeu",
      };
    }
  } catch (e: any) {
    results.services.gemini = {
      status: "offline",
      error: e?.message || "Gemini unreachable",
    };
  }

  // Check Python Analyzer
  try {
    const sample = runPythonAnalyzer("Contato: joao@gmail.com. Telefone: 11 99999-9999");
    results.services.pythonAnalyzer = {
      status: sample ? "online" : "offline",
      sampleExtracted: !!sample,
    };
  } catch (e: any) {
    results.services.pythonAnalyzer = {
      status: "offline",
      error: e?.message,
    };
  }

  return res.status(200).json(results);
}
