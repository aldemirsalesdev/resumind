import { applyCors, parseRequestBody, runAiQuery } from "../sharedAi";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = await parseRequestBody(req);
    const { structuredData } = body;

    if (!structuredData || typeof structuredData !== "object") {
      return res.status(400).json({ error: "Dados estruturados do currículo ausentes ou inválidos." });
    }

    const systemPrompt = `Você é um especialista sênior em revisão linguística em português, padrões ABNT e sistemas ATS (Applicant Tracking Systems).
Analise o currículo estruturado fornecido e retorne ESTRITAMENTE um JSON no seguinte formato:
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
Retorne exclusivamente o JSON, sem formatação markdown em torno do texto.`;

    const userPrompt = `Currículo para análise gramatical e completude:\n\n${JSON.stringify(
      structuredData,
      null,
      2
    ).slice(0, 25000)}`;

    let responseText = await runAiQuery(systemPrompt, userPrompt, true);
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(cleanJson);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("API /analyze-grammar Error:", err);
    return res.status(500).json({
      error: err?.message || "Erro durante a análise gramatical.",
    });
  }
}
