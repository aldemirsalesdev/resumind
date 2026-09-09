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
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Ping" }],
      model: "llama-3.1-8b-instant",
      max_tokens: 5,
    });
    results.services.groq = {
      status: "online",
      latencyMs: Date.now() - start,
      reply: completion.choices[0]?.message?.content?.trim(),
    };
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
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Ping",
    });
    results.services.gemini = {
      status: "online",
      latencyMs: Date.now() - start,
      reply: response.text?.trim(),
    };
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
