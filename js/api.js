/* ============================================================
   Audius API client
   Docs: https://docs.audius.org/api/
   No API key required. CORS-enabled, so we call it from the browser.
   ============================================================ */
const Audius = (() => {
    const APP_NAME = "Soundify";
    // Fallbacks in case the discovery-host lookup fails.
    const FALLBACK_HOSTS = [
        "https://discoveryprovider.audius.co",
        "https://discoveryprovider2.audius.co",
        "https://discoveryprovider3.audius.co",
    ];
    let hostPromise = null;

    // Pick a healthy discovery node once, then reuse it for the session.
    function pickHost() {
        if (hostPromise) return hostPromise;
        hostPromise = fetch("https://api.audius.co")
            .then((r) => r.json())
            .then((j) => {
                const list = (j && j.data) || [];
                if (!list.length) throw new Error("no hosts");
                return list[Math.floor(Math.random() * list.length)];
            })
            .catch(() => FALLBACK_HOSTS[0]);
        return hostPromise;
    }

    async function get(path, params = {}) {
        const host = await pickHost();
        const url = new URL(host + "/v1" + path);
        url.searchParams.set("app_name", APP_NAME);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
        });
        const res = await fetch(url);
        if (!res.ok) throw new Error("Audius API " + res.status);
        return (await res.json()).data;
    }

    // Convert an Audius track into the shape the rest of the app uses.
    function normalize(t) {
        const art = t.artwork || {};
        return {
            id: t.id,
            title: t.title || "Untitled",
            artist: (t.user && (t.user.name || t.user.handle)) || "Unknown artist",
            artwork: art["480x480"] || art["150x150"] || "",
            artworkLarge: art["1000x1000"] || art["480x480"] || art["150x150"] || "",
            duration: t.duration || 0,
            genre: t.genre || "",
            plays: t.play_count || 0,
        };
    }

    const streamable = (t) => t && t.is_streamable !== false && !t.is_delete;

    return {
        // Build the direct stream URL (302-redirects to the audio CDN).
        async streamUrl(id) {
            const host = await pickHost();
            return `${host}/v1/tracks/${id}/stream?app_name=${APP_NAME}`;
        },

        async trending({ genre, time = "week", limit = 20 } = {}) {
            const data = await get("/tracks/trending", { genre, time, limit });
            return (data || []).filter(streamable).slice(0, limit).map(normalize);
        },

        async search(query, limit = 30) {
            if (!query || !query.trim()) return [];
            const data = await get("/tracks/search", { query: query.trim(), limit });
            return (data || []).filter(streamable).map(normalize);
        },

        async track(id) {
            const data = await get(`/tracks/${id}`);
            return normalize(data);
        },
    };
})();
