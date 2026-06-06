/* ============================================================
   Player engine — owns the <audio> element, the queue, the
   bottom player bar, the now-playing panel, and the visualizer.
   Views (ui.js) drive it through Player.playContext(...).
   ============================================================ */
const Player = (() => {
    const audio = new Audio();
    audio.preload = "metadata";

    let queue = [];        // array of normalized track objects
    let index = -1;        // current position within `queue`
    let order = [];        // permutation of queue indices = playback order
    let orderPos = -1;     // current position within `order`
    let isShuffle = false;
    let repeatMode = 0;    // 0 off · 1 all · 2 one
    let lastLoggedId = null;

    const listeners = new Set();
    const emit = () => listeners.forEach((fn) => fn());

    // ---- DOM ----
    const $ = (id) => document.getElementById(id);
    const els = {
        play: $("masterplay"), prev: $("previous"), next: $("next"),
        shuffle: $("shuffle"), repeat: $("repeat"),
        seek: $("seek"), cur: $("cur-time"), dur: $("dur-time"),
        vol: $("volume"), mute: $("mute"),
        barCover: $("bar-cover"), barTitle: $("bar-title"), barArtist: $("bar-artist"),
        barLike: $("bar-like"),
        npCover: $("np-cover"), npTitle: $("np-title"), npArtist: $("np-artist"),
        canvas: $("visualizer"), queueList: $("queue-list"),
    };

    // ---- helpers ----
    function fmtTime(sec) {
        if (!sec || isNaN(sec)) return "0:00";
        const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    function buildOrder() {
        order = queue.map((_, i) => i);
        if (isShuffle) {
            const rest = order.filter((i) => i !== index);
            for (let i = rest.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [rest[i], rest[j]] = [rest[j], rest[i]];
            }
            order = index >= 0 ? [index, ...rest] : rest;
        }
        orderPos = order.indexOf(index);
    }

    function paintMeta(track) {
        const cover = track.artworkLarge || track.artwork || "logo.jpg";
        els.barCover.src = cover;
        els.npCover.src = cover;
        els.barTitle.textContent = track.title;
        els.npTitle.textContent = track.title;
        els.barArtist.textContent = track.artist;
        els.npArtist.textContent = track.artist;
        document.title = `${track.title} · ${track.artist} — Soundify`;
        paintLike();
    }

    function paintLike() {
        const t = current();
        const liked = t && Store.isLiked(t.id);
        els.barLike.classList.toggle("on", !!liked);
        els.barLike.querySelector("i").className =
            liked ? "fa-solid fa-heart" : "fa-regular fa-heart";
    }

    async function load(autoplay) {
        const track = queue[index];
        if (!track) return;
        paintMeta(track);
        renderQueue();
        emit();
        try {
            audio.src = await Audius.streamUrl(track.id);
            if (autoplay) await audio.play();
        } catch (e) {
            console.error("Stream failed:", e);
        }
    }

    function current() { return queue[index] || null; }

    // ---- queue panel ----
    function renderQueue() {
        const list = els.queueList;
        if (!queue.length) {
            list.innerHTML = `<p class="queue-empty">Queue is empty. Pick a song to start.</p>`;
            return;
        }
        const upcoming = order.slice(orderPos + 1).concat(order.slice(0, orderPos));
        if (!upcoming.length) {
            list.innerHTML = `<p class="queue-empty">End of queue.</p>`;
            return;
        }
        list.innerHTML = "";
        upcoming.forEach((qi) => {
            const t = queue[qi];
            const row = document.createElement("div");
            row.className = "queue-item";
            row.innerHTML = `
                <img src="${t.artwork || "logo.jpg"}" alt="" loading="lazy">
                <div class="q-text">
                    <div class="q-name">${escapeHtml(t.title)}</div>
                    <div class="q-artist">${escapeHtml(t.artist)}</div>
                </div>`;
            row.addEventListener("click", () => jumpTo(qi));
            list.appendChild(row);
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function jumpTo(qIndex) {
        index = qIndex;
        orderPos = order.indexOf(index);
        load(true);
    }

    // ============================================================
    //  Public playback API
    // ============================================================
    function playContext(tracks, startIndex = 0) {
        if (!tracks || !tracks.length) return;
        queue = tracks.slice();
        index = Math.max(0, Math.min(startIndex, queue.length - 1));
        buildOrder();
        load(true);
    }

    function toggle() {
        if (!current()) return;
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
    }

    function next() {
        if (!order.length) return;
        orderPos = (orderPos + 1) % order.length;
        index = order[orderPos];
        load(true);
    }

    function prev() {
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        if (!order.length) return;
        orderPos = (orderPos - 1 + order.length) % order.length;
        index = order[orderPos];
        load(true);
    }

    // ============================================================
    //  Wire controls
    // ============================================================
    els.play.addEventListener("click", toggle);
    els.next.addEventListener("click", next);
    els.prev.addEventListener("click", prev);

    els.shuffle.addEventListener("click", () => {
        isShuffle = !isShuffle;
        els.shuffle.classList.toggle("on", isShuffle);
        buildOrder();
        renderQueue();
    });

    els.repeat.addEventListener("click", () => {
        repeatMode = (repeatMode + 1) % 3;
        els.repeat.classList.toggle("on", repeatMode !== 0);
        els.repeat.querySelector("i").className =
            repeatMode === 2 ? "fa-solid fa-repeat" : "fa-solid fa-repeat";
        // tiny "1" badge for repeat-one
        els.repeat.classList.toggle("one", repeatMode === 2);
        els.repeat.title = ["Repeat: off", "Repeat: all", "Repeat: one"][repeatMode];
    });

    els.barLike.addEventListener("click", () => {
        const t = current();
        if (!t) return;
        Store.toggleLike(t);
        paintLike();
        emit();
    });

    audio.addEventListener("play", () => {
        els.play.querySelector("i").className = "fa-solid fa-pause";
        const t = current();
        if (t && t.id !== lastLoggedId) { Store.addHistory(t); lastLoggedId = t.id; }
        startVisualizer();
        emit();
    });
    audio.addEventListener("pause", () => {
        els.play.querySelector("i").className = "fa-solid fa-play";
        emit();
    });

    audio.addEventListener("ended", () => {
        if (repeatMode === 2) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
        const isLast = orderPos === order.length - 1;
        if (isLast && repeatMode === 0) { audio.pause(); audio.currentTime = 0; return; }
        next();
    });

    audio.addEventListener("timeupdate", () => {
        const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        els.seek.value = pct;
        els.seek.style.background =
            `linear-gradient(90deg,var(--accent) ${pct}%,rgba(255,255,255,.18) ${pct}%)`;
        els.cur.textContent = fmtTime(audio.currentTime);
    });
    audio.addEventListener("loadedmetadata", () => {
        els.dur.textContent = fmtTime(audio.duration);
    });
    els.seek.addEventListener("input", () => {
        if (audio.duration) audio.currentTime = (els.seek.value / 100) * audio.duration;
    });

    function applyVolume() {
        audio.volume = els.vol.value / 100;
        els.vol.style.background =
            `linear-gradient(90deg,#fff ${els.vol.value}%,rgba(255,255,255,.18) ${els.vol.value}%)`;
        const i = els.mute.querySelector("i");
        i.className = audio.volume === 0 ? "fa-solid fa-volume-xmark"
            : audio.volume < 0.5 ? "fa-solid fa-volume-low"
            : "fa-solid fa-volume-high";
        localStorage.setItem("soundify_vol", els.vol.value);
    }
    let lastVol = 100;
    els.vol.addEventListener("input", applyVolume);
    els.mute.addEventListener("click", () => {
        if (audio.volume > 0) { lastVol = els.vol.value; els.vol.value = 0; }
        else els.vol.value = lastVol || 100;
        applyVolume();
    });

    // restore saved volume
    const savedVol = localStorage.getItem("soundify_vol");
    if (savedVol !== null) els.vol.value = savedVol;
    applyVolume();

    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.code === "Space") { e.preventDefault(); toggle(); }
        else if (e.code === "ArrowRight") next();
        else if (e.code === "ArrowLeft") prev();
    });

    // ============================================================
    //  Visualizer (Web Audio API → canvas, with taint fallback)
    // ============================================================
    const canvas = els.canvas, cx = canvas.getContext("2d");
    let actx, analyser, dataArray, rafId, graphReady = false;
    let useFallback = false, zeroFrames = 0;

    function setupGraph() {
        if (graphReady) return;
        try {
            actx = new (window.AudioContext || window.webkitAudioContext)();
            const src = actx.createMediaElementSource(audio);
            analyser = actx.createAnalyser();
            analyser.fftSize = 128;
            src.connect(analyser);
            analyser.connect(actx.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        } catch {
            analyser = null;      // cross-origin/tainted → synthetic bars
            useFallback = true;
        }
        graphReady = true;
    }

    function resize() {
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;
    }
    window.addEventListener("resize", resize);

    function draw() {
        rafId = requestAnimationFrame(draw);
        const w = canvas.width, h = canvas.height;
        cx.clearRect(0, 0, w, h);
        if (audio.paused) return;

        let values;
        if (analyser && !useFallback) {
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            if (sum === 0) { if (++zeroFrames > 30) useFallback = true; }
            else zeroFrames = 0;
            values = dataArray;
        }
        if (!analyser || useFallback) {
            const n = 32;
            values = Array.from({ length: n }, (_, i) =>
                70 + 80 * Math.abs(Math.sin(Date.now() / 220 + i * 0.5)));
        }

        const bars = values.length;
        const gap = 2 * devicePixelRatio;
        const bw = (w - gap * (bars - 1)) / bars;
        const grad = cx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, "rgba(29,185,84,.95)");
        grad.addColorStop(1, "rgba(139,92,246,.95)");
        cx.fillStyle = grad;
        for (let i = 0; i < bars; i++) {
            const bh = Math.max(2, (values[i] / 255) * h);
            cx.fillRect(i * (bw + gap), h - bh, bw, bh);
        }
    }

    function startVisualizer() {
        setupGraph();
        if (actx && actx.state === "suspended") actx.resume();
        resize();
        if (!rafId) draw();
    }

    return {
        playContext,
        playTrack: (t) => playContext([t], 0),
        toggle, next, prev,
        current,
        isPlaying: () => !audio.paused,
        onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
})();
