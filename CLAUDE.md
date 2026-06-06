# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Soundify — a static, single-page music player. No build step, no framework, no package manager. Open `index.html` directly in a browser to run it.

## Architecture

All logic is in three files:

- `index.html` — static shell only: top nav (brand + search), a main grid (library + now-playing/queue), and a fixed bottom player bar. The library list and queue are rendered by JS, not hardcoded.
- `script.js` — all runtime behaviour. The `songs[]` array (each entry: `songName`, `artist`, `filePath`, `coverPath`) is the single source of truth. A single reused `Audio` element drives playback.
- `style.css` — dark theme via CSS custom properties in `:root`; responsive grid collapses to one column under 880px.

### Key concepts in `script.js`

- **State:** `currentIndex`, `isShuffle`, `repeatMode` (0 off / 1 all / 2 one), `shuffleOrder` (Fisher–Yates, current track first), and `filtered` (indices currently shown after a search).
- **`playbackOrder()`** returns the index sequence for next/prev/queue — either natural order or `shuffleOrder`. `next()`/`prev()` wrap around it; `prev()` restarts the current track if >3s elapsed.
- **Rendering is data-driven:** `renderLibrary()` rebuilds the list from `filtered`; `renderQueue()` shows upcoming tracks; `syncActiveRow()` highlights the playing row. Re-call these after any state change rather than mutating DOM by hand.
- **Search** (`applySearch`) filters `songs` by name/artist into `filtered`, then re-renders.
- **Visualizer:** Web Audio API `AnalyserNode` → canvas bars. `createMediaElementSource` can throw on tainted `file://` audio in some browsers, so there's a synthetic time-based fallback when `analyser` is null. Don't assume the analyser path always runs.
- **Icons:** Font Awesome 6 via CDN `<link>`. Play/pause toggles by swapping `fa-play` / `fa-pause` on the button's `<i>`.

## Adding a song

1. Drop the `.mp3` and cover image into the project directory.
2. Add one entry to the `songs[]` array in `script.js`. That's it — the library row, queue, and search all derive from the array automatically.
