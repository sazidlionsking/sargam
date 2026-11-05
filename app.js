"use strict";
(function () {
/* ================= helpers ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const store = {
  get(k, d) { try { const v = localStorage.getItem("sg_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("sg_" + k, JSON.stringify(v)); } catch (e) {} }
};
const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
let lang = store.get("lang", "en");
const L = (k, v) => {
  let s = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]);
  return s;
};
const P = d => '<path d="' + d + '"/>';
const IC = {
  play: P("M8 5v14l11-7z"), pause: P("M6 19h4V5H6v14zm8-14v14h4V5h-4z"),
  next: P("M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"), prev: P("M6 6h2v12H6zm3.5 6l8.5 6V6z"),
  shuffle: P("M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"),
  repeat: P("M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"),
  repeat1: P("M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"),
  heartO: P("M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"),
  heart: P("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"),
  more: P("M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"),
  search: P("M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"),
  settings: P("M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"),
  add: P("M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"),
  back: P("M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"),
  down: P("M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"),
  up: P("M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"),
  note: P("M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"),
  video: P("M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"),
  person: P("M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"),
  album: P("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"),
  playlist: P("M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"),
  trash: P("M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"),
  hide: P("M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"),
  speed: P("M20.38 8.57l-1.23 1.85a8 8 0 01-.22 7.58H5.07A8 8 0 0115.58 6.85l1.85-1.23A10 10 0 003.35 19a2 2 0 001.72 1h13.85a2 2 0 001.74-1 10 10 0 00-.27-10.44zm-9.79 6.84a2 2 0 002.83 0l5.66-8.49-8.49 5.66a2 2 0 000 2.83z"),
  timer: P("M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"),
  lyrics: P("M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"),
  eq: P("M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"),
  check: P("M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"),
  globe: P("M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 015.08 16zm2.95-8H5.08a7.987 7.987 0 014.33-3.56A15.65 15.65 0 008.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"),
  info: P("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"),
  backup: P("M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"),
  swap: P("M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"),
  edit: P("M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"),
  minus: P("M19 13H5v-2h14v2z"),
  headset: P("M12 1a9 9 0 00-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 00-9-9z")
};
const ic = (n, c) => '<svg class="ic ' + (c || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || "") + "</svg>";

/* ================= IndexedDB ================= */
let db;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("sargam", 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("items", { keyPath: "id", autoIncrement: true }); d.createObjectStore("pl", { keyPath: "id", autoIncrement: true }); };
    r.onsuccess = () => { db = r.result; res(); };
    r.onerror = () => rej(r.error);
  });
}
function req(st, mode, f) {
  return new Promise((res, rej) => {
    const t = db.transaction(st, mode); const r = f(t.objectStore(st));
    t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
}
const dbAll = s => req(s, "readonly", o => o.getAll());
const dbPut = (s, v) => req(s, "readwrite", o => o.put(v));
const dbDel = (s, k) => req(s, "readwrite", o => o.delete(k));

/* ================= state ================= */
const items = new Map();
let pls = [];
let tab = store.get("tab", "songs");
const TABS = ["songs", "artists", "albums", "playlists"];
let chip = store.get("chip", "all");
const TABIC = { songs: "note", videos: "video", artists: "person", albums: "album", playlists: "playlist" };
if (!TABS.includes(tab)) tab = "songs";
const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
const vis = kind => [...items.values()].filter(i => !i.hidden && (!kind || i.kind === kind)).sort(byTitle);
const isVis = id => { const i = items.get(id); return !!i && !i.hidden; };

/* ================= toast / busy ================= */
let tt;
function toast(m) { const e = $("toast"); e.textContent = m; e.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => e.classList.remove("show"), 2300); }
function busy(on, text, pct) {
  $("busy").classList.toggle("show", !!on);
  if (text != null) $("busyT").textContent = text;
  if (pct != null) $("busyB").style.width = pct + "%";
}

/* ================= history layers (back button) ================= */
const layers = [];
let rootOnly = false;
function pushLayer(type, close) {
  if (rootOnly) { try { history.pushState({ s: 1 }, ""); } catch (e) {} rootOnly = false; }
  layers.push({ type, close });
  try { history.pushState({ l: layers.length }, ""); } catch (e) {}
}
const NATIVE = !!(window.SargamNative && SargamNative.isNative && SargamNative.onBack);
let exitArmed = false;
window.addEventListener("popstate", () => {
  const l = layers.pop();
  if (l) { l.close(); return; }
  if (NATIVE) return;
  if (tab !== "songs") { setTab("songs"); try { history.pushState({ s: 1 }, ""); } catch (e) {} return; }
  toast(L("t_exit")); rootOnly = true;
  setTimeout(() => { if (rootOnly) { rootOnly = false; try { history.pushState({ s: 1 }, ""); } catch (e) {} } }, 2200);
});
if (NATIVE) {
  SargamNative.onBack(() => {
    if (layers.length) { history.back(); return; }
    if (tab !== "songs") { setTab("songs"); return; }
    if (exitArmed) { SargamNative.exit(); return; }
    exitArmed = true; toast(L("t_exit")); setTimeout(() => { exitArmed = false; }, 2200);
  });
} else { try { history.replaceState({ root: 1 }, ""); history.pushState({ s: 1 }, ""); } catch (e) {} }

/* ================= sheet ================= */
let sheetOpen = false;
function openSheet(title, fill) {
  $("sheetTitle").textContent = title;
  $("sheetTitle").dataset.k = "";
  const b = $("sheetBody"); b.innerHTML = ""; fill(b); $("sheet").scrollTop = 0;
  if (!sheetOpen) {
    sheetOpen = true; $("sheet").classList.add("open"); $("scrim").classList.add("open");
    pushLayer("sheet", () => { sheetOpen = false; $("sheet").classList.remove("open"); $("scrim").classList.remove("open"); });
  }
}
function closeSheet() { if (sheetOpen) history.back(); }
$("scrim").onclick = closeSheet;
function srow(b, icon, label, fn, o) {
  o = o || {};
  const e = mk("button", "srow tap" + (o.cls ? " " + o.cls : ""), '<span class="si">' + ic(icon) + '</span><span class="sl">' + esc(label) + "</span>" + (o.val ? '<span class="sv">' + esc(o.val) + "</span>" : "") + (o.check ? '<span class="sc">' + ic("check") + "</span>" : ""));
  e.onclick = fn; b.appendChild(e); return e;
}
function askText(title, init, okLabel, cb) {
  openSheet(title, b => {
    const inp = mk("input", "field"); inp.value = init || ""; inp.placeholder = title; inp.style.userSelect = "text";
    b.appendChild(inp);
    const a = mk("div", "sh-actions");
    const c = mk("button", "chip tap", esc(L("cancel"))); c.onclick = closeSheet;
    const o = mk("button", "chip g tap", esc(okLabel));
    const go = () => { const v = inp.value.trim(); if (!v) return; closeSheet(); cb(v); };
    o.onclick = go; inp.onkeydown = e => { if (e.key === "Enter") go(); };
    a.appendChild(c); a.appendChild(o); b.appendChild(a);
    setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 300);
  });
}

/* ================= pages ================= */
const pages = [];
function openPage(render) {
  const el = mk("div", "page", '<div class="ph"><button class="ib tap pback">' + ic("back") + '</button><div class="pt"></div><div class="pa"></div></div><div class="pb"></div>');
  const p = { el, render, body: el.querySelector(".pb"), edit: false, o: {} };
  el._p = p;
  p.refresh = () => {
    if (p.onRefresh) { p.onRefresh(); return; }
    const r = render(p); const st = p.body.scrollTop;
    el.querySelector(".pt").textContent = r.title || ""; el.querySelector(".pa").innerHTML = r.actions || "";
    p.body.innerHTML = r.html || ""; p.body.scrollTop = st;
  };
  el.querySelector(".pback").onclick = () => history.back();
  $("pages").appendChild(el); pages.push(p); p.refresh();
  pushLayer("page", () => { el.remove(); const i = pages.indexOf(p); if (i >= 0) pages.splice(i, 1); });
  return p;
}

/* ================= list rendering ================= */
let ctxSeq = 0; const ctxs = {};
function covInner(it) { return it.thumb ? '<img alt="" src="' + it.thumb + '">' : ic(it.kind === "v" ? "video" : "note"); }
const sub = it => (it.artist || L("unknown")) + (it.dur ? " · " + fmt(it.dur) : "");
function rowHTML(it, i, o) {
  return '<div class="row tap' + (curId === it.id ? " now" : "") + '" data-id="' + it.id + '" data-i="' + i + '">' +
    '<div class="cov">' + covInner(it) + (it.kind === "v" ? '<i class="vtag">' + ic("video") + "</i>" : "") + '</div><div class="meta"><div class="t">' + esc(it.title) + '</div><div class="s">' + esc(sub(it)) + "</div></div>" +
    (it.fav ? '<span class="fv">' + ic("heart") + "</span>" : "") +
    (o.reorder ? '<button class="mv tap" data-up="' + i + '">' + ic("up") + '</button><button class="mv tap" data-dn="' + i + '">' + ic("down") + "</button>"
      : '<button class="more tap" data-more="' + it.id + '">' + ic("more") + "</button>") + "</div>";
}
function listHTML(ids, o) {
  o = o || {}; const key = "c" + (++ctxSeq); ctxs[key] = ids.slice(); delete ctxs["c" + (ctxSeq - 30)];
  return '<div class="list" data-ctx="' + key + '"' + (o.pl ? ' data-pl="' + o.pl + '"' : "") + ">" + ids.map((id, i) => rowHTML(items.get(id), i, o)).join("") + "</div>";
}
const emptyHTML = (icon, h, t, btn) => '<div class="empty"><div class="big">' + ic(icon) + "</div><h3>" + esc(h) + "</h3><div>" + esc(t || "") + "</div>" + (btn || "") + "</div>";
const srowH = (act, icon, label, val, extra) => '<button class="srow tap" data-act="' + act + '"' + (extra || "") + '><span class="si">' + ic(icon) + '</span><span class="sl">' + esc(label) + "</span>" + (val ? '<span class="sv">' + esc(val) + "</span>" : "") + "</button>";

/* ================= tabs ================= */
function groupBy(field) {
  const m = new Map();
  for (const it of vis()) { const k = it[field] || ""; if (!m.has(k)) m.set(k, []); m.get(k).push(it.id); }
  return [...m.entries()].sort((a, b) => (a[0] || "￿").localeCompare(b[0] || "￿", undefined, { sensitivity: "base" }));
}
function trackBar(count, kindKey, ids) {
  return '<div class="bar-top"><span>' + esc(L(kindKey, { n: count })) + '</span><span class="chips"><button class="chip tap" data-act="tshuf">' + ic("shuffle", "s") + esc(L("shuffle_play")) + '</button><button class="chip g tap" data-act="tplay">' + ic("play", "s") + esc(L("play_all")) + "</button></span></div>";
}
let tabIds = [];
function renderTab() {
  const v = $("view"); const st = v.scrollTop; let h = "";
  if (tab === "songs") {
    const ids = vis(chip === "a" || chip === "v" ? chip : null).map(i => i.id); tabIds = ids;
    const chips = '<div class="chips" style="padding:2px 6px 8px">' + [["all", "chip_all"], ["a", "chip_songs"], ["v", "tab_videos"]].map(([k, l]) => '<button class="chip tap' + (chip === k ? " on" : "") + '" data-chip="' + k + '">' + esc(L(l)) + "</button>").join("") + "</div>";
    if (!ids.length) h = chips + emptyHTML(chip === "v" ? "video" : "note", L(chip === "v" ? "empty_videos" : "empty_songs"), L("empty_hint"), '<div style="margin-top:18px"><button class="chip g tap" data-act="add">' + ic("add", "s") + esc(L("add_files")) + "</button></div>");
    else h = chips + trackBar(ids.length, chip === "v" ? "videos_n" : chip === "a" ? "songs_n" : "items_n") + listHTML(ids);
  } else if (tab === "artists") {
    const g = groupBy("artist");
    h = g.length ? '<div class="list">' + g.map(([k, ids]) => '<div class="row tap" data-act="artist" data-v="' + encodeURIComponent(k) + '"><div class="cov round">' + ic("person") + '</div><div class="meta"><div class="t">' + esc(k || L("unknown")) + '</div><div class="s">' + esc(L("songs_n", { n: ids.length })) + "</div></div></div>").join("") + "</div>"
      : emptyHTML("person", L("empty_songs"), L("empty_hint"));
  } else if (tab === "albums") {
    const g = groupBy("album");
    h = g.length ? '<div class="grid">' + g.map(([k, ids]) => { const th = ids.map(i => items.get(i).thumb).find(Boolean); return '<button class="card tap" data-act="album" data-v="' + encodeURIComponent(k) + '"><div class="cv">' + (th ? '<img alt="" src="' + th + '">' : ic("album")) + '</div><div class="t">' + esc(k || L("unknown_album")) + '</div><div class="s">' + esc(L("songs_n", { n: ids.length })) + "</div></button>"; }).join("") + "</div>"
      : emptyHTML("album", L("empty_songs"), L("empty_hint"));
  } else {
    const favN = [...items.values()].filter(i => i.fav && !i.hidden).length;
    h = srowH("fav", "heart", L("favourites"), String(favN)) + srowH("newpl", "add", L("new_playlist"));
    h += pls.length ? pls.map(p => '<div class="row tap" data-act="pl" data-id="' + p.id + '"><div class="cov">' + ic("playlist") + '</div><div class="meta"><div class="t">' + esc(p.name) + '</div><div class="s">' + esc(L("songs_n", { n: p.ids.filter(isVis).length })) + "</div></div></div>").join("") : '<div class="note">' + esc(L("pl_none")) + "</div>";
  }
  v.innerHTML = h; v.scrollTop = st;
}
function setTab(t) { tab = t; store.set("tab", t); drawNav(); renderTab(); $("view").scrollTop = 0; }
function drawNav() {
  $("nav").innerHTML = TABS.map(t => '<button class="tap' + (t === tab ? " on" : "") + '" data-tab="' + t + '">' + ic(TABIC[t]) + "<span>" + esc(L("tab_" + t)) + "</span></button>").join("");
}

/* ================= sub pages ================= */
function songsPage(titleFn, getIds, o) {
  o = o || {};
  const p = openPage(p => {
    const ids = getIds().filter(isVis); p.ids = ids;
    let actions = "";
    if (ids.length) actions += '<button class="ib tap" data-act="pshuf">' + ic("shuffle") + '</button><button class="ib tap" data-act="pplay">' + ic("play") + "</button>";
    if (o.pl) actions += '<button class="ib tap" data-act="pedit" style="' + (p.edit ? "color:var(--g)" : "") + '">' + ic("swap") + '</button><button class="ib tap" data-act="pmore">' + ic("more") + "</button>";
    return { title: titleFn(), actions, html: ids.length ? listHTML(ids, { pl: o.pl, reorder: p.edit }) : emptyHTML("note", o.emptyT || L("pl_empty"), o.emptyS || "") };
  });
  p.o = o; return p;
}
const artistIds = k => vis().filter(i => (i.artist || "") === k).map(i => i.id);
const albumIds = k => vis().filter(i => (i.album || "") === k).map(i => i.id);
const openArtist = k => songsPage(() => k || L("unknown"), () => artistIds(k));
const openAlbum = k => songsPage(() => k || L("unknown_album"), () => albumIds(k));
const openFav = () => songsPage(() => L("favourites"), () => vis().filter(i => i.fav).map(i => i.id), { emptyT: L("favourites"), emptyS: L("fav_empty") });
const openPlaylist = id => songsPage(() => { const p = pls.find(x => x.id === id); return p ? p.name : ""; }, () => { const p = pls.find(x => x.id === id); return p ? p.ids : []; }, { pl: id });

function openSearch() {
  const p = openPage(() => ({ title: L("search"), html: '<div class="sbox"><input id="sq" type="search" placeholder="' + esc(L("search_ph")) + '" autocomplete="off"></div><div id="sres"></div>' }));
  const fill = () => {
    const q = ($("sq").value || "").trim().toLowerCase(); const r = $("sres");
    if (!q) { r.innerHTML = ""; return; }
    const ids = vis().filter(i => (i.title + " " + i.artist + " " + i.album).toLowerCase().includes(q)).map(i => i.id);
    r.innerHTML = ids.length ? listHTML(ids) : '<div class="empty">' + esc(L("no_results")) + "</div>";
  };
  p.onRefresh = fill; $("sq").oninput = fill;
  setTimeout(() => { try { $("sq").focus(); } catch (e) {} }, 350);
}
function openSettings() {
  openPage(() => ({
    title: L("settings"),
    html: srowH("lang", "globe", L("set_lang"), lang === "hi" ? "हिन्दी" : "English") + srowH("eq", "eq", L("set_eq"), eq.on ? "ON" : "") +
      srowH("hidden", "hide", L("set_hidden"), String([...items.values()].filter(i => i.hidden).length)) + srowH("backup", "backup", L("set_backup")) + srowH("about", "info", L("set_about"))
  }));
}
function openHidden() {
  openPage(() => {
    const hs = [...items.values()].filter(i => i.hidden).sort(byTitle);
    return { title: L("hidden_t"), html: hs.length ? hs.map(i => '<div class="row"><div class="cov">' + covInner(i) + '</div><div class="meta"><div class="t">' + esc(i.title) + '</div><div class="s">' + esc(sub(i)) + '</div></div><button class="chip tap" data-act="unhide" data-id="' + i.id + '">' + esc(L("unhide")) + "</button></div>").join("") : emptyHTML("hide", L("hidden_none"), "") };
  });
}
function eqHTML() {
  const names = ["flat", "bass", "pop", "rock", "classical", "vocal", "dance"]; const nk = { flat: "eq_flat", bass: "eq_bassp", pop: "eq_pop", rock: "eq_rock", classical: "eq_classical", vocal: "eq_vocal", dance: "eq_dance" };
  const hz = ["60 Hz", "230 Hz", "910 Hz", "3.6 kHz", "14 kHz"];
  let h = '<div class="srow" style="cursor:default"><span class="sl">' + esc(L("eq_on")) + '</span><span class="sw' + (eq.on ? " on" : "") + '" data-act="eqon"></span></div>';
  h += '<div class="eqbox' + (eq.on ? "" : " off") + '"><div class="sec">' + esc(L("eq_presets")) + '</div><div class="chips" style="padding:4px 12px 10px">' + names.map(n => '<button class="chip tap' + (eq.preset === n ? " on" : "") + '" data-act="eqpre" data-v="' + n + '">' + esc(L(nk[n])) + "</button>").join("") + "</div>";
  h += hz.map((f, i) => '<div class="eqrow"><label>' + f + '</label><input type="range" min="-12" max="12" step="1" value="' + eq.g[i] + '" data-eqb="' + i + '"><span class="v">' + eq.g[i] + " dB</span></div>").join("");
  h += '<div class="sec">' + esc(L("eq_bass")) + '</div><div class="eqrow"><label></label><input type="range" min="0" max="15" step="1" value="' + eq.bass + '" data-eqbass="1"><span class="v">' + eq.bass + " dB</span></div></div>";
  return h + '<div class="note">' + esc(L("eq_note")) + "</div>";
}
function openEQ() { openPage(() => ({ title: L("set_eq"), html: eqHTML() })); }
function eqSheet() { openSheet(L("set_eq"), b => { b.innerHTML = eqHTML(); b.querySelectorAll("input[type=range]").forEach(setP); }); $("sheetTitle").dataset.k = "eq"; }
function infoSheet(id) {
  const it = items.get(id); if (!it) return;
  openSheet(L("edit_info"), b => {
    const t = mk("input", "field"); t.value = it.title; t.placeholder = L("f_title");
    const a = mk("input", "field"); a.value = it.artist; a.placeholder = L("f_artist"); a.style.marginTop = "8px";
    b.appendChild(t); b.appendChild(a);
    const save = async () => { const nt = t.value.trim(); if (nt) it.title = nt; it.artist = a.value.trim(); it.edited = 1; await dbPut("items", it); refreshAll(); if (curId === it.id) uiTrack(); };
    const acts = mk("div", "sh-actions");
    const s1 = mk("button", "chip tap", esc(L("save"))); s1.onclick = async () => { await save(); closeSheet(); };
    const s2 = mk("button", "chip g tap", esc(L("lyr_search_btn"))); s2.onclick = async () => { await save(); closeSheet(); findOnline(it); };
    acts.appendChild(s1); acts.appendChild(s2); b.appendChild(acts);
    srow(b, "lyrics", L("lyr_paste"), () => pasteLyrSheet(id));
    srow(b, "add", L("lyr_add"), () => { lrcTarget = id; $("lrcIn").value = ""; $("lrcIn").click(); });
  });
}
function pasteLyrSheet(id) {
  const it = items.get(id); if (!it) return;
  openSheet(L("lyr_paste"), b => {
    const ta = mk("textarea", "field"); ta.value = it.lyrics || ""; b.appendChild(ta);
    const a = mk("div", "sh-actions"); const o = mk("button", "chip g tap", esc(L("save")));
    o.onclick = async () => { it.lyrics = ta.value.trim(); await dbPut("items", it); closeSheet(); if (curId === id) { lyr.data = parseLyrics(it.lyrics); lyr.state = ""; lyr.idx = -1; renderLyrics(); } toast(L("lyr_saved")); };
    a.appendChild(o); b.appendChild(a);
  });
}
function openBackup() {
  openPage(() => ({ title: L("bk_title"), html: '<div class="note">' + esc(L("bk_desc")) + "</div>" + srowH("bkexp", "backup", L("bk_export")) + srowH("bkfile", "add", L("bk_import_file")) + srowH("bkpaste", "edit", L("bk_import_paste")) }));
}

/* ================= item operations ================= */
async function setFav(id, v) { const it = items.get(id); if (!it) return; it.fav = v ? 1 : 0; await dbPut("items", it); refreshAll(); uiHeart(); }
async function hideItem(id) {
  const it = items.get(id); if (!it) return; it.hidden = 1; await dbPut("items", it);
  if (curId === id) stopPlayback();
  queue = queue.filter(x => x !== id); orig = orig.filter(x => x !== id); if (curId != null) qi = queue.indexOf(curId);
  refreshAll(); toast(L("hidden_done"));
}
async function unhideItem(id) { const it = items.get(id); if (!it) return; it.hidden = 0; await dbPut("items", it); refreshAll(); }
async function deleteItem(id) {
  if (curId === id) stopPlayback();
  await dbDel("items", id); items.delete(id);
  for (const p of pls) { const n = p.ids.length; p.ids = p.ids.filter(x => x !== id); if (p.ids.length !== n) await dbPut("pl", p); }
  queue = queue.filter(x => x !== id); orig = orig.filter(x => x !== id); if (curId != null) qi = queue.indexOf(curId);
  refreshAll(); toast(L("del_done"));
}
async function createPlaylist(name) { const p = { name, ids: [], ghosts: [] }; p.id = await dbPut("pl", p); pls.push(p); refreshAll(); return p; }
async function addToPl(plId, id) {
  const p = pls.find(x => x.id === plId); if (!p) return;
  if (p.ids.includes(id)) { toast(L("already_pl", { name: p.name })); return; }
  p.ids.push(id); await dbPut("pl", p); refreshAll(); toast(L("added_pl", { name: p.name }));
}
async function removeFromPl(plId, id) { const p = pls.find(x => x.id === plId); if (!p) return; p.ids = p.ids.filter(x => x !== id); await dbPut("pl", p); refreshAll(); toast(L("removed_pl")); }
async function movePl(plId, i, d) {
  const p = pls.find(x => x.id === plId); if (!p) return;
  const shown = p.ids.filter(isVis), rest = p.ids.filter(x => !isVis(x)); const j = i + d;
  if (j < 0 || j >= shown.length) return;
  const t = shown[i]; shown[i] = shown[j]; shown[j] = t; p.ids = shown.concat(rest); await dbPut("pl", p); refreshAll();
}
function addToPlSheet(id) {
  openSheet(L("choose_pl"), b => {
    srow(b, "add", L("new_playlist"), () => askText(L("playlist_name"), "", L("create"), async name => { const p = await createPlaylist(name); await addToPl(p.id, id); }));
    pls.forEach(p => srow(b, "playlist", p.name, async () => { closeSheet(); await addToPl(p.id, id); }, { val: String(p.ids.length) }));
  });
}
function speedSheet() {
  openSheet(L("speed_title"), b => [0.5, 0.75, 1, 1.25, 1.5, 2].forEach(v => srow(b, "speed", v + "x", () => { setSpeed(v); closeSheet(); }, { check: v === speed })));
}
function sleepSheet() {
  openSheet(L("sleep_title") + (sleep.end ? " · " + L("sleep_left", { t: fmt((sleep.end - Date.now()) / 1000) }) : ""), b => {
    [15, 30, 45, 60].forEach(m => srow(b, "timer", m === 60 ? L("sleep_hour") : L("sleep_min", { n: m }), () => { setSleep(m); closeSheet(); }));
    srow(b, "timer", L("sleep_song"), () => { setSleep("song"); closeSheet(); });
    if (sleep.end || sleep.song) srow(b, "minus", L("sleep_off"), () => { clearSleep(); closeSheet(); });
  });
}
function deleteSheet(id) {
  const it = items.get(id);
  openSheet(L("del_title"), b => {
    b.appendChild(mk("div", "msg", esc(it.title) + "<br><br>" + esc(L("del_msg"))));
    const a = mk("div", "sh-actions");
    const c = mk("button", "chip tap", esc(L("cancel"))); c.onclick = closeSheet;
    const o = mk("button", "chip g tap", esc(L("del_ok"))); o.onclick = () => { closeSheet(); deleteItem(id); };
    a.appendChild(c); a.appendChild(o); b.appendChild(a);
  });
}
function openItemMenu(id, listEl) {
  const it = items.get(id); if (!it) return; const plId = listEl && listEl.dataset.pl ? +listEl.dataset.pl : null;
  openSheet(it.title, b => {
    srow(b, it.fav ? "heart" : "heartO", it.fav ? L("menu_unfav") : L("menu_fav"), () => { closeSheet(); setFav(id, !it.fav); });
    srow(b, "playlist", L("menu_addpl"), () => addToPlSheet(id));
    srow(b, "speed", L("menu_speed"), () => speedSheet(), { val: speed + "x" });
    srow(b, "timer", L("menu_sleep"), () => sleepSheet());
    srow(b, "edit", L("edit_info"), () => infoSheet(id));
    srow(b, "hide", L("menu_hide"), () => { closeSheet(); hideItem(id); });
    if (plId) srow(b, "minus", L("menu_remove_pl"), () => { closeSheet(); removeFromPl(plId, id); });
    srow(b, "trash", L("menu_delete"), () => deleteSheet(id), { cls: "danger" });
  });
}

/* ================= ID3 / metadata ================= */
const ss = (b, o) => ((b[o] & 127) << 21) | ((b[o + 1] & 127) << 14) | ((b[o + 2] & 127) << 7) | (b[o + 3] & 127);
const be32 = (b, o) => (b[o] * 16777216) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
function dec(b, enc) {
  try {
    if (enc === 1) {
      if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
      if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
      return new TextDecoder("utf-16le").decode(b);
    }
    if (enc === 2) return new TextDecoder("utf-16be").decode(b);
    if (enc === 3) return new TextDecoder("utf-8").decode(b);
    return new TextDecoder("iso-8859-1").decode(b);
  } catch (e) { return ""; }
}
const clean = s => s.replace(/\u0000+$/g, "").replace(/\u0000/g, " / ").trim();
const txt = d => clean(dec(d.subarray(1), d[0]));
function termAt(d, start, enc) { // find end of the terminated string; returns index after terminator
  if (enc === 0 || enc === 3) { for (let i = start; i < d.length; i++) if (d[i] === 0) return i + 1; return d.length; }
  for (let i = start; i + 1 < d.length; i += 2) if (d[i] === 0 && d[i + 1] === 0) return i + 2;
  return d.length;
}
async function readID3(file) {
  const out = {};
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return out;
    const ver = head[3]; if (ver < 3) return out;
    const size = Math.min(ss(head, 6), 12 * 1024 * 1024);
    const buf = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer());
    let p = 0;
    if (head[5] & 0x40) p = ver === 4 ? ss(buf, 0) : be32(buf, 0) + 4;
    while (p + 10 <= buf.length) {
      const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const sz = ver === 4 ? ss(buf, p + 4) : be32(buf, p + 4);
      if (sz <= 0 || p + 10 + sz > buf.length) break;
      const d = buf.subarray(p + 10, p + 10 + sz); p += 10 + sz;
      if (id === "TIT2") out.title = txt(d);
      else if (id === "TPE1") out.artist = txt(d);
      else if (id === "TALB") out.album = txt(d);
      else if (id === "USLT" && !out.lyrics) { const e = d[0]; const s = termAt(d, 4, e); out.lyrics = dec(d.subarray(s), e).replace(/\u0000+$/g, "").trim(); }
      else if (id === "APIC" && !out.cover) {
        const e = d[0]; let i = 1; while (i < d.length && d[i] !== 0) i++;
        const mime = String.fromCharCode.apply(null, d.subarray(1, i)); const s = termAt(d, i + 2, e); const img = d.subarray(s);
        if (img.length > 100) out.cover = new Blob([img], { type: /png/i.test(mime) || (img[0] === 0x89) ? "image/png" : "image/jpeg" });
      }
    }
  } catch (e) {}
  return out;
}
function shrink(blob, max) {
  max = max || 320;
  return new Promise(res => {
    const u = URL.createObjectURL(blob), im = new Image();
    im.onload = () => {
      try {
        const s = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.82));
      } catch (e) { URL.revokeObjectURL(u); res(null); }
    };
    im.onerror = () => { URL.revokeObjectURL(u); res(null); }; im.src = u;
  });
}
function shrinkBlob(blob, max, q) {
  return new Promise(res => {
    const u = URL.createObjectURL(blob), im = new Image();
    im.onload = () => {
      try {
        const sc = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(b => res(b), "image/jpeg", q);
      } catch (e) { URL.revokeObjectURL(u); res(null); }
    };
    im.onerror = () => { URL.revokeObjectURL(u); res(null); }; im.src = u;
  });
}
const fcc = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
function mp4Items(buf, s, e, out) {
  let p = s;
  while (p + 8 <= e) {
    const sz = be32(buf, p), t = fcc(buf, p + 4);
    if (sz < 8 || p + sz > e) break;
    const ps = p + 8, pe = p + sz;
    if (t === "udta" || t === "moov") mp4Items(buf, ps, pe, out);
    else if (t === "meta") mp4Items(buf, ps + 4, pe, out);
    else if (t === "ilst") {
      let q = ps;
      while (q + 8 <= pe) {
        const isz = be32(buf, q), it = fcc(buf, q + 4);
        if (isz < 8 || q + isz > pe) break;
        const d = q + 8;
        if (d + 16 <= q + isz && fcc(buf, d + 4) === "data") {
          const dsz = be32(buf, d), flags = be32(buf, d + 8) & 0xffffff, body = buf.subarray(d + 16, Math.min(d + dsz, q + isz));
          const tx = () => new TextDecoder("utf-8").decode(body).trim();
          if (it === "\xA9nam") out.title = tx(); else if (it === "\xA9ART") out.artist = tx(); else if (it === "aART" && !out.artist) out.artist = tx();
          else if (it === "\xA9alb") out.album = tx(); else if (it === "\xA9lyr") out.lyrics = tx();
          else if (it === "covr") out.cover = new Blob([body], { type: flags === 14 ? "image/png" : "image/jpeg" });
        }
        q += isz;
      }
    }
    p += sz;
  }
}
async function readMP4(file) {
  const out = {};
  try {
    let off = 0; const size = file.size;
    while (off + 8 <= size) {
      const h = new Uint8Array(await file.slice(off, off + 16).arrayBuffer());
      let sz = be32(h, 0), hdr = 8; const t = fcc(h, 4);
      if (sz === 1) { sz = be32(h, 12) + be32(h, 8) * 4294967296; hdr = 16; } else if (sz === 0) sz = size - off;
      if (sz < hdr) break;
      if (t === "moov") { if (sz > 40 * 1024 * 1024) break; const mv = new Uint8Array(await file.slice(off + hdr, off + sz).arrayBuffer()); mp4Items(mv, 0, mv.length, out); break; }
      off += sz;
    }
  } catch (e) {}
  return out;
}
function probe(file, kind) {
  return new Promise(res => {
    const u = URL.createObjectURL(file); const m = document.createElement(kind === "v" ? "video" : "audio");
    m.preload = "metadata"; m.muted = true; let done = false;
    const fin = r => { if (done) return; done = true; clearTimeout(to); try { m.removeAttribute("src"); m.load(); } catch (e) {} URL.revokeObjectURL(u); res(r); };
    const to = setTimeout(() => fin({ dur: 0 }), 20000);
    m.onerror = () => fin({ dur: 0, err: 1 });
    m.onloadedmetadata = () => {
      const dur = isFinite(m.duration) ? m.duration : 0;
      if (kind !== "v") return fin({ dur });
      if (!m.videoWidth) return fin({ dur, audioOnly: true });
      const fr = dur > 4 ? [0.12, 0.28, 0.45, 0.62, 0.8] : [0.3]; let k = 0, best = null, bestL = -1;
      const cv = document.createElement("canvas");
      const grab = () => {
        const r = m.videoWidth / m.videoHeight || 1.78; cv.width = 640; cv.height = Math.round(640 / r) || 360;
        const g = cv.getContext("2d"); g.drawImage(m, 0, 0, cv.width, cv.height);
        const px = g.getImageData(0, 0, cv.width, cv.height).data; let sum = 0, n = 0;
        for (let i = 0; i < px.length; i += 64) { sum += px[i] + px[i + 1] + px[i + 2]; n += 3; }
        if (sum / n > bestL) { bestL = sum / n; best = document.createElement("canvas"); best.width = cv.width; best.height = cv.height; best.getContext("2d").drawImage(cv, 0, 0); }
      };
      const finish = () => {
        if (!best) return fin({ dur });
        const t = document.createElement("canvas"); t.width = 240; t.height = Math.round(240 * best.height / best.width);
        t.getContext("2d").drawImage(best, 0, 0, t.width, t.height);
        const thumb = t.toDataURL("image/jpeg", 0.75);
        best.toBlob(bl => fin({ dur, thumb, art: bl }), "image/jpeg", 0.88);
      };
      m.onseeked = () => {
        try { grab(); } catch (e) {}
        if (++k < fr.length) { try { m.currentTime = Math.max(0.3, dur * fr[k]); } catch (e) { finish(); } } else finish();
      };
      try { m.currentTime = Math.max(0.3, dur * fr[0]); } catch (e) { fin({ dur }); }
    };
    m.src = u;
  });
}
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|wma|amr)$/i, VIDEO_EXT = /\.(mp4|mkv|webm|3gp|avi|mov|m4v)$/i;
const isMedia = f => /^(audio|video)\//.test(f.type) || AUDIO_EXT.test(f.name) || VIDEO_EXT.test(f.name);
const baseOf = n => n.replace(/\.[^.]+$/, "").toLowerCase().trim();
const NOISE = /\b(official|music video|video|lyrical|lyrics|audio|full song|full video|hd|4k|1080p|720p|remix|visualizer|song)\b/i;
function nameParts(n) {
  let b = n.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
  b = b.replace(/\(([^)]*)\)|\[([^\]]*)\]/g, (m, x, y) => (NOISE.test(x || y || "") ? " " : m)).replace(/\s+/g, " ").trim();
  const bars = b.split(/\s*[|｜]\s*/).filter(Boolean);
  if (bars.length > 1) return { title: bars[0].trim(), artist: NOISE.test(bars[1]) || bars[1].length > 40 ? "" : bars[1].trim() };
  const m = b.match(/^(.{1,40}?)\s+[-–—]\s+(.+)$/);
  if (m) return NOISE.test(m[2]) ? { artist: "", title: m[1].trim() } : { artist: m[1].trim(), title: m[2].trim() };
  return { artist: "", title: b };
}
async function buildItem(f, key) {
  let kind = (/^video\//.test(f.type) || VIDEO_EXT.test(f.name)) && !AUDIO_EXT.test(f.name) ? "v" : "a";
  const tags = /\.(mp4|m4a|m4v|mov|3gp)$/i.test(f.name) ? await readMP4(f) : kind === "a" ? await readID3(f) : {};
  const pr = await probe(f, kind);
  if (kind === "v" && pr.audioOnly) kind = "a";
  let thumb = null, art = null;
  if (tags.cover) { thumb = await shrink(tags.cover, 320); art = await shrinkBlob(tags.cover, 900, 0.9); }
  else if (pr.thumb) { thumb = pr.thumb; art = pr.art || null; }
  const np = nameParts(f.name);
  return { kind, title: tags.title || np.title, artist: tags.artist || np.artist || "", album: tags.album || "", dur: pr.dur || 0, blob: f, thumb, art, tagsDone: 1, lyrics: tags.lyrics || "", base: baseOf(f.name), key, hidden: 0, fav: 0, added: Date.now(), size: f.size };
}
async function importFiles(list) {
  const all = [...list]; const lrcs = all.filter(f => /\.lrc$/i.test(f.name)); const meds = all.filter(f => !/\.lrc$/i.test(f.name) && isMedia(f));
  if (!meds.length && !lrcs.length) { toast(L("no_media")); return; }
  busy(true, "", 0);
  let added = 0, skipped = 0, failed = 0; const have = new Set([...items.values()].map(i => i.key));
  for (let i = 0; i < meds.length; i++) {
    busy(true, L("adding", { a: i + 1, b: meds.length }), (i / meds.length) * 100);
    const f = meds[i]; const key = f.name.toLowerCase() + "|" + f.size;
    if (have.has(key)) { skipped++; continue; }
    try { const it = await buildItem(f, key); it.id = await dbPut("items", it); items.set(it.id, it); have.add(key); added++; } catch (e) { failed++; }
  }
  let lc = 0;
  for (const f of lrcs) {
    let t = ""; try { t = await f.text(); } catch (e) {} if (!t) continue; const b = baseOf(f.name);
    for (const it of items.values()) if (it.base === b) { it.lyrics = t; await dbPut("items", it); lc++; }
  }
  await resolveGhosts(); busy(false);
  refreshAll();
  const parts = []; if (added) parts.push(L("added_n", { n: added })); if (skipped) parts.push(L("skipped_n", { n: skipped })); if (failed) parts.push(L("failed_n", { n: failed })); if (lc) parts.push(L("lrc_n", { n: lc }));
  toast(parts.join(" · ") || L("no_media"));
  if (lyr.on) loadLyrics();
}

/* ================= lyrics ================= */
const lyr = { on: false, data: null, idx: -1, state: "", tried: {} };
let lrcTarget = null;
function parseLyrics(t) {
  if (!t) return null;
  const out = []; let synced = false;
  for (const ln of t.replace(/\r/g, "").split("\n")) {
    const m = [...ln.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)]; const text = ln.replace(/\[[^\]]*\]/g, "").trim();
    if (m.length) { synced = true; for (const x of m) out.push({ t: +x[1] * 60 + +x[2] + (x[3] ? +("0." + x[3]) : 0), text }); }
    else if (!/^\[(ar|ti|al|by|offset|length|re|ve|au):/i.test(ln.trim())) out.push({ t: -1, text: ln.trim() });
  }
  if (synced) return { synced: true, lines: out.filter(x => x.t >= 0).sort((a, b) => a.t - b.t) };
  return { synced: false, lines: out };
}
function loadLyrics() {
  const it = curItem(); lyr.data = it ? parseLyrics(it.lyrics) : null; lyr.idx = -1; lyr.state = "";
  renderLyrics();
  if (lyr.on && it && !lyr.data && !lyr.tried[it.id]) findOnline(it);
}
function openLyrics() {
  if (!curItem()) return;
  if (lyr.on) { history.back(); return; }
  lyr.on = true; $("lsheet").classList.add("open"); $("xLyr").classList.add("on");
  pushLayer("lyr", () => { lyr.on = false; $("lsheet").classList.remove("open"); $("xLyr").classList.remove("on"); });
  loadLyrics();
}
function renderLyrics() {
  const body = $("lbody"); if (!body) return; const it = curItem(); if (!it) return;
  $("lT").textContent = it.title; $("lS").textContent = it.artist || L("unknown"); $("lCov").innerHTML = covInner(it);
  $("lDel").style.display = lyr.data ? "" : "none";
  const btns = '<div class="chips" style="justify-content:center;margin-top:14px"><button class="chip tap" data-act="lfind">' + esc(L("lyr_find")) + '</button><button class="chip tap" data-act="ledit">' + esc(L("edit_info")) + "</button></div>";
  let h;
  if (lyr.state === "search") h = '<div class="lmsg">' + esc(L("lyr_search")) + "</div>";
  else if (lyr.data && lyr.data.lines.length) h = lyr.data.lines.map((l, i) => '<p data-i="' + i + '">' + esc(l.text || "♪") + "</p>").join("");
  else h = '<div class="lmsg">' + esc(lyr.state === "offline" ? L("lyr_offline") : lyr.state === "none" ? L("lyr_none") : L("lyr_empty")) + btns + "</div>";
  body.className = "lbody" + (lyr.data && !lyr.data.synced ? " plain" : ""); body.innerHTML = h;
}
async function fetchLrclib(it) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 12000);
  try {
    if (it.artist) {
      const q = new URLSearchParams({ track_name: it.title, artist_name: it.artist }); if (it.album) q.set("album_name", it.album); if (it.dur) q.set("duration", String(Math.round(it.dur)));
      const r = await fetch("https://lrclib.net/api/get?" + q, { signal: ctl.signal });
      if (r.ok) { const j = await r.json(); const t = j.syncedLyrics || j.plainLyrics; if (t) return t; }
    }
    const q2 = new URLSearchParams(it.artist ? { track_name: it.title, artist_name: it.artist } : { q: it.title });
    const r2 = await fetch("https://lrclib.net/api/search?" + q2, { signal: ctl.signal });
    if (r2.ok) { const a = await r2.json(); if (Array.isArray(a)) { const b = a.find(x => x.syncedLyrics) || a.find(x => x.plainLyrics); if (b) return b.syncedLyrics || b.plainLyrics; } }
    const clean2 = it.title.replace(/\(.*?\)|\[.*?\]/g, " ").replace(/\b(prod\.?\s*by|official|video|audio|lyrical|lyrics|full song|hd)\b.*$/i, "").replace(/\s+/g, " ").trim();
    const r3 = await fetch("https://lrclib.net/api/search?" + new URLSearchParams({ q: (clean2 + " " + (it.artist || "")).trim() }), { signal: ctl.signal });
    if (r3.ok) { const a = await r3.json(); if (Array.isArray(a)) { const b = a.find(x => x.syncedLyrics) || a.find(x => x.plainLyrics); if (b) return b.syncedLyrics || b.plainLyrics; } }
    return null;
  } finally { clearTimeout(to); }
}
async function findOnline(it) {
  lyr.tried[it.id] = 1; lyr.state = "search"; renderLyrics();
  let t = null, err = false;
  try { t = await fetchLrclib(it); } catch (e) { err = true; }
  if (t) { it.lyrics = t; await dbPut("items", it); toast(L("lyr_saved")); } else toast(L(err ? "lyr_offline" : "lyr_none"));
  if (curId === it.id) { lyr.data = parseLyrics(it.lyrics); lyr.state = t ? "" : err ? "offline" : "none"; lyr.idx = -1; renderLyrics(); }
}
function syncLyrics(time) {
  if (!lyr.on || !lyr.data || !lyr.data.synced) return;
  const ls = lyr.data.lines; let k = -1; for (let i = 0; i < ls.length; i++) { if (ls[i].t <= time + 0.15) k = i; else break; }
  if (k === lyr.idx) return; lyr.idx = k;
  const body = $("lbody"); if (!body) return;
  body.querySelectorAll("p.on").forEach(e => e.classList.remove("on"));
  const el = body.querySelector('p[data-i="' + k + '"]');
  if (el) { el.classList.add("on"); body.scrollTo({ top: el.offsetTop - body.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" }); }
}

/* ================= player ================= */
let queue = [], orig = [], qi = -1, curId = null, url = null, errCount = 0, artUrl = null;
let shuf = store.get("shuf", false), rep = store.get("rep", "off"), speed = store.get("speed", 1), vpref = store.get("vmode", "video"), mode = "audio";
const sleep = { t: null, end: 0, song: false };
let aud, vid;
const curItem = () => (curId != null ? items.get(curId) : null);
const activeEl = () => { const it = curItem(); return it && it.kind === "v" && mode === "video" ? vid : aud; };
const shuffled = (ids, first) => { const a = ids.filter(x => x !== first); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return first != null ? [first].concat(a) : a; };
function playQueue(ids, i, forceShuffle) {
  ids = ids.filter(isVis); if (!ids.length) return;
  orig = ids.slice(); let start = ids[Math.min(i, ids.length - 1)];
  if (forceShuffle) { shuf = true; store.set("shuf", true); start = ids[Math.floor(Math.random() * ids.length)]; }
  if (shuf) { queue = shuffled(ids, start); qi = 0; } else { queue = ids.slice(); qi = queue.indexOf(start); }
  errCount = 0; load(true); uiShuf();
}
function load(auto) {
  const it = items.get(queue[qi]); if (!it) return;
  curId = it.id; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(it.blob);
  mode = "audio";
  const el = activeEl(), other = el === aud ? vid : aud;
  other.pause(); other.removeAttribute("src"); try { other.load(); } catch (e) {}
  el.src = url; el.defaultPlaybackRate = speed; el.playbackRate = speed;
  if (auto) playEl(el);
  uiTrack();
}
function playEl(el) {
  if (eq.on) eqApply();
  const p = el.play(); if (p && p.catch) p.catch(e => { if (e && e.name === "NotAllowedError") return; if (e && e.name === "AbortError") return; trackError(); });
}
function trackError() {
  const it = curItem(); toast(L("play_err", { n: it ? it.title : "" })); errCount++;
  if (errCount < queue.length) next(true); else { errCount = 0; uiState(); }
}
function next(auto) {
  if (!queue.length) return; let n = qi + 1;
  if (n >= queue.length) { if (rep === "all" || !auto) n = 0; else { const el = activeEl(); try { el.pause(); el.currentTime = 0; } catch (e) {} uiState(); return; } }
  qi = n; load(true);
}
function prev() {
  if (!queue.length) return; const el = activeEl();
  if (el.currentTime > 3) { el.currentTime = 0; return; }
  qi = (qi - 1 + queue.length) % queue.length; load(true);
}
function onEnded() {
  if (sleep.song) { clearSleep(); toast(L("sleep_done")); uiState(); return; }
  if (rep === "one") { const el = activeEl(); el.currentTime = 0; playEl(el); return; }
  next(true);
}
function togglePlay() { const el = activeEl(); if (!curItem()) return; if (el.paused) playEl(el); else el.pause(); }
function stopPlayback() {
  try { aud.pause(); aud.removeAttribute("src"); aud.load(); vid.pause(); vid.removeAttribute("src"); vid.load(); } catch (e) {}
  if (url) { URL.revokeObjectURL(url); url = null; }
  curId = null; if ($("full").classList.contains("open")) history.back(); uiTrack();
}
function setSpeed(v) { speed = v; store.set("speed", v); for (const e of [aud, vid]) { e.defaultPlaybackRate = v; e.playbackRate = v; } toast(v + "x"); }
function toggleShuffle() {
  shuf = !shuf; store.set("shuf", shuf);
  if (queue.length && curId != null) { if (shuf) { queue = shuffled(queue, curId); qi = 0; } else { queue = orig.filter(isVis); if (!queue.includes(curId)) queue.unshift(curId); qi = queue.indexOf(curId); } }
  uiShuf();
}
function cycleRepeat() { rep = rep === "off" ? "all" : rep === "all" ? "one" : "off"; store.set("rep", rep); uiShuf(); }
function setMode(m) {
  const it = curItem(); if (!it || it.kind !== "v" || m === mode) return;
  const old = activeEl(), t = old.currentTime, was = !old.paused; old.pause(); old.removeAttribute("src"); try { old.load(); } catch (e) {}
  mode = m;
  const el = activeEl(); el.src = url; el.defaultPlaybackRate = speed; el.playbackRate = speed;
  el.addEventListener("loadedmetadata", function f() { el.removeEventListener("loadedmetadata", f); try { el.currentTime = t; } catch (e) {} if (was) playEl(el); });
  uiTrack();
}
function setSleep(m) {
  clearSleep();
  if (m === "song") { sleep.song = true; toast(L("sleep_song_set")); }
  else { sleep.end = Date.now() + m * 60000; sleep.t = setTimeout(() => { try { activeEl().pause(); } catch (e) {} clearSleep(); toast(L("sleep_done")); }, m * 60000); toast(L("sleep_set", { n: m })); }
  uiSleep();
}
function clearSleep() { clearTimeout(sleep.t); sleep.t = null; sleep.end = 0; sleep.song = false; uiSleep(); }

/* ---- equalizer (lazy: audio graph is only created when EQ is switched on) ---- */
const BANDS = [60, 230, 910, 3600, 14000];
const PRESETS = { flat: [0, 0, 0, 0, 0], bass: [6, 4, 1, 0, 0], pop: [-1, 2, 4, 2, -1], rock: [4, 2, -2, 2, 4], classical: [4, 3, -2, 2, 3], vocal: [-2, 0, 4, 3, -1], dance: [5, 3, 0, 2, 3] };
let eq = store.get("eq", { on: false, g: [0, 0, 0, 0, 0], bass: 0, preset: "flat" });
let actx = null, enodes = null;
function eqBuild() {
  if (actx) return true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  try {
    actx = new AC(); const bass = actx.createBiquadFilter(); bass.type = "lowshelf"; bass.frequency.value = 110;
    const fs = BANDS.map(f => { const b = actx.createBiquadFilter(); b.type = "peaking"; b.frequency.value = f; b.Q.value = 1; return b; });
    let prevN = bass; fs.forEach(f => { prevN.connect(f); prevN = f; }); prevN.connect(actx.destination);
    for (const el of [aud, vid]) actx.createMediaElementSource(el).connect(bass);
    enodes = { bass, fs }; return true;
  } catch (e) { actx = null; enodes = null; return false; }
}
function eqApply() {
  if (eq.on && !eqBuild()) { eq.on = false; toast(L("eq_fail")); }
  if (enodes) { enodes.bass.gain.value = eq.on ? eq.bass : 0; enodes.fs.forEach((f, i) => { f.gain.value = eq.on ? eq.g[i] : 0; }); if (actx.state === "suspended") actx.resume().catch(() => {}); }
  store.set("eq", eq);
}

/* ================= player UI ================= */
function buildFull() {
  $("full").innerHTML =
    '<div id="fbg"></div><div class="fhead"><button class="ib tap" id="fClose">' + ic("down") + '</button><div class="fh-t" id="fHeadT"></div><button class="ib tap" id="fMore">' + ic("more") + "</button></div>" +
    '<div class="fart" id="fArt"><div class="fcover" id="fCover"></div><video id="vid" playsinline></video><button class="vbtn tap hide" id="fVid"></button></div>' +
    '<div class="finfo"><div class="meta"><div class="fi-t" id="fT"></div><div class="fi-s" id="fS"></div></div><button class="ib tap" id="fHeart"></button></div>' +
    '<div class="fseek"><input type="range" id="seek" min="0" max="1000" value="0"><div class="times"><span id="tCur">0:00</span><span id="tDur">0:00</span></div></div>' +
    '<div class="fctl"><button class="cb tap" id="cShuf">' + ic("shuffle") + '</button><button class="cb sm tap" id="cPrev">' + ic("prev") + '</button><button class="bigplay" id="cPlay"></button><button class="cb sm tap" id="cNext">' + ic("next") + '</button><button class="cb tap" id="cRep"></button></div>' +
    '<div class="fext"><button class="tap" id="xLyr">' + ic("lyrics") + '<span id="xLyrT"></span></button><button class="tap" id="xEq">' + ic("eq") + '<span id="xEqT"></span></button><button class="tap" id="xSleep">' + ic("timer") + '<span id="xSleepT"></span></button><button class="tap" id="xSpeed">' + ic("speed") + '<span id="xSpeedT"></span></button></div>' +
    '<div id="lsheet"><button class="lgrab tap" id="lGrab">' + ic("down") + '</button><div class="lmini"><div class="cov" id="lCov"></div><div class="meta"><div class="t" id="lT"></div><div class="s" id="lS"></div></div></div>' +
    '<div class="lhd"><span id="lTitle"></span><span class="lact"><button class="ib tap" id="lEdit">' + ic("edit") + '</button><button class="ib tap" id="lDel">' + ic("trash") + '</button></span></div><div class="lbody" id="lbody"></div></div>';
  $("mini").innerHTML = '<div class="cov" id="mCov"></div><div class="meta"><div class="t" id="mT"></div><div class="s" id="mS"></div></div><button class="mb tap pp" id="mPlay"></button><button class="mb tap" id="mNext">' + ic("next") + "</button>";
  vid = $("vid");
}
const eaBusy = new Set();
async function upgradeItem(it) {
  if (it.tagsDone && it.art !== undefined) return;
  try {
    const mp4 = /\.(mp4|m4a|m4v|mov|3gp)$/i.test(it.blob.name || "");
    const tags = mp4 ? await readMP4(it.blob) : it.kind === "a" ? await readID3(it.blob) : {};
    if (!it.edited) { if (tags.title) it.title = tags.title; if (tags.artist && !it.artist) it.artist = tags.artist; }
    if (tags.album && !it.album) it.album = tags.album;
    if (tags.lyrics && !it.lyrics) it.lyrics = tags.lyrics;
    if (it.art === undefined) {
      if (tags.cover) { it.thumb = await shrink(tags.cover, 320); it.art = await shrinkBlob(tags.cover, 900, 0.9); }
      else if (it.kind === "v") { const pr = await probe(it.blob, "v"); if (pr.thumb) { it.thumb = pr.thumb; it.art = pr.art || null; } else it.art = null; }
      else it.art = null;
    }
    it.tagsDone = 1; await dbPut("items", it);
  } catch (e) { it.art = it.art === undefined ? null : it.art; it.tagsDone = 1; }
}
async function upgradeAll() {
  let n = 0;
  for (const it of [...items.values()]) { if (!(it.tagsDone && it.art !== undefined)) { await upgradeItem(it); n++; await new Promise(r => setTimeout(r, 40)); } }
  if (n) { refreshAll(); if (curItem()) uiTrack(); }
}
function uiTrack() {
  const it = curItem(); $("mini").classList.toggle("show", !!it);
  document.querySelectorAll(".row[data-id]").forEach(r => r.classList.toggle("now", +r.dataset.id === curId));
  if (!it) { uiState(); return; }
  $("mT").textContent = it.title; $("mS").textContent = it.artist || L("unknown");
  $("mCov").innerHTML = covInner(it);
  $("fT").textContent = it.title; $("fS").textContent = it.artist || L("unknown");
  if (artUrl) { URL.revokeObjectURL(artUrl); artUrl = null; }
  if (it.art) artUrl = URL.createObjectURL(it.art);
  const big = artUrl || it.thumb;
  $("fCover").innerHTML = big ? '<img alt="" src="' + big + '">' : ic(it.kind === "v" ? "video" : "note");
  $("fbg").style.backgroundImage = it.thumb ? "url(" + it.thumb + ")" : "none";
  $("fArt").classList.toggle("m-video", it.kind === "v" && mode === "video");
  const vb = $("fVid"); vb.classList.toggle("hide", it.kind !== "v"); vb.classList.toggle("on", mode === "video"); vb.innerHTML = ic(mode === "video" ? "headset" : "video");
  $("tDur").textContent = fmt(it.dur); uiHeart(); uiState(); uiShuf(); uiSleep(); uiTime(true);
  loadLyrics();
}
function uiHeart() { const it = curItem(); const b = $("fHeart"); if (!b) return; b.innerHTML = ic(it && it.fav ? "heart" : "heartO"); b.classList.toggle("on", !!(it && it.fav)); }
function uiState() {
  const playing = !!curItem() && !activeEl().paused;
  $("cPlay").innerHTML = ic(playing ? "pause" : "play"); $("mPlay").innerHTML = ic(playing ? "pause" : "play");
}
function uiShuf() {
  $("cShuf").classList.toggle("on", shuf); $("cRep").innerHTML = ic(rep === "one" ? "repeat1" : "repeat"); $("cRep").classList.toggle("on", rep !== "off");
  $("xSpeedT").textContent = speed + "x";
}
function uiSleep() { const b = $("xSleep"); if (!b) return; b.classList.toggle("on", !!(sleep.end || sleep.song)); $("xSleepT").textContent = sleep.song ? L("sleep_song").split(" ").slice(-2).join(" ") : sleep.end ? Math.max(1, Math.ceil((sleep.end - Date.now()) / 60000)) + " min" : L("menu_sleep"); }
let seeking = false;
const setP = r => r.style.setProperty("--p", ((r.value - (+r.min || 0)) / ((+r.max || 1000) - (+r.min || 0)) * 100) + "%");
function uiTime(force) {
  const el = activeEl(), it = curItem(); if (!it) return;
  const d = isFinite(el.duration) && el.duration > 0 ? el.duration : it.dur;
  if (!seeking) { $("seek").value = d ? Math.min(1000, (el.currentTime / d) * 1000) : 0; setP($("seek")); $("tCur").textContent = fmt(el.currentTime); }
  if (d) $("tDur").textContent = fmt(d);
  syncLyrics(el.currentTime);
}
function openFull() {
  if (!curItem() || $("full").classList.contains("open")) return;
  $("full").classList.add("open"); pushLayer("full", () => $("full").classList.remove("open"));
}
function setStatic() {
  document.documentElement.lang = lang;
  $("bSearch").innerHTML = ic("search"); $("bAdd").innerHTML = ic("add"); $("bSet").innerHTML = ic("settings");
  $("fHeadT").textContent = L("now_playing"); $("xLyrT").textContent = L("lyrics"); $("xEqT").textContent = L("eq_short"); $("lTitle").textContent = L("lyrics");
  drawNav(); uiShuf(); uiSleep(); if (curItem()) uiTrack();
}
function refreshAll() { renderTab(); pages.forEach(p => p.refresh()); }

/* ================= backup ================= */
const gh = () => store.get("gh", []), gf = () => store.get("gf", []);
function makeBackup() {
  const all = [...items.values()]; const keyOf = id => { const i = items.get(id); return i && i.key; };
  return {
    app: "sargam", v: 1, when: new Date().toISOString(),
    favs: all.filter(i => i.fav).map(i => i.key).concat(gf()),
    hidden: all.filter(i => i.hidden).map(i => i.key).concat(gh()),
    playlists: pls.map(p => ({ name: p.name, keys: p.ids.map(keyOf).filter(Boolean).concat(p.ghosts || []) }))
  };
}
async function applyBackup(j) {
  if (!j || j.app !== "sargam") { toast(L("bk_bad")); return; }
  const byKey = new Map([...items.values()].map(i => [i.key, i])); let ok = 0, wait = 0;
  const nf = gf(), nh = gh();
  for (const k of j.favs || []) { const it = byKey.get(k); if (it) { it.fav = 1; await dbPut("items", it); ok++; } else if (!nf.includes(k)) { nf.push(k); wait++; } }
  for (const k of j.hidden || []) { const it = byKey.get(k); if (it) { it.hidden = 1; await dbPut("items", it); ok++; } else if (!nh.includes(k)) { nh.push(k); wait++; } }
  store.set("gf", nf); store.set("gh", nh);
  for (const bp of j.playlists || []) {
    let p = pls.find(x => x.name === bp.name); if (!p) { p = { name: bp.name, ids: [], ghosts: [] }; p.id = await dbPut("pl", p); pls.push(p); }
    p.ghosts = p.ghosts || [];
    for (const k of bp.keys || []) { const it = byKey.get(k); if (it) { if (!p.ids.includes(it.id)) { p.ids.push(it.id); ok++; } } else if (!p.ghosts.includes(k)) { p.ghosts.push(k); wait++; } }
    await dbPut("pl", p);
  }
  refreshAll(); toast(L("bk_done", { a: ok, b: wait }));
}
async function resolveGhosts() {
  const byKey = new Map([...items.values()].map(i => [i.key, i]));
  const f2 = []; for (const k of gf()) { const it = byKey.get(k); if (it) { it.fav = 1; await dbPut("items", it); } else f2.push(k); } store.set("gf", f2);
  const h2 = []; for (const k of gh()) { const it = byKey.get(k); if (it) { it.hidden = 1; await dbPut("items", it); } else h2.push(k); } store.set("gh", h2);
  for (const p of pls) {
    if (!p.ghosts || !p.ghosts.length) continue; const rest = [];
    for (const k of p.ghosts) { const it = byKey.get(k); if (it) { if (!p.ids.includes(it.id)) p.ids.push(it.id); } else rest.push(k); }
    if (rest.length !== p.ghosts.length) { p.ghosts = rest; await dbPut("pl", p); }
  }
}
function exportSheet() {
  const text = JSON.stringify(makeBackup(), null, 1);
  openSheet(L("bk_export"), b => {
    const ta = mk("textarea", "field"); ta.value = text; ta.readOnly = true; b.appendChild(ta);
    const a = mk("div", "sh-actions");
    const c = mk("button", "chip tap", esc(L("bk_copy")));
    c.onclick = async () => { try { await navigator.clipboard.writeText(text); } catch (e) { ta.select(); try { document.execCommand("copy"); } catch (e2) {} } toast(L("bk_copied")); };
    const s = mk("button", "chip g tap", esc(L("bk_save")));
    s.onclick = async () => {
      const file = new File([text], "sargam-backup.json", { type: "application/json" });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
      const u = URL.createObjectURL(file); const l = mk("a"); l.href = u; l.download = "sargam-backup.json"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast(L("bk_saved"));
    };
    a.appendChild(c); a.appendChild(s); b.appendChild(a);
  });
}
function pasteSheet() {
  openSheet(L("bk_import_paste"), b => {
    const ta = mk("textarea", "field"); ta.placeholder = L("bk_paste_ph"); b.appendChild(ta);
    const a = mk("div", "sh-actions"); const o = mk("button", "chip g tap", esc(L("bk_import")));
    o.onclick = async () => { let j = null; try { j = JSON.parse(ta.value); } catch (e) {} closeSheet(); await applyBackup(j); };
    a.appendChild(o); b.appendChild(a);
  });
}

/* ================= events ================= */
function onAct(el) {
  const act = el.dataset.act, pg = el.closest(".page"), p = pg && pg._p;
  switch (act) {
    case "add": $("fileIn").click(); break;
    case "tplay": playQueue(tabIds, 0); break;
    case "tshuf": playQueue(tabIds, 0, true); break;
    case "artist": openArtist(decodeURIComponent(el.dataset.v)); break;
    case "album": openAlbum(decodeURIComponent(el.dataset.v)); break;
    case "fav": openFav(); break;
    case "pl": openPlaylist(+el.dataset.id); break;
    case "newpl": askText(L("playlist_name"), "", L("create"), name => createPlaylist(name)); break;
    case "pplay": if (p) playQueue(p.ids, 0); break;
    case "pshuf": if (p) playQueue(p.ids, 0, true); break;
    case "pedit": if (p) { p.edit = !p.edit; p.refresh(); } break;
    case "pmore": if (p) { const id = p.o.pl; const pl = pls.find(x => x.id === id); openSheet(pl.name, b => {
        srow(b, "edit", L("rename"), () => askText(L("playlist_name"), pl.name, L("save"), async n => { pl.name = n; await dbPut("pl", pl); refreshAll(); }));
        srow(b, "trash", L("delete_playlist"), async () => { closeSheet(); await dbDel("pl", id); pls = pls.filter(x => x.id !== id); toast(L("pl_deleted")); setTimeout(() => { history.back(); }, 120); refreshAll(); }, { cls: "danger" });
      }); } break;
    case "lang": openSheet(L("lang_pick"), b => [["en", "English"], ["hi", "हिन्दी"]].forEach(([k, n]) => srow(b, "globe", n, () => { lang = k; store.set("lang", k); closeSheet(); setStatic(); refreshAll(); }, { check: lang === k }))); break;
    case "eq": openEQ(); break;
    case "hidden": openHidden(); break;
    case "backup": openBackup(); break;
    case "about": openSheet(L("set_about"), b => { b.appendChild(mk("div", "msg", esc(L("about_text")) + '<br><br><b style="color:var(--g);font-size:17px">' + esc(L("created_by")) + "</b><br>" + esc(L("version")))); }); break;
    case "unhide": unhideItem(+el.dataset.id); break;
    case "eqon": eq.on = !eq.on; eqApply(); refreshAll(); if ($("sheetTitle").dataset.k === "eq") eqSheet(); break;
    case "eqpre": eq.preset = el.dataset.v; eq.g = PRESETS[eq.preset].slice(); eq.bass = eq.preset === "bass" ? 8 : 0; eq.on = true; eqApply(); refreshAll(); if ($("sheetTitle").dataset.k === "eq") eqSheet(); break;
    case "bkexp": exportSheet(); break;
    case "bkfile": $("bkIn").value = ""; $("bkIn").click(); break;
    case "bkpaste": pasteSheet(); break;
    case "lfind": { const it = curItem(); if (it) { lyr.tried[it.id] = 0; findOnline(it); } break; }
    case "ledit": if (curItem()) infoSheet(curId); break;
  }
}
document.addEventListener("click", e => {
  const t = e.target;
  let n = t.closest("[data-tab]"); if (n) { if (n.dataset.tab !== tab) setTab(n.dataset.tab); return; }
  n = t.closest("[data-chip]"); if (n) { chip = n.dataset.chip; store.set("chip", chip); renderTab(); return; }
  n = t.closest("[data-more]"); if (n) { openItemMenu(+n.dataset.more, n.closest(".list")); return; }
  n = t.closest("[data-up]"); if (n) { const p = n.closest(".page")._p; movePl(p.o.pl, +n.dataset.up, -1); return; }
  n = t.closest("[data-dn]"); if (n) { const p = n.closest(".page")._p; movePl(p.o.pl, +n.dataset.dn, 1); return; }
  n = t.closest("[data-act]"); if (n) { onAct(n); return; }
  n = t.closest(".row[data-id]"); if (n) { const l = n.closest(".list"); if (l && ctxs[l.dataset.ctx]) playQueue(ctxs[l.dataset.ctx], +n.dataset.i); return; }
});
document.addEventListener("input", e => {
  const t = e.target;
  const live = () => { eq.on = true; document.querySelectorAll(".sw").forEach(x => x.classList.add("on")); document.querySelectorAll(".eqbox").forEach(x => x.classList.remove("off")); };
  if (t.dataset && t.dataset.eqb != null) { eq.g[+t.dataset.eqb] = +t.value; eq.preset = ""; t.nextElementSibling.textContent = t.value + " dB"; setP(t); live(); eqApply(); }
  else if (t.dataset && t.dataset.eqbass != null) { eq.bass = +t.value; t.nextElementSibling.textContent = t.value + " dB"; setP(t); live(); eqApply(); }
});

function wire() {
  aud = $("aud");
  for (const el of [aud, vid]) {
    el.addEventListener("timeupdate", () => { if (el === activeEl()) uiTime(); });
    el.addEventListener("play", () => { if (el === activeEl()) uiState(); });
    el.addEventListener("pause", () => { if (el === activeEl()) uiState(); });
    el.addEventListener("playing", () => { errCount = 0; if (el === activeEl()) uiState(); });
    el.addEventListener("loadedmetadata", () => { if (el === activeEl()) uiTime(); });
    el.addEventListener("ended", () => { if (el === activeEl()) onEnded(); });
    el.addEventListener("error", () => { if (el === activeEl() && el.getAttribute("src")) trackError(); });
  }
  $("bAdd").onclick = () => $("fileIn").click();
  $("bSearch").onclick = openSearch;
  $("bSet").onclick = openSettings;
  $("mini").onclick = e => { if (e.target.closest("#mPlay")) { togglePlay(); return; } if (e.target.closest("#mNext")) { next(false); return; } openFull(); };
  $("fClose").onclick = () => history.back();
  $("fMore").onclick = () => { const it = curItem(); if (it) openItemMenu(it.id, null); };
  $("fHeart").onclick = () => { const it = curItem(); if (it) setFav(it.id, !it.fav); };
  $("cPlay").onclick = togglePlay; $("cNext").onclick = () => next(false); $("cPrev").onclick = prev;
  $("cShuf").onclick = toggleShuffle; $("cRep").onclick = cycleRepeat;
  $("xLyr").onclick = openLyrics; $("lGrab").onclick = () => history.back();
  $("lEdit").onclick = () => { if (curItem()) infoSheet(curId); };
  $("lDel").onclick = () => { const it = curItem(); if (it) { it.lyrics = ""; dbPut("items", it); lyr.tried[it.id] = 1; lyr.data = null; lyr.state = ""; renderLyrics(); } };
  $("fVid").onclick = () => setMode(mode === "video" ? "audio" : "video");
  $("xEq").onclick = eqSheet;
  $("xSleep").onclick = sleepSheet; $("xSpeed").onclick = speedSheet;
  const sk = $("seek");
  sk.addEventListener("input", () => { seeking = true; setP(sk); const it = curItem(); const el = activeEl(); const d = isFinite(el.duration) && el.duration > 0 ? el.duration : (it ? it.dur : 0); $("tCur").textContent = fmt(sk.value / 1000 * d); });
  sk.addEventListener("change", () => { const it = curItem(); const el = activeEl(); const d = isFinite(el.duration) && el.duration > 0 ? el.duration : (it ? it.dur : 0); if (d) el.currentTime = sk.value / 1000 * d; seeking = false; });
  $("fileIn").onchange = e => { const f = e.target.files; if (f && f.length) importFiles(f); e.target.value = ""; };
  $("lrcIn").onchange = async e => {
    const f = e.target.files && e.target.files[0]; const it = items.get(lrcTarget != null ? lrcTarget : curId); if (!f || !it) return;
    try { it.lyrics = await f.text(); await dbPut("items", it); lyr.data = parseLyrics(it.lyrics); lyr.state = ""; lyr.idx = -1; renderLyrics(); toast(L("lyr_saved")); } catch (err) {}
    e.target.value = "";
  };
  $("bkIn").onchange = async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return; let j = null;
    try { j = JSON.parse(await f.text()); } catch (err) {} await applyBackup(j); e.target.value = "";
  };
}

/* ================= start ================= */
(async function init() {
  try { if (window.SargamNative) SargamNative.bars("#07090a"); } catch (e) {}
  buildFull(); wire();
  try {
    await openDB();
    for (const it of await dbAll("items")) items.set(it.id, it);
    pls = await dbAll("pl");
  } catch (e) { toast("Storage error"); }
  setStatic(); renderTab(); setTimeout(upgradeAll, 1500);
  if (eq.on) { /* graph is built on first play */ }
})();
})();
