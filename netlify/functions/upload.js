/* ===========================================================================
   SEDAL — Netlify serverless image uploader
   ---------------------------------------------------------------------------
   The upstream image tools take a public image URL (?url=...), so a file the
   user picks on their device must first be hosted somewhere public. This
   function receives the file (base64) and uploads it to a public image host,
   returning a direct URL the image tools can fetch.

   Hosts (tried in order): catbox.moe -> 0x0.st -> uguu.se

   Invoke (POST JSON):
     /.netlify/functions/upload   or   /api/upload
     body: { "name": "photo.jpg", "type": "image/jpeg", "data": "<base64>" }
   Response: { ok:true, url:"https://files.catbox.moe/abc.jpg", host:"catbox" }
   =========================================================================== */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap
const ALLOWED = /^image\/(jpe?g|png|webp|gif|bmp)$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS },
  body: JSON.stringify(obj),
});

function extFor(type, name) {
  const m = /\.(jpe?g|png|webp|gif|bmp)$/i.exec(name || "");
  if (m) return m[0].toLowerCase();
  const t = (type || "").toLowerCase();
  if (t.includes("png")) return ".png";
  if (t.includes("webp")) return ".webp";
  if (t.includes("gif")) return ".gif";
  if (t.includes("bmp")) return ".bmp";
  return ".jpg";
}

/* ---- host uploaders: each returns a direct URL string or throws ---- */
async function toCatbox(buf, filename, type) {
  const form = new FormData();
  form.set("reqtype", "fileupload");
  form.set("fileToUpload", new Blob([buf], { type }), filename);
  const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) throw new Error(`catbox: ${text.slice(0, 120) || res.status}`);
  return text;
}
async function toUguu(buf, filename, type) {
  const form = new FormData();
  form.set("files[]", new Blob([buf], { type }), filename);
  const res = await fetch("https://uguu.se/upload.php?output=text", { method: "POST", body: form });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) throw new Error(`uguu: ${text.slice(0, 120) || res.status}`);
  return text.split(/\s+/)[0];
}
async function to0x0(buf, filename, type) {
  const form = new FormData();
  form.set("file", new Blob([buf], { type }), filename);
  const res = await fetch("https://0x0.st", {
    method: "POST",
    body: form,
    headers: { "User-Agent": "Sedal/1.0 (+https://sedal.netlify.app)" },
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) throw new Error(`0x0: ${text.slice(0, 120) || res.status}`);
  return text;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "bad_json", message: "Body harus JSON." });
  }

  const { name = "image.jpg", type = "image/jpeg", data = "" } = payload;
  if (!ALLOWED.test(type)) {
    return json(415, { ok: false, error: "unsupported_type", message: "Tipe file harus gambar (jpg/png/webp/gif/bmp)." });
  }

  const base64 = String(data).replace(/^data:[^;]+;base64,/, "");
  let buf;
  try {
    buf = Buffer.from(base64, "base64");
  } catch {
    return json(400, { ok: false, error: "bad_data", message: "Data gambar tidak valid." });
  }
  if (!buf.length) return json(400, { ok: false, error: "empty", message: "File kosong." });
  if (buf.length > MAX_BYTES) {
    return json(413, { ok: false, error: "too_large", message: "Ukuran gambar maksimal 10 MB." });
  }

  const filename = `sedal_${Date.now()}${extFor(type, name)}`;
  const hosts = [
    ["catbox", toCatbox],
    ["uguu", toUguu],
    ["0x0", to0x0],
  ];

  const errors = [];
  for (const [host, fn] of hosts) {
    try {
      const url = await fn(buf, filename, type);
      return json(200, { ok: true, url, host, bytes: buf.length });
    } catch (e) {
      errors.push(`${host}: ${(e && e.message) || e}`);
    }
  }

  return json(502, {
    ok: false,
    error: "upload_failed",
    message: "Gagal mengunggah gambar ke semua host. Coba lagi atau gunakan metode URL.",
    detail: errors,
  });
};
