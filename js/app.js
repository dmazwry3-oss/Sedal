/* =====================================================================
   SEDAL — Media Downloader & Image Tools  ·  app.js
   Friendly UI on top of the api-xemoz endpoints.
   Routes through the Netlify proxy (no CORS), falls back to direct.
   ===================================================================== */
(() => {
  "use strict";

  const API_ROOT = "https://api-xemoz-official.my.id/api/";
  const PROXY_URL = "/.netlify/functions/proxy";
  const UPLOAD_URL = "/.netlify/functions/upload";
  const RECENT_KEY = "sedal_recent_v1";
  const MAX_RECENT = 6;

  /* ---------- icons (inline SVG or emoji) ---------- */
  const ICONS = {
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9V9.6c-1.3 0-2.5-.4-3.5-1v5.7a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v2.8a2.6 2.6 0 1 0 1.8 2.4V3h2.6z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
    spotify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><path d="M7.4 9.8c3-.9 6.4-.5 8.9 1.1M7.9 13c2.4-.7 4.8-.4 6.8 1M8.5 15.9c1.8-.5 3.6-.3 5 .6"/></svg>',
    tiktokv2: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9V9.6c-1.3 0-2.5-.4-3.5-1v5.7a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v2.8a2.6 2.6 0 1 0 1.8 2.4V3h2.6z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8zM10 15V9l5 3z"/></svg>',
    hdimage: "🔍", remini: "✨", removebg: "✂️", wink: "🪄", topixel: "🧩",
  };

  /* ---------- tool registry ---------- */
  const TOOLS = [
    // ===== DOWNLOADERS =====
    {
      id: "tiktok", name: "TikTok", category: "download", family: "tiktok",
      path: "donwloader/tiktok.php", param: "url",
      accent: "#fe2c55", badge: "linear-gradient(135deg,#25f4ee,#fe2c55)",
      placeholder: "https://www.tiktok.com/@user/video/...",
      sample: "https://www.tiktok.com/@tiktok/video/7106594312292453675",
      detect: /tiktok\.com|douyin|vt\.tiktok|vm\.tiktok/i,
      tip: "Video TikTok tanpa watermark + audionya.",
    },
    {
      id: "instagram", name: "Instagram", category: "download",
      path: "donwloader/instagram.php", param: "q",
      accent: "#e1306c", badge: "linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)",
      placeholder: "https://www.instagram.com/p/...",
      sample: "https://www.instagram.com/reel/C5qWNkWreXf/",
      detect: /instagram\.com|instagr\.am/i,
      tip: "Foto, Reels, dan carousel Instagram.",
    },
    {
      id: "spotify", name: "Spotify", category: "download",
      path: "donwloader/spotify-dl.php", param: "q",
      accent: "#1db954", badge: "#1db954",
      placeholder: "https://open.spotify.com/track/...",
      sample: "https://open.spotify.com/track/3rXS2AEXNADrIFyuY3F6RJ",
      detect: /open\.spotify\.com|spotify\.link/i,
      tip: "Unduh lagu Spotify beserta sampul albumnya.",
    },
    {
      id: "twitter", name: "Twitter / X", category: "download",
      path: "donwloader/twitter.php", param: "q",
      accent: "#1d9bf0", badge: "#1d9bf0",
      placeholder: "https://x.com/user/status/...",
      sample: "https://x.com/Twitter/status/1445078208190291973",
      detect: /twitter\.com|x\.com|t\.co/i,
      tip: "Video & gambar dari Tweet / status X.",
    },
    {
      id: "ytmp4", name: "YouTube MP4", category: "download", family: "youtube",
      path: "donwloader/ytmp4.php", param: "url",
      accent: "#ff0000", badge: "linear-gradient(135deg,#ff0000,#c4302b)",
      placeholder: "https://www.youtube.com/watch?v=...",
      sample: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      detect: /youtube\.com|youtu\.be/i,
      tip: "Unduh video YouTube dalam format MP4.",
    },
    {
      id: "ytmp3", name: "YouTube MP3", category: "download", family: "youtube",
      path: "donwloader/ytmp3.php", param: "url",
      accent: "#ff5252", badge: "linear-gradient(135deg,#ff5252,#ff0000)",
      placeholder: "https://www.youtube.com/watch?v=...",
      sample: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      detect: null, // shares the youtube family; choose manually
      tip: "Ubah video YouTube menjadi audio MP3.",
    },
    {
      id: "tiktokv2", name: "TikTok V2", category: "download", family: "tiktok",
      path: "donwloader/tiktokv2.php", param: "url",
      accent: "#00c2cc", badge: "linear-gradient(135deg,#fe2c55,#25f4ee)",
      placeholder: "https://www.tiktok.com/@user/video/...",
      sample: "https://www.tiktok.com/@tiktok/video/7106594312292453675",
      detect: null, // manual fallback only
      tip: "Cadangan untuk TikTok bila yang utama gagal.",
    },

    // ===== IMAGE TOOLS =====
    {
      id: "hdimage", name: "HD Upscale", category: "image",
      path: "tools/image/hdimage.php", param: "url",
      accent: "#7c5cff", badge: "linear-gradient(135deg,#7c5cff,#a98bff)",
      placeholder: "Tempel URL gambar (jpg/png)…",
      sample: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
      detect: null,
      tip: "Perbesar resolusi gambar beberapa kali lipat.",
      extras: [{ key: "scale", label: "Skala", options: ["2", "4", "8"], default: "4" }],
    },
    {
      id: "remini", name: "Remini", category: "image",
      path: "tools/image/remini.php", param: "url",
      accent: "#00c2cc", badge: "linear-gradient(135deg,#00c2cc,#36e0d0)",
      placeholder: "Tempel URL gambar (jpg/png)…",
      sample: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
      detect: null,
      tip: "Pertajam & perjelas foto buram (face enhance).",
    },
    {
      id: "removebg", name: "Hapus BG", category: "image",
      path: "tools/image/removebg.php", param: "url",
      accent: "#ff5c9d", badge: "linear-gradient(135deg,#ff5c9d,#ff8fb3)",
      placeholder: "Tempel URL gambar (jpg/png)…",
      sample: "https://cloud.yardansh.com/M3bLEV.jpg",
      detect: null,
      tip: "Hapus latar belakang gambar jadi transparan.",
    },
    {
      id: "wink", name: "Wink", category: "image",
      path: "tools/image/wink.php", param: "url",
      accent: "#ffb454", badge: "linear-gradient(135deg,#ffb454,#ffd08a)",
      placeholder: "Tempel URL gambar (jpg/png)…",
      sample: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
      detect: null,
      tip: "Tingkatkan kualitas gambar dengan mode pilihan.",
      extras: [{ key: "mode", label: "Mode", options: ["ultrahd", "enhance", "colorize"], default: "ultrahd" }],
    },
    {
      id: "topixel", name: "ToPixel", category: "image",
      path: "tools/image/topixel.php", param: "url",
      accent: "#2bd576", badge: "linear-gradient(135deg,#2bd576,#5cf0a0)",
      placeholder: "Tempel URL gambar (jpg/png)…",
      sample: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
      detect: null,
      tip: "Ubah gambar menjadi gaya pixel-art.",
      extras: [{ key: "level", label: "Level", options: ["10", "20", "30", "50"], default: "30" }],
    },
  ];

  const CATEGORIES = [
    { id: "download", label: "Unduh Media" },
    { id: "image", label: "Alat Gambar" },
  ];

  const $ = (s) => document.querySelector(s);
  const el = {
    tabs: $("#tabs"),
    options: $("#tool-options"),
    input: $("#link-input"), inputIcon: $("#dl-input-icon"),
    paste: $("#btn-paste"), clear: $("#btn-clear"),
    download: $("#btn-download"), dlLabel: $(".btn-download-label"), box: $("#dl-box"),
    detectHint: $("#detect-hint"), sample: $("#btn-sample"),
    progress: $("#progress"),
    resultSection: $("#result-section"), resultWrap: $("#result-wrap"),
    recent: $("#recent"), recentList: $("#recent-list"), recentClear: $("#recent-clear"),
    toast: $("#toast"),
    btnInstall: $("#btn-install"),
    // upload UI
    modeToggle: $("#mode-toggle"), modeUrl: $("#mode-url"), modeUpload: $("#mode-upload"),
    uploadZone: $("#upload-zone"), fileInput: $("#file-input"), dropArea: $("#drop-area"),
    dropEmpty: $("#drop-empty"), dropPreview: $("#drop-preview"),
    previewImg: $("#preview-img"), previewName: $("#preview-name"),
    previewSize: $("#preview-size"), previewState: $("#preview-state"),
    previewRemove: $("#preview-remove"), btnProcess: $("#btn-process"),
  };

  let active = TOOLS[0];
  let busy = false;
  let deferredPrompt = null;
  let extraValues = {};   // current values of the active tool's extra params
  let inputMode = "url";  // "url" | "upload" (upload only for image tools)
  let uploaded = null;    // { hostedUrl, previewUrl, name } once an image is hosted
  let pendingFile = null; // selected file awaiting upload

  /* ===================================================================
     TABS (grouped by category)
     =================================================================== */
  function buildTabs() {
    el.tabs.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const group = document.createElement("div");
      group.className = "tab-group";
      group.innerHTML = `<span class="tab-group-label">${cat.label}</span>`;
      const row = document.createElement("div");
      row.className = "tab-row";
      TOOLS.filter((t) => t.category === cat.id).forEach((t) => {
        const b = document.createElement("button");
        b.className = "tab";
        b.dataset.id = t.id;
        b.style.setProperty("--tab", t.accent);
        b.setAttribute("role", "tab");
        b.innerHTML = `<span class="tab-ic" style="background:${t.badge}">${ICONS[t.id]}</span><span>${t.name}</span>`;
        b.addEventListener("click", () => selectTool(t.id));
        row.appendChild(b);
      });
      group.appendChild(row);
      el.tabs.appendChild(group);
    });
  }

  function selectTool(id, keepInputValue) {
    active = TOOLS.find((t) => t.id === id) || TOOLS[0];
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.id === active.id));
    document.documentElement.style.setProperty("--accent", active.accent);
    el.input.placeholder = active.placeholder;
    el.inputIcon.textContent = active.category === "image" ? "🖼️" : "🔗";
    el.dlLabel.textContent = active.category === "image" ? "✨ Proses" : "⬇ Download";

    // reset extra params to defaults + (re)build their controls
    extraValues = {};
    (active.extras || []).forEach((ex) => (extraValues[ex.key] = ex.default));
    buildOptions();

    // image tools get the URL/Upload mode toggle; downloaders are URL-only
    const isImage = active.category === "image";
    el.modeToggle.hidden = !isImage;
    if (!isImage && inputMode === "upload") setMode("url");
    else applyMode(); // refresh which box is visible

    if (!keepInputValue) setHint(active.tip);
  }

  /* ===================================================================
     INPUT MODE (URL vs Upload) — image tools only
     =================================================================== */
  function setMode(mode) {
    inputMode = mode;
    applyMode();
  }
  function applyMode() {
    const isImage = active.category === "image";
    const uploadVisible = isImage && inputMode === "upload";
    el.modeUrl.classList.toggle("active", inputMode === "url");
    el.modeUpload.classList.toggle("active", inputMode === "upload");
    el.box.hidden = uploadVisible;          // URL box
    el.uploadZone.hidden = !uploadVisible;  // upload zone
  }

  /* extra-parameter controls (scale / mode / level) */
  function buildOptions() {
    el.options.innerHTML = "";
    const extras = active.extras || [];
    el.options.hidden = extras.length === 0;
    extras.forEach((ex) => {
      const wrap = document.createElement("label");
      wrap.className = "opt";
      const sel = `<select data-key="${ex.key}">${ex.options
        .map((o) => `<option value="${attr(o)}"${o === ex.default ? " selected" : ""}>${escapeHtml(o)}</option>`)
        .join("")}</select>`;
      wrap.innerHTML = `<span class="opt-label">${escapeHtml(ex.label)}</span>${sel}`;
      const select = wrap.querySelector("select");
      select.addEventListener("change", () => { extraValues[ex.key] = select.value; });
      el.options.appendChild(wrap);
    });
  }

  /* ===================================================================
     AUTO-DETECT (family-aware so MP3/MP4 & TikTok V2 don't fight)
     =================================================================== */
  function autoDetect() {
    const v = el.input.value.trim();
    el.clear.hidden = !v;
    if (!v) { setHint(active.tip); return; }
    if (active.category === "image") {
      // image tools take a generic image URL — no platform detection
      setHint(active.tip);
      return;
    }
    const match = TOOLS.find((t) => t.detect && t.detect.test(v));
    if (match) {
      // stay within the same family if the user already picked a variant
      if (match.family && match.family === active.family) {
        if (match.family === "youtube") setHint("✓ YouTube terdeteksi — pilih MP3 atau MP4 di atas.", "ok");
        else setHint(`✓ Terdeteksi: ${active.name}`, "ok");
      } else {
        selectTool(match.id, true);
        if (match.family === "youtube") setHint("✓ YouTube terdeteksi — pilih MP3 atau MP4 di atas.", "ok");
        else setHint(`✓ Terdeteksi: ${match.name}`, "ok");
      }
    } else if (/^https?:\/\//i.test(v)) {
      setHint("Link tidak dikenali — pilih tool manual di atas.", "warn");
    } else {
      setHint(active.tip);
    }
  }
  function setHint(text, kind) {
    el.detectHint.textContent = text;
    el.detectHint.className = "detect-hint" + (kind ? " " + kind : "");
  }

  /* ===================================================================
     ROUTING (proxy first, then direct)
     =================================================================== */
  function buildExtras() {
    const params = new URLSearchParams();
    (active.extras || []).forEach((ex) => {
      const val = extraValues[ex.key];
      if (val != null && val !== "") params.set(ex.key, val);
    });
    return params;
  }
  function directUrl(value) {
    const params = new URLSearchParams();
    params.set(active.param, value);
    for (const [k, v] of buildExtras()) params.set(k, v);
    return `${API_ROOT}${active.path}?${params.toString()}`;
  }
  function proxyUrl(value) {
    const params = new URLSearchParams();
    params.set("service", active.id);
    params.set("value", value);
    for (const [k, v] of buildExtras()) params.set(k, v);
    return `${PROXY_URL}?${params.toString()}`;
  }

  async function callProxy(value) {
    const res = await fetch(proxyUrl(value), { headers: { Accept: "application/json" } });
    const wrapped = await res.json();
    if (!res.ok || wrapped.ok === false) {
      throw new Error(wrapped.message || wrapped.error || `proxy ${res.status}`);
    }
    return { data: wrapped.data, kind: wrapped.kind };
  }
  async function callDirect(value) {
    const res = await fetch(directUrl(value), { headers: { Accept: "application/json, text/plain, image/*, */*" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    if (/^image\//i.test(ct)) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      return { data: { result: url, image: url }, kind: "image" };
    }
    const raw = await res.text();
    try { return { data: JSON.parse(raw), kind: undefined }; }
    catch { return { data: raw, kind: undefined }; }
  }

  /* ===================================================================
     IMAGE UPLOAD (pick / drop / paste -> compress -> host)
     =================================================================== */
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  async function handleFile(file) {
    if (!file) return;
    if (!/^image\//i.test(file.type)) { toast("File harus berupa gambar", "err"); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast("Ukuran gambar maksimal 10 MB", "err"); return; }

    // reset previous hosted state
    uploaded = null;
    pendingFile = file;

    // preview immediately
    const previewUrl = URL.createObjectURL(file);
    el.previewImg.src = previewUrl;
    el.previewName.textContent = file.name || "image";
    el.previewSize.textContent = humanSize(file.size);
    el.previewState.textContent = "";
    el.previewState.className = "preview-state";
    el.dropEmpty.hidden = true;
    el.dropPreview.hidden = false;
    el.dropArea.classList.add("has-file");
  }

  // Downscale/compress large images in-browser to speed up the upload.
  async function compressImage(file) {
    // keep small images & non-JPEG/PNG (e.g. gif) as-is
    if (file.size < 600 * 1024 || !/image\/(jpe?g|png|webp)/i.test(file.type)) return file;
    try {
      const bitmap = await createImageBitmap(file);
      const MAXD = 2000;
      let { width, height } = bitmap;
      const scale = Math.min(1, MAXD / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
      if (blob && blob.size < file.size) return new File([blob], (file.name || "image").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch { /* fall through to original */ }
    return file;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).replace(/^data:[^;]+;base64,/, ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // Ensure pendingFile is hosted; returns a public URL or throws.
  async function ensureHosted() {
    if (uploaded && uploaded.hostedUrl) return uploaded.hostedUrl;
    if (!pendingFile) throw new Error("Belum ada gambar yang dipilih.");

    el.previewState.textContent = "mengunggah…";
    el.previewState.className = "preview-state uploading";

    const file = await compressImage(pendingFile);
    const data = await fileToBase64(file);
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, type: file.type, data }),
    });
    let payload;
    try { payload = await res.json(); } catch { payload = null; }
    if (!res.ok || !payload || payload.ok === false || !payload.url) {
      const msg = (payload && payload.message) || `upload gagal (${res.status})`;
      throw new Error(msg);
    }
    uploaded = { hostedUrl: payload.url, previewUrl: el.previewImg.src, name: pendingFile.name };
    el.previewState.textContent = "✓ terunggah";
    el.previewState.className = "preview-state ok";
    return payload.url;
  }

  function clearUpload() {
    pendingFile = null;
    uploaded = null;
    el.fileInput.value = "";
    el.dropPreview.hidden = true;
    el.dropEmpty.hidden = false;
    el.dropArea.classList.remove("has-file");
  }

  /* ===================================================================
     ACTION FLOW
     =================================================================== */
  // Resolve the value to send to the API based on the current input mode.
  async function getTargetValue() {
    if (active.category === "image" && inputMode === "upload") {
      return await ensureHosted();   // upload (if needed) then return hosted URL
    }
    return el.input.value.trim();
  }
  async function startDownload() {
    if (busy) return;

    const isUpload = active.category === "image" && inputMode === "upload";
    if (isUpload && !pendingFile && !(uploaded && uploaded.hostedUrl)) {
      toast("Pilih atau seret gambar dulu 🙂", "err");
      el.dropArea.focus();
      return;
    }
    if (!isUpload) {
      const v = el.input.value.trim();
      if (!v) { toast("Tempel link dulu ya 🙂", "err"); el.input.focus(); return; }
      if (!/^https?:\/\//i.test(v)) { toast("Link harus diawali http:// atau https://", "err"); return; }
    }

    busy = true;
    setLoading(true);
    showSkeleton();
    haptic(10);

    // resolve the target value (may upload the file first)
    let val;
    try {
      val = await getTargetValue();
    } catch (upErr) {
      renderError(new Error((upErr && upErr.message) || "Gagal mengunggah gambar."), null, true);
      if (el.previewState) { el.previewState.textContent = "✕ gagal unggah"; el.previewState.className = "preview-state err"; }
      haptic([50, 30, 50]);
      setLoading(false);
      busy = false;
      el.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    let result = null, err = null;
    try {
      result = await callProxy(val);              // try Netlify proxy first
    } catch (e1) {
      try { result = await callDirect(val); }     // fall back to direct browser call
      catch (e2) { err = e2.message?.includes("HTTP") || /CORS|fetch|network/i.test(e2.message) ? e2 : e1; }
    }

    if (result == null || result.data == null) {
      renderError(err || new Error("Tidak ada respons dari server."));
      haptic([50, 30, 50]);
    } else {
      const { data, kind } = result;
      const apiMsg = apiErrorMessage(data);
      const success = kind === "image" || hasMedia(data) || (active.category === "image" && findResultImage(data));
      if (apiMsg && !success) {
        renderError(new Error(apiMsg), data, true);
        haptic([50, 30, 50]);
      } else if (active.category === "image") {
        const ok = renderImageResult(data, kind, val);
        if (ok) { pushRecent(val, active.name); haptic([15, 40, 15]); }
      } else {
        const ok = renderResult(data, val);
        if (ok) { pushRecent(val, lastTitle); haptic([15, 40, 15]); }
      }
    }

    setLoading(false);
    busy = false;
    el.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function apiErrorMessage(data) {
    if (typeof data !== "object" || data === null) return "";
    const nodes = [data, data.result, data.data].filter((n) => n && typeof n === "object");
    let failed = false, detail = "";
    for (const n of nodes) {
      if (n.success === false || n.status === false || n.ok === false || n.error) failed = true;
      const msg = n.error || n.message || n.msg;
      if (msg && typeof msg === "string" && !detail) detail = msg;
    }
    if (!failed) return "";
    if (/404|not found/i.test(detail)) return "Konten tidak ditemukan (404) — link mungkin salah, sudah dihapus, atau privat.";
    if (/internal server error|500/i.test(detail)) return "Server sumber sedang bermasalah (Internal Server Error). Coba lagi sebentar lagi.";
    if (/timeout|timed out|504/i.test(detail)) return "Server sumber lama merespons (timeout). Coba lagi.";
    if (/rate|too many|429/i.test(detail)) return "Terlalu banyak permintaan ke server (rate limit). Tunggu sebentar lalu coba lagi.";
    return detail || "Server sumber menolak permintaan ini.";
  }

  function setLoading(on) {
    el.download.disabled = on;
    el.download.classList.toggle("loading", on);
    if (el.btnProcess) { el.btnProcess.disabled = on; el.btnProcess.classList.toggle("loading", on); }
    el.progress.classList.toggle("active", on);
  }

  /* ===================================================================
     MEDIA SCAN
     =================================================================== */
  const RX = {
    video: /\.(mp4|mov|webm|m3u8)(\?|$)/i,
    audio: /\.(mp3|m4a|aac|ogg|wav|opus)(\?|$)/i,
    image: /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i,
    url: /^https?:\/\//i,
  };
  const HINT = {
    video: /(video|nowatermark|nowm|hdplay|play|hd|sd|reel|mp4|720|1080)/i,
    audio: /(audio|music|sound|song|mp3|track|preview)/i,
    image: /(thumb|image|cover|photo|pic|display|poster|avatar|art)/i,
    title: /(title|caption|desc|name|track|fulltitle|text)/i,
    author: /(author|artist|owner|username|user|channel|nickname|creator)/i,
    duration: /(duration|length|time)/i,
  };
  function classify(key, value) {
    if (RX.video.test(value) || HINT.video.test(key)) return "video";
    if (RX.audio.test(value) || HINT.audio.test(key)) return "audio";
    if (RX.image.test(value) || HINT.image.test(key)) return "image";
    return "link";
  }
  function deepScan(obj, out, path = "") {
    if (obj == null) return;
    if (typeof obj === "string") {
      if (RX.url.test(obj)) out.media.push({ key: path, url: obj, type: classify(path, obj) });
      return;
    }
    if (typeof obj !== "object") return;
    Object.keys(obj).forEach((k) => {
      const v = obj[k], lk = k.toLowerCase();
      if (typeof v === "string" && !RX.url.test(v)) {
        if (HINT.title.test(lk) && !out.title && v.length < 240) out.title = v;
        else if (HINT.author.test(lk) && !out.author) out.author = v;
        else if (HINT.duration.test(lk) && !out.duration) out.duration = v;
      }
      deepScan(v, out, k);
    });
  }
  function hasMedia(data) {
    if (typeof data !== "object") return false;
    const out = { media: [] }; deepScan(data, out);
    return out.media.length > 0;
  }

  /* find a processed-image URL (http or data:) in an image-tool response */
  function findResultImage(data) {
    if (typeof data === "string") {
      if (/^data:image\//i.test(data) || (RX.url.test(data))) return data;
      return "";
    }
    if (typeof data !== "object" || data === null) return "";
    const PREF = /(result|output|image|hasil|hd|url|link|data)/i;
    let best = "", fallback = "";
    (function walk(obj, key) {
      if (best) return;
      if (typeof obj === "string") {
        const isImg = /^data:image\//i.test(obj) || RX.image.test(obj) || (RX.url.test(obj) && PREF.test(key || ""));
        if (isImg) {
          if (PREF.test(key || "")) best = obj;
          else if (!fallback && RX.url.test(obj)) fallback = obj;
        }
        return;
      }
      if (typeof obj === "object" && obj) Object.keys(obj).forEach((k) => walk(obj[k], k));
    })(data, "");
    return best || fallback;
  }

  /* ===================================================================
     RENDER — downloaders
     =================================================================== */
  let lastTitle = "";

  function renderResult(data, srcUrl) {
    if (typeof data !== "object" || data === null) {
      renderError(new Error("Format respons tidak dikenali."));
      return false;
    }
    const out = { media: [], title: "", author: "", duration: "" };
    deepScan(data, out);
    const seen = new Set();
    out.media = out.media.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));

    if (!out.media.length) {
      renderError(new Error("Tidak ada media yang ditemukan pada link ini."), data);
      return false;
    }

    const videos = out.media.filter((m) => m.type === "video");
    const audios = out.media.filter((m) => m.type === "audio");
    const images = out.media.filter((m) => m.type === "image");
    const links  = out.media.filter((m) => m.type === "link");
    const thumb = images[0];
    lastTitle = out.title || `${active.name} media`;

    let mediaCol = "";
    if (videos.length) {
      mediaCol = `<video src="${attr(videos[0].url)}" controls playsinline preload="metadata" ${thumb ? `poster="${attr(thumb.url)}"` : ""}></video>`;
    } else if (audios.length && !images.length) {
      mediaCol = `<div class="audio-art">🎵</div>`;
    } else if (thumb) {
      mediaCol = `<img class="thumb" src="${attr(thumb.url)}" alt="thumbnail" loading="lazy" onerror="this.style.display='none'">`;
    }

    const actions = [];
    videos.forEach((m, i) => actions.push(action(m.url, `⬇ Video${videos.length > 1 ? " " + (i + 1) : ""}`, i === 0 ? "primary" : "")));
    audios.forEach((m, i) => actions.push(action(m.url, `🎵 Audio${audios.length > 1 ? " " + (i + 1) : ""}`, "audio")));
    if (images.length === 1) actions.push(action(images[0].url, "⬇ Gambar", videos.length ? "" : "primary"));
    links.slice(0, 4).forEach((m) => actions.push(action(m.url, `↗ ${shortLabel(m.key)}`, "")));
    if (out.media.length > 1) actions.push(`<button class="dl-action" data-all='${attr(JSON.stringify(out.media.map((m) => m.url)))}'>⬇ Unduh semua (${out.media.length})</button>`);

    const gallery = images.length > 1
      ? `<div class="gallery">${images.map((m) => `<a href="${attr(m.url)}" target="_blank" rel="noopener" download><img src="${attr(m.url)}" loading="lazy" alt="" onerror="this.parentElement.style.display='none'"></a>`).join("")}</div>`
      : "";

    const wideClass = (active.id === "twitter" || active.family === "youtube") ? " wide" : "";

    el.resultWrap.innerHTML = `
      <div class="card">
        <div class="card-media${wideClass}">${mediaCol}</div>
        <div class="card-info">
          <span class="card-platform" style="background:${active.badge}">${ICONS[active.id]} ${active.name}</span>
          <div class="card-title">${escapeHtml(lastTitle)}</div>
          <div class="card-meta">
            ${out.author ? `<span>👤 <b>${escapeHtml(out.author)}</b></span>` : ""}
            ${out.duration ? `<span>⏱ <b>${escapeHtml(String(out.duration))}</b></span>` : ""}
            <span>📦 <b>${out.media.length}</b> file</span>
          </div>
          ${audios.length ? `<audio class="card-audio" src="${attr(audios[0].url)}" controls preload="none"></audio>` : ""}
          <div class="dl-actions">${actions.join("")}</div>
          ${gallery}
          ${rawDetails(data)}
        </div>
      </div>`;
    el.resultSection.hidden = false;
    wireDownloadAll();
    toast("Berhasil! Tinggal pilih unduhanmu ⬇", "ok");
    return true;
  }

  /* ===================================================================
     RENDER — image tools (before / after)
     =================================================================== */
  function renderImageResult(data, kind, srcUrl) {
    const resultUrl = (kind === "image" && typeof data === "object" && data && (data.result || data.image)) || findResultImage(data);
    if (!resultUrl) {
      renderError(new Error("Gambar hasil tidak ditemukan pada respons."), data);
      return false;
    }
    const dl = action(resultUrl, "⬇ Unduh hasil", "primary");
    el.resultWrap.innerHTML = `
      <div class="card image-result">
        <div class="card-info" style="width:100%">
          <span class="card-platform" style="background:${active.badge}">${ICONS[active.id]} ${active.name}</span>
          <div class="card-title">${escapeHtml(active.name)} — selesai ✨</div>
          <div class="compare">
            <figure>
              <figcaption>Sebelum</figcaption>
              <img src="${attr(srcUrl)}" alt="sebelum" loading="lazy" onerror="this.style.opacity=.3">
            </figure>
            <figure>
              <figcaption>Sesudah</figcaption>
              <img src="${attr(resultUrl)}" alt="sesudah" loading="lazy">
            </figure>
          </div>
          <div class="dl-actions">
            ${dl}
            <a class="dl-action" href="${attr(resultUrl)}" target="_blank" rel="noopener">↗ Buka di tab baru</a>
          </div>
          ${rawDetails(data)}
        </div>
      </div>`;
    el.resultSection.hidden = false;
    toast("Selesai! Lihat hasilnya di bawah ✨", "ok");
    return true;
  }

  function rawDetails(data) {
    const txt = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    const trimmed = txt.length > 6000 ? txt.slice(0, 6000) + "\n… (dipotong)" : txt;
    return `<details class="raw-toggle"><summary>Lihat detail teknis (JSON)</summary><pre class="raw-pre">${escapeHtml(trimmed)}</pre></details>`;
  }
  function wireDownloadAll() {
    const dlAll = el.resultWrap.querySelector("[data-all]");
    if (dlAll) dlAll.addEventListener("click", () => downloadAll(JSON.parse(dlAll.dataset.all)));
  }

  function action(url, label, variant) {
    const cls = "dl-action" + (variant ? " " + variant : "");
    return `<a class="${cls}" href="${attr(url)}" target="_blank" rel="noopener" download>${label}</a>`;
  }
  function downloadAll(urls) {
    urls.forEach((u, i) => setTimeout(() => {
      const a = document.createElement("a");
      a.href = u; a.target = "_blank"; a.rel = "noopener"; a.download = "";
      document.body.appendChild(a); a.click(); a.remove();
    }, i * 350));
    toast(`Membuka ${urls.length} file…`, "ok");
  }
  function shortLabel(key) { return key ? key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 18) : "Tautan"; }

  function showSkeleton() {
    el.resultSection.hidden = false;
    el.resultWrap.innerHTML = `
      <div class="skeleton">
        <div class="sk sk-media"></div>
        <div class="sk-lines">
          <div class="sk sk-line mid"></div>
          <div class="sk sk-line short"></div>
          <div class="sk sk-line"></div>
          <div class="sk-btns"><div class="sk sk-btn"></div><div class="sk sk-btn"></div></div>
        </div>
      </div>`;
  }

  function renderError(err, raw, isApiError) {
    el.resultSection.hidden = false;
    const msg = (err && err.message) || "Terjadi kesalahan.";
    const corsLike = !isApiError && /CORS|fetch|Failed to fetch|network|proxy \d/i.test(msg);

    let tips = "";
    if (isApiError) {
      tips = `
        <ul class="err-tips">
          <li>Coba <b>lagi</b> beberapa saat — server sumber kadang sibuk.</li>
          ${active.id === "tiktok" ? "<li>Coba ganti ke tab <b>TikTok V2</b>.</li>" : ""}
          ${active.id === "tiktokv2" ? "<li>Coba ganti ke tab <b>TikTok</b> (yang utama).</li>" : ""}
          ${active.category === "image" ? "<li>Pakai <b>URL gambar langsung</b> (diakhiri .jpg/.png) yang bisa diakses publik.</li>" : "<li>Pastikan kontennya <b>publik</b> dan link masih aktif.</li>"}
        </ul>`;
    } else if (corsLike) {
      tips = `<p class="err-sub">Sepertinya situs ini belum berjalan di Netlify, jadi permintaan langsung dari browser diblokir (CORS). Deploy ke Netlify agar proxy aktif.</p>`;
    } else {
      tips = `<p class="err-sub">Pastikan link benar &amp; bisa diakses publik, lalu coba lagi.${active.id === "tiktok" ? " Untuk TikTok, coba juga tab <b>TikTok V2</b>." : ""}</p>`;
    }

    el.resultWrap.innerHTML = `
      <div class="error-box">
        <div class="err-ic">${isApiError ? "🛠️" : "😕"}</div>
        <h3>${isApiError ? "Server sumber sedang bermasalah" : "Gagal memproses"}</h3>
        <p class="err-msg">${escapeHtml(msg)}</p>
        ${tips}
        <button class="dl-action primary retry" id="retry-btn">↻ Coba lagi</button>
        ${raw ? `<details class="raw-toggle" style="margin-top:16px;text-align:left"><summary>Lihat respons teknis</summary><pre class="raw-pre">${escapeHtml(JSON.stringify(raw, null, 2))}</pre></details>` : ""}
      </div>`;
    const rb = $("#retry-btn");
    if (rb) rb.addEventListener("click", startDownload);
    toast(isApiError ? "Server sumber error — coba lagi" : "Gagal — coba lagi atau ganti tool", "err");
  }

  /* ===================================================================
     RECENT (localStorage)
     =================================================================== */
  function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } }
  function saveRecent(items) { localStorage.setItem(RECENT_KEY, JSON.stringify(items)); }
  function pushRecent(value, title) {
    let items = loadRecent().filter((it) => !(it.value === value && it.service === active.id));
    items.unshift({ service: active.id, value, title: title || "", ts: Date.now() });
    saveRecent(items.slice(0, MAX_RECENT));
    renderRecent();
  }
  function renderRecent() {
    const items = loadRecent();
    el.recent.hidden = items.length === 0;
    el.recentList.innerHTML = "";
    items.forEach((it) => {
      const tool = TOOLS.find((t) => t.id === it.service) || active;
      const row = document.createElement("div");
      row.className = "recent-item";
      row.innerHTML = `
        <span class="recent-ic" style="background:${tool.badge}">${ICONS[tool.id]}</span>
        <div style="flex:1;min-width:0">
          <div class="recent-platform">${tool.name}</div>
          <div class="recent-val">${escapeHtml(it.title || it.value)}</div>
        </div>
        <span style="color:var(--txt-faint)">↻</span>`;
      row.addEventListener("click", () => {
        selectTool(it.service, true);
        el.input.value = it.value;
        autoDetect();
        startDownload();
      });
      el.recentList.appendChild(row);
    });
  }

  /* ===================================================================
     UI/UX — scroll reveal + nav scrollspy
     =================================================================== */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
  }

  function initScrollSpy() {
    const links = [...document.querySelectorAll(".nav-links a[href^='#']")];
    const sections = links
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const id = "#" + en.target.id;
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
        }
      });
    }, { threshold: 0.4 });
    sections.forEach((s) => io.observe(s));
  }

  /* ===================================================================
     PWA / INSTALL / SHARE
     =================================================================== */
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost") return;
    window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
  }
  function initInstall() {
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; el.btnInstall.hidden = false; });
    el.btnInstall.addEventListener("click", async () => {
      if (!deferredPrompt) { toast("Gunakan menu browser → Add to Home Screen"); return; }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null; el.btnInstall.hidden = true;
    });
    window.addEventListener("appinstalled", () => { el.btnInstall.hidden = true; toast("Sedal terpasang ⚡", "ok"); });
  }
  function firstUrl(s) { const m = s && String(s).match(/https?:\/\/[^\s"']+/i); return m ? m[0] : ""; }
  function handleLaunch() {
    const p = new URLSearchParams(location.search);
    const toolParam = (p.get("tool") || "").toLowerCase();
    if (toolParam && TOOLS.some((t) => t.id === toolParam)) selectTool(toolParam, true);
    const shared = firstUrl(p.get("url")) || firstUrl(p.get("text")) || firstUrl(p.get("u")) || firstUrl(p.get("q"));
    if (shared) {
      el.input.value = shared; autoDetect();
      toast("Link diterima — memproses…", "ok");
      setTimeout(startDownload, 500);
      if (history.replaceState) history.replaceState(null, "", location.pathname);
    }
  }

  /* ===================================================================
     HELPERS
     =================================================================== */
  function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function attr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch {} }
  let toastTimer;
  function toast(msg, kind) {
    el.toast.textContent = msg;
    el.toast.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.toast.className = "toast"), 2400);
  }

  /* ===================================================================
     INIT
     =================================================================== */
  function init() {
    buildTabs();
    selectTool(TOOLS[0].id);
    renderRecent();

    el.input.addEventListener("input", autoDetect);
    el.input.addEventListener("keydown", (e) => { if (e.key === "Enter") startDownload(); });
    el.input.addEventListener("focus", () => el.box.classList.add("focus"));
    el.input.addEventListener("blur", () => el.box.classList.remove("focus"));
    el.download.addEventListener("click", startDownload);
    el.clear.addEventListener("click", () => { el.input.value = ""; autoDetect(); el.input.focus(); });
    el.paste.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) { el.input.value = text.trim(); autoDetect(); toast("Link ditempel", "ok"); }
        else toast("Clipboard kosong", "err");
      } catch { toast("Tidak bisa akses clipboard — tempel manual", "err"); el.input.focus(); }
    });
    el.sample.addEventListener("click", () => { el.input.value = active.sample; autoDetect(); el.input.focus(); });
    el.recentClear.addEventListener("click", () => { saveRecent([]); renderRecent(); toast("Riwayat dibersihkan"); });

    // ---- input-mode toggle ----
    el.modeUrl.addEventListener("click", () => setMode("url"));
    el.modeUpload.addEventListener("click", () => setMode("upload"));

    // ---- upload: browse / drag-drop / paste ----
    el.btnProcess.addEventListener("click", startDownload);
    el.dropArea.addEventListener("click", (e) => { if (!e.target.closest(".preview-remove")) el.fileInput.click(); });
    el.dropArea.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.fileInput.click(); } });
    el.fileInput.addEventListener("change", () => { if (el.fileInput.files[0]) handleFile(el.fileInput.files[0]); });
    el.previewRemove.addEventListener("click", (e) => { e.stopPropagation(); clearUpload(); });

    ["dragenter", "dragover"].forEach((ev) =>
      el.dropArea.addEventListener(ev, (e) => { e.preventDefault(); el.dropArea.classList.add("drag"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      el.dropArea.addEventListener(ev, (e) => { e.preventDefault(); el.dropArea.classList.remove("drag"); })
    );
    el.dropArea.addEventListener("drop", (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
    // paste an image while in upload mode
    window.addEventListener("paste", (e) => {
      if (!(active.category === "image" && inputMode === "upload")) return;
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (item) { const f = item.getAsFile(); if (f) { handleFile(f); toast("Gambar dari clipboard ditempel", "ok"); } }
    });

    initReveal();
    initScrollSpy();
    registerSW();
    initInstall();
    handleLaunch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
