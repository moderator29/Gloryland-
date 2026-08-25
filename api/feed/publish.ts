import type { VercelRequest, VercelResponse } from "@vercel/node";
import { TEMPLATES, makeContext, type Post, type Template } from "./_templates";

/**
 * Signal's publishing endpoint.
 *
 * Intended to be called by a scheduler roughly every three hours. As a Vercel
 * manual or external trigger. Vercel Hobby projects cannot run a schedule
 * more than once a day, so no schedule is committed here. Point any
 * external scheduler at this endpoint when you want publishing to run.
 * "/api/feed/publish" and the schedule "0 0,3,6,9,12,15,18,21 * * *",
 * which fires eight times a day and is written longhand because the step form
 * of that expression cannot appear inside a block comment.
 *
 * It selects one eligible template, renders it, and returns the finished post
 * as JSON.
 *
 * WHAT THIS ENDPOINT DOES NOT DO, stated plainly so nobody has to read the
 * code to find out: it does not persist anything. There is no database in this
 * build, and a serverless function has no durable storage of its own. Two
 * consequences follow and both are real limitations, not oversights:
 *
 *   1. The rotation ledger below lives in module scope, which means it lives
 *      for the life of one warm instance. A cold start forgets which templates
 *      have run recently, so cooldowns are best effort rather than guaranteed.
 *   2. The rendered post is returned to the caller. Whoever calls this is
 *      responsible for storing it. Until a database exists, the client seeds
 *      its own starter set locally (see src/domain/feed.ts) and this endpoint
 *      stands ready for the moment there is somewhere to write to.
 *
 * Making publishing durable means one table, roughly:
 *   posts(id pk, kind, title, body, published_at, tags, tier_id)
 *   template_runs(template_key pk, last_used_at)
 * at which point step (b) reads template_runs instead of the map below, and
 * the rendered post is inserted rather than returned. Nothing else changes.
 */

/** Rotation ledger: template key to the time it last produced a post. */
const lastUsed = new Map<string, number>();

/**
 * Constant time comparison of two secrets.
 *
 * Both sides are hashed first so the comparison operates on equal length
 * buffers, which keeps a length mismatch from leaking through an early return.
 * Node's timingSafeEqual throws on differing lengths, so this is also what
 * makes the call safe to reach at all.
 */
async function secretMatches(provided: string, expected: string): Promise<boolean> {
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Bearer token or explicit header, whichever the scheduler sends. */
function presentedSecret(req: VercelRequest): string {
  const header = (name: string): string => {
    const v = req.headers[name];
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  };
  const auth = header("authorization");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return header("x-publish-secret").trim();
}

/**
 * Choose what to publish.
 *
 * Eligible means the template has rested for its full cooldown. Among those,
 * the score is staleness in hours multiplied by weight, so the least recently
 * used template wins unless a heavier template is close behind it. A template
 * that has never run scores from the largest cooldown in the library, which
 * puts fresh templates at the front of the queue on a cold instance.
 */
function chooseTemplate(now: number): Template | null {
  const maxCooldown = TEMPLATES.reduce((m, t) => Math.max(m, t.cooldownHours), 0);

  let best: Template | null = null;
  let bestScore = -1;

  for (const t of TEMPLATES) {
    const last = lastUsed.get(t.key);
    const stalenessHours = last === undefined ? maxCooldown * 2 : (now - last) / 3_600_000;
    if (stalenessHours < t.cooldownHours) continue;

    const score = stalenessHours * t.weight;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed", message: "Use GET or POST." });
  }

  res.setHeader("Cache-Control", "no-store");

  // (a) Shared secret. Without one configured the endpoint stays shut rather
  // than falling open, and the failure names the variable to set.
  const expected = process.env.PUBLISH_SECRET;
  if (!expected) {
    return res.status(503).json({
      error: "not_configured",
      message:
        "Publishing is not enabled. Set PUBLISH_SECRET in the server environment and send it as a bearer token.",
    });
  }

  const provided = presentedSecret(req);
  if (!provided || !(await secretMatches(provided, expected))) {
    // Identical body for a missing and a wrong secret: the response tells a
    // caller nothing about which half of the check failed.
    return res.status(401).json({ error: "unauthorized", message: "Invalid credentials." });
  }

  // (b) Pick the least recently used eligible template.
  const now = Date.now();
  const template = chooseTemplate(now);
  if (!template) {
    return res.status(200).json({
      ok: true,
      post: null,
      reason: "all_cooling_down",
      message: "Every template is inside its cooldown. Nothing published this run.",
    });
  }

  // (c) Render and return. Storage is the caller's job until a database exists.
  let post: Post;
  try {
    post = template.render(makeContext(now));
  } catch (err) {
    console.error(
      "feed template render failed",
      template.key,
      err instanceof Error ? err.message : err,
    );
    return res.status(500).json({
      error: "render_failed",
      message: "The post could not be rendered.",
    });
  }

  lastUsed.set(template.key, now);

  return res.status(200).json({
    ok: true,
    post,
    template: { key: template.key, kind: template.kind, cooldownHours: template.cooldownHours },
    persisted: false,
    note: "This endpoint renders and returns a post. It does not store it: durable publishing requires a database.",
  });
}
