# XEMOZ // MEDIA INJECTION CONSOLE ⚡

A slick, cyberpunk-terminal styled web console for the
`api-xemoz-official.my.id` downloader API. Paste a link, hit **EXECUTE
INJECTION**, and the console resolves downloadable media from:

| Tool        | Endpoint            | Param | Example input |
|-------------|---------------------|-------|---------------|
| Instagram   | `instagram.php`     | `q`   | `https://www.instagram.com/p/XYZ/` |
| Spotify     | `spotify-dl.php`    | `q`   | `https://open.spotify.com/track/...` |
| TikTok      | `tiktok.php`        | `url` | `https://www.tiktok.com/@user/video/123` |
| TikTok V2   | `tiktokv2.php`      | `url` | `https://www.tiktok.com/@user/video/123` |
| Twitter / X | `twitter.php`       | `q`   | `https://x.com/user/status/123` |

## ✨ Features

- **Smart auto-detect** — paste any link and the matching endpoint is selected
  automatically.
- **AUTO / PROXY / DIRECT routing** — choose how requests are sent:
  - **AUTO** *(default)* — try the Netlify proxy first, fall back to a direct call.
  - **PROXY** — always use the serverless function (no CORS issues).
  - **DIRECT** — call the API straight from the browser.
- **Live request builder** — `TARGET_URL`, JSON `PAYLOAD_SAMPLE` and
  `PARAMETERS` update as you type, each with a one-tap **COPY** button.
- **Rich result cards** — the response is deep-scanned for media URLs and
  rendered as inline **video / audio previews**, an **image gallery**, plus
  categorized ⬇ download buttons, per-asset **copy link**, and **download all**.
- **History** — your last requests are saved (localStorage); click to re-run.
- **Syntax-highlighted RAW_OUTPUT** with clickable URLs.
- **Keyboard shortcuts** — `Enter` run · `Ctrl/⌘+K` focus · `Esc` clear ·
  `1–5` switch endpoint.
- **Terminal FX** — glitch title, scanlines, matrix rain, live clock, network
  probe, activity log, top progress bar, toasts.
- Fully **responsive** and respects `prefers-reduced-motion`.

## 🚀 Deploy to Netlify

This repo is Netlify-ready — **no build step**. The included
[`netlify.toml`](./netlify.toml) and the serverless proxy at
[`netlify/functions/proxy.js`](./netlify/functions/proxy.js) wire everything up.

### Option A — Git import (recommended)
1. Push this repo to GitHub (already done if you're reading the PR).
2. On [Netlify](https://app.netlify.com) → **Add new site → Import an existing
   project** → pick this repo.
3. Leave build command empty, publish directory `.` (already set in
   `netlify.toml`). Click **Deploy**.

### Option B — Netlify CLI
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Option C — Local dev with functions
```bash
npm i -g netlify-cli
netlify dev          # serves the site + functions at http://localhost:8888
```

> The serverless proxy lives at `/.netlify/functions/proxy` (aliased to
> `/api/proxy`). It whitelists the five services, calls the upstream API
> server-side, and returns JSON with CORS headers — so the browser never hits a
> CORS wall.

## 🧪 Run as a plain static site

No Netlify? It still works (use **DIRECT** route):
```bash
python3 -m http.server 8080   # open http://localhost:8080
```
> In DIRECT mode the browser calls the API itself; if the API doesn't send
> `Access-Control-Allow-Origin`, switch to a Netlify deploy (PROXY/AUTO).

## 📁 Project structure

```
.
├── index.html               # console layout
├── css/style.css            # cyberpunk theme
├── js/app.js                # routing, auto-detect, history, rendering
├── netlify.toml             # Netlify config + redirects
├── netlify/functions/
│   └── proxy.js             # serverless CORS proxy (whitelisted services)
└── README.md
```

---

Built for the operator. Use responsibly — only download content you have the
rights to.
