/* =====================================================================
   XEMOZ // MEDIA INJECTION CONSOLE  —  app.js
   Calls the api-xemoz-official.my.id downloader endpoints from the
   browser, renders raw JSON + smart media previews / download buttons.
   ===================================================================== */
(() => {
  "use strict";

  const API_BASE = "https://api-xemoz-official.my.id/api/donwloader/";

  /* ---------- Tool registry ---------- */
  const TOOLS = [
    {
      id: "instagram",
      name: "INSTAGRAM",
      tag: "REELS · POST",
      glyph: "📸",
      accent: "#ff2bd6",
      endpoint: "instagram.php",
      param: "q",
      placeholder: "https://www.instagram.com/p/XYZ/",
      sample: "https://www.instagram.com/p/XYZ/",
      desc: "Pull photos, reels and carousel media from a public Instagram link.",
    },
    {
      id: "spotify",
      name: "SPOTIFY",
      tag: "TRACK · DL",
      glyph: "🎵",
      accent: "#2bff88",
      endpoint: "spotify-dl.php",
      param: "q",
      placeholder: "https://open.spotify.com/track/3rXS2AEXNADrIFyuY3F6RJ",
      sample: "https://open.spotify.com/track/3rXS2AEXNADrIFyuY3F6RJ",
      desc: "Resolve a Spotify track link to downloadable audio + cover art.",
    },
    {
      id: "tiktok",
      name: "TIKTOK",
      tag: "NO WATERMARK",
      glyph: "🎬",
      accent: "#00f0ff",
      endpoint: "tiktok.php",
      param: "url",
      placeholder: "https://www.tiktok.com/@user/video/123",
      sample: "https://www.tiktok.com/Xlakak/XYZ/",
      desc: "Grab a TikTok video without watermark, plus audio track.",
    },
    {
      id: "tiktokv2",
      name: "TIKTOK V2",
      tag: "FALLBACK",
      glyph: "⚡",
      accent: "#ffb454",
      endpoint: "tiktokv2.php",
      param: "url",
      placeholder: "https://www.tiktok.com/@user/video/123",
      sample: "https://www.tiktok.com/@tiktok/video/7000000000000000000",
      desc: "Alternate TikTok resolver — use when the primary endpoint stalls.",
    },
    {
      id: "twitter",
      name: "TWITTER / X",
      tag: "STATUS · MP4",
      glyph: "🐦",
      accent: "#1d9bf0",
      endpoint: "twitter.php",
      param: "q",
      placeholder: "https://x.com/user/status/123",
      sample: "https://x.com/user/status/123",
      desc: "Download video & images attached to a Tweet / X status.",
    },
  ];

  /* ---------- DOM refs ---------- */
  const $ = (sel) => document.querySelector(sel);
  const el = {
    rail: $("#tool-rail"),
    glyph: $("#active-glyph"),
    name: $("#active-name"),
    desc: $("#active-desc"),
    paramHint: $("#param-hint"),
    input: $("#target-input"),
    clear: $("#btn-clear"),
    quickRow: $("#quick-row"),
    inject: $("#btn-inject"),
    targetUrl: $("#target-url"),
    payload: $("#payload-sample"),
    paramsKey: $("#params-key"),
    paramsVal: $("#params-val"),
    results: $("#results"),
    respJson: $("#response-json"),
    respStatus: $("#resp-status"),
    jsonToggle: $("#json-toggle"),
    log: $("#log"),
    toast: $("#toast"),
    clock: $("#clock"),
    netState: $("#net-state"),
    netPill: $(".pill-live"),
  };

  let active = TOOLS[0];

  /* ===================================================================
     BUILD TOOL RAIL
     =================================================================== */
  function buildRail() {
    el.rail.innerHTML = "";
    TOOLS.forEach((t) => {
      const b = document.createElement("button");
      b.className = "tool-btn";
      b.style.setProperty("--accent", t.accent);
      b.dataset.id = t.id;
      b.innerHTML = `
        <span class="t-glyph">${t.glyph}</span>
        <span class="t-name">${t.name}</span>
        <span class="t-tag">${t.tag}</span>`;
      b.addEventListener("click", () => selectTool(t.id));
      el.rail.appendChild(b);
    });
  }

  function selectTool(id) {
    active = TOOLS.find((t) => t.id === id) || TOOLS[0];
    document.querySelectorAll(".tool-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.id === active.id)
    );
    el.glyph.textContent = active.glyph;
    el.name.textContent = active.name;
    el.desc.textContent = active.desc;
    el.paramHint.textContent = `[ ${active.param} ]`;
    el.input.placeholder = active.placeholder;
    document.documentElement.style.setProperty("--active-accent", active.accent);

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

    refreshMeta();
    log(`endpoint switched → ${active.endpoint}`);
  }

  /* ===================================================================
     META (TARGET_URL / PAYLOAD / PARAMS)
     =================================================================== */
  function buildUrl(value) {
    return `${API_BASE}${active.endpoint}?${active.param}=${encodeURIComponent(value || "")}`;
  }

  function refreshMeta() {
    const val = el.input.value.trim();
    el.targetUrl.textContent = val
      ? buildUrl(val)
      : `${API_BASE}${active.endpoint}?${active.param}=…`;
    const payloadObj = {};
    payloadObj[active.param] = val || active.placeholder;
    el.payload.textContent = JSON.stringify(payloadObj, null, 4);
    el.paramsKey.textContent = `.${active.param}`;
    el.paramsVal.textContent = val || "—";
  }

  /* ===================================================================
     EXECUTE INJECTION
     =================================================================== */
  let busy = false;

  async function inject() {
    const val = el.input.value.trim();
    if (!val) {
      toast("⚠ input target required", true);
      el.input.focus();
      return;
    }
    if (busy) return;
    busy = true;

    const url = buildUrl(val);
    setLoading(true);
    setStatus("run", "RUNNING");
    el.results.hidden = true;
    el.results.innerHTML = "";
    el.respJson.innerHTML = `<span class="awaiting">// transmitting request…</span>`;
    log(`>> POST ${active.endpoint} :: ${truncate(val, 60)}`);

    const started = performance.now();
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json, text/plain, */*" },
      });
      const ms = Math.round(performance.now() - started);
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw; // not JSON — keep as text
      }

      if (!res.ok) {
        setStatus("err", `HTTP ${res.status}`);
        log(`<< HTTP ${res.status} (${ms}ms)`, "err");
      } else {
        setStatus("ok", `200 · ${ms}ms`);
        log(`<< 200 OK (${ms}ms)`, "ok");
      }

      renderJson(data);
      renderResults(data);
    } catch (err) {
      setStatus("err", "FAILED");
      const isCors =
        err instanceof TypeError && /fetch|network|cors/i.test(err.message);
      el.respJson.innerHTML =
        `<span class="tok-null">// INJECTION FAILED</span>\n` +
        `<span class="tok-bool">error:</span> ${escapeHtml(err.message)}\n\n` +
        (isCors
          ? `<span class="tok-str">// The API blocked the browser request (CORS) or is\n` +
            `// unreachable. Try opening the TARGET_URL directly in a new tab,\n` +
            `// or run this site through a small proxy.</span>`
          : "");
      log(`<< request error: ${err.message}`, "err");
      toast("✕ injection failed", true);
    } finally {
      setLoading(false);
      busy = false;
    }
  }

  function setLoading(on) {
    el.inject.disabled = on;
    el.inject.classList.toggle("is-loading", on);
    el.inject.querySelector(".btn-inject-label").textContent = on
      ? "⏳ INJECTING"
      : "⏻ EXECUTE INJECTION";
  }

  function setStatus(kind, text) {
    el.respStatus.className = "status-chip " + kind;
    el.respStatus.textContent = text;
  }

  /* ===================================================================
     JSON RENDER (syntax highlight)
     =================================================================== */
  function renderJson(data) {
    const str =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);
    if (typeof data === "string") {
      el.respJson.textContent = data || "// empty response";
      return;
    }
    el.respJson.innerHTML = highlight(str);
  }

  function highlight(json) {
    return escapeHtml(json).replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "tok-num";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "tok-key";
          } else {
            const inner = match.replace(/^"|"$/g, "");
            cls = /^https?:\/\//.test(inner) ? "tok-url" : "tok-str";
          }
        } else if (/true|false/.test(match)) {
          cls = "tok-bool";
        } else if (/null/.test(match)) {
          cls = "tok-null";
        }
        if (cls === "tok-url") {
          const inner = match.replace(/^"|"$/g, "");
          return `"<a class="tok-url" href="${inner}" target="_blank" rel="noopener">${inner}</a>"`;
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  /* ===================================================================
     SMART RESULTS  (deep-scan response for media)
     =================================================================== */
  const RX = {
    video: /\.(mp4|mov|webm|m3u8)(\?|$)/i,
    audio: /\.(mp3|m4a|aac|ogg|wav|opus)(\?|$)/i,
    image: /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i,
    url: /^https?:\/\//i,
  };
  const HINT = {
    video: /(video|noWatermark|nowm|play|hd|sd|reel|mp4)/i,
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
      if (RX.url.test(obj)) {
        out.media.push({ key: path, url: obj, type: classify(path, obj) });
      }
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
    if (typeof data !== "object" || data === null) {
      el.results.hidden = true;
      return;
    }
    const out = { media: [], title: "", author: "", duration: "" };
    deepScan(data, out);

    // de-dupe urls
    const seen = new Set();
    out.media = out.media.filter((m) => {
      if (seen.has(m.url)) return false;
      seen.add(m.url);
      return true;
    });

    el.results.innerHTML = "";
    el.results.hidden = false;

    if (out.media.length === 0) {
      el.results.innerHTML =
        `<div class="result-card"><div class="result-empty">⚠ No direct media URLs detected in response. Inspect RAW_OUTPUT below.</div></div>`;
      return;
    }

    const thumb = out.media.find((m) => m.type === "image");
    const videos = out.media.filter((m) => m.type === "video");
    const audios = out.media.filter((m) => m.type === "audio");
    const images = out.media.filter((m) => m.type === "image");
    const links = out.media.filter((m) => m.type === "link");

    const card = document.createElement("div");
    card.className = "result-card";

    /* thumbnail / preview */
    let mediaCol = "";
    if (videos.length) {
      mediaCol = `<video class="result-media" src="${videos[0].url}" controls playsinline ${
        thumb ? `poster="${thumb.url}"` : ""
      }></video>`;
    } else if (thumb) {
      mediaCol = `<img class="result-thumb" src="${thumb.url}" alt="thumbnail" loading="lazy" onerror="this.style.display='none'" />`;
    } else if (audios.length) {
      mediaCol = `<div class="result-thumb audio">🎵</div>`;
    }

    /* info + actions */
    const actions = [];
    videos.forEach((m, i) =>
      actions.push(dlBtn(m.url, `⬇ VIDEO${videos.length > 1 ? " " + (i + 1) : ""}`, ""))
    );
    audios.forEach((m, i) =>
      actions.push(dlBtn(m.url, `⬇ AUDIO${audios.length > 1 ? " " + (i + 1) : ""}`, "audio"))
    );
    images.forEach((m, i) =>
      actions.push(dlBtn(m.url, `⬇ IMAGE${images.length > 1 ? " " + (i + 1) : ""}`, "alt"))
    );
    links.slice(0, 6).forEach((m) =>
      actions.push(dlBtn(m.url, `⬇ ${shortLabel(m.key)}`, "alt"))
    );

    card.innerHTML = `
      ${mediaCol}
      <div class="result-info">
        <div class="result-title">${escapeHtml(out.title || active.name + " media")}</div>
        ${out.author ? `<div class="result-meta">👤 <b>${escapeHtml(out.author)}</b></div>` : ""}
        ${out.duration ? `<div class="result-meta">⏱ <b>${escapeHtml(String(out.duration))}</b></div>` : ""}
        <div class="result-meta">📦 <b>${out.media.length}</b> asset(s) detected · ${videos.length}v / ${audios.length}a / ${images.length}img</div>
        ${audios.length ? `<audio class="result-media" src="${audios[0].url}" controls style="max-height:54px"></audio>` : ""}
        <div class="result-actions">${actions.join("")}</div>
      </div>`;
    el.results.appendChild(card);
    log(`rendered ${out.media.length} asset(s)`, "ok");
  }

  function dlBtn(url, label, variant) {
    const cls = variant ? `dl-btn ${variant}` : "dl-btn";
    // download attr helps for same-origin/CORS-friendly; target fallback opens tab
    return `<a class="${cls}" href="${url}" target="_blank" rel="noopener" download>${label}</a>`;
  }

  function shortLabel(key) {
    if (!key) return "LINK";
    return key.replace(/[_-]/g, " ").toUpperCase().slice(0, 16);
  }

  /* ===================================================================
     COPY BUTTONS
     =================================================================== */
  function bindCopy() {
    document.querySelectorAll(".copy").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const target = $(btn.dataset.copyTarget);
        if (!target) return;
        const text = target.textContent;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // fallback
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        const original = btn.textContent;
        btn.classList.add("copied");
        btn.textContent = "COPIED ✓";
        toast("⧉ copied to clipboard");
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.textContent = original;
        }, 1300);
      });
    });
  }

  /* ===================================================================
     HELPERS
     =================================================================== */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function truncate(s, n) {
    return s.length > n ? s.slice(0, n) + "…" : s;
  }
  function log(msg, kind = "") {
    const line = document.createElement("span");
    line.className = "log-line" + (kind ? " " + kind : "");
    const t = new Date().toLocaleTimeString("en-GB");
    line.innerHTML = `<span class="t">[${t}]</span> ${escapeHtml(msg)}`;
    el.log.appendChild(line);
    el.log.scrollTop = el.log.scrollHeight;
    // keep log trimmed
    while (el.log.children.length > 60) el.log.removeChild(el.log.firstChild);
  }
  let toastTimer;
  function toast(msg, isErr = false) {
    el.toast.textContent = msg;
    el.toast.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.toast.className = "toast"), 2200);
  }

  /* ---------- clock ---------- */
  function tickClock() {
    el.clock.textContent = new Date().toLocaleTimeString("en-GB");
  }

  /* ---------- network probe ---------- */
  async function probeNet() {
    el.netState.textContent = "PROBE";
    try {
      // no-cors just checks reachability of the host
      await fetch(API_BASE, { mode: "no-cors", cache: "no-store" });
      el.netState.textContent = "ONLINE";
      el.netPill.classList.remove("is-down");
    } catch {
      el.netState.textContent = navigator.onLine ? "ONLINE" : "OFFLINE";
      if (!navigator.onLine) el.netPill.classList.add("is-down");
    }
  }

  /* ---------- matrix rain ---------- */
  function initMatrix() {
    const canvas = $("#matrix");
    const ctx = canvas.getContext("2d");
    const chars = "01アカサタナハマ<>{}[]#/$%&*".split("");
    let cols, drops, fontSize = 14;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = Array(cols).fill(1);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx.fillStyle = "rgba(5,7,13,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00f0ff";
      ctx.font = fontSize + "px monospace";
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) setInterval(draw, 60);
  }

  /* ===================================================================
     INIT
     =================================================================== */
  function init() {
    buildRail();
    bindCopy();
    selectTool(TOOLS[0].id);

    el.input.addEventListener("input", refreshMeta);
    el.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") inject();
    });
    el.clear.addEventListener("click", () => {
      el.input.value = "";
      refreshMeta();
      el.input.focus();
    });
    el.inject.addEventListener("click", inject);
    el.jsonToggle.addEventListener("click", () => {
      const hidden = el.respJson.style.display === "none";
      el.respJson.style.display = hidden ? "" : "none";
      el.jsonToggle.textContent = hidden ? "HIDE" : "SHOW";
    });

    tickClock();
    setInterval(tickClock, 1000);
    probeNet();
    window.addEventListener("online", probeNet);
    window.addEventListener("offline", probeNet);
    initMatrix();

    log("console ready. select an endpoint and inject a link.", "ok");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
