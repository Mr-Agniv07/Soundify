/* ============================================================
   Soundify — music player
   ============================================================ */

// --- Data: single source of truth for tracks ---
const songs = [
    {
        songName: "Brooklyn Baby",
        artist: "Lana Del Rey",
        filePath: "Lana_Del_Rey_-_Brooklyn_Baby_-_Ultraviolence_out_June_16_UK_June_17_US_Pre-order_on_iTunes_P_(mp3.pm).mp3",
        coverPath: "maxresdefault.jpg",
    },
    {
        songName: "Sway With Me",
        artist: "Michael Bublé",
        filePath: "michael_buble_-_sway_-_Bez_nazvaniya_(mp3.pm).mp3",
        coverPath: "artworks-3XBv1zcHsuRJQQhN-OeFTYg-t1080x1080.jpg",
    },
    {
        songName: "Khuda Jaane",
        artist: "Bachna Ae Haseeno",
        filePath: "Jogi Mahi Bachna Ae Haseeno 128 Kbps.mp3",
        coverPath: "94bedb8101c42ae24bef814cf3434667.jpg",
    },
];

// --- State ---
let currentIndex = 0;
let isShuffle = false;
let repeatMode = 0;          // 0 = off, 1 = repeat all, 2 = repeat one
let shuffleOrder = [];       // playback order of indices when shuffling
let filtered = songs.map((_, i) => i); // indices currently shown in the library

const audio = new Audio();
audio.volume = 1;

// --- Element refs ---
const $ = (id) => document.getElementById(id);
const songlistEl   = $("songlist");
const queueListEl   = $("queue-list");
const searchEl      = $("search");
const searchClearEl = $("search-clear");
const emptyStateEl  = $("empty-state");
const songCountEl   = $("song-count");

const masterPlay = $("masterplay");
const seek       = $("seek");
const volume     = $("volume");
const curTimeEl  = $("cur-time");
const durTimeEl  = $("dur-time");

const npCover  = $("np-cover");
const npTitle  = $("np-title");
const npArtist = $("np-artist");
const barCover  = $("bar-cover");
const barTitle  = $("bar-title");
const barArtist = $("bar-artist");

const shuffleBtn = $("shuffle");
const repeatBtn  = $("repeat");
const muteBtn    = $("mute");

// ============================================================
//  Rendering
// ============================================================
function fmtTime(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function renderLibrary() {
    songlistEl.innerHTML = "";
    filtered.forEach((idx) => {
        const song = songs[idx];
        const row = document.createElement("div");
        row.className = "songitem";
        row.dataset.index = idx;
        row.innerHTML = `
            <div class="cover-wrap">
                <img src="${song.coverPath}" alt="${song.songName}">
                <span class="play-overlay"><i class="fa-solid fa-play"></i></span>
                <span class="eq"><span></span><span></span><span></span><span></span></span>
            </div>
            <div class="song-text">
                <span class="name">${song.songName}</span>
                <span class="artist">${song.artist}</span>
            </div>
            <span class="song-dur"><i class="fa-regular fa-music"></i></span>
        `;
        row.addEventListener("click", () => playSong(idx));
        songlistEl.appendChild(row);
    });

    emptyStateEl.hidden = filtered.length > 0;
    songCountEl.textContent =
        `${filtered.length} song${filtered.length === 1 ? "" : "s"}`;
    syncActiveRow();
}

function renderQueue() {
    const order = playbackOrder();
    const pos = order.indexOf(currentIndex);
    const upcoming = order.slice(pos + 1).concat(order.slice(0, pos)); // wrap-around
    queueListEl.innerHTML = "";

    if (upcoming.length === 0) {
        queueListEl.innerHTML = `<p class="queue-empty">Nothing queued.</p>`;
        return;
    }
    upcoming.forEach((idx) => {
        const song = songs[idx];
        const item = document.createElement("div");
        item.className = "queue-item";
        item.innerHTML = `
            <img src="${song.coverPath}" alt="">
            <div class="q-text">
                <div class="q-name">${song.songName}</div>
                <div class="q-artist">${song.artist}</div>
            </div>
        `;
        item.addEventListener("click", () => playSong(idx));
        queueListEl.appendChild(item);
    });
}

function syncActiveRow() {
    document.querySelectorAll(".songitem").forEach((row) => {
        const active = Number(row.dataset.index) === currentIndex;
        row.classList.toggle("active", active);
        row.classList.toggle("playing", active && !audio.paused);
    });
}

// ============================================================
//  Playback
// ============================================================
function loadSong(idx, { autoplay = true } = {}) {
    currentIndex = idx;
    const song = songs[idx];
    audio.src = song.filePath;

    npCover.src = song.coverPath;
    barCover.src = song.coverPath;
    npTitle.textContent = song.songName;
    barTitle.textContent = song.songName;
    npArtist.textContent = song.artist;
    barArtist.textContent = song.artist;

    if (autoplay) {
        audio.play().catch(() => {});
    }
    renderQueue();
    syncActiveRow();
}

function playSong(idx) {
    if (idx === currentIndex && audio.src) {
        togglePlay();
        return;
    }
    loadSong(idx, { autoplay: true });
}

function togglePlay() {
    if (audio.paused) {
        if (!audio.src) loadSong(currentIndex);
        audio.play().catch(() => {});
    } else {
        audio.pause();
    }
}

// Order of indices used for next/prev/queue
function playbackOrder() {
    return isShuffle ? shuffleOrder : songs.map((_, i) => i);
}

function buildShuffleOrder() {
    // Fisher–Yates over all indices, keeping the current track first
    const rest = songs.map((_, i) => i).filter((i) => i !== currentIndex);
    for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    shuffleOrder = [currentIndex, ...rest];
}

function next() {
    const order = playbackOrder();
    const pos = order.indexOf(currentIndex);
    const nextPos = (pos + 1) % order.length;
    loadSong(order[nextPos], { autoplay: true });
}

function prev() {
    // If more than 3s in, restart current track first (standard player UX)
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    const order = playbackOrder();
    const pos = order.indexOf(currentIndex);
    const prevPos = (pos - 1 + order.length) % order.length;
    loadSong(order[prevPos], { autoplay: true });
}

// ============================================================
//  Events: controls
// ============================================================
masterPlay.addEventListener("click", togglePlay);
$("next").addEventListener("click", next);
$("previous").addEventListener("click", prev);

shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("on", isShuffle);
    if (isShuffle) buildShuffleOrder();
    renderQueue();
});

repeatBtn.addEventListener("click", () => {
    repeatMode = (repeatMode + 1) % 3;
    repeatBtn.classList.toggle("on", repeatMode !== 0);
    const icon = repeatBtn.querySelector("i");
    icon.className = repeatMode === 2 ? "fa-solid fa-repeat-1" : "fa-solid fa-repeat";
    repeatBtn.title = ["Repeat: off", "Repeat: all", "Repeat: one"][repeatMode];
});

// Reflect play/pause state in the UI
audio.addEventListener("play", () => {
    masterPlay.querySelector("i").className = "fa-solid fa-pause";
    syncActiveRow();
    startVisualizer();
});
audio.addEventListener("pause", () => {
    masterPlay.querySelector("i").className = "fa-solid fa-play";
    syncActiveRow();
});

audio.addEventListener("ended", () => {
    if (repeatMode === 2) {            // repeat one
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
    }
    const order = playbackOrder();
    const pos = order.indexOf(currentIndex);
    const isLast = pos === order.length - 1;
    if (isLast && repeatMode === 0) {  // stop at end of list
        audio.pause();
        audio.currentTime = 0;
        return;
    }
    next();
});

// ============================================================
//  Events: progress + volume
// ============================================================
audio.addEventListener("timeupdate", () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    seek.value = pct;
    seek.style.background =
        `linear-gradient(90deg, var(--accent) ${pct}%, rgba(255,255,255,0.18) ${pct}%)`;
    curTimeEl.textContent = fmtTime(audio.currentTime);
});

audio.addEventListener("loadedmetadata", () => {
    durTimeEl.textContent = fmtTime(audio.duration);
});

seek.addEventListener("input", () => {
    if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
});

function applyVolume() {
    audio.volume = volume.value / 100;
    volume.style.background =
        `linear-gradient(90deg, #fff ${volume.value}%, rgba(255,255,255,0.18) ${volume.value}%)`;
    const i = muteBtn.querySelector("i");
    if (audio.volume === 0)      i.className = "fa-solid fa-volume-xmark";
    else if (audio.volume < 0.5) i.className = "fa-solid fa-volume-low";
    else                         i.className = "fa-solid fa-volume-high";
}
volume.addEventListener("input", applyVolume);

let lastVolume = 100;
muteBtn.addEventListener("click", () => {
    if (audio.volume > 0) {
        lastVolume = volume.value;
        volume.value = 0;
    } else {
        volume.value = lastVolume || 100;
    }
    applyVolume();
});

// ============================================================
//  Search
// ============================================================
function applySearch(term) {
    const q = term.trim().toLowerCase();
    filtered = songs
        .map((_, i) => i)
        .filter((i) =>
            !q ||
            songs[i].songName.toLowerCase().includes(q) ||
            songs[i].artist.toLowerCase().includes(q));
    searchClearEl.classList.toggle("show", q.length > 0);
    renderLibrary();
}
searchEl.addEventListener("input", (e) => applySearch(e.target.value));
searchClearEl.addEventListener("click", () => {
    searchEl.value = "";
    applySearch("");
    searchEl.focus();
});

// ============================================================
//  Keyboard shortcuts
// ============================================================
document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return; // don't hijack the search box
    if (e.code === "Space")      { e.preventDefault(); togglePlay(); }
    else if (e.code === "ArrowRight") next();
    else if (e.code === "ArrowLeft")  prev();
});

// ============================================================
//  Visualizer (Web Audio API + canvas, with fallback)
// ============================================================
const canvas = $("visualizer");
const ctx = canvas.getContext("2d");
let audioCtx, analyser, dataArray, rafId, vizStarted = false;

function setupAudioGraph() {
    if (vizStarted) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        vizStarted = true;
    } catch (err) {
        // createMediaElementSource can fail on tainted (file://) audio in some
        // browsers; fall back to a synthetic animation instead.
        vizStarted = true;
        analyser = null;
    }
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
}
window.addEventListener("resize", resizeCanvas);

function drawVisualizer() {
    rafId = requestAnimationFrame(drawVisualizer);
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (audio.paused) return;

    let values;
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        values = dataArray;
    } else {
        // Fallback: fake spectrum driven by time
        const n = 32;
        values = Array.from({ length: n }, (_, i) =>
            80 + 70 * Math.abs(Math.sin(Date.now() / 200 + i * 0.5)));
    }

    const bars = values.length;
    const gap = 2 * devicePixelRatio;
    const barW = (w - gap * (bars - 1)) / bars;
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, "rgba(29,185,84,0.9)");
    grad.addColorStop(1, "rgba(139,92,246,0.9)");
    ctx.fillStyle = grad;

    for (let i = 0; i < bars; i++) {
        const v = values[i] / 255;
        const barH = Math.max(2, v * h);
        ctx.fillRect(i * (barW + gap), h - barH, barW, barH);
    }
}

function startVisualizer() {
    setupAudioGraph();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    resizeCanvas();
    if (!rafId) drawVisualizer();
}

// ============================================================
//  Init
// ============================================================
renderLibrary();
loadSong(0, { autoplay: false });
applyVolume();
