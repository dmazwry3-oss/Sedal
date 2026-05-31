/* ===========================================================================
   SEDAL — Netlify serverless proxy
   ---------------------------------------------------------------------------
   Runs server-side so the browser never talks to the upstream API directly,
   which removes the CORS wall. Only whitelisted services are allowed.

   Invoke:
     /.netlify/functions/proxy?service=tiktok&value=<encoded url>
     /api/proxy?service=tiktok&value=<encoded url>      (alias via netlify.toml)

   Extra params (scale / mode / level) are forwarded only when whitelisted
   for that service.
   =========================================================================== */

const API_ROOT = "https://api-xemoz-official.my.id/api/";

// Whitelist: service id -> { path (relative to API_ROOT), param, extras[] }
const ENDPOINTS = {
  // ---- downloaders ----
  instagram: { path: "donwloader/instagram.php", param: "q" },
  spotify:   { path: "donwloader/spotify-dl.php", param: "q" },
  tiktok:    { path: "donwloader/tiktok.php", param: "url" },
  tiktokv2:  { path: "donwloader/tiktokv2.php", param: "url" },
  twitter:   { path: "donwloader/twitter.php", param: "q" },
  ytmp3:     { path: "donwloader/ytmp3.php", param: "url" },
  ytmp4:     { path: "donwloader/ytmp4.php", param: "url" },
  // ---- image tools ----
  hdimage:   { path: "tools/image/hdimage.php", param: "url", extras: ["scale"] },
  remini:    { path: "tools/image/remini.php", param: "url" },
  removebg:  { path: "tools/image/removebg.php", param: "url" },
  wink:      { path: "tools/image/wink.php", param: "url", extras: ["mode"] },
  topixel:   { path: "tools/image/topixel.php", param: "url", extras: ["level"] },
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

  // Build the upstream query string: primary param + whitelisted extras
  const params = new URLSearchParams();
  params.set(cfg.param, value);
  (cfg.extras || []).forEach((key) => {
    if (q[key] != null && q[key] !== "") params.set(key, q[key]);
  });

  const upstream = `${API_ROOT}${cfg.path}?${params.toString()}`;

  // Abort if upstream is too slow. Image enhancers can take a while, so give
  // them more headroom than the plain downloaders (Netlify cap is ~10s/26s).
  const isImageTool = cfg.path.startsWith("tools/image/");
  const timeoutMs = isImageTool ? 24000 : 9000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

    const contentType = res.headers.get("content-type") || "";
    const elapsed = Date.now() - started;

    // Some image tools may return the processed image directly (binary).
    // In that case, hand back a data URL the frontend can show/download.
    if (/^image\//i.test(contentType)) {
      const buf = Buffer.from(await res.arrayBuffer());
      const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;
      return json(200, {
        ok: res.ok,
        service,
        upstreamStatus: res.status,
        elapsedMs: elapsed,
        kind: "image",
        data: { result: dataUrl, image: dataUrl },
      });
    }

    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

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
        ? `The upstream API took too long to respond (>${Math.round(timeoutMs / 1000)}s). Please try again.`
        : String((err && err.message) || err),
    });
  }
};
