import { applyCors, parseRequestBody } from "../sharedAi";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 15,
};

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = await parseRequestBody(req);
    const { rating, feedbackType, comment, email, metadata } = body;

    const webhookUrl =
      process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
      process.env.google_sheets_webhook_url;

    if (!webhookUrl) {
      console.warn("GOOGLE_SHEETS_WEBHOOK_URL is not defined in environment variables.");
      return res.status(200).json({
        success: true,
        mock: true,
        message: "Feedback recebido em modo local (webhook não configurado).",
      });
    }

    const payload = {
      timestamp: new Date().toISOString(),
      rating: rating || "N/A",
      feedbackType: feedbackType || "Geral",
      comment: comment || "",
      email: email || "Anônimo",
      userAgent: req.headers["user-agent"] || "",
      metadata: typeof metadata === "object" ? JSON.stringify(metadata) : "",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Google Sheets webhook error:", response.status, text);
      return res.status(502).json({
        error: "Falha ao encaminhar feedback para o webhook.",
      });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("API /feedback Error:", error);
    return res.status(500).json({
      error: error?.message || "Erro interno ao registrar feedback.",
    });
  }
}
