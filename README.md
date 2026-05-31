# Sedal — Downloader Video, Musik & Alat Gambar ⚡

A clean, friendly web app to download media from **TikTok** (no watermark),
**Instagram**, **Spotify**, **Twitter/X**, and **YouTube** (MP3/MP4), plus a set
of **image tools** (HD upscale, enhance, remove background, pixel-art). Paste a
link, hit the button, and pick your result. Installable as a PWA and
deploy-ready for Netlify.

### Downloaders
| Platform    | Endpoint            | Param | Example link |
|-------------|---------------------|-------|--------------|
| TikTok      | `donwloader/tiktok.php`     | `url` | `https://www.tiktok.com/@user/video/123` |
| TikTok V2   | `donwloader/tiktokv2.php`   | `url` | *(fallback for TikTok)* |
| Instagram   | `donwloader/instagram.php`  | `q`   | `https://www.instagram.com/p/XYZ/` |
| Spotify     | `donwloader/spotify-dl.php` | `q`   | `https://open.spotify.com/track/...` |
| Twitter / X | `donwloader/twitter.php`    | `q`   | `https://x.com/user/status/123` |
| YouTube MP4 | `donwloader/ytmp4.php`      | `url` | `https://www.youtube.com/watch?v=...` |
| YouTube MP3 | `donwloader/ytmp3.php`      | `url` | `https://www.youtube.com/watch?v=...` |

### Image tools
| Tool        | Endpoint                    | Params        |
|-------------|-----------------------------|---------------|
| HD Upscale  | `tools/image/hdimage.php`   | `url`, `scale` (2/4/8) |
| Remini      | `tools/image/remini.php`    | `url` |
| Remove BG   | `tools/image/removebg.php`  | `url` |
| Wink        | `tools/image/wink.php`      | `url`, `mode` (ultrahd/…) |
| ToPixel     | `tools/image/topixel.php`   | `url`, `level` (10–50) |

> **Upload support:** image tools accept either a direct image URL **or an
> uploaded file**. Files are compressed in-browser, sent to the Netlify
> `upload` function, hosted on a public image host (catbox → uguu → 0x0), and
> the resulting URL is passed to the tool.

## ✨ Features

- **Paste & go** — tabs grouped into *Unduh Media* and *Alat Gambar*;
  downloader links auto-detect the platform.
- **Extra options** — per-tool selectors (scale / mode / level) for the image
  tools, forwarded safely through the proxy.
- **Rich preview** — inline video/audio player, thumbnail, image gallery, a
  before/after compare view for image tools, and labeled download buttons.
- **No CORS headaches** — requests go through a Netlify serverless proxy first
  (which also returns processed images as data URLs), with an automatic
  fallback to a direct browser call.
- **Recent items** — your last actions are saved locally for quick re-runs.
- **Installable PWA** — add to home screen, works offline, and supports the
  Web **Share Target** (share a link from another app straight into Sedal).
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
