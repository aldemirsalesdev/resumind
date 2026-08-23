import {
  applyCors,
  extractTextFromPdf,
  getGeminiClient,
  parseRequestBody,
} from "../src/server/sharedAi";
import mammoth from "mammoth";
import path from "path";

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const body = parseRequestBody(req);
    const { filename = "", mimetype = "", data = "" } = body;

    if (!filename || !data) {
      return res.status(400).json({ error: "Nome do arquivo ou dados ausentes." });
    }

    const lowerFile = filename.toLowerCase();
    const ext = path.extname(lowerFile);

    // 1. Validar extensões suportadas
    if (![".pdf", ".docx", ".txt"].includes(ext)) {
      return res.status(400).json({
        error: "Formato de arquivo não suportado. Use apenas PDF, DOCX ou TXT.",
      });
    }

    // 2. Decodificar base64
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
    const maxPdfSize = 10 * 1024 * 1024; // 10MB
    const maxDocxSize = 10 * 1024 * 1024; // 10MB
    const maxTxtSize = 2 * 1024 * 1024; // 2MB

    if (ext === ".pdf" && fileSize > maxPdfSize) {
      return res.status(400).json({
        error: "O arquivo PDF excede o limite máximo permitido de 10MB.",
      });
    }
    if (ext === ".docx" && fileSize > maxDocxSize) {
      return res.status(400).json({
        error: "O arquivo DOCX excede o limite máximo permitido de 10MB.",
      });
    }
    if (ext === ".txt" && fileSize > maxTxtSize) {
      return res.status(400).json({
        error: "O arquivo TXT excede o limite máximo permitido de 2MB.",
      });
    }

    // 4. Content Sniffing e proteção contra extensões falsas
    if (ext === ".pdf") {
      const isPdfMagic =
        fileBuffer.slice(0, 4).toString() === "%PDF" ||
        fileBuffer.toString("utf-8", 0, 1024).includes("%PDF");
      if (!isPdfMagic) {
        return res.status(400).json({
          error: "Assinatura de arquivo inválida. O arquivo não é um PDF válido.",
        });
      }
    } else if (ext === ".docx") {
      const isZipMagic = fileBuffer.slice(0, 4).toString("hex") === "504b0304";
      if (!isZipMagic) {
        return res.status(400).json({
          error: "Assinatura de arquivo inválida. O arquivo não é um documento DOCX válido.",
        });
      }
    } else if (ext === ".txt") {
      const hasNullByte = fileBuffer.includes(0x00);
      if (hasNullByte) {
        return res.status(400).json({
          error: "Assinatura de arquivo inválida. O arquivo contém bytes binários.",
        });
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
        } catch {
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

    res.status(200).json({ text: textStripped });
  } catch (e: any) {
    console.error("API /extract-text Error:", e);
    res.status(500).json({
      error: e?.message || "Falha ao processar o arquivo.",
    });
  }
}
