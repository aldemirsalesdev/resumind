import { applyCors, parseRequestBody } from "../src/server/sharedAi";

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const body = parseRequestBody(req);
    const { userId, userEmail, rating, liked, feedback, context } = body;

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    if (!webhookUrl) {
      return res.status(200).json({
        success: true,
        message: "Webhook não configurado, salvo apenas no DB.",
      });
    }

    const safeFeedback = (feedback || "").toString().substring(0, 2000);
    const safeUserName = (body.userName || "Anônimo").toString().substring(0, 100);
    const safeUserEmail = (userEmail || "anonymous").toString().substring(0, 100);
    const safeUserId = (userId || "anonymous").toString().substring(0, 100);
    const safeContext = (context || "Geral").toString().substring(0, 50);

    const payload = {
      dataHora: new Date().toISOString(),
      userName: safeUserName,
      userEmail: safeUserEmail,
      userId: safeUserId,
      rating,
      liked: Boolean(liked),
      feedback: safeFeedback,
      context: safeContext,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Erro ao enviar para Google Sheets:", await response.text());
      return res.status(500).json({ error: "Erro ao integrar com planilha." });
    }

    res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Feedback Webhook Error:", e);
    res.status(500).json({ error: "Erro interno ao processar feedback." });
  }
}
