/* ============================================================
   UI layer — sidebar, view router, and all the main-content
   views (Home, Search, Liked, History, Playlist).
   ============================================================ */
const UI = (() => {
    const $ = (id) => document.getElementById(id);
    const view = $("view");
    const playlistListEl = $("playlist-list");
    const navHome = $("nav-home");
    const navSearch = $("nav-search");
    const navLiked = $("nav-liked");
    const navHistory = $("nav-history");

    const GENRES = ["Electronic", "Hip-Hop/Rap", "Pop", "Rock", "Lo-Fi"];

    let currentView = { name: "home", param: null };

    // ---- utils ----
    const esc = (s) =>
        String(s ?? "").replace(/[&<>"']/g, (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const fmt = (sec) => {
        if (!sec || isNaN(sec)) return "";
        const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };
    const skeleton = (label) =>
        `<div class="loading"><span class="spinner"></span>${esc(label)}</div>`;

    // ============================================================
    //  Reusable components
    // ============================================================
    function trackRow(track, tracks, idx, opts = {}) {
        const row = document.createElement("div");
        row.className = "track";
        row.dataset.id = track.id;
        row.dataset.index = idx;
        const cur = Player.current();
        const isCur = cur && cur.id === track.id;
        if (isCur) row.classList.add("active");

        row.innerHTML = `
            <span class="t-index">${isCur && Player.isPlaying()
                ? '<span class="eq"><span></span><span></span><span></span></span>'
                : (idx + 1)}</span>
            <img class="t-art" src="${esc(track.artwork || "logo.jpg")}" alt="" loading="lazy">
            <div class="t-meta">
                <span class="t-title">${esc(track.title)}</span>
                <span class="t-artist">${esc(track.artist)}</span>
            </div>
            <span class="t-genre">${esc(track.genre || "")}</span>
            <button class="t-btn t-like ${Store.isLiked(track.id) ? "on" : ""}" title="Like">
                <i class="${Store.isLiked(track.id) ? "fa-solid" : "fa-regular"} fa-heart"></i>
            </button>
            <button class="t-btn t-add" title="Add to playlist"><i class="fa-solid fa-plus"></i></button>
            <span class="t-dur">${fmt(track.duration)}</span>
            ${opts.onRemove ? '<button class="t-btn t-remove" title="Remove"><i class="fa-solid fa-xmark"></i></button>' : ""}
        `;

        row.addEventListener("click", (e) => {
            if (e.target.closest(".t-btn")) return;
            Player.playContext(tracks, idx);
        });
        row.querySelector(".t-like").addEventListener("click", (e) => {
            e.stopPropagation();
            Store.toggleLike(track);
        });
        row.querySelector(".t-add").addEventListener("click", (e) => {
            e.stopPropagation();
            openAddToPlaylist(track);
        });
        if (opts.onRemove) {
            row.querySelector(".t-remove").addEventListener("click", (e) => {
                e.stopPropagation();
                opts.onRemove(track);
            });
        }
        return row;
    }

    function trackList(tracks, opts = {}) {
        const wrap = document.createElement("div");
        wrap.className = "tracklist";
        tracks.forEach((t, i) => wrap.appendChild(trackRow(t, tracks, i, opts)));
        return wrap;
    }

    function card(track, tracks, idx) {
        const el = document.createElement("div");
        el.className = "card";
        el.innerHTML = `
            <div class="card-art">
                <img src="${esc(track.artwork || "logo.jpg")}" alt="" loading="lazy">
                <button class="card-play"><i class="fa-solid fa-play"></i></button>
            </div>
            <div class="card-title">${esc(track.title)}</div>
            <div class="card-sub">${esc(track.artist)}</div>
        `;
        el.addEventListener("click", () => Player.playContext(tracks, idx));
        return el;
    }

    function row(title, tracks) {
        const section = document.createElement("section");
        section.className = "row";
        const head = document.createElement("div");
        head.className = "section-head";
        head.innerHTML = `<h2>${esc(title)}</h2>`;
        const scroller = document.createElement("div");
        scroller.className = "card-row";
        tracks.forEach((t, i) => scroller.appendChild(card(t, tracks, i)));
        section.append(head, scroller);
        return section;
    }

    function header(title, subtitle, tracks) {
        const h = document.createElement("div");
        h.className = "view-header";
        h.innerHTML = `
            <div class="vh-text">
                <span class="vh-kicker">${esc(subtitle)}</span>
                <h1>${esc(title)}</h1>
                <span class="vh-count">${tracks ? tracks.length + " songs" : ""}</span>
            </div>
            ${tracks && tracks.length ? '<button class="play-all"><i class="fa-solid fa-play"></i> Play</button>' : ""}
        `;
        if (tracks && tracks.length) {
            h.querySelector(".play-all").addEventListener("click", () =>
                Player.playContext(tracks, 0));
        }
        return h;
    }

    // ============================================================
    //  Add-to-playlist modal
    // ============================================================
    function openAddToPlaylist(track) {
        const overlay = $("modal");
        const body = $("modal-body");
        body.innerHTML = `<h3>Add to playlist</h3>`;
        const list = document.createElement("div");
        list.className = "modal-list";

        const newBtn = document.createElement("button");
        newBtn.className = "modal-item new";
        newBtn.innerHTML = `<i class="fa-solid fa-plus"></i> New playlist…`;
        newBtn.addEventListener("click", () => {
            const name = prompt("Playlist name:");
            if (name === null) return;
            const p = Store.createPlaylist(name);
            Store.addToPlaylist(p.id, track);
            closeModal();
        });
        list.appendChild(newBtn);

        const playlists = Store.getPlaylists();
        if (!playlists.length) {
            const hint = document.createElement("p");
            hint.className = "modal-hint";
            hint.textContent = "No playlists yet — create one above.";
            list.appendChild(hint);
        }
        playlists.forEach((p) => {
            const has = p.tracks.some((t) => t.id === track.id);
            const item = document.createElement("button");
            item.className = "modal-item";
            item.innerHTML = `<span>${esc(p.name)}</span>
                <i class="fa-solid ${has ? "fa-check" : "fa-plus"}"></i>`;
            item.addEventListener("click", () => {
                if (has) Store.removeFromPlaylist(p.id, track.id);
                else Store.addToPlaylist(p.id, track);
                openAddToPlaylist(track); // refresh checkmarks
            });
            list.appendChild(item);
        });

        body.appendChild(list);
        overlay.classList.add("open");
    }
    function closeModal() { $("modal").classList.remove("open"); }

    // ============================================================
    //  Views
    // ============================================================
    async function renderHome() {
        view.innerHTML = "";
        view.appendChild(header("Home", "Powered by Audius — full free tracks", null));
        const container = document.createElement("div");
        container.innerHTML = skeleton("Loading fresh music…");
        view.appendChild(container);
        try {
            const trending = await Audius.trending({ limit: 15 });
            container.innerHTML = "";
            if (trending.length) container.appendChild(row("Trending this week", trending));
            // genres load in parallel
            const results = await Promise.allSettled(
                GENRES.map((g) => Audius.trending({ genre: g, limit: 12 }))
            );
            results.forEach((res, i) => {
                if (res.status === "fulfilled" && res.value.length)
                    container.appendChild(row(GENRES[i], res.value));
            });
            if (!container.children.length)
                container.innerHTML = `<p class="empty">Couldn't load music right now. Try again.</p>`;
        } catch {
            container.innerHTML = `<p class="empty">Couldn't reach Audius. Check your connection.</p>`;
        }
    }

    let searchSeq = 0;
    async function renderSearch(query) {
        view.innerHTML = "";
        view.appendChild(header(query ? `Results for “${query}”` : "Search", "Search", null));
        const container = document.createElement("div");
        view.appendChild(container);
        if (!query.trim()) {
            container.innerHTML = `<p class="empty">Type to search millions of tracks.</p>`;
            return;
        }
        container.innerHTML = skeleton("Searching…");
        const seq = ++searchSeq;
        try {
            const results = await Audius.search(query, 40);
            if (seq !== searchSeq) return; // a newer search superseded this one
            container.innerHTML = "";
            if (!results.length) {
                container.innerHTML = `<p class="empty">No results for “${esc(query)}”.</p>`;
                return;
            }
            container.appendChild(trackList(results));
        } catch {
            if (seq === searchSeq)
                container.innerHTML = `<p class="empty">Search failed. Try again.</p>`;
        }
    }

    function renderLiked() {
        view.innerHTML = "";
        const tracks = Store.getLiked();
        view.appendChild(header("Liked Songs", "Playlist", tracks));
        if (!tracks.length) {
            view.insertAdjacentHTML("beforeend",
                `<p class="empty">Songs you ♥ will show up here.</p>`);
            return;
        }
        view.appendChild(trackList(tracks, {
            onRemove: (t) => { Store.toggleLike(t); },
        }));
    }

    function renderHistory() {
        view.innerHTML = "";
        const tracks = Store.getHistory();
        const h = header("Recently Played", "History", tracks);
        if (tracks.length) {
            const clear = document.createElement("button");
            clear.className = "play-all ghost";
            clear.innerHTML = `<i class="fa-solid fa-trash"></i> Clear`;
            clear.addEventListener("click", () => { Store.clearHistory(); });
            h.appendChild(clear);
        }
        view.appendChild(h);
        if (!tracks.length) {
            view.insertAdjacentHTML("beforeend",
                `<p class="empty">Your listening history is empty.</p>`);
            return;
        }
        view.appendChild(trackList(tracks));
    }

    function renderPlaylist(id) {
        const p = Store.getPlaylist(id);
        view.innerHTML = "";
        if (!p) { view.innerHTML = `<p class="empty">Playlist not found.</p>`; return; }
        const h = header(p.name, "Playlist", p.tracks);
        const rename = document.createElement("button");
        rename.className = "play-all ghost";
        rename.innerHTML = `<i class="fa-solid fa-pen"></i> Rename`;
        rename.addEventListener("click", () => {
            const name = prompt("Rename playlist:", p.name);
            if (name) { Store.renamePlaylist(id, name); }
        });
        const del = document.createElement("button");
        del.className = "play-all ghost danger";
        del.innerHTML = `<i class="fa-solid fa-trash"></i> Delete`;
        del.addEventListener("click", () => {
            if (confirm(`Delete playlist “${p.name}”?`)) {
                Store.deletePlaylist(id);
                navigate("home");
            }
        });
        h.append(rename, del);
        view.appendChild(h);
        if (!p.tracks.length) {
            view.insertAdjacentHTML("beforeend",
                `<p class="empty">This playlist is empty. Add songs with the ＋ button.</p>`);
            return;
        }
        view.appendChild(trackList(p.tracks, {
            onRemove: (t) => { Store.removeFromPlaylist(id, t.id); },
        }));
    }

    // ============================================================
    //  Router + sidebar
    // ============================================================
    function setActiveNav() {
        [navHome, navSearch, navLiked, navHistory].forEach((b) =>
            b && b.classList.remove("active"));
        const map = { home: navHome, search: navSearch, liked: navLiked, history: navHistory };
        if (map[currentView.name]) map[currentView.name].classList.add("active");
        document.querySelectorAll(".pl-item").forEach((el) =>
            el.classList.toggle("active",
                currentView.name === "playlist" && el.dataset.id === currentView.param));
    }

    function navigate(name, param = null) {
        currentView = { name, param };
        setActiveNav();
        if (name === "home") renderHome();
        else if (name === "search") renderSearch($("search").value);
        else if (name === "liked") renderLiked();
        else if (name === "history") renderHistory();
        else if (name === "playlist") renderPlaylist(param);
    }

    function renderSidebar() {
        const playlists = Store.getPlaylists();
        playlistListEl.innerHTML = "";
        playlists.forEach((p) => {
            const item = document.createElement("button");
            item.className = "pl-item";
            item.dataset.id = p.id;
            item.innerHTML = `<i class="fa-solid fa-music"></i>
                <span class="pl-name">${esc(p.name)}</span>
                <span class="pl-count">${p.tracks.length}</span>`;
            item.addEventListener("click", () => navigate("playlist", p.id));
            playlistListEl.appendChild(item);
        });
        setActiveNav();
    }

    // Update only the play-state visuals on existing rows (no refetch).
    function syncPlaying() {
        const cur = Player.current();
        const playing = Player.isPlaying();
        document.querySelectorAll(".track").forEach((row) => {
            const isCur = cur && row.dataset.id === cur.id;
            row.classList.toggle("active", !!isCur);
            const cell = row.querySelector(".t-index");
            if (!cell) return;
            cell.innerHTML = isCur && playing
                ? '<span class="eq"><span></span><span></span><span></span></span>'
                : (Number(row.dataset.index) + 1);
        });
    }

    // re-render the current view & sidebar when data changes
    function refresh() {
        renderSidebar();
        const { name, param } = currentView;
        // Re-render data-backed views so likes/history reflect immediately.
        if (["liked", "history", "playlist"].includes(name)) navigate(name, param);
    }

    return { navigate, renderSidebar, refresh, syncPlaying, openAddToPlaylist, closeModal,
             get current() { return currentView; } };
})();
