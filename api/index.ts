import { applyCors } from "../src/server/sharedAi";

export default function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  res.status(200).json({
    status: "online",
    message: "Resumind API Serverless Gateway está operando perfeitamente.",
    timestamp: new Date().toISOString(),
  });
}
