# XEMOZ // MEDIA INJECTION CONSOLE ⚡

A slick, cyberpunk-terminal styled web front-end for the
`api-xemoz-official.my.id` downloader API. Paste a link, hit **EXECUTE
INJECTION**, and the console resolves downloadable media from:

| Tool        | Endpoint            | Param | Example input |
|-------------|---------------------|-------|---------------|
| Instagram   | `instagram.php`     | `q`   | `https://www.instagram.com/p/XYZ/` |
| Spotify     | `spotify-dl.php`    | `q`   | `https://open.spotify.com/track/...` |
| TikTok      | `tiktok.php`        | `url` | `https://www.tiktok.com/@user/video/123` |
| TikTok V2   | `tiktokv2.php`      | `url` | `https://www.tiktok.com/@user/video/123` |
| Twitter / X | `twitter.php`       | `q`   | `https://x.com/user/status/123` |

## Features

- **Live request builder** — see the exact `TARGET_URL`, JSON `PAYLOAD_SAMPLE`
  and `PARAMETERS` update as you type, each with a one-tap **COPY** button.
- **Smart result cards** — the response is deep-scanned for media URLs and
  rendered as inline **video/audio previews** plus categorized
  ⬇ download buttons (video / audio / image / links).
- **Syntax-highlighted RAW_OUTPUT** — full JSON response with clickable URLs.
- **Terminal FX** — glitch title, scanlines, matrix rain, live clock, network
  probe and an activity log.
- **Responsive** and respects `prefers-reduced-motion`.

## Run it

It's a static site — no build step.

```bash
# from the repo root
python3 -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` in a browser.

> You can also deploy it to **GitHub Pages**: Settings → Pages → deploy from
> the `main` branch root.

## Note on CORS

The requests are made directly from your browser to
`api-xemoz-official.my.id`. If the API does not send
`Access-Control-Allow-Origin`, the browser may block the response and the
console will show a CORS hint. In that case you can:

1. Open the generated `TARGET_URL` directly in a new tab, or
2. Put a tiny proxy in front of the API and point `API_BASE` (in
   `js/app.js`) at it.

## Project structure

```
.
├── index.html      # console layout
├── css/style.css   # cyberpunk theme
├── js/app.js       # tool registry, fetch + render logic
└── README.md
```

---

Built for the operator. Use responsibly — only download content you have the
rights to.
