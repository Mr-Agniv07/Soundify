# 🎵 Soundify

A free music streaming web app built with **vanilla HTML, CSS, and JavaScript** — no framework, no build step, no bundler. Music streams from the [**Audius**](https://audius.org) public API (full-length free tracks, no API key, no login), and your library is saved locally in the browser.

## ✨ Features

- 🔎 **Search** millions of real tracks with artwork
- 🏠 **Browse** a Home feed of Trending + per-genre rows (Electronic, Hip-Hop/Rap, Pop, Rock, Lo-Fi)
- ▶️ **Full playback** — full-length songs, not 30-second previews
- 📋 **Playlists** — create, rename, delete, add/remove songs
- ❤️ **Liked Songs** and 🕒 **Recently Played** history
- 🔀 Shuffle · 🔁 Repeat (off / all / one) · 📜 Up-Next queue
- 📊 **Audio visualizer** (Web Audio API, with a graceful fallback)
- ⌨️ Keyboard shortcuts — `Space` play/pause, `←` / `→` previous/next
- 💾 Everything saved to **localStorage** — no account needed
- 📱 Responsive layout

## 🚀 Run locally

```bash
npm install   # one-time (installs live-server for dev)
npm start     # → http://localhost:8000
```

`npm run dev` does the same and opens your browser. Edit a file, save, and it auto-reloads.

> You can also just open `index.html`, but serving over `http://` is recommended so the Web Audio visualizer works (a synthetic animation kicks in otherwise).

## 🌐 Deploy

It's a static site — deploy anywhere:

- **Netlify** — drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop), or connect the repo (the included `netlify.toml` sets the right config automatically).
- **GitHub Pages** — Settings → Pages → deploy from `main` / root (the included `.nojekyll` makes Pages serve the `js/` folder correctly).
- **Vercel / Cloudflare Pages** — import the repo, no build command, output directory `.`.

## 🗂️ Structure

| Path           | Role                                                          |
| -------------- | ------------------------------------------------------------ |
| `index.html`   | Static shell (sidebar · views · now-playing · player · modal) |
| `js/api.js`    | Audius API client (search, trending, stream URLs)            |
| `js/store.js`  | localStorage persistence (likes, playlists, history)         |
| `js/player.js` | Audio engine, queue, player bar, visualizer                  |
| `js/ui.js`     | View router + renderers + components                         |
| `js/app.js`    | Bootstrap & event wiring                                     |
| `style.css`    | Dark theme (CSS variables) + responsive layout              |

## 🙏 Credits

Music streaming powered by the [Audius](https://audius.org) protocol and its independent artists.
