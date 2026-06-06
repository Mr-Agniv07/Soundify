/* ============================================================
   Persistence layer — everything lives in localStorage.
   We store full (normalized) track objects so views render
   instantly without re-fetching from the API.
   ============================================================ */
const Store = (() => {
    const KEY = "soundify_v1";
    const HISTORY_CAP = 60;
    const DEFAULTS = { liked: [], history: [], playlists: [] };

    let state = load();
    const listeners = new Set();

    function load() {
        try {
            const raw = JSON.parse(localStorage.getItem(KEY));
            return { ...DEFAULTS, ...(raw || {}) };
        } catch {
            return JSON.parse(JSON.stringify(DEFAULTS));
        }
    }

    function save() {
        localStorage.setItem(KEY, JSON.stringify(state));
        listeners.forEach((fn) => fn());
    }

    const uid = () =>
        Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    return {
        // Subscribe to any change (used to re-render the sidebar/views).
        onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

        // ---- Liked songs ----
        getLiked() { return state.liked; },
        isLiked(id) { return state.liked.some((t) => t.id === id); },
        toggleLike(track) {
            const i = state.liked.findIndex((t) => t.id === track.id);
            if (i >= 0) state.liked.splice(i, 1);
            else state.liked.unshift(track);
            save();
            return i < 0; // true if now liked
        },

        // ---- Recently played ----
        getHistory() { return state.history; },
        addHistory(track) {
            state.history = state.history.filter((t) => t.id !== track.id);
            state.history.unshift({ ...track, playedAt: Date.now() });
            if (state.history.length > HISTORY_CAP)
                state.history.length = HISTORY_CAP;
            save();
        },
        clearHistory() { state.history = []; save(); },

        // ---- Playlists ----
        getPlaylists() { return state.playlists; },
        getPlaylist(id) { return state.playlists.find((p) => p.id === id); },
        createPlaylist(name) {
            const p = { id: uid(), name: name.trim() || "New Playlist", tracks: [] };
            state.playlists.unshift(p);
            save();
            return p;
        },
        renamePlaylist(id, name) {
            const p = this.getPlaylist(id);
            if (p) { p.name = name.trim() || p.name; save(); }
        },
        deletePlaylist(id) {
            state.playlists = state.playlists.filter((p) => p.id !== id);
            save();
        },
        addToPlaylist(id, track) {
            const p = this.getPlaylist(id);
            if (!p) return false;
            if (p.tracks.some((t) => t.id === track.id)) return false; // no dupes
            p.tracks.push(track);
            save();
            return true;
        },
        removeFromPlaylist(id, trackId) {
            const p = this.getPlaylist(id);
            if (!p) return;
            p.tracks = p.tracks.filter((t) => t.id !== trackId);
            save();
        },
    };
})();
