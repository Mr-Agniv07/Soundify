# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Soundify — a free music streaming web app. Vanilla HTML/CSS/JS, **no build step, no framework, no bundler**. Music comes from the **Audius public API** (full free tracks, no API key, no login). All user data (likes, playlists, history) lives in **localStorage**. The whole thing is a static site — deployable to any static host.

## Commands

```bash
npm install     # one-time: installs live-server (dev only)
npm start       # serve at http://localhost:8000 (no auto-open)
npm run dev     # same, but opens the browser
```

There is **no build, no lint, no tests**. `live-server` auto-reloads the browser on save. You can also just open `index.html` directly, but serving over `http://` is preferred (the visualizer's Web Audio path needs it; otherwise a synthetic fallback runs).

## Architecture

`index.html` is a static shell (sidebar · main view · now-playing panel · player bar · modal). Everything else is in `js/`, loaded as **classic scripts in dependency order** (they share global scope — no ES modules, so later files can call earlier ones):

1. **`js/api.js`** → `Audius` — the API client. Picks a discovery host once (with hardcoded fallbacks), then exposes `trending({genre,time,limit})`, `search(query)`, `track(id)`, and `streamUrl(id)`. Every track is run through `normalize()` into the app's shape `{id,title,artist,artwork,artworkLarge,duration,genre,plays}`. **All other code depends on this normalized shape** — if you add a field, add it here.
2. **`js/store.js`** → `Store` — localStorage persistence under key `soundify_v1` (`{liked, history, playlists}`). Stores **full normalized track objects** (not just ids) so views render without re-fetching. Exposes `onChange(fn)` for reactivity. Likes/history/playlists CRUD.
3. **`js/player.js`** → `Player` — owns the single `<audio>` element, the queue, the bottom player bar, the now-playing panel, and the canvas visualizer. Drive it with `Player.playContext(tracks, startIndex)`. Internals: `queue` (track objects) + `order`/`orderPos` (a permutation for shuffle) + `repeatMode` (0/1/2). Streams by setting `audio.src = await Audius.streamUrl(id)`. Logs to `Store.addHistory` on play. Exposes `onChange(fn)`. The visualizer is a **synthetic** canvas animation — see the gotcha below.
4. **`js/ui.js`** → `UI` — view router + renderers (Home, Search, Liked, History, Playlist) and reusable components (`trackRow`, `card`, `row`, `header`, add-to-playlist modal). `navigate(name, param)` swaps the `#view` contents. `syncPlaying()` updates only the active-row highlight without re-fetching.
5. **`js/app.js`** — bootstrap. Wires sidebar nav, debounced top-bar search, modal, and the reactivity wiring: `Store.onChange → UI.refresh`, `Player.onChange → UI.syncPlaying`.

### Reactivity model
Two event buses: `Store.onChange` (data changed → re-render sidebar + data-backed views) and `Player.onChange` (playback changed → update row highlights, refresh Liked/History). Never mutate the DOM for these by hand — call the renderers.

### Key gotchas
- **Track ids are strings** (e.g. `"BqpPKMP"`), not the numeric `track_id`. Always use `.id`.
- **Visualizer / silent-audio trap (important):** do NOT reintroduce `createMediaElementSource` / an `AnalyserNode`. It reroutes `<audio>` output through the Web Audio graph, and Audius streams are cross-origin behind a 302 whose *redirect* response carries no CORS header — so the browser **silences** the rerouted audio (it appears to play but is silent). The visualizer is therefore a synthetic animation. Also don't set `audio.crossOrigin = "anonymous"` — the redirect would then fail CORS and break playback entirely.
- **Search is debounced and sequence-guarded** (`searchSeq`) so a slow earlier request can't overwrite a newer one.
- Adding/removing a feature usually means touching the relevant `js/` module **and** wiring it in `app.js` — there is no shared framework doing it for you.

## Deployment

Pure static. `netlify.toml` sets `publish = "."` and an empty build command (so Netlify doesn't try to run a non-existent build because of `package.json`). `.nojekyll` lets GitHub Pages serve the `js/` folder untouched. `node_modules/` and the old sample `.mp3`/image files are gitignored (the app streams everything now).
