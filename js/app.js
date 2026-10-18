(async () => {
  "use strict";

  const SITE = window.SITE;
  const $ = (id) => document.getElementById(id);

  /* ---------------- 曲フォルダの読み込み ----------------
     tracks/01 〜 tracks/07 を順に見て、info.txt に曲名があり audio.mp3 がある曲だけ拾う。
     video.mp4 と lyrics.txt は、あれば使う。 */
  const RESERVED = { 曲名: "title", 長さ: "duration", ダウンロード: "download" };

  function parseInfo(text) {
    const info = { credits: [] };
    text.replace(/^﻿/, "").split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line || line[0] === "#") return;
      const m = line.match(/^([^:：]+)[:：]\s*(.*)$/);
      if (!m) return;
      const key = m[1].trim();
      const val = m[2].trim();
      if (RESERVED[key] === "title") info.title = val;
      else if (RESERVED[key] === "duration") info.duration = val;
      else if (RESERVED[key] === "download") info.download = !/^(なし|no|false|x|×)$/i.test(val);
      else if (val) {
        const parts = val.split("|").map((s) => s.trim());
        info.credits.push({ role: key, name: parts[0], url: parts[1] || undefined });
      }
    });
    return info;
  }

  async function exists(url) {
    try {
      return (await fetch(url, { method: "HEAD", cache: "no-cache" })).ok;
    } catch (e) {
      return false;
    }
  }

  async function readText(url) {
    try {
      const r = await fetch(url, { cache: "no-cache" });
      return r.ok ? (await r.text()).replace(/^﻿/, "").trim() : "";
    } catch (e) {
      return "";
    }
  }

  async function loadTracks() {
    const ids = Array.from({ length: SITE.slots }, (_, i) => String(i + 1).padStart(2, "0"));
    const found = await Promise.all(
      ids.map(async (id) => {
        const dir = "tracks/" + id + "/";
        const text = await readText(dir + "info.txt");
        if (!text) return null;
        const info = parseInfo(text);
        if (!info.title) return null; // 曲名が空の枠は使わない
        const [hasAudio, hasVideo, lyrics, creditsText] = await Promise.all([
          exists(dir + "audio.mp3"),
          exists(dir + "video.mp4"),
          readText(dir + "lyrics.txt"),
          readText(dir + "credits.txt"),
        ]);
        if (!hasAudio) return null;
        // 担当者は credits.txt が基本。info.txt に書いた「役割: 名前」も後ろに足す
        const credits = parseInfo(creditsText).credits.concat(info.credits);
        return {
          id,
          title: info.title,
          audio: dir + "audio.mp3",
          video: hasVideo ? dir + "video.mp4" : undefined,
          lyrics: lyrics || undefined,
          duration: info.duration,
          download: info.download,
          credits,
        };
      })
    );
    return found.filter(Boolean);
  }

  const TRACKS = await loadTracks();

  const audio = $("audio");
  const video = $("mv");
  const stage = $("stage");
  const playBtn = $("play");
  const seekEl = $("seek");
  const curEl = $("cur");
  const durEl = $("dur");
  const lyricsEl = $("lyrics");
  const tabSong = $("tab-song");
  const tabMv = $("tab-mv");
  const tabs = [tabSong, tabMv];

  let index = 0;
  let mode = "song"; // "song" | "mv"
  let seeking = false;
  let lastPosSent = 0;

  const media = () => (mode === "mv" ? video : audio);
  const fmt = (s) => {
    if (!isFinite(s) || s < 0) return "–:–";
    const m = Math.floor(s / 60);
    return m + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ---------------- 静的な部分の描画 ---------------- */
  $("event").textContent = SITE.event;
  $("copyright").textContent = SITE.copyright;
  $("notice").textContent = SITE.notice;

  const ARROW =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const linksEl = $("links");
  SITE.links.forEach((l) => {
    const li = el("li");
    if (l.url) {
      const a = el("a", "link");
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.appendChild(el("span", null, l.label));
      a.insertAdjacentHTML("beforeend", ARROW);
      li.appendChild(a);
    } else {
      const s = el("span", "link link--off");
      s.setAttribute("aria-disabled", "true");
      s.appendChild(el("span", null, l.label));
      s.appendChild(el("span", "link__soon", "準備中"));
      li.appendChild(s);
    }
    linksEl.appendChild(li);
  });

  const listEl = $("tracklist");
  const rows = TRACKS.map((t, i) => {
    const li = el("li");
    const b = el("button", "track");
    b.type = "button";
    b.dataset.index = i;
    b.appendChild(el("span", "track__no", t.id));
    b.appendChild(el("span", "track__title", t.title));
    b.appendChild(el("span", "track__mv", t.video ? "MV" : ""));
    b.appendChild(el("span", "track__dur", t.duration || "–:–"));
    li.appendChild(b);
    listEl.appendChild(li);
    return b;
  });

  if (TRACKS.length < 2) {
    $("prev").hidden = true;
    $("next").hidden = true;
  }

  /* ---------------- 現在の曲の表示 ---------------- */
  function renderCurrent(t) {
    $("now-title").textContent = t.title;
    const first = t.credits && t.credits[0];
    $("now-by").textContent = first ? first.role + "　" + first.name : "";

    // 歌詞
    $("sec-lyrics").hidden = !t.lyrics;
    lyricsEl.textContent = t.lyrics || "";

    // クレジット（担当者は曲ごと。最後に制作サークルを必ず足す）
    const dl = $("credits");
    dl.textContent = "";
    (t.credits || []).concat([{ role: "制作", name: SITE.circle }]).forEach((c) => {
      const row = el("div", "credit");
      row.appendChild(el("dt", null, c.role));
      const dd = el("dd");
      if (c.url) {
        const a = el("a", null, c.name);
        a.href = c.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        dd.appendChild(a);
      } else {
        dd.textContent = c.name;
      }
      row.appendChild(dd);
      dl.appendChild(row);
    });

    // ダウンロード
    const dlLink = $("dl");
    dlLink.hidden = t.download === false;
    dlLink.href = t.audio;
    const ext = (t.audio.match(/\.[a-z0-9]+$/i) || [".mp3"])[0];
    const base = t.downloadName || [SITE.circle, t.id, t.title].join("_");
    dlLink.setAttribute("download", base.replace(/[\\/:*?"<>|\s]+/g, "").replace(/\.[a-z0-9]+$/i, "") + ext);

    // MV タブ
    tabMv.disabled = !t.video;

    // 曲リスト
    rows.forEach((b, i) => {
      if (i === index) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });

    // 進捗の初期化
    seekEl.value = 0;
    seekEl.style.setProperty("--p", "0%");
    seekEl.setAttribute("aria-valuetext", "0:00");
    curEl.textContent = "0:00";
    durEl.textContent = t.duration || "–:–";

    // 共有用に ?track= を更新（QRコードに使える）
    try {
      history.replaceState(null, "", "?track=" + encodeURIComponent(t.id));
    } catch (e) { /* file:// などでは無視 */ }

    updateMediaMetadata(t);
  }

  function applyModeUI() {
    stage.dataset.mode = mode;
    video.hidden = mode !== "mv";
    tabs.forEach((tab) => {
      const on = tab.dataset.mode === mode;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
  }

  /* ---------------- 再生制御 ---------------- */
  function play() {
    const p = media().play();
    if (p && p.catch) p.catch(() => {});
  }
  function pause() {
    media().pause();
  }
  function toggle() {
    media().paused ? play() : pause();
  }

  function loadTrack(i, opts) {
    const autoplay = !!(opts && opts.play);
    index = (i + TRACKS.length) % TRACKS.length;
    const t = TRACKS[index];
    audio.pause();
    video.pause();
    if (mode === "mv" && !t.video) mode = "song";
    applyModeUI();
    const active = media();
    const other = active === audio ? video : audio;
    other.removeAttribute("src");
    other.load();
    active.src = mode === "mv" ? t.video : t.audio;
    renderCurrent(t);
    updatePlayUI();
    if (autoplay) play();
  }

  function setMode(next) {
    if (next === mode) return;
    const t = TRACKS[index];
    if (next === "mv" && !t.video) return;
    const from = media();
    const time = from.currentTime || 0;
    const wasPlaying = !from.paused;
    from.pause();
    mode = next;
    applyModeUI();
    const to = media();
    from.removeAttribute("src");
    from.load();
    to.src = next === "mv" ? t.video : t.audio;
    to.addEventListener(
      "loadedmetadata",
      () => {
        try { to.currentTime = time; } catch (e) { /* 無視 */ }
      },
      { once: true }
    );
    if (wasPlaying) play();
    updatePlayUI();
  }

  const next = () => loadTrack(index + 1, { play: true });
  const prev = () => {
    if (media().currentTime > 3) media().currentTime = 0;
    else loadTrack(index - 1, { play: true });
  };

  function updatePlayUI() {
    const playing = !media().paused;
    playBtn.dataset.state = playing ? "playing" : "paused";
    playBtn.setAttribute("aria-label", playing ? "一時停止" : "再生");
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }

  function updateProgress() {
    const m = media();
    const d = m.duration;
    const ratio = isFinite(d) && d > 0 ? m.currentTime / d : 0;
    if (!seeking) {
      seekEl.value = Math.round(ratio * 1000);
      seekEl.style.setProperty("--p", ratio * 100 + "%");
      curEl.textContent = fmt(m.currentTime);
      seekEl.setAttribute("aria-valuetext", fmt(m.currentTime) + " / " + fmt(d));
    }
    if ("mediaSession" in navigator && navigator.mediaSession.setPositionState && isFinite(d) && d > 0) {
      const now = Date.now();
      if (now - lastPosSent > 1000) {
        lastPosSent = now;
        try {
          navigator.mediaSession.setPositionState({
            duration: d,
            position: Math.min(m.currentTime, d),
            playbackRate: m.playbackRate || 1,
          });
        } catch (e) { /* 無視 */ }
      }
    }
  }

  function onDuration() {
    const d = media().duration;
    if (!isFinite(d)) return;
    durEl.textContent = fmt(d);
    const durCell = rows[index].querySelector(".track__dur");
    if (durCell) durCell.textContent = fmt(d);
  }

  // audio / video どちらのイベントも、いま使っている側だけ処理する
  const bind = (m) => {
    const guard = (fn) => (e) => { if (e.target === media()) fn(e); };
    m.addEventListener("timeupdate", guard(updateProgress));
    m.addEventListener("durationchange", guard(onDuration));
    m.addEventListener("loadedmetadata", guard(onDuration));
    m.addEventListener("play", guard(updatePlayUI));
    m.addEventListener("pause", guard(updatePlayUI));
    m.addEventListener("ended", guard(() => {
      if (index < TRACKS.length - 1) loadTrack(index + 1, { play: true });
      else { m.currentTime = 0; updatePlayUI(); updateProgress(); }
    }));
    m.addEventListener("error", guard(() => {
      if (!m.getAttribute("src")) return;
      $("now-by").textContent = "音源を読み込めませんでした";
      updatePlayUI();
    }));
  };
  bind(audio);
  bind(video);

  /* ---------------- 操作 ---------------- */
  playBtn.addEventListener("click", toggle);
  $("prev").addEventListener("click", prev);
  $("next").addEventListener("click", next);

  rows.forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.index);
      if (i === index) toggle();
      else loadTrack(i, { play: true });
    })
  );

  tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  $("tab-song").parentElement.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const enabled = tabs.filter((t) => !t.disabled);
    const cur = enabled.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const nextTab = enabled[(cur + (e.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
    if (nextTab) { e.preventDefault(); setMode(nextTab.dataset.mode); nextTab.focus(); }
  });

  seekEl.addEventListener("input", () => {
    seeking = true;
    const d = media().duration;
    if (!isFinite(d)) return;
    const t = (seekEl.value / 1000) * d;
    curEl.textContent = fmt(t);
    seekEl.style.setProperty("--p", seekEl.value / 10 + "%");
    seekEl.setAttribute("aria-valuetext", fmt(t) + " / " + fmt(d));
  });
  seekEl.addEventListener("change", () => {
    const m = media();
    if (isFinite(m.duration)) m.currentTime = (seekEl.value / 1000) * m.duration;
    seeking = false;
  });

  // スペースで再生/一時停止（ボタンやリンクにフォーカスがあるときは本来の動作を優先）
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (e.code !== "Space" || (t.closest && t.closest("button, a, input, select, textarea, summary"))) return;
    e.preventDefault();
    toggle();
  });

  // 歌詞のコピー抑止（CSSの user-select:none と合わせて、簡単な操作を防ぐ。完全な防止ではない）
  ["copy", "cut", "contextmenu", "dragstart", "selectstart"].forEach((ev) =>
    lyricsEl.addEventListener(ev, (e) => e.preventDefault())
  );

  /* ---------------- ロック画面・通知（Media Session） ---------------- */
  function updateMediaMetadata(t) {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const first = t.credits && t.credits[0];
    const art = t.artwork
      ? [{ src: t.artwork, sizes: "512x512", type: "image/png" }]
      : [96, 192, 512].map((s) => ({ src: "assets/img/artwork-" + s + ".png", sizes: s + "x" + s, type: "image/png" }));
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: first ? first.name : SITE.circle,
      album: SITE.circle + " " + SITE.event,
      artwork: art,
    });
  }

  if ("mediaSession" in navigator) {
    const set = (action, fn) => {
      try { navigator.mediaSession.setActionHandler(action, fn); } catch (e) { /* 未対応の操作は無視 */ }
    };
    set("play", play);
    set("pause", pause);
    set("stop", () => { pause(); media().currentTime = 0; });
    set("previoustrack", prev);
    set("nexttrack", next);
    // 10秒送り戻し（seekbackward/seekforward）は登録しない。iOS ではこれがあると
    // ロック画面のボタンが「前後の曲」ではなく「10秒送り戻し」になってしまうため
    set("seekto", (d) => {
      const m = media();
      if (d.fastSeek && "fastSeek" in m) m.fastSeek(d.seekTime);
      else m.currentTime = d.seekTime;
    });
  }

  /* ---------------- 初期化 ---------------- */
  if (TRACKS.length) {
    // ?track=02 でも ?track=2 でも、フォルダ番号で曲を選ぶ
    const param = new URLSearchParams(location.search).get("track") || "";
    const wanted = /^\d+$/.test(param) ? param.padStart(2, "0") : param;
    loadTrack(Math.max(0, TRACKS.findIndex((t) => t.id === wanted)));
  } else {
    // 曲が1つもない（フォルダが空、または file:// で開いていて読み込めない）
    $("now-title").textContent = "曲がまだ登録されていません";
    $("now-by").textContent = "tracks フォルダに曲を入れてください";
    document.querySelectorAll(".seek, .ctrl, .tabs, .dl").forEach((n) => (n.hidden = true));
    ["h-tracks", "h-credits"].forEach((id) => ($(id).closest(".sec").hidden = true));
    $("sec-lyrics").hidden = true;
  }

  /* ---------------- ローディング演出 ---------------- */
  const loader = $("loader");
  const root = document.documentElement;
  if (loader) {
    const MIN = 1400; // 最短で見せる時間
    const MAX = 6000; // どんなに遅くてもここで開く
    const numEl = $("loader-num");
    const litEl = $("loader-lit");
    // 明るいロゴを左から見せる（脈拍の線が進捗バーになる）
    const setLit = (ratio) => { litEl.style.clipPath = "inset(0 " + (100 - ratio * 100) + "% 0 0)"; };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = { dom: true, fonts: false, art: false };
    const real = () => 0.15 + (done.fonts ? 0.35 : 0) + (done.art ? 0.5 : 0);

    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 4000))]).then(() => { done.fonts = true; });
    const art = document.querySelector(".stage__art");
    const artReady = art.complete && art.naturalWidth
      ? Promise.resolve()
      : new Promise((r) => { art.addEventListener("load", r, { once: true }); art.addEventListener("error", r, { once: true }); });
    artReady.then(() => { done.art = true; });

    const t0 = performance.now();
    let shown = 0;
    let last = t0;
    let reachedAt = 0;
    let left = false;
    let timer = 0;
    const finish = () => { loader.remove(); root.classList.remove("is-loading"); };
    const leave = () => {
      if (left) return;
      left = true;
      clearInterval(timer);
      numEl.textContent = "100%";
      setLit(1);
      loader.classList.add("is-leaving");
      if (reduce) return setTimeout(finish, 300);
      setTimeout(() => loader.classList.add("is-open"), 520);
      setTimeout(finish, 1300);
    };
    const tick = (now) => {
      if (left) return;
      const elapsed = now - t0;
      const goal = elapsed >= MAX ? 1 : Math.min(real(), Math.min(1, elapsed / MIN));
      // 表示はフレームレートに依存せず、時間でなめらかに追いかける
      shown += (goal - shown) * (1 - Math.exp(-(now - last) / 120));
      last = now;
      if (goal >= 1) {
        reachedAt = reachedAt || now;
        if (shown > 0.995 || now - reachedAt > 300) return leave();
      }
      numEl.textContent = Math.round(shown * 100) + "%";
      setLit(shown);
    };
    // rAF ではなくタイマーで回す（描画が間引かれる環境でも進捗が止まらないように）
    timer = setInterval(() => tick(performance.now()), 33);
    // 何があっても、最長時間を過ぎたら必ず開く
    setTimeout(leave, MAX + 500);
  } else {
    root.classList.remove("is-loading");
  }
})();
