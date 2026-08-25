/**
 * Server-side helpers for the AI surfaces.
 *
 * The Anthropic key is read from the environment on the server and is never
 * sent to the browser. The client posts a conversation to these endpoints and
 * receives a streamed reply; it never sees a credential, a model id it did not
 * choose, or the system prompt.
 */

export const MODEL = "claude-sonnet-4-5";
export const MAX_TOKENS = 1600;

export type Role = "user" | "assistant";
export type WireMessage = { role: Role; content: string };

/** Response styles a member can pick in AI settings. */
export const STYLES = {
  concise: "Answer in as few words as the question allows. Lead with the answer.",
  balanced: "Answer clearly and completely, without padding.",
  detailed: "Answer thoroughly, showing your reasoning and covering edge cases.",
} as const;
export type Style = keyof typeof STYLES;

/** Facts about the product, shared by both assistants so neither invents them. */
export const PLATFORM_FACTS = `
Rigel is a private digital-asset vault platform.

How a vault works:
- A member places capital into a vault, which starts a fixed 30 day term.
- The vault accrues 1% of principal per day, continuously.
- Across a full term that totals 30% of principal.
- Accrual stops at maturity. A matured vault holds at exactly 30%.
- Rewards can be claimed at any time during the term. Claiming moves rewards
  into an available balance.
- Settling a matured vault returns the principal to the available balance.
- The available balance can be withdrawn to an external address.

The tier ladder, by lifetime contribution:
- Core, entry $400, settlement target 72 hours
- Signal, entry $1,000, settlement target 48 hours
- Vector, entry $3,000, settlement target 36 hours
- Apex, entry $5,000, settlement target 24 hours
- Meridian, entry $8,000, settlement target 12 hours
- Sovereign, entry $10,000, settlement target 6 hours

Every tier earns the same 30% over 30 days. Tiers differ on access,
settlement speed and tooling, never on rate.

Where things live in the product:
- /app is Home, the overview of position, standing and what needs attention.
- /app/desk is the Desk, for funding, withdrawing and reading the market.
- /app/vaults lists positions. /app/vaults/new opens one.
- /app/tiers is the tier ladder. /app/rewards is claiming and earnings.
- /app/analytics is performance. /app/insights is observations drawn from the
  member's own ledger. /app/activity is the full record. /app/settings is control.

Important constraints on what you may say:
- This build stores a member's ledger in their own browser. There is no server
  side account, no custody, and no settlement network connected yet.
- Never promise a return, guarantee an outcome, or give investment advice.
- Never invent a licence, an audit, an insurance policy, a custody partner, a
  regulator, a partnership or a statistic. If you do not know, say so.
- Capital placed in a vault is at risk, including total loss. Say so when the
  conversation touches on risk or returns.
`.trim();

export function systemPrompt(kind: "copilot" | "support", style: Style, snapshot?: string) {
  const voice =
    kind === "copilot"
      ? `You are the Rigel Copilot, an analyst who helps a member understand their own position and the platform. You are precise, calm and numerate. You explain rather than sell.`
      : `You are Rigel Support. You help members use the product: how to do something, where a screen is, what a term means, why something looks the way it does. You are direct and practical. You do not speculate about markets or returns.`;

  const limits =
    kind === "support"
      ? `If a question falls outside the product (markets, tax, legal, personal financial advice), say it is outside what you can help with and point to the relevant page or to a human. If you do not have enough information to answer accurately, say exactly that rather than guessing.`
      : `If a question needs data you were not given, say what you would need. Do not estimate a member's figures.`;

  return [
    voice,
    STYLES[style],
    limits,
    "Never use em dash characters in your replies. Use commas, colons, parentheses or shorter sentences.",
    PLATFORM_FACTS,
    snapshot ? `\nThe member's current position, derived from their own ledger:\n${snapshot}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Reject oversized or malformed conversations before they reach the model. */
export function validate(
  messages: unknown,
): { ok: true; messages: WireMessage[] } | { ok: false; error: string } {
  if (!Array.isArray(messages)) return { ok: false, error: "messages must be an array" };
  if (messages.length === 0) return { ok: false, error: "messages is empty" };
  if (messages.length > 40) return { ok: false, error: "conversation is too long" };

  const out: WireMessage[] = [];
  let total = 0;
  for (const m of messages) {
    if (!m || typeof m !== "object") return { ok: false, error: "malformed message" };
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return { ok: false, error: "invalid role" };
    if (typeof content !== "string" || !content.trim())
      return { ok: false, error: "empty content" };
    total += content.length;
    if (total > 60_000) return { ok: false, error: "conversation is too large" };
    out.push({ role, content });
  }
  if (out[out.length - 1].role !== "user")
    return { ok: false, error: "last message must be from the user" };
  return { ok: true, messages: out };
}

/** Fixed-window rate limit, keyed per caller. Resets on cold start, which is acceptable for abuse control at this size. */
const hits = new Map<string, { n: number; until: number }>();
export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.until) {
    hits.set(key, { n: 1, until: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (rec.n >= limit)
    return { ok: false, remaining: 0, retryAfter: Math.ceil((rec.until - now) / 1000) };
  rec.n += 1;
  return { ok: true, remaining: limit - rec.n };
}
