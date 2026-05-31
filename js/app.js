/* =====================================================================
   XEMOZ // MEDIA INJECTION CONSOLE  —  app.js  v2
   - AUTO / PROXY / DIRECT routing (Netlify function fallback)
   - smart link auto-detection
   - localStorage history
   - rich media rendering (gallery, previews, per-asset copy, download all)
   - keyboard shortcuts
   ===================================================================== */
(() => {
  "use strict";

  const API_BASE = "https://api-xemoz-official.my.id/api/donwloader/";
  const PROXY_URL = "/.netlify/functions/proxy";
  const HISTORY_KEY = "xemoz_history_v1";
  const ROUTE_KEY = "xemoz_route_v1";
  const MAX_HISTORY = 12;

  /* ---------- Tool registry ---------- */
  const TOOLS = [
    {
      id: "instagram", name: "INSTAGRAM", tag: "REELS · POST", glyph: "📸",
      accent: "#ff2bd6", endpoint: "instagram.php", param: "q",
      placeholder: "https://www.instagram.com/p/XYZ/",
      sample: "https://www.instagram.com/p/XYZ/",
      detect: /instagram\.com|instagr\.am/i,
      desc: "Pull photos, reels and carousel media from a public Instagram link.",
    },
    {
      id: "spotify", name: "SPOTIFY", tag: "TRACK · DL", glyph: "🎵",
      accent: "#2bff88", endpoint: "spotify-dl.php", param: "q",
      placeholder: "https://open.spotify.com/track/3rXS2AEXNADrIFyuY3F6RJ",
      sample: "https://open.spotify.com/track/3rXS2AEXNADrIFyuY3F6RJ",
      detect: /open\.spotify\.com|spotify\.link/i,
      desc: "Resolve a Spotify track link to downloadable audio + cover art.",
    },
    {
      id: "tiktok", name: "TIKTOK", tag: "NO WATERMARK", glyph: "🎬",
      accent: "#00f0ff", endpoint: "tiktok.php", param: "url",
      placeholder: "https://www.tiktok.com/@user/video/123",
      sample: "https://www.tiktok.com/Xlakak/XYZ/",
      detect: /tiktok\.com|douyin/i,
      desc: "Grab a TikTok video without watermark, plus its audio track.",
    },
    {
      id: "tiktokv2", name: "TIKTOK V2", tag: "FALLBACK", glyph: "⚡",
      accent: "#ffb454", endpoint: "tiktokv2.php", param: "url",
      placeholder: "https://www.tiktok.com/@user/video/123",
      sample: "https://www.tiktok.com/@tiktok/video/7000000000000000000",
      detect: null, // manual fallback — never auto-selected
      desc: "Alternate TikTok resolver — use when the primary endpoint stalls.",
    },
    {
      id: "twitter", name: "TWITTER / X", tag: "STATUS · MP4", glyph: "🐦",
      accent: "#1d9bf0", endpoint: "twitter.php", param: "q",
      placeholder: "https://x.com/user/status/123",
      sample: "https://x.com/user/status/123",
      detect: /twitter\.com|x\.com|t\.co/i,
      desc: "Download video & images attached to a Tweet / X status.",
    },
  ];

  /* ---------- DOM refs ---------- */
  const $ = (s) => document.querySelector(s);
  const el = {
    rail: $("#tool-rail"),
    glyph: $("#active-glyph"), name: $("#active-name"), desc: $("#active-desc"),
    paramHint: $("#param-hint"), detectBadge: $("#detect-badge"),
    input: $("#target-input"), clear: $("#btn-clear"), paste: $("#btn-paste"),
    quickRow: $("#quick-row"), inject: $("#btn-inject"),
    targetUrl: $("#target-url"), payload: $("#payload-sample"),
    paramsKey: $("#params-key"), paramsVal: $("#params-val"),
    results: $("#results"), respJson: $("#response-json"),
    respStatus: $("#resp-status"), respTime: $("#resp-time"), routeUsed: $("#route-used"),
    jsonToggle: $("#json-toggle"),
    log: $("#log"), toast: $("#toast"), clock: $("#clock"),
    netState: $("#net-state"), netPill: $(".pill-live"),
    progress: $("#progress"),
    routeSeg: $("#route-seg"),
    historyList: $("#history-list"), historyCount: $("#history-count"), historyClear: $("#history-clear"),
    help: $("#help"), btnHelp: $("#btn-help"), helpClose: $("#help-close"),
  };

  let active = TOOLS[0];
  let route = localStorage.getItem(ROUTE_KEY) || "auto";
  let busy = false;

  /* ===================================================================
     TOOL RAIL
     =================================================================== */
  function buildRail() {
    el.rail.innerHTML = "";
    TOOLS.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "tool-btn";
      b.style.setProperty("--accent", t.accent);
      b.dataset.id = t.id;
      b.innerHTML = `
        <span class="t-key">${i + 1}</span>
        <span class="t-glyph">${t.glyph}</span>
        <span class="t-name">${t.name}</span>
        <span class="t-tag">${t.tag}</span>`;
      b.addEventListener("click", () => selectTool(t.id));
      el.rail.appendChild(b);
    });
  }

  function selectTool(id, keepInput) {
    active = TOOLS.find((t) => t.id === id) || TOOLS[0];
    document.querySelectorAll(".tool-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.id === active.id)
    );
    el.glyph.textContent = active.glyph;
    el.name.textContent = active.name;
    el.desc.textContent = active.desc;
    el.paramHint.textContent = `[ ${active.param} ]`;
    el.input.placeholder = active.placeholder;
    document.documentElement.style.setProperty("--accent", active.accent);

    // quick sample chip
    el.quickRow.innerHTML = "";
    const chip = document.createElement("button");
    chip.className = "quick-chip";
    chip.textContent = "⌖ load sample";
    chip.addEventListener("click", () => {
      el.input.value = active.sample;
      refreshMeta();
      el.input.focus();
    });
    el.quickRow.appendChild(chip);

    if (!keepInput) refreshMeta();
    log(`endpoint → ${active.endpoint}`);
  }

  /* ===================================================================
     AUTO-DETECT service from input
     =================================================================== */
  function autoDetect() {
    const v = el.input.value.trim();
    if (!v) { hideDetect(); return; }
    const match = TOOLS.find((t) => t.detect && t.detect.test(v));
    if (match && match.id !== active.id) {
      selectTool(match.id, true);
      showDetect(`⟶ ${match.name} detected`, false);
    } else if (match) {
      showDetect(`✓ ${match.name}`, false);
    } else if (/^https?:\/\//i.test(v)) {
      showDetect("⚠ unknown link · pick a tool", true);
    } else {
      hideDetect();
    }
  }
  function showDetect(text, warn) {
    el.detectBadge.hidden = false;
    el.detectBadge.textContent = text;
    el.detectBadge.classList.toggle("warn", !!warn);
  }
  function hideDetect() { el.detectBadge.hidden = true; }

  /* ===================================================================
     META (TARGET_URL / PAYLOAD / PARAMS)
     =================================================================== */
  function directUrl(value) {
    return `${API_BASE}${active.endpoint}?${active.param}=${encodeURIComponent(value || "")}`;
  }
  function proxyUrl(value) {
    return `${PROXY_URL}?service=${active.id}&value=${encodeURIComponent(value || "")}`;
  }

  function refreshMeta() {
    const val = el.input.value.trim();
    el.targetUrl.textContent = val ? directUrl(val) : `${API_BASE}${active.endpoint}?${active.param}=…`;
    const payloadObj = {};
    payloadObj[active.param] = val || active.placeholder;
    el.payload.textContent = JSON.stringify(payloadObj, null, 4);
    el.paramsKey.textContent = `.${active.param}`;
    el.paramsVal.textContent = val || "—";
    autoDetect();
  }

  /* ===================================================================
     ROUTING
     =================================================================== */
  function setRoute(r) {
    route = r;
    localStorage.setItem(ROUTE_KEY, r);
    document.querySelectorAll(".seg-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.route === r)
    );
    log(`route mode → ${r.toUpperCase()}`);
  }

  // Try one route; returns { data, via } or throws.
  async function callRoute(via, value) {
    if (via === "proxy") {
      const res = await fetch(proxyUrl(value), { headers: { Accept: "application/json" } });
      const wrapped = await res.json(); // proxy always returns JSON
      if (!res.ok || wrapped.ok === false) {
        const msg = wrapped.message || wrapped.error || `proxy HTTP ${res.status}`;
        const e = new Error(msg);
        e.proxyPayload = wrapped;
        throw e;
      }
      // unwrap to the upstream payload
      return { data: wrapped.data, via: "PROXY", upstreamStatus: wrapped.upstreamStatus, ms: wrapped.elapsedMs };
    }
    // direct
    const started = performance.now();
    const res = await fetch(directUrl(value), { headers: { Accept: "application/json, text/plain, */*" } });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = raw; }
    if (!res.ok) {
      const e = new Error(`HTTP ${res.status}`);
      e.httpStatus = res.status;
      e.data = data;
      throw e;
    }
    return { data, via: "DIRECT", upstreamStatus: res.status, ms: Math.round(performance.now() - started) };
  }

  /* ===================================================================
     EXECUTE INJECTION
     =================================================================== */
  async function inject() {
    const val = el.input.value.trim();
    if (!val) { toast("⚠ input target required", "err"); el.input.focus(); return; }
    if (busy) return;
    busy = true;

    setLoading(true);
    setStatus("run", "RUNNING");
    el.respTime.hidden = true;
    el.routeUsed.textContent = route.toUpperCase();
    el.results.hidden = true;
    el.results.innerHTML = "";
    el.respJson.innerHTML = `<span class="awaiting">// transmitting request…</span>`;
    log(`>> ${active.endpoint} :: ${truncate(val, 56)} [${route}]`);

    const t0 = performance.now();
    let result = null, lastErr = null;

    // build the ordered list of routes to attempt
    const attempts = route === "auto" ? ["proxy", "direct"] : [route];

    for (const via of attempts) {
      try {
        result = await callRoute(via, val);
        break;
      } catch (err) {
        lastErr = err;
        log(`-- ${via} failed: ${err.message}`, "warn");
        if (route === "auto" && via === "proxy") {
          log(`-- falling back to DIRECT…`, "warn");
          continue;
        }
      }
    }

    const totalMs = Math.round(performance.now() - t0);

    if (result) {
      const ms = result.ms != null ? result.ms : totalMs;
      setStatus("ok", `${result.upstreamStatus || 200} OK`);
      el.respTime.hidden = false;
      el.respTime.textContent = `${ms}ms`;
      el.routeUsed.textContent = result.via;
      log(`<< ${result.via} 200 (${ms}ms)`, "ok");
      renderJson(result.data);
      renderResults(result.data);
      pushHistory(val, "ok");
      toast("✓ injection complete", "ok");
    } else {
      setStatus("err", "FAILED");
      el.routeUsed.textContent = "—";
      renderError(lastErr);
      pushHistory(val, "err");
      toast("✕ injection failed", "err");
    }

    setLoading(false);
    busy = false;
  }

  function renderError(err) {
    const isCors = err instanceof TypeError || /fetch|network|cors|failed/i.test(err.message || "");
    let body =
      `<span class="tok-null">// INJECTION FAILED</span>\n` +
      `<span class="tok-bool">error:</span> ${escapeHtml(err.message || "unknown")}\n`;
    if (err.proxyPayload) {
      body += `\n<span class="tok-null">// proxy response</span>\n` + highlight(JSON.stringify(err.proxyPayload, null, 2));
    } else if (isCors && route === "direct") {
      body +=
        `\n<span class="tok-str">// The browser blocked the request (CORS) or the host is\n` +
        `// unreachable. Switch the route to PROXY / AUTO (needs a Netlify\n` +
        `// deploy) or open the TARGET_URL directly in a new tab.</span>`;
    }
    el.respJson.innerHTML = body;
  }

  function setLoading(on) {
    el.inject.disabled = on;
    el.inject.classList.toggle("is-loading", on);
    el.inject.querySelector(".btn-inject-label").textContent = on ? "⏳ INJECTING…" : "⏻ EXECUTE INJECTION";
    el.progress.classList.toggle("active", on);
  }
  function setStatus(kind, text) {
    el.respStatus.className = "status-chip " + kind;
    el.respStatus.textContent = text;
  }

  /* ===================================================================
     JSON RENDER
     =================================================================== */
  function renderJson(data) {
    if (typeof data === "string") {
      el.respJson.textContent = data || "// empty response";
      return;
    }
    el.respJson.innerHTML = highlight(JSON.stringify(data, null, 2));
  }
  function highlight(json) {
    return escapeHtml(json).replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "tok-num";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) { cls = "tok-key"; }
          else {
            const inner = match.replace(/^"|"$/g, "");
            if (/^https?:\/\//.test(inner)) {
              return `"<a class="tok-url" href="${inner}" target="_blank" rel="noopener">${inner}</a>"`;
            }
            cls = "tok-str";
          }
        } else if (/true|false/.test(match)) cls = "tok-bool";
        else if (/null/.test(match)) cls = "tok-null";
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  /* ===================================================================
     SMART RESULTS
     =================================================================== */
  const RX = {
    video: /\.(mp4|mov|webm|m3u8)(\?|$)/i,
    audio: /\.(mp3|m4a|aac|ogg|wav|opus)(\?|$)/i,
    image: /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i,
    url: /^https?:\/\//i,
  };
  const HINT = {
    video: /(video|nowatermark|nowm|play|hd|sd|reel|mp4|hdplay)/i,
    audio: /(audio|music|sound|song|mp3|track|preview)/i,
    image: /(thumb|image|cover|photo|pic|display|poster|avatar|art)/i,
    title: /(title|caption|desc|name|track|fulltitle|text)/i,
    author: /(author|artist|owner|username|user|channel|nickname)/i,
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
      const v = obj[k];
      const lk = k.toLowerCase();
      if (typeof v === "string" && !RX.url.test(v)) {
        if (HINT.title.test(lk) && !out.title && v.length < 240) out.title = v;
        else if (HINT.author.test(lk) && !out.author) out.author = v;
        else if (HINT.duration.test(lk) && !out.duration) out.duration = v;
      }
      deepScan(v, out, k);
    });
  }

  function renderResults(data) {
    if (typeof data !== "object" || data === null) { el.results.hidden = true; return; }
    const out = { media: [], title: "", author: "", duration: "" };
    deepScan(data, out);

    const seen = new Set();
    out.media = out.media.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));

    el.results.innerHTML = "";
    el.results.hidden = false;

    if (out.media.length === 0) {
      el.results.innerHTML = `<div class="result-card"><div class="result-empty">⚠ No direct media URLs detected. Inspect RAW_OUTPUT below.</div></div>`;
      return;
    }

    const videos = out.media.filter((m) => m.type === "video");
    const audios = out.media.filter((m) => m.type === "audio");
    const images = out.media.filter((m) => m.type === "image");
    const links = out.media.filter((m) => m.type === "link");
    const thumb = images[0];

    const card = document.createElement("div");
    card.className = "result-card";

    let mediaCol = "";
    if (videos.length) {
      mediaCol = `<video class="result-media" src="${attr(videos[0].url)}" controls playsinline ${thumb ? `poster="${attr(thumb.url)}"` : ""}></video>`;
    } else if (thumb) {
      mediaCol = `<img class="result-thumb" src="${attr(thumb.url)}" alt="thumbnail" loading="lazy" onerror="this.style.display='none'" />`;
    } else if (audios.length) {
      mediaCol = `<div class="result-thumb audio">🎵</div>`;
    }

    const actions = [];
    videos.forEach((m, i) => actions.push(dlGroup(m.url, `⬇ VIDEO${videos.length > 1 ? " " + (i + 1) : ""}`, "")));
    audios.forEach((m, i) => actions.push(dlGroup(m.url, `⬇ AUDIO${audios.length > 1 ? " " + (i + 1) : ""}`, "audio")));
    if (images.length === 1) actions.push(dlGroup(images[0].url, "⬇ IMAGE", "alt"));
    links.slice(0, 6).forEach((m) => actions.push(dlGroup(m.url, `⬇ ${shortLabel(m.key)}`, "alt")));
    if (out.media.length > 1) {
      actions.push(`<button class="dl-btn ghost" data-dl-all='${attr(JSON.stringify(out.media.map((m) => m.url)))}'>⬇ ALL (${out.media.length})</button>`);
    }

    const gallery = images.length > 1
      ? `<div class="gallery">${images.map((m) => `<a href="${attr(m.url)}" target="_blank" rel="noopener" download title="download"><img src="${attr(m.url)}" loading="lazy" alt="" onerror="this.parentElement.style.display='none'"></a>`).join("")}</div>`
      : "";

    card.innerHTML = `
      ${mediaCol}
      <div class="result-info">
        <div class="result-title">${escapeHtml(out.title || active.name + " media")}</div>
        ${out.author ? `<div class="result-meta">👤 <b>${escapeHtml(out.author)}</b></div>` : ""}
        ${out.duration ? `<div class="result-meta">⏱ <b>${escapeHtml(String(out.duration))}</b></div>` : ""}
        <div class="result-meta">📦 <b>${out.media.length}</b> asset(s) · ${videos.length}v / ${audios.length}a / ${images.length}img / ${links.length}link</div>
        ${audios.length ? `<audio class="result-media" src="${attr(audios[0].url)}" controls style="max-height:54px"></audio>` : ""}
        <div class="result-actions">${actions.join("")}</div>
        ${gallery}
      </div>`;
    el.results.appendChild(card);

    // wire per-asset copy + download-all
    card.querySelectorAll(".copy-link").forEach((b) =>
      b.addEventListener("click", () => copyText(b.dataset.url, b, "⧉ link copied"))
    );
    const dlAll = card.querySelector("[data-dl-all]");
    if (dlAll) dlAll.addEventListener("click", () => downloadAll(JSON.parse(dlAll.dataset.dlAll)));

    log(`rendered ${out.media.length} asset(s)`, "ok");
  }

  function dlGroup(url, label, variant) {
    const cls = variant ? `dl-btn ${variant}` : "dl-btn";
    return `<span class="btn-group">
      <a class="${cls}" href="${attr(url)}" target="_blank" rel="noopener" download>${label}</a>
      <button class="dl-btn ghost copy-link" data-url="${attr(url)}" title="Copy link">⧉</button>
    </span>`;
  }
  function downloadAll(urls) {
    urls.forEach((u, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = u; a.target = "_blank"; a.rel = "noopener"; a.download = "";
        document.body.appendChild(a); a.click(); a.remove();
      }, i * 350);
    });
    toast(`⬇ opening ${urls.length} asset(s)`, "ok");
  }
  function shortLabel(key) { return key ? key.replace(/[_-]/g, " ").toUpperCase().slice(0, 16) : "LINK"; }

  /* ===================================================================
     HISTORY (localStorage)
     =================================================================== */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
  }
  function saveHistory(items) { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); }
  function pushHistory(value, status) {
    let items = loadHistory();
    items = items.filter((it) => !(it.value === value && it.service === active.id));
    items.unshift({ service: active.id, glyph: active.glyph, value, status, ts: Date.now() });
    items = items.slice(0, MAX_HISTORY);
    saveHistory(items);
    renderHistory();
  }
  function renderHistory() {
    const items = loadHistory();
    el.historyCount.textContent = items.length;
    if (!items.length) {
      el.historyList.innerHTML = `<div class="history-empty">// no requests yet — your injections will be logged here.</div>`;
      return;
    }
    el.historyList.innerHTML = "";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "history-item";
      const tool = TOOLS.find((t) => t.id === it.service);
      row.innerHTML = `
        <span class="history-glyph">${it.glyph || (tool && tool.glyph) || "★"}</span>
        <div class="history-meta">
          <div class="history-svc">${(tool && tool.name) || it.service}</div>
          <div class="history-val" title="${attr(it.value)}">${escapeHtml(it.value)}</div>
        </div>
        <span class="history-status ${it.status}">${it.status === "ok" ? "200" : "ERR"}</span>`;
      row.addEventListener("click", () => {
        selectTool(it.service, true);
        el.input.value = it.value;
        refreshMeta();
        el.input.focus();
        toast("↺ loaded from history");
      });
      el.historyList.appendChild(row);
    });
  }

  /* ===================================================================
     COPY
     =================================================================== */
  function bindCopy() {
    document.querySelectorAll(".copy[data-copy-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = $(btn.dataset.copyTarget);
        if (target) copyText(target.textContent, btn);
      });
    });
  }
  async function copyText(text, btn, msg) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    if (btn) {
      const original = btn.textContent;
      btn.classList.add("copied");
      if (!btn.classList.contains("copy-link")) btn.textContent = "COPIED ✓";
      setTimeout(() => { btn.classList.remove("copied"); if (!btn.classList.contains("copy-link")) btn.textContent = original; }, 1300);
    }
    toast(msg || "⧉ copied to clipboard", "ok");
  }

  /* ===================================================================
     HELPERS
     =================================================================== */
  function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function attr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function truncate(s, n) { return s.length > n ? s.slice(0, n) + "…" : s; }
  function log(msg, kind = "") {
    const line = document.createElement("span");
    line.className = "log-line" + (kind ? " " + kind : "");
    line.innerHTML = `<span class="t">[${new Date().toLocaleTimeString("en-GB")}]</span> ${escapeHtml(msg)}`;
    el.log.appendChild(line);
    el.log.scrollTop = el.log.scrollHeight;
    while (el.log.children.length > 60) el.log.removeChild(el.log.firstChild);
  }
  let toastTimer;
  function toast(msg, kind = "") {
    el.toast.textContent = msg;
    el.toast.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.toast.className = "toast"), 2200);
  }

  function tickClock() { el.clock.textContent = new Date().toLocaleTimeString("en-GB"); }

  async function probeNet() {
    el.netPill.classList.add("is-probe"); el.netState.textContent = "PROBE";
    try {
      await fetch(API_BASE, { mode: "no-cors", cache: "no-store" });
      el.netState.textContent = "ONLINE"; el.netPill.classList.remove("is-down", "is-probe");
    } catch {
      el.netPill.classList.remove("is-probe");
      if (!navigator.onLine) { el.netState.textContent = "OFFLINE"; el.netPill.classList.add("is-down"); }
      else { el.netState.textContent = "ONLINE"; }
    }
  }

  /* ---------- matrix rain ---------- */
  function initMatrix() {
    const canvas = $("#matrix");
    const ctx = canvas.getContext("2d");
    const chars = "01アカサタナハマ<>{}[]#/$%&*".split("");
    let drops, fontSize = 14;
    function resize() {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      drops = Array(Math.floor(canvas.width / fontSize)).fill(1);
    }
    resize();
    window.addEventListener("resize", resize);
    function draw() {
      ctx.fillStyle = "rgba(5,7,13,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#00f0ff";
      ctx.font = fontSize + "px monospace";
      for (let i = 0; i < drops.length; i++) {
        ctx.fillText(chars[(Math.random() * chars.length) | 0], i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setInterval(draw, 60);
  }

  /* ---------- help modal ---------- */
  function toggleHelp(show) {
    el.help.hidden = show === undefined ? !el.help.hidden : !show;
  }

  /* ---------- keyboard ---------- */
  function bindKeys() {
    document.addEventListener("keydown", (e) => {
      // focus input
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); el.input.focus(); el.input.select(); return; }
      if (e.key === "Escape") {
        if (!el.help.hidden) { toggleHelp(false); return; }
        if (document.activeElement === el.input && el.input.value) { el.input.value = ""; refreshMeta(); return; }
      }
      // number keys to switch tools (when not typing)
      if (document.activeElement !== el.input && /^[1-5]$/.test(e.key)) {
        selectTool(TOOLS[+e.key - 1].id);
        el.input.focus();
      }
    });
  }

  /* ===================================================================
     INIT
     =================================================================== */
  function init() {
    buildRail();
    bindCopy();
    bindKeys();
    setRoute(route);
    selectTool(TOOLS[0].id);
    renderHistory();

    el.input.addEventListener("input", refreshMeta);
    el.input.addEventListener("keydown", (e) => { if (e.key === "Enter") inject(); });
    el.clear.addEventListener("click", () => { el.input.value = ""; refreshMeta(); el.input.focus(); });
    el.paste.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) { el.input.value = text.trim(); refreshMeta(); toast("⧉ pasted"); }
        else toast("clipboard empty", "err");
      } catch { toast("clipboard blocked — paste manually", "err"); el.input.focus(); }
    });
    el.inject.addEventListener("click", inject);
    el.jsonToggle.addEventListener("click", () => {
      const hidden = el.respJson.style.display === "none";
      el.respJson.style.display = hidden ? "" : "none";
      el.jsonToggle.textContent = hidden ? "HIDE" : "SHOW";
    });
    el.routeSeg.querySelectorAll(".seg-btn").forEach((b) =>
      b.addEventListener("click", () => setRoute(b.dataset.route))
    );
    el.historyClear.addEventListener("click", () => {
      saveHistory([]); renderHistory(); toast("history cleared");
    });
    el.btnHelp.addEventListener("click", () => toggleHelp());
    el.helpClose.addEventListener("click", () => toggleHelp(false));
    el.help.addEventListener("click", (e) => { if (e.target === el.help) toggleHelp(false); });

    tickClock(); setInterval(tickClock, 1000);
    probeNet();
    window.addEventListener("online", probeNet);
    window.addEventListener("offline", probeNet);
    initMatrix();

    log("console ready. select an endpoint and inject a link.", "ok");
    log(`route mode: ${route.toUpperCase()} · proxy: ${PROXY_URL}`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
