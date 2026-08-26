import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Coarse country lookup for the calling client.
 *
 * Inherited from a predecessor product and currently called by nothing in
 * `src/`. It is kept because the surfaces that would use it (jurisdiction
 * notices on the legal pages) are still to be written, but it is deployed and
 * therefore reachable, so it is treated as a public endpoint rather than as
 * dead code.
 *
 * Two things were wrong with the original and are fixed here.
 *
 * The client's address was read from `x-forwarded-for` and interpolated
 * straight into the upstream URL. That header is set by the caller, so a
 * request could put path segments into it and steer the fetch at a different
 * resource entirely. The value is now parsed as an address and rejected if it
 * is not one, and it is encoded before it reaches the URL.
 *
 * The upstream response was read as if its shape were known. It is a third
 * party JSON body, so it is untrusted input: only two fields are read, both
 * are checked, and anything else is discarded rather than passed through to
 * the caller.
 */

/** Dotted quad, each octet 0 to 255. */
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
/** Hex groups and colons only, which is enough to keep it out of a path. */
const IPV6 = /^[0-9a-fA-F:]{2,45}$/;

function callerAddress(req: VercelRequest): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  // The header is a list; the client is the first entry. Fall back to the
  // socket, which the caller cannot influence.
  const first = (raw ?? "").split(",")[0].trim() || req.socket.remoteAddress || "";
  if (IPV4.test(first)) return first;
  if (first.includes(":") && IPV6.test(first)) return first;
  return null;
}

const UNKNOWN = { country_code: "GLOBAL", country_name: "Unknown" } as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Answering with the fallback rather than an error keeps the caller simple:
  // there is one shape to handle, and an unknown country is a normal outcome.
  res.setHeader("cache-control", "public, max-age=3600, s-maxage=3600");

  const ip = callerAddress(req);
  if (!ip) {
    res.status(200).json(UNKNOWN);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(200).json(UNKNOWN);
      return;
    }

    const data: unknown = await response.json();
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const code = typeof record.country_code === "string" ? record.country_code : "";
    const name = typeof record.country_name === "string" ? record.country_name : "";

    res.status(200).json({
      country_code: /^[A-Z]{2}$/.test(code) ? code : UNKNOWN.country_code,
      country_name: name.length > 0 && name.length <= 64 ? name : UNKNOWN.country_name,
    });
  } catch {
    // A timeout, a refused connection or malformed JSON are all the same
    // outcome to the caller, and none of them should reach a log with an
    // address in it.
    res.status(200).json(UNKNOWN);
  }
}
