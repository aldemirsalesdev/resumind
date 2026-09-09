// src/server/sharedAi.ts
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();
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

// src/server/api/feedback.ts
var config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb"
    }
  },
  maxDuration: 15
};
async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const body = await parseRequestBody(req);
    const { rating, feedbackType, comment, email, metadata } = body;
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.google_sheets_webhook_url;
    if (!webhookUrl) {
      console.warn("GOOGLE_SHEETS_WEBHOOK_URL is not defined in environment variables.");
      return res.status(200).json({
        success: true,
        mock: true,
        message: "Feedback recebido em modo local (webhook n\xE3o configurado)."
      });
    }
    const payload = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      rating: rating || "N/A",
      feedbackType: feedbackType || "Geral",
      comment: comment || "",
      email: email || "An\xF4nimo",
      userAgent: req.headers["user-agent"] || "",
      metadata: typeof metadata === "object" ? JSON.stringify(metadata) : ""
    };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Google Sheets webhook error:", response.status, text);
      return res.status(502).json({
        error: "Falha ao encaminhar feedback para o webhook."
      });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("API /feedback Error:", error);
    return res.status(500).json({
      error: error?.message || "Erro interno ao registrar feedback."
    });
  }
}
export {
  config,
  handler as default
};
