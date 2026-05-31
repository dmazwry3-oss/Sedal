# Sedal — Downloader Video & Musik ⚡

A clean, friendly web app to download media from **TikTok** (no watermark),
**Instagram**, **Spotify**, and **Twitter/X**. Paste a link, hit **Download**,
and pick the file you want. Installable as a PWA and deploy-ready for Netlify.

| Platform    | Endpoint            | Param | Example link |
|-------------|---------------------|-------|--------------|
| TikTok      | `tiktok.php`        | `url` | `https://www.tiktok.com/@user/video/123` |
| TikTok V2   | `tiktokv2.php`      | `url` | *(fallback for TikTok)* |
| Instagram   | `instagram.php`     | `q`   | `https://www.instagram.com/p/XYZ/` |
| Spotify     | `spotify-dl.php`    | `q`   | `https://open.spotify.com/track/...` |
| Twitter / X | `twitter.php`       | `q`   | `https://x.com/user/status/123` |

## ✨ Features

- **Paste & download** — auto-detects the platform from the link you paste.
- **Rich preview** — inline video/audio player, thumbnail, image gallery, and
  clearly labeled download buttons (video / audio / image / download all).
- **No CORS headaches** — requests go through a Netlify serverless proxy first,
  with an automatic fallback to a direct browser call.
- **Recent downloads** — your last links are saved locally for quick re-runs.
- **Installable PWA** — add to home screen, works offline, and supports the
  Web **Share Target** (share a link from TikTok/IG/X straight into Sedal).
- **Mobile-first & responsive** — big touch targets, safe-area insets, haptics,
  no iOS focus-zoom.
- Friendly **how-to**, **features**, and **FAQ** sections.

## 🚀 Deploy to Netlify (recommended)

No build step. The included [`netlify.toml`](./netlify.toml) and the proxy at
[`netlify/functions/proxy.js`](./netlify/functions/proxy.js) wire it up.

1. Push to GitHub.
2. On [Netlify](https://app.netlify.com) → **Add new site → Import an existing
   project** → choose this repo → **Deploy** (leave build command empty,
   publish dir `.`).

Or via CLI:
```bash
npm i -g netlify-cli
netlify deploy --prod     # or: netlify dev  (local site + functions)
```

The proxy lives at `/.netlify/functions/proxy` (aliased `/api/proxy`): it
whitelists the five services, calls the upstream API server-side, and returns
JSON with CORS headers — so the browser never hits a CORS wall.

## 🧪 Run as a plain static site

```bash
python3 -m http.server 8080   # open http://localhost:8080
```
Without Netlify the app falls back to calling the API directly from the browser;
if the API doesn't send `Access-Control-Allow-Origin`, deploy to Netlify so the
proxy can handle it.

## 📁 Project structure

```
.
├── index.html               # landing page + downloader UI
├── css/style.css            # modern theme (glass cards, responsive)
├── js/app.js                # tabs, auto-detect, fetch+render, recent, PWA
├── manifest.webmanifest     # PWA manifest (installable + share target)
├── sw.js                    # service worker (offline shell cache)
├── assets/icon.svg          # app icon
├── netlify.toml             # Netlify config + redirects + headers
├── netlify/functions/
│   └── proxy.js             # serverless CORS proxy (whitelisted services)
└── README.md
```

---

Use responsibly — only download content you have the rights to. Sedal is not
affiliated with TikTok, Instagram, Spotify, or X.
