# 🎵 Soundify

A lightweight, dependency-free music player built with **vanilla HTML, CSS, and JavaScript** — no build step, no framework, no bundler.

## Features

- 🎚️ **Full playback controls** — play/pause, next, previous (with smart "restart vs. previous" behaviour)
- 🔀 **Shuffle** (Fisher–Yates order) and 🔁 **Repeat** (off / all / one)
- 📜 **Up Next queue** that reflects the current playback order
- 🔍 **Live search** across song titles and artists
- 📊 **Audio visualizer** powered by the Web Audio API (with a graceful fallback)
- 🔊 **Volume + mute** and a seekable progress bar with timestamps
- ⌨️ **Keyboard shortcuts** — `Space` play/pause, `←` / `→` previous/next
- 📱 **Responsive** layout that collapses to a single column on small screens

## Run it

No install required — just open `index.html` in any modern browser.

```bash
# or serve it locally for the visualizer to work reliably
python -m http.server 8000
# then visit http://localhost:8000
```

> The Web Audio visualizer is most reliable when the page is served over `http://`
> rather than opened directly via `file://`; a synthetic animation kicks in as a fallback.

## Adding a song

Drop the `.mp3` and a cover image into the project folder, then add one entry to the
`songs[]` array in `script.js`:

```js
{
    songName: "Song Title",
    artist:   "Artist Name",
    filePath: "my-song.mp3",
    coverPath: "my-cover.jpg",
}
```

The library list, queue, and search all derive from that array automatically.

## Project structure

| File         | Role                                                        |
| ------------ | ----------------------------------------------------------- |
| `index.html` | Static shell — nav, library/now-playing grid, player bar    |
| `script.js`  | All playback logic, rendering, search, and the visualizer   |
| `style.css`  | Dark theme (CSS variables) + responsive layout              |
