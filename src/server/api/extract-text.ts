import {
  applyCors,
  extractTextFromPdf,
  getGeminiClient,
  parseRequestBody,
} from "../sharedAi";
import mammoth from "mammoth";
import path from "path";

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
    const { filename = "", mimetype = "", data = "" } = body;

    if (!filename || !data) {
      return res
        .status(400)
        .json({ error: "Nome do arquivo ou dados ausentes na requisição." });
    }

    const ext = path.extname(filename).toLowerCase();
    const allowedExtensions = [".pdf", ".docx", ".txt"];

    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: `Formato de arquivo ${ext} não suportado. Envie PDF, DOCX ou TXT.`,
      });
    }

    const base64Data = data.includes(",") ? data.split(",")[1] : data;
    const fileBuffer = Buffer.from(base64Data, "base64");

    if (fileBuffer.length === 0) {
      return res.status(400).json({ error: "O arquivo enviado está vazio." });
    }

    // Maximum 10MB
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res
        .status(400)
        .json({ error: "O arquivo excede o limite máximo permitido de 10MB." });
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
      } catch (docxErr: any) {
        return res.status(400).json({
          error:
            "Não foi possível ler o documento Word (DOCX). Verifique se o arquivo está corrompido.",
        });
      }
    } else if (ext === ".txt") {
      rawText = fileBuffer.toString("utf-8");
    }

    let textStripped = rawText.replace(/\0/g, "").trim();

    // Fallback OCR Using Gemini if local text parsing returned empty
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
                      mimeType: mimetype,
                    },
                  },
                  {
                    text: "Você é um extrator OCR especializado em currículos profissionais. Transcreva todo o conteúdo textual legível deste documento de forma fiel, preservando a ordem das seções e informações de contato. Retorne APENAS o texto puro transcrito, sem introduções ou comentários.",
                  },
                ],
              },
            ],
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
                      mimeType: mimetype,
                    },
                  },
                  {
                    text: "Extraia todo o texto deste currículo exatamente como escrito.",
                  },
                ],
              },
            ],
          });
        }

        if (response && response.text) {
          textStripped = response.text.replace(/\0/g, "").trim();
        }
      } catch (fallbackError: any) {
        console.warn("OCR Fallback extraction failed:", fallbackError?.message);
      }
    }

    if (!textStripped) {
      return res.status(400).json({
        error:
          "O arquivo parece estar vazio, protegido por senha ou não contém texto legível. Tente salvá-lo novamente em PDF padrão ou formato DOCX.",
      });
    }

    return res.status(200).json({
      success: true,
      text: textStripped,
      filename,
      charCount: textStripped.length,
    });
  } catch (e: any) {
    console.error("API /extract-text Error:", e);
    return res.status(500).json({
      error: e?.message || "Falha interna ao processar o arquivo no servidor.",
    });
  }
}
