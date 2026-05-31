/* ===========================================================================
   XEMOZ // MEDIA INJECTION CONSOLE — Netlify serverless proxy
   ---------------------------------------------------------------------------
   Runs server-side so the browser never talks to the upstream API directly,
   which removes the CORS wall. Only whitelisted services are allowed.

   Invoke:
     /.netlify/functions/proxy?service=tiktok&value=<encoded url>
     /api/proxy?service=tiktok&value=<encoded url>      (alias via netlify.toml)
   =========================================================================== */

const UPSTREAM_BASE = "https://api-xemoz-official.my.id/api/donwloader/";

// Whitelist: service id -> upstream endpoint + query parameter name
const ENDPOINTS = {
  instagram: { path: "instagram.php", param: "q" },
  spotify: { path: "spotify-dl.php", param: "q" },
  tiktok: { path: "tiktok.php", param: "url" },
  tiktokv2: { path: "tiktokv2.php", param: "url" },
  twitter: { path: "twitter.php", param: "q" },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

const json = (statusCode, obj, extra = {}) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...CORS,
    ...extra,
  },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const q = event.queryStringParameters || {};
  const service = (q.service || "").toLowerCase();
  const value = q.value || q.q || q.url || "";

  const cfg = ENDPOINTS[service];
  if (!cfg) {
    return json(400, {
      ok: false,
      error: "unknown_service",
      message: `service must be one of: ${Object.keys(ENDPOINTS).join(", ")}`,
    });
  }
  if (!value) {
    return json(400, { ok: false, error: "missing_value", message: "no target value provided" });
  }

  const upstream = `${UPSTREAM_BASE}${cfg.path}?${cfg.param}=${encodeURIComponent(value)}`;

  // Abort if upstream is too slow (Netlify functions cap ~10s)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  const started = Date.now();

  try {
    const res = await fetch(upstream, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    clearTimeout(timer);

    const text = await res.text();
    const elapsed = Date.now() - started;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    // Wrap so the frontend always gets consistent metadata
    return json(200, {
      ok: res.ok,
      service,
      upstreamStatus: res.status,
      elapsedMs: elapsed,
      data: parsed !== null ? parsed : text,
      raw: parsed === null ? text : undefined,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err && err.name === "AbortError";
    return json(aborted ? 504 : 502, {
      ok: false,
      service,
      error: aborted ? "upstream_timeout" : "upstream_unreachable",
      message: aborted
        ? "The upstream API took too long to respond (>9s). Try again or switch to DIRECT mode."
        : String((err && err.message) || err),
    });
  }
};
