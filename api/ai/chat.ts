import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  MODEL,
  MAX_TOKENS,
  EFFORT,
  STYLES,
  systemPrompt,
  validate,
  rateLimit,
  type Style,
} from "./_shared";

/**
 * Streaming chat endpoint for both AI surfaces.
 *
 * The Anthropic key lives only in this process. The browser posts messages and
 * reads back a text stream, so the credential is never in a bundle, a response
 * body, or a log line.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // A clear, actionable failure rather than a generic 500.
    return res.status(503).json({
      error: "not_configured",
      message:
        "The assistant is not connected yet. Set ANTHROPIC_API_KEY in the server environment to enable it.",
    });
  }

  const caller =
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]) ||
    req.socket.remoteAddress ||
    "anon";
  const limited = rateLimit(String(caller).split(",")[0].trim());
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter ?? 60));
    return res
      .status(429)
      .json({ error: "rate_limited", message: "Too many requests. Try again shortly." });
  }

  const body = (req.body ?? {}) as {
    messages?: unknown;
    kind?: unknown;
    style?: unknown;
    snapshot?: unknown;
  };

  const checked = validate(body.messages);
  if (!checked.ok) return res.status(400).json({ error: "bad_request", message: checked.error });

  const kind = body.kind === "support" ? "support" : "copilot";
  const style: Style =
    typeof body.style === "string" && body.style in STYLES ? (body.style as Style) : "balanced";
  const snapshot = typeof body.snapshot === "string" ? body.snapshot.slice(0, 2600) : undefined;

  // The latest turn narrows the product briefing to the sections it needs, so
  // a one line question does not carry the whole reference into the prompt.
  const question = checked.messages[checked.messages.length - 1].content.slice(0, 600);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: EFFORT },
        stream: true,
        system: systemPrompt(kind, style, snapshot, question),
        messages: checked.messages,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      console.error("anthropic upstream error", upstream.status, detail.slice(0, 300));

      // Surface enough to diagnose a misconfiguration without leaking
      // anything sensitive. The key never appears in an upstream error body:
      // the API returns a type and a message, and both are safe to pass on.
      // Swallowing them is what made a wrong model id look like an outage.
      let reason = "";
      try {
        const parsed = JSON.parse(detail) as { error?: { type?: string; message?: string } };
        reason = [parsed.error?.type, parsed.error?.message].filter(Boolean).join(": ");
      } catch {
        reason = detail.slice(0, 160);
      }

      const message =
        upstream.status === 401 || upstream.status === 403
          ? "The configured key was rejected. Check ANTHROPIC_API_KEY in the deployment environment."
          : upstream.status === 429
            ? "Rate limited upstream. Try again in a moment."
            : `The assistant could not be reached. Upstream returned ${upstream.status}.`;

      return res.status(502).json({
        error: "upstream",
        status: upstream.status,
        reason: reason.slice(0, 200),
        message,
      });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");

    // Unwrap Anthropic's SSE into plain text deltas so the client stays simple.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            res.write(evt.delta.text);
          }
        } catch {
          /* partial frame, wait for the rest */
        }
      }
    }
    return res.end();
  } catch (err) {
    console.error("chat handler error", err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "server", message: "Something went wrong. Try again." });
    }
    return res.end();
  }
}
