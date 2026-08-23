import {
  applyCors,
  getGeminiClient,
  getGroqClient,
  runPythonAnalyzer,
} from "../src/server/sharedAi";

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

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
        message: "Chave GROQ_API_KEY não configurada",
      };
    } else {
      const client = getGroqClient();
      const start = Date.now();
      const groqModels = [
        "llama-3.3-70b-versatile",
        "llama-3.1-70b-versatile",
        "llama-3.1-8b-instant",
        "llama3-70b-8192",
        "llama3-8b-8192",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
      ];
      let workingModel = "";
      let testResponse = "";

      for (const model of groqModels) {
        try {
          const response = await client.chat.completions.create({
            model,
            messages: [
              { role: "user", content: "responder com apenas um caractere: K" },
            ],
            max_tokens: 5,
          });
          testResponse = response.choices[0]?.message?.content?.trim() || "";
          workingModel = model;
          break;
        } catch {
          continue;
        }
      }

      const duration = Date.now() - start;
      if (workingModel) {
        results.groq = {
          status: "online",
          message: `API Groq está ativa via ${workingModel}! Latência: ${duration}ms.`,
          response: testResponse,
          activeModel: workingModel,
        };
      } else {
        results.groq = {
          status: "error",
          message: "Nenhum modelo Groq respondeu com sucesso.",
        };
      }
    }
  } catch (e: any) {
    results.groq = {
      status: "error",
      message: `Erro na API Groq: ${e?.message || e}`,
    };
  }

  // 2. Check Gemini API
  try {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
    if (!geminiKey) {
      results.gemini = {
        status: "missing",
        message: "Chave GEMINI_API_KEY não configurada",
      };
    } else {
      const ai = getGeminiClient();
      const start = Date.now();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "responder apenas com a letra K",
      });
      const duration = Date.now() - start;
      results.gemini = {
        status: "online",
        message: `API Gemini está ativa! Latência: ${duration}ms.`,
        response: response.text?.trim(),
      };
    }
  } catch (e: any) {
    results.gemini = {
      status: "error",
      message: `Erro na API Gemini: ${e?.message || e}`,
    };
  }

  // 3. Check Python Analyzer
  try {
    const pyRes = runPythonAnalyzer("Currículo de teste simples.");
    if (pyRes) {
      results.python = {
        status: "online",
        message: "Engine Python de análise de texto carregada com sucesso!",
      };
    } else {
      results.python = {
        status: "offline",
        message: "Python CLI não detectado (usando fallback JS nativo).",
      };
    }
  } catch (e: any) {
    results.python = {
      status: "offline",
      message: `Python offline: ${e?.message || e}`,
    };
  }

  res.status(200).json(results);
}
