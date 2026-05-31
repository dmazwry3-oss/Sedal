/* =====================================================================
   SEDAL — Media Downloader  ·  app.js
   Friendly downloader UI on top of the api-xemoz endpoints.
   Routes through the Netlify proxy (no CORS), falls back to direct.
   ===================================================================== */
(() => {
  "use strict";

  const API_BASE = "https://api-xemoz-official.my.id/api/donwloader/";
  const PROXY_URL = "/.netlify/functions/proxy";
  const RECENT_KEY = "sedal_recent_v1";
  const MAX_RECENT = 6;

  /* ---------- brand icons (inline SVG) ---------- */
  const ICONS = {
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9V9.6c-1.3 0-2.5-.4-3.5-1v5.7a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v2.8a2.6 2.6 0 1 0 1.8 2.4V3h2.6z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
    spotify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><path d="M7.4 9.8c3-.9 6.4-.5 8.9 1.1M7.9 13c2.4-.7 4.8-.4 6.8 1M8.5 15.9c1.8-.5 3.6-.3 5 .6"/></svg>',
    tiktokv2: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9V9.6c-1.3 0-2.5-.4-3.5-1v5.7a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v2.8a2.6 2.6 0 1 0 1.8 2.4V3h2.6z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  };

  /* ---------- tool registry ---------- */
  const TOOLS = [
    {
      id: "tiktok", name: "TikTok", endpoint: "tiktok.php", param: "url",
      accent: "#fe2c55", badge: "linear-gradient(135deg,#25f4ee,#fe2c55)",
      placeholder: "https://www.tiktok.com/@user/video/...",
      sample: "https://www.tiktok.com/@tiktok/video/7106594312292453675",
      detect: /tiktok\.com|douyin|vt\.tiktok|vm\.tiktok/i,
      tip: "Video TikTok tanpa watermark + audionya.",
    },
    {
      id: "instagram", name: "Instagram", endpoint: "instagram.php", param: "q",
      accent: "#e1306c", badge: "linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)",
      placeholder: "https://www.instagram.com/p/...",
      sample: "https://www.instagram.com/reel/C5qWNkWreXf/",
      detect: /instagram\.com|instagr\.am/i,
      tip: "Foto, Reels, dan carousel Instagram.",
    },
    {
      id: "spotify", name: "Spotify", endpoint: "spotify-dl.php", param: "q",
      accent: "#1db954", badge: "#1db954",
      placeholder: "https://open.spotify.com/track/...",
      sample: "https://open.spotify.com/track/3rXS2AEXNADrIFyuY3F6RJ",
      detect: /open\.spotify\.com|spotify\.link/i,
      tip: "Unduh lagu Spotify beserta sampul albumnya.",
    },
    {
      id: "twitter", name: "Twitter / X", endpoint: "twitter.php", param: "q",
      accent: "#1d9bf0", badge: "#1d9bf0",
      placeholder: "https://x.com/user/status/...",
      sample: "https://x.com/Twitter/status/1445078208190291973",
      detect: /twitter\.com|x\.com|t\.co/i,
      tip: "Video & gambar dari Tweet / status X.",
    },
    {
      id: "tiktokv2", name: "TikTok V2", endpoint: "tiktokv2.php", param: "url",
      accent: "#00c2cc", badge: "linear-gradient(135deg,#fe2c55,#25f4ee)",
      placeholder: "https://www.tiktok.com/@user/video/...",
      sample: "https://www.tiktok.com/@tiktok/video/7106594312292453675",
      detect: null, // manual fallback only
      tip: "Cadangan untuk TikTok bila yang utama gagal.",
    },
  ];

  const $ = (s) => document.querySelector(s);
  const el = {
    tabs: $("#tabs"),
    input: $("#link-input"), inputIcon: $("#dl-input-icon"),
    paste: $("#btn-paste"), clear: $("#btn-clear"),
    download: $("#btn-download"), box: $("#dl-box"),
    detectHint: $("#detect-hint"), sample: $("#btn-sample"),
    progress: $("#progress"),
    resultSection: $("#result-section"), resultWrap: $("#result-wrap"),
    recent: $("#recent"), recentList: $("#recent-list"), recentClear: $("#recent-clear"),
    toast: $("#toast"),
    btnInstall: $("#btn-install"),
  };

  let active = TOOLS[0];
  let busy = false;
  let deferredPrompt = null;

  /* ===================================================================
     TABS
     =================================================================== */
  function buildTabs() {
    el.tabs.innerHTML = "";
    TOOLS.forEach((t) => {
      const b = document.createElement("button");
      b.className = "tab";
      b.dataset.id = t.id;
      b.style.setProperty("--tab", t.accent);
      b.setAttribute("role", "tab");
      b.innerHTML = `<span class="tab-ic" style="background:${t.badge}">${ICONS[t.id]}</span><span>${t.name}</span>`;
      b.addEventListener("click", () => selectTool(t.id));
      el.tabs.appendChild(b);
    });
  }

  function selectTool(id, keepHint) {
    active = TOOLS.find((t) => t.id === id) || TOOLS[0];
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.id === active.id));
    document.documentElement.style.setProperty("--accent", active.accent);
    el.input.placeholder = active.placeholder;
    if (!keepHint) setHint(active.tip);
  }

  /* ===================================================================
     AUTO-DETECT
     =================================================================== */
  function autoDetect() {
    const v = el.input.value.trim();
    el.clear.hidden = !v;
    if (!v) { setHint(active.tip); return; }
    const match = TOOLS.find((t) => t.detect && t.detect.test(v));
    if (match) {
      if (match.id !== active.id) selectTool(match.id, true);
      setHint(`✓ Terdeteksi: ${match.name}`, "ok");
    } else if (/^https?:\/\//i.test(v)) {
      setHint("Link tidak dikenali — pilih platform manual di atas.", "warn");
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
  function directUrl(value) {
    return `${API_BASE}${active.endpoint}?${active.param}=${encodeURIComponent(value)}`;
  }
  function proxyUrl(value) {
    return `${PROXY_URL}?service=${active.id}&value=${encodeURIComponent(value)}`;
  }

  async function callProxy(value) {
    const res = await fetch(proxyUrl(value), { headers: { Accept: "application/json" } });
    const wrapped = await res.json();
    if (!res.ok || wrapped.ok === false) {
      throw new Error(wrapped.message || wrapped.error || `proxy ${res.status}`);
    }
    return wrapped.data;
  }
  async function callDirect(value) {
    const res = await fetch(directUrl(value), { headers: { Accept: "application/json, text/plain, */*" } });
    const raw = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try { return JSON.parse(raw); } catch { return raw; }
  }

  /* ===================================================================
     DOWNLOAD FLOW
     =================================================================== */
  async function startDownload() {
    const val = el.input.value.trim();
    if (!val) { toast("Tempel link dulu ya 🙂", "err"); el.input.focus(); return; }
    if (!/^https?:\/\//i.test(val)) { toast("Link harus diawali http:// atau https://", "err"); return; }
    if (busy) return;
    busy = true;

    setLoading(true);
    showSkeleton();
    haptic(10);

    let data = null, err = null;
    try {
      data = await callProxy(val);              // try Netlify proxy first
    } catch (e1) {
      try { data = await callDirect(val); }     // fall back to direct browser call
      catch (e2) { err = e2.message?.includes("HTTP") || /CORS|fetch|network/i.test(e2.message) ? e2 : e1; }
    }

    // 1) transport failed entirely
    if (data == null) {
      renderError(err || new Error("Tidak ada respons dari server."));
      haptic([50, 30, 50]);
    } else {
      // 2) the API itself reported a failure (even if HTTP 200)
      const apiMsg = apiErrorMessage(data);
      if (apiMsg && !hasMedia(data)) {
        renderError(new Error(apiMsg), data, true);
        haptic([50, 30, 50]);
      } else {
        // 3) success → render media
        const ok = renderResult(data, val);
        if (ok) { pushRecent(val, lastTitle); haptic([15, 40, 15]); }
      }
    }

    setLoading(false);
    busy = false;
    el.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* Detect an error envelope returned by the upstream API.
     Handles shapes like:
       { status:false, message:"..." }
       { success:false, error:"..." }
       { result:{ success:false, message:"Internal Server Error",
                  error:"Request failed with status code 404" } }
     Returns a human message string, or "" if it looks fine. */
  function apiErrorMessage(data) {
    if (typeof data !== "object" || data === null) return "";
    const nodes = [data, data.result, data.data].filter((n) => n && typeof n === "object");
    let failed = false;
    let detail = "";
    for (const n of nodes) {
      if (n.success === false || n.status === false || n.ok === false || n.error) failed = true;
      const msg = n.error || n.message || n.msg;
      if (msg && typeof msg === "string" && !detail) detail = msg;
    }
    if (!failed) return "";
    // map common upstream errors to friendlier wording
    if (/404|not found/i.test(detail)) return "Konten tidak ditemukan (404) — link mungkin salah, sudah dihapus, atau privat.";
    if (/internal server error|500/i.test(detail)) return "Server sumber sedang bermasalah (Internal Server Error). Coba lagi sebentar lagi.";
    if (/timeout|timed out|504/i.test(detail)) return "Server sumber lama merespons (timeout). Coba lagi.";
    if (/rate|too many|429/i.test(detail)) return "Terlalu banyak permintaan ke server (rate limit). Tunggu sebentar lalu coba lagi.";
    return detail || "Server sumber menolak permintaan ini.";
  }

  function setLoading(on) {
    el.download.disabled = on;
    el.download.classList.toggle("loading", on);
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
    video: /(video|nowatermark|nowm|hdplay|play|hd|sd|reel|mp4)/i,
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

  /* ===================================================================
     RENDER RESULT
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

    // media column
    let mediaCol = "";
    if (videos.length) {
      mediaCol = `<video src="${attr(videos[0].url)}" controls playsinline preload="metadata" ${thumb ? `poster="${attr(thumb.url)}"` : ""}></video>`;
    } else if (audios.length && !images.length) {
      mediaCol = `<div class="audio-art">🎵</div>`;
    } else if (thumb) {
      mediaCol = `<img class="thumb" src="${attr(thumb.url)}" alt="thumbnail" loading="lazy" onerror="this.style.display='none'">`;
    }

    // actions
    const actions = [];
    videos.forEach((m, i) => actions.push(action(m.url, `⬇ Video${videos.length > 1 ? " " + (i + 1) : ""}`, i === 0 ? "primary" : "")));
    audios.forEach((m, i) => actions.push(action(m.url, `🎵 Audio${audios.length > 1 ? " " + (i + 1) : ""}`, "audio")));
    if (images.length === 1) actions.push(action(images[0].url, "⬇ Gambar", videos.length ? "" : "primary"));
    links.slice(0, 4).forEach((m) => actions.push(action(m.url, `↗ ${shortLabel(m.key)}`, "")));
    if (out.media.length > 1) actions.push(`<button class="dl-action" data-all='${attr(JSON.stringify(out.media.map((m) => m.url)))}'>⬇ Unduh semua (${out.media.length})</button>`);

    const gallery = images.length > 1
      ? `<div class="gallery">${images.map((m) => `<a href="${attr(m.url)}" target="_blank" rel="noopener" download><img src="${attr(m.url)}" loading="lazy" alt="" onerror="this.parentElement.style.display='none'"></a>`).join("")}</div>`
      : "";

    const wideClass = (active.id === "twitter") ? " wide" : "";

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
          <details class="raw-toggle">
            <summary>Lihat detail teknis (JSON)</summary>
            <pre class="raw-pre">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
          </details>
        </div>
      </div>`;
    el.resultSection.hidden = false;

    const dlAll = el.resultWrap.querySelector("[data-all]");
    if (dlAll) dlAll.addEventListener("click", () => downloadAll(JSON.parse(dlAll.dataset.all)));

    toast("Berhasil! Tinggal pilih unduhanmu ⬇", "ok");
    return true;
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
      // upstream API responded but with an error — not our fault, not the user's link format
      tips = `
        <ul class="err-tips">
          <li>Coba <b>lagi</b> beberapa saat — server sumber kadang sibuk.</li>
          ${active.id === "tiktok" ? "<li>Coba ganti ke tab <b>TikTok V2</b>.</li>" : ""}
          ${active.id === "tiktokv2" ? "<li>Coba ganti ke tab <b>TikTok</b> (yang utama).</li>" : ""}
          <li>Pastikan kontennya <b>publik</b> (bukan akun privat) dan link masih aktif.</li>
          <li>Gunakan link <b>asli/lengkap</b>, bukan contoh placeholder.</li>
        </ul>`;
    } else if (corsLike) {
      tips = `<p class="err-sub">Sepertinya situs ini belum berjalan di Netlify, jadi permintaan langsung dari browser diblokir (CORS). Deploy ke Netlify agar proxy aktif.</p>`;
    } else {
      tips = `<p class="err-sub">Pastikan link benar &amp; kontennya publik, lalu coba lagi.${active.id === "tiktok" ? " Untuk TikTok, coba juga tab <b>TikTok V2</b>." : ""}</p>`;
    }

    el.resultWrap.innerHTML = `
      <div class="error-box">
        <div class="err-ic">${isApiError ? "🛠️" : "😕"}</div>
        <h3>${isApiError ? "Server sumber sedang bermasalah" : "Gagal mengambil media"}</h3>
        <p class="err-msg">${escapeHtml(msg)}</p>
        ${tips}
        <button class="dl-action primary retry" id="retry-btn">↻ Coba lagi</button>
        ${raw ? `<details class="raw-toggle" style="margin-top:16px;text-align:left"><summary>Lihat respons teknis</summary><pre class="raw-pre">${escapeHtml(JSON.stringify(raw, null, 2))}</pre></details>` : ""}
      </div>`;
    const rb = $("#retry-btn");
    if (rb) rb.addEventListener("click", startDownload);
    toast(isApiError ? "Server sumber error — coba lagi" : "Gagal — coba lagi atau ganti platform", "err");
  }

  /* ===================================================================
     RECENT (localStorage)
     =================================================================== */
  function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } }
  function saveRecent(items) { localStorage.setItem(RECENT_KEY, JSON.stringify(items)); }
  function pushRecent(value, title) {
    let items = loadRecent().filter((it) => it.value !== value);
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
     PWA / INSTALL / SHARE
     =================================================================== */
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
  function initInstall() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault(); deferredPrompt = e; el.btnInstall.hidden = false;
    });
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

    registerSW();
    initInstall();
    handleLaunch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
