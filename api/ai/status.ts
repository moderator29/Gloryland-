import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MODEL } from "./_shared";

/**
 * Whether the assistant is actually usable.
 *
 * This used to report only whether the variable was set, which is a different
 * question and a misleading one: a key that is present but rejected, or a
 * model identifier the API does not recognise, both read as configured while
 * every message failed. That is exactly the state the product was in.
 *
 * So this makes the smallest real call it can, one token against the model the
 * assistants use, and reports what came back. The key itself is never in the
 * response: only whether it was accepted, and the API's own error type when it
 * was not.
 */

/** Cached briefly so a page load does not cost a request every time. */
let cached: { at: number; body: Record<string, unknown> } | null = null;
const TTL_MS = 60_000;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(200).json({
      configured: false,
      reachable: false,
      model: MODEL,
      detail: "ANTHROPIC_API_KEY is not set in this environment.",
    });
  }

  if (cached && Date.now() - cached.at < TTL_MS) {
    return res.status(200).json(cached.body);
  }

  try {
    const probe = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });

    if (probe.ok) {
      const body = { configured: true, reachable: true, model: MODEL, detail: "" };
      cached = { at: Date.now(), body };
      return res.status(200).json(body);
    }

    const text = await probe.text().catch(() => "");
    let detail = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text) as { error?: { type?: string; message?: string } };
      detail = [parsed.error?.type, parsed.error?.message].filter(Boolean).join(": ").slice(0, 200);
    } catch {
      /* a non JSON body is reported as it arrived, already truncated */
    }

    const body = {
      configured: true,
      reachable: false,
      model: MODEL,
      status: probe.status,
      detail:
        probe.status === 401 || probe.status === 403
          ? `The key was rejected. ${detail}`
          : detail || `Upstream returned ${probe.status}.`,
    };
    // A failure is cached too, so a broken key does not cost a request per
    // page load while it is being fixed.
    cached = { at: Date.now(), body };
    return res.status(200).json(body);
  } catch (err) {
    return res.status(200).json({
      configured: true,
      reachable: false,
      model: MODEL,
      detail: `Could not reach the API: ${err instanceof Error ? err.message : "unknown error"}`,
    });
  }
}
