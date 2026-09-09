import { calculateAtsScore } from "../../lib/atsScore";
import {
  applyCors,
  extractEmailFromRawText,
  extractPhoneFromRawText,
  parseRequestBody,
  runAiQuery,
  runPythonAnalyzer,
  sanitizeLinkedinLink,
} from "../sharedAi";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 60,
};

const sanitizeResult = (data: any) => {
  if (!data) return null;
  const deepSanitize = (obj: any): any => {
    if (typeof obj === "string") {
      let cleaned = obj.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
      cleaned = cleaned.replace(/[\uFFFD\uFFFE\uFFFF]/g, "");
      return cleaned.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(deepSanitize);
    }
    if (obj !== null && typeof obj === "object") {
      const newObj: any = {};
      for (const key of Object.keys(obj)) {
        newObj[key] = deepSanitize(obj[key]);
      }
      return newObj;
    }
    return obj;
  };
  return deepSanitize(data);
};

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = await parseRequestBody(req);
    const { rawText = "" } = body;

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ error: "Texto do currículo não fornecido ou inválido." });
    }

    const systemPrompt = `Você é um extrator semântico de currículos para o mercado brasileiro de tecnologia e corporativo.
Analise com extrema precisão o texto fornecido e retorne estritamente um JSON válido no seguinte formato:
{
  "structuredData": {
    "personalInfo": {
      "fullName": string,
      "email": string,
      "phone": string,
      "location": string,
      "linkedin": string,
      "portfolio": string
    },
    "summary": string,
    "experience": [
      {
        "company": string,
        "position": string,
        "startDate": string,
        "endDate": string,
        "current": boolean,
        "description": string,
        "achievements": string[]
      }
    ],
    "education": [
      {
        "institution": string,
        "degree": string,
        "field": string,
        "startDate": string,
        "endDate": string,
        "current": boolean
      }
    ],
    "skills": {
      "technical": string[],
      "soft": string[],
      "languages": [
        {
          "language": string,
          "level": string
        }
      ]
    },
    "certifications": [
      {
        "name": string,
        "issuer": string,
        "date": string
      }
    ]
  },
  "atsAnalysis": {
    "score": number,
    "feedback": {
      "strengths": string[],
      "improvements": string[]
    }
  }
}
Retorne exclusivamente o JSON, sem formatação markdown em torno do texto.`;

    const userPrompt = `Texto extraído do currículo:\n\n${rawText.slice(0, 30000)}`;

    let parsedResult: any = null;

    try {
      const aiResponse = await runAiQuery(systemPrompt, userPrompt, true);
      let cleanJson = aiResponse.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsedResult = JSON.parse(cleanJson);
    } catch (aiError: any) {
      console.warn("AI LLM analysis failed, attempting Python/deterministic fallback:", aiError?.message);
    }

    // Python / local fallback if AI failed or missed structuredData
    if (!parsedResult || !parsedResult.structuredData) {
      const pythonData = runPythonAnalyzer(rawText);
      if (pythonData) {
        parsedResult = {
          structuredData: pythonData,
          atsAnalysis: {
            score: 75,
            feedback: {
              strengths: ["Conteúdo extraído com sucesso através de análise sintática."],
              improvements: ["Revise as seções para enriquecer os detalhes profissionais."],
            },
          },
        };
      }
    }

    if (!parsedResult) {
      return res.status(500).json({
        error: "Não foi possível analisar o currículo com os modelos de IA disponíveis.",
      });
    }

    // Safety checks & normalizations
    if (!parsedResult.structuredData) parsedResult.structuredData = {};
    if (!parsedResult.structuredData.personalInfo) parsedResult.structuredData.personalInfo = {};

    // Fallback Regex for Contacts
    const extractedEmail = extractEmailFromRawText(rawText);
    const extractedPhone = extractPhoneFromRawText(rawText);

    if (!parsedResult.structuredData.personalInfo.email && extractedEmail) {
      parsedResult.structuredData.personalInfo.email = extractedEmail;
    }
    if (!parsedResult.structuredData.personalInfo.phone && extractedPhone) {
      parsedResult.structuredData.personalInfo.phone = extractedPhone;
    }
    if (parsedResult.structuredData.personalInfo.linkedin) {
      parsedResult.structuredData.personalInfo.linkedin = sanitizeLinkedinLink(
        parsedResult.structuredData.personalInfo.linkedin
      );
    }

    // Deterministic ATS Calculation
    if (parsedResult.structuredData) {
      if (!parsedResult.atsAnalysis) parsedResult.atsAnalysis = {};
      const calculatedScore = calculateAtsScore(
        parsedResult.structuredData,
        parsedResult.atsAnalysis?.feedback
      );
      parsedResult.atsAnalysis.score = calculatedScore.score;
      parsedResult.atsAnalysis.feedback = calculatedScore.feedback;
    }

    const sanitizedData = sanitizeResult(parsedResult);
    return res.status(200).json(sanitizedData);
  } catch (err: any) {
    console.error("API /analyze-resume Error:", err);
    return res.status(500).json({
      error: err?.message || "Erro interno ao processar a análise do currículo.",
    });
  }
}
