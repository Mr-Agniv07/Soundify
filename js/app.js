/* ============================================================
   App bootstrap — wires the sidebar, top-bar search, modal,
   and connects Store/Player changes to the UI.
   ============================================================ */
(function init() {
    const $ = (id) => document.getElementById(id);

    // Bulletproof mobile viewport height: lock the app to the *visible*
    // height so the player bar is never hidden behind the browser's
    // address/nav bar (older phones don't support CSS `dvh`).
    function setAppHeight() {
        const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
        document.body.style.height = h + "px";
    }
    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.addEventListener("orientationchange", setAppHeight);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", setAppHeight);

    // ---- Sidebar nav ----
    $("nav-home").addEventListener("click", () => UI.navigate("home"));
    $("nav-search").addEventListener("click", () => { UI.navigate("search"); $("search").focus(); });
    $("nav-liked").addEventListener("click", () => UI.navigate("liked"));
    $("nav-history").addEventListener("click", () => UI.navigate("history"));
    $("btn-create-playlist").addEventListener("click", () => {
        const name = prompt("New playlist name:");
        if (name === null) return;
        const p = Store.createPlaylist(name);
        UI.navigate("playlist", p.id);
    });

    // ---- Top-bar search (debounced) ----
    const searchEl = $("search");
    const clearEl = $("search-clear");
    let debounce;
    searchEl.addEventListener("input", (e) => {
        const q = e.target.value;
        clearEl.classList.toggle("show", q.length > 0);
        if (UI.current.name !== "search") UI.navigate("search");
        clearTimeout(debounce);
        debounce = setTimeout(() => UI.navigate("search"), 300);
    });
    searchEl.addEventListener("focus", () => {
        if (UI.current.name !== "search") UI.navigate("search");
    });
    clearEl.addEventListener("click", () => {
        searchEl.value = "";
        clearEl.classList.remove("show");
        searchEl.focus();
        UI.navigate("search");
    });

    // ---- Modal close ----
    $("modal").addEventListener("click", (e) => {
        if (e.target.id === "modal" || e.target.closest(".modal-close")) UI.closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") UI.closeModal();
    });

    // ---- Now-playing panel toggle (mobile) ----
    const npToggle = $("np-toggle");
    if (npToggle) {
        npToggle.addEventListener("click", () =>
            document.body.classList.toggle("show-np"));
    }

    // ---- Reactivity ----
    // Data changes (likes / playlists / history) → refresh sidebar + data views.
    Store.onChange(() => UI.refresh());
    // Playback changes → update row highlight + Liked/History live.
    Player.onChange(() => {
        UI.syncPlaying();
        if (["liked", "history"].includes(UI.current.name)) UI.refresh();
    });

    // ---- Go ----
    UI.renderSidebar();
    UI.navigate("home");
})();
