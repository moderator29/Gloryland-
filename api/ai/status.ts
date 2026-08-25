import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Whether the assistant is usable. Reports only a boolean, never the key or
 * any part of it, so the UI can show an honest state instead of failing on
 * the first message.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ configured: Boolean(process.env.ANTHROPIC_API_KEY) });
}
