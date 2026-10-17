(function applySavedTheme() {
  const saved = localStorage.getItem("codex-studys-theme");
  if (!saved || saved === "system") return;
  document.documentElement.setAttribute("data-theme", saved);
})();

const FALLBACK_THUMB = "assets/codex-telegram.png";
let allBatches = [];
let activeFilter = "VLEMN";
let searchQuery = "";
let sortMode = "relevance";
let langFilter = "all";
let visibleCount = 24;
const PAGE_SIZE = 24;

/* ---------- Unacademy (Nexthope worker) ---------- */
const UA_WORKER = "https://unc-worker.mikey-nt.workers.dev";
const UA_GOALS = {"KSCGY": "UPSC Civil Services (IAS)", "TMUVD": "JEE Main & Advanced", "YOTUH": "NEET UG", "VLEMN": "SSC Exams", "MAFGF": "GRE", "XNDUS": "CAT", "TEWDQ": "NTA UGC NET", "RTPSX": "Bank Exams", "BBKWG": "CA (Chartered Accountancy)", "MRZFY": "Law Entrance Exams", "DZVHL": "IELTS", "GWDPV": "MP PSC", "GNFFE": "Maharashtra PSC", "FHWHO": "Punjab PSC", "QJEJG": "Railway Exams", "SCANJ": "Rajasthan PSC", "XCTVJ": "UP PSC / UPSSSC", "EWFJR": "English Language", "NJHPJ": "Campus Placements", "SUVLV": "Class 9", "GSZGO": "Class 10", "GWDPZ": "Class 11", "DOZGI": "Personal Development", "ZISFF": "Tamil Nadu PSC", "TUNWK": "CDS / AFCAT / CAPF", "LGQVU": "GMAT", "PESHE": "GATE", "LVECA": "Karnataka PSC", "QKHZF": "AP PSC / Telangana PSC", "NVLIA": "GATE - CSIT, DSAI", "ZIUBD": "Kerala PSC", "RJVOD": "Gujarat PSC", "UQCMN": "West Bengal PSC", "JJTHM": "DSSSB", "BIZXQ": "CSIR UGC NET", "QOIVT": "BPSC", "GMXMZ": "TET", "IFKUZ": "UPTET", "PLWCX": "Class 12 Board", "XTKHH": "OPSC", "ZKXEQ": "Haryana PSC", "EGKYI": "Jammu & Kashmir PSC", "SIFWL": "IIT JAM", "SDDOC": "NEET PG", "WXKBF": "MP TET", "AELON": "Jharkhand PSC", "DOKOV": "Programming", "MCRYW": "Company Secretary", "SWBEI": "Rajasthan TET", "WJWZU": "Haryana TET", "DANNJ": "NDA / Airforce X-Y / Navy", "JXGKD": "HPPSC", "QFJOA": "Engineering Services Exam", "TPSBK": "Foundation NTSE"};
const UA_GOAL_ORDER = ["VLEMN", "KSCGY", "TMUVD", "YOTUH", "RTPSX", "QJEJG", "TUNWK", "PESHE", "TEWDQ", "BIZXQ", "SIFWL", "SDDOC", "BBKWG", "MRZFY", "XNDUS", "MAFGF", "LGQVU", "EWFJR", "DOKOV", "PLWCX", "GWDPZ", "GSZGO", "SUVLV"];
const UA_GOAL_SHORT = { KSCGY: "UPSC", TMUVD: "JEE", YOTUH: "NEET", VLEMN: "SSC", RTPSX: "Banking", QJEJG: "Railway", TUNWK: "Defence", PESHE: "GATE", TEWDQ: "UGC NET", BIZXQ: "CSIR NET", SIFWL: "IIT JAM", SDDOC: "NEET PG", BBKWG: "CA", MRZFY: "Law", XNDUS: "CAT", MAFGF: "GRE", LGQVU: "GMAT", EWFJR: "English", DOKOV: "Coding", PLWCX: "Class 12", GWDPZ: "Class 11", GSZGO: "Class 10", SUVLV: "Class 9" };
const UA_DEFAULT_GOAL = "VLEMN";
const UA_EXTRA_TEACHERS = [
  { goal: "TMUVD", first_name: "Amit", last_name: "Gupta", username: "mitgupt-1395", avatar_v2: "https://static.uacdn.net/educator_new/processed_image/47C4FF69-81B0-472D-9DF2-48C2A7DF46CF_.png?q=75&auto=format,compress&w=128", topics_display: "Physics · JEE", followers_count: 26000 },
  { goal: "TMUVD", first_name: "Sandal", last_name: "Agarwal", username: "unacademy-user-artz952gl36v", avatar_v2: "https://static.uacdn.net/educator_new/processed_image/F47ED962-917B-4791-9AAB-8E28B1C7DC99_.png?q=75&auto=format,compress&w=128", topics_display: "Mathematics · JEE", followers_count: 5200 }
];
const FAV_DATA_KEY = "cx-fav-data";
const UA_META_KEY = "cx-ua-meta";
const seenBatches = {};
const UA = { goal: null, teachers: [], tOff: 0, tTotal: 0, teacher: null, cOff: 0, cTotal: 0, token: 0, busy: false, loadingMore: false, error: "" };

async function uaApi(params, tries = 2) {
  const query = new URLSearchParams(params).toString();
  let lastError;
  for (let attempt = 0; attempt < tries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${UA_WORKER}/?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function goalName(uid) { return UA_GOALS[uid] || "Courses"; }
function goalShort(uid) {
  if (UA_GOAL_SHORT[uid]) return UA_GOAL_SHORT[uid];
  const name = goalName(uid);
  return name.length > 14 ? name.slice(0, 13).trim() + "…" : name;
}
function teacherName(t) { return `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.username || "Educator"; }
function teacherAvatar(t) { return t.avatar_v2 || t.avatar_v1 || t.avatar || t.intro_photo || ""; }

function courseToBatch(course, teacher, goalUid) {
  const uid = course.uid;
  const count = Number(course.itemCount || course.item_count || 0) || 0;
  const batch = {
    _id: uid,
    uid,
    name: course.name || "Untitled course",
    byName: `${teacherName(teacher)}${count ? ` · ${count} lessons` : ""}`,
    language: course.languageDisplay || course.language_display || "",
    previewImage: course.thumbnail || course.thumbnailV1 || course.thumbnail_v1 || "",
    type: "UNACADEMY",
    category: goalShort(goalUid),
    slug: uid,
    lectureCount: count,
    noteCount: 0,
    startDate: course.startDate || course.start_date || "",
    teacher: teacherName(teacher),
    goal: goalUid,
    subBatches: []
  };
  seenBatches[uid] = batch;
  return batch;
}

function saveUaMeta(batch) {
  try {
    const id = batch._id || batch.batch_id;
    const map = readJson(UA_META_KEY, {});
    delete map[id];
    map[id] = { name: batch.name || "", by: batch.byName || "", teacher: batch.teacher || "", thumb: batch.previewImage || "", language: batch.language || "", count: batch.lectureCount || 0 };
    const keys = Object.keys(map);
    keys.slice(0, Math.max(0, keys.length - 150)).forEach((k) => delete map[k]);
    localStorage.setItem(UA_META_KEY, JSON.stringify(map));
  } catch (e) {}
}

function getFavoriteBatches() {
  const data = readJson(FAV_DATA_KEY, {});
  return getFavorites().map((id) => seenBatches[id] || data[id]).filter(Boolean);
}

function hasMoreCourses() {
  return activeFilter !== "favorites" && !!UA.teacher && UA.cOff < UA.cTotal;
}

function gridSkeleton() {
  const grid = $("#batchGrid");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton-card"><div class="skeleton-thumb"></div><div class="skeleton-body"><div class="skeleton-line" style="width:88%"></div><div class="skeleton-line" style="width:60%"></div></div></div>').join("");
}

function renderGoalChips() {
  const row = $("#filters");
  if (!row || row.querySelector("[data-goal-chip]")) return;
  const ordered = [...UA_GOAL_ORDER.filter((uid) => UA_GOALS[uid]), ...Object.keys(UA_GOALS).filter((uid) => !UA_GOAL_ORDER.includes(uid))];
  row.insertAdjacentHTML("beforeend", ordered.map((uid) => `<button class="filter" data-filter="${uid}" data-goal-chip="1" title="${escapeHtml(goalName(uid))}">${escapeHtml(UA_GOAL_SHORT[uid] || goalName(uid))}</button>`).join(""));
  row.querySelector('[data-filter="all"]')?.remove();
}

function updateEduVisibility() {
  const wrap = $("#eduWrap");
  if (wrap) wrap.style.display = activeFilter === "favorites" ? "none" : "";
}

function renderEduRow() {
  const row = $("#eduRow");
  const count = $("#eduCount");
  if (!row) return;
  updateEduVisibility();
  if (count) count.textContent = UA.teachers.length ? `· ${UA.teachers.length}${UA.tOff < UA.tTotal ? "+" : ""}` : "";
  if (UA.busy && !UA.teachers.length) {
    row.innerHTML = Array.from({ length: 6 }, () => '<div class="edu edu-skel"><span class="edu-av"></span><span class="edu-nm">&nbsp;</span></div>').join("");
    return;
  }
  if (!UA.teachers.length) {
    row.innerHTML = UA.error ? '<button class="edu edu-more" type="button" data-edu-retry="1">Retry</button>' : '<span class="edu-empty">No educators found for this goal.</span>';
    return;
  }
  const current = UA.teacher ? (UA.teacher.username || "").toLowerCase() : "";
  row.innerHTML = UA.teachers.map((t) => {
    const name = teacherName(t);
    const username = (t.username || "").toLowerCase();
    const avatar = teacherAvatar(t);
    return `<button class="edu${username === current ? " active" : ""}" type="button" data-edu="${escapeHtml(username)}" title="${escapeHtml(name)}"><span class="edu-av" data-ini="${escapeHtml(name.charAt(0).toUpperCase())}">${avatar ? `<img src="${escapeHtml(avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</span><span class="edu-nm">${escapeHtml(name)}</span></button>`;
  }).join("") + (UA.tOff < UA.tTotal ? '<button class="edu edu-more" type="button" data-edu-more="1">More ›</button>' : "");
}

async function fetchTeachers(token) {
  const data = await uaApi({ action: "teachers", goal_uid: UA.goal, offset: UA.tOff });
  if (token !== UA.token) return;
  const list = data.results || [];
  UA.tTotal = Number(data.count) || 0;
  const known = new Set(UA.teachers.map((t) => (t.username || "").toLowerCase()));
  list.forEach((t) => { const u = (t.username || "").toLowerCase(); if (u && !known.has(u)) { known.add(u); UA.teachers.push(t); } });
  UA.tOff += list.length;
  if (!list.length) UA.tTotal = UA.tOff;
}

async function selectGoal(uid) {
  if (!UA_GOALS[uid]) uid = UA_DEFAULT_GOAL;
  activeFilter = uid;
  try { localStorage.setItem("codex-studys-last-filter", uid); } catch (e) {}
  $$(".filter-row .filter").forEach((item) => item.classList.toggle("active", item.dataset.filter === uid));
  const chip = $(`.filter-row .filter[data-filter="${uid}"]`);
  try { chip?.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
  const token = ++UA.token;
  Object.assign(UA, { goal: uid, teachers: UA_EXTRA_TEACHERS.filter((t) => t.goal === uid).map((t) => ({ ...t })), tOff: 0, tTotal: 0, teacher: null, cOff: 0, cTotal: 0, busy: true, loadingMore: false, error: "" });
  allBatches = [];
  visibleCount = PAGE_SIZE;
  renderEduRow();
  gridSkeleton();
  $("#resultsNote").textContent = `Loading ${goalName(uid)} educators…`;
  try {
    await fetchTeachers(token);
    if (token !== UA.token) return;
    UA.busy = false;
    renderEduRow();
    if (!UA.teachers.length) {
      renderBatches();
      return;
    }
    await selectTeacher(UA.teachers[0]);
  } catch (error) {
    if (token !== UA.token) return;
    console.error(error);
    UA.busy = false;
    UA.error = error.message || "Failed";
    renderEduRow();
    $("#resultsNote").textContent = "The course library could not be loaded.";
    $("#batchGrid").innerHTML = '<div class="empty">Could not reach the course server. <button class="clear-filters-btn" type="button" data-edu-retry="1">Retry</button></div>';
    showToast("Course library unavailable");
  }
}

async function selectTeacher(teacher) {
  const token = ++UA.token;
  Object.assign(UA, { teacher, cOff: 0, cTotal: 0, busy: true, loadingMore: false, error: "" });
  allBatches = [];
  visibleCount = PAGE_SIZE;
  renderEduRow();
  gridSkeleton();
  $("#resultsNote").textContent = `Loading courses by ${teacherName(teacher)}…`;
  try {
    await fetchCourses(token);
    if (token !== UA.token) return;
    UA.busy = false;
    updateStats();
    renderBatches();
    saveUaCache();
  } catch (error) {
    if (token !== UA.token) return;
    console.error(error);
    UA.busy = false;
    $("#resultsNote").textContent = "Courses could not be loaded.";
    $("#batchGrid").innerHTML = '<div class="empty">Failed to load courses for this educator. <button class="clear-filters-btn" type="button" data-course-retry="1">Retry</button></div>';
  }
}

async function fetchCourses(token) {
  const teacher = UA.teacher;
  const data = await uaApi({ action: "courses", username: (teacher.username || "").toLowerCase(), offset: UA.cOff, type: "popular" });
  if (token !== UA.token) return;
  const list = data.results || [];
  UA.cTotal = Number(data.count) || 0;
  UA.cOff += list.length;
  if (!list.length) UA.cTotal = UA.cOff;
  const known = new Set(allBatches.map((b) => b._id));
  list.forEach((course) => { if (course && course.uid && !known.has(course.uid)) { known.add(course.uid); allBatches.push(courseToBatch(course, teacher, UA.goal)); } });
}

async function loadMoreCourses() {
  if (UA.loadingMore || !hasMoreCourses()) return;
  UA.loadingMore = true;
  const token = UA.token;
  try { await fetchCourses(token); saveUaCache(); } catch (error) { console.error(error); showToast("Could not load more courses"); UA.cTotal = UA.cOff; }
  UA.loadingMore = false;
}

function setupEducators() {
  $("#eduRow")?.addEventListener("click", async (event) => {
    if (event.target.closest("[data-edu-retry]")) { selectGoal(activeFilter); return; }
    if (event.target.closest("[data-edu-more]")) {
      const token = UA.token;
      const btn = event.target.closest("[data-edu-more]");
      btn.textContent = "…";
      try { await fetchTeachers(token); } catch (error) { showToast("Could not load more educators"); UA.tTotal = UA.tOff; }
      renderEduRow();
      return;
    }
    const button = event.target.closest("[data-edu]");
    if (!button) return;
    const teacher = UA.teachers.find((t) => (t.username || "").toLowerCase() === button.dataset.edu);
    if (teacher && teacher !== UA.teacher) selectTeacher(teacher);
  });
  $("#batchGrid")?.addEventListener("click", (event) => {
    if (event.target.closest("[data-edu-retry]")) selectGoal(activeFilter);
    else if (event.target.closest("[data-course-retry]") && UA.teacher) selectTeacher(UA.teacher);
  });
}

function showFavorites() {
  activeFilter = "favorites";
  try { localStorage.setItem("codex-studys-last-filter", "favorites"); } catch (e) {}
  visibleCount = PAGE_SIZE;
  $$(".filter-row .filter").forEach((item) => item.classList.toggle("active", item.dataset.filter === "favorites"));
  updateEduVisibility();
  renderBatches();
}

const $ = (selector) => document.querySelector(selector);
const THUMB_PLACEHOLDER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
window.__thumbFallback = (img) => { img.outerHTML = THUMB_PLACEHOLDER_SVG; };
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function categoryFor(batch) {
  if (batch.category) return String(batch.category).toLowerCase();
  const text = `${batch.name || ""} ${batch.byName || ""}`.toLowerCase();
  if (/bank|ibps|sbi|rbi/.test(text)) return "banking";
  if (/upsc|ias|pcs/.test(text)) return "upsc";
  return "ssc";
}

function deepSearchText(batch) {
  if (batch.__searchText) return batch.__searchText;
  const parts = [batch.name, batch.byName, batch.language, batch.type, (batch.slug || "").replace(/-/g, " ")];
  (batch.subBatches || []).forEach((sub) => parts.push(sub.name, sub.byName));
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  Object.defineProperty(batch, "__searchText", { value: text, enumerable: false, writable: true });
  return text;
}

function deepSearchScore(batch, queryWords, rawQuery) {
  const name = (batch.name || "").toLowerCase();
  const text = deepSearchText(batch);
  if (!queryWords.every((word) => text.includes(word))) return 0;
  if (name === rawQuery) return 100;
  if (name.startsWith(rawQuery)) return 80;
  if (name.includes(rawQuery)) return 60;
  if (queryWords.every((word) => name.includes(word))) return 40;
  return 20;
}

function deepSearch(batches, query) {
  const rawQuery = query.trim().toLowerCase();
  if (!rawQuery) return batches;
  const queryWords = rawQuery.split(/\s+/).filter(Boolean);
  return batches
    .map((batch) => ({ batch, score: deepSearchScore(batch, queryWords, rawQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.batch);
}

function openBatch(batch) {
  const id = batch._id || batch.batch_id;
  if (!id) return showToast("This course is not available right now.");
  addRecentlyViewed(batch);
  try { window.CXProfile && window.CXProfile.trackBatch(batch); } catch (e) {}
  renderRecentlyWatched();
  try { sessionStorage.setItem("cx-scroll", String(Math.round(window.scrollY))); } catch (e) {}
  saveUaMeta(batch);
  window.location.href = `batch.html?uid=${encodeURIComponent(id)}`;
}

function getRecentlyViewed() {
  try { return JSON.parse(localStorage.getItem("codex-studys-recent") || "[]"); }
  catch { return []; }
}

function addRecentlyViewed(batch) {
  const id = batch._id || batch.batch_id;
  if (!id) return;
  const entry = { _id: id, name: batch.name || "Untitled course", byName: batch.byName || "", language: batch.language || "", previewImage: batch.previewImage || "" };
  const recent = getRecentlyViewed().filter((item) => item._id !== id);
  recent.unshift(entry);
  localStorage.setItem("codex-studys-recent", JSON.stringify(recent.slice(0, 8)));
}

const RECENT_LECTURES_KEY = "codex-studys-recent-lectures";
const DONE_KEY = "cx-done";
let recentExpanded = false;

function readJson(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
  catch { return fallback; }
}

function getRecentLectures() {
  const list = readJson(RECENT_LECTURES_KEY, []);
  return Array.isArray(list) ? list.filter((x) => x && x.b && x.i != null).slice(0, 10) : [];
}

function getDoneMap() {
  const map = readJson(DONE_KEY, {});
  return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}

function formatHms(total) {
  const t = Math.max(0, Math.floor(Number(total) || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function lectureWatchInfo(item) {
  const id = item.b + "-" + item.i;
  const dur = Number(readJson("lp:dur:" + id, 0)) || 0;
  const done = !!getDoneMap()[id];
  let pos = Number(readJson("lp:pos:" + id, 0)) || 0;
  if (done) pos = dur;
  if (dur) pos = Math.min(pos, dur);
  const pct = done ? 100 : dur ? Math.min(100, Math.round((pos / dur) * 100)) : 0;
  return { pos, dur, pct, done };
}

function openRecentLecture(item) {
  const full = allBatches.find((batch) => (batch._id || batch.batch_id) === item.b);
  if (full) {
    addRecentlyViewed(full);
    try { window.CXProfile && window.CXProfile.trackBatch(full); } catch (e) {}
  }
  try { sessionStorage.setItem("cx-scroll", String(Math.round(window.scrollY))); } catch (e) {}
  window.location.href = `batch.html?uid=${encodeURIComponent(item.b)}#lec=${encodeURIComponent(item.i)}`;
}

function renderRecentlyWatched() {
  const statRecent = document.getElementById("statRecent");
  if (statRecent) statRecent.textContent = String(getRecentlyViewed().length);
  const section = document.getElementById("recentSection");
  const row = document.getElementById("recentRow");
  if (!section || !row) return;
  const items = getRecentLectures();
  if (!items.length) { section.style.display = "none"; row.innerHTML = ""; recentExpanded = false; return; }
  section.style.display = "block";
  if (items.length < 2) recentExpanded = false;
  const viewAll = document.getElementById("recentViewAll");
  if (viewAll) {
    viewAll.style.display = items.length > 1 ? "" : "none";
    viewAll.textContent = recentExpanded ? "Show Less" : "View All ›";
    viewAll.setAttribute("aria-expanded", recentExpanded ? "true" : "false");
  }
  const shown = recentExpanded ? items : items.slice(0, 1);
  row.innerHTML = shown.map((item, index) => {
    const info = lectureWatchInfo(item);
    return `
    <button class="rw-item${info.done ? " full" : ""}" type="button" data-recent-index="${index}">
      <img class="rw-thumb" src="${escapeHtml(item.th || FALLBACK_THUMB)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_THUMB}'">
      <span class="rw-info">
        <span class="rw-name">${escapeHtml(item.t || "Lecture")}</span>
        <span class="rw-meta"><span>${formatHms(info.pos)} / ${formatHms(info.dur)}</span><span class="rw-pct">Watched: ${info.pct}%</span></span>
        <span class="rw-bar"><i style="width:${info.pct}%"></i></span>
      </span>
    </button>`;
  }).join("");
  row.querySelectorAll("[data-recent-index]").forEach((button) => {
    button.addEventListener("click", () => openRecentLecture(shown[Number(button.dataset.recentIndex)]));
  });
}

function setupRecentlyWatched() {
  renderRecentlyWatched();
  document.getElementById("recentViewAll")?.addEventListener("click", () => {
    recentExpanded = !recentExpanded;
    renderRecentlyWatched();
  });
  document.getElementById("recentClearBtn")?.addEventListener("click", () => {
    localStorage.removeItem(RECENT_LECTURES_KEY);
    recentExpanded = false;
    renderRecentlyWatched();
    showToast("Recently watched cleared.");
  });
  const refresh = () => renderRecentlyWatched();
  window.addEventListener("pageshow", refresh);
  window.addEventListener("storage", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
}

function setupQuickInstall() {
  const button = document.getElementById("installQuickBtn");
  if (!button) return;
  button.addEventListener("click", () => openModal("installModal"));
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem("codex-studys-favorites") || "[]"); }
  catch { return []; }
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function toggleFavorite(id) {
  const favorites = getFavorites();
  const index = favorites.indexOf(id);
  if (index === -1) favorites.push(id); else favorites.splice(index, 1);
  localStorage.setItem("codex-studys-favorites", JSON.stringify(favorites));
  try {
    const data = readJson(FAV_DATA_KEY, {});
    if (favorites.includes(id) && seenBatches[id]) data[id] = seenBatches[id]; else if (!favorites.includes(id)) delete data[id];
    localStorage.setItem(FAV_DATA_KEY, JSON.stringify(data));
  } catch (e) {}
  return favorites.includes(id);
}

function updateFavoritesCount() {
  const count = getFavorites().length;
  const button = $('.filter-row .filter[data-filter="favorites"]');
  if (button) button.textContent = count ? `❤ Favorite Batches (${count})` : "❤ Favorite Batches";
  const navBadge = $("#favNavBadge");
  if (navBadge) {
    navBadge.textContent = String(count);
    navBadge.style.display = count ? "grid" : "none";
  }
  const statFav = $("#statFav");
  if (statFav) statFav.textContent = count.toLocaleString();
}

function filteredBatches() {
  let batches;
  if (activeFilter === "favorites") {
    batches = getFavoriteBatches();
  } else {
    batches = allBatches.slice();
  }
  if (langFilter !== "all") {
    batches = batches.filter((batch) => (batch.language || "").toLowerCase().includes(langFilter));
  }
  if (searchQuery.trim()) {
    batches = deepSearch(batches, searchQuery);
  }
  if (sortMode === "az") {
    batches = [...batches].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (sortMode === "za") {
    batches = [...batches].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
  } else if (sortMode === "newest") {
    batches = [...batches].sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
  }
  return batches;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date)) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isRecent(value) {
  if (!value) return false;
  const date = new Date(value);
  if (isNaN(date)) return false;
  const days = (Date.now() - date.getTime()) / 86400000;
  return days >= 0 && days <= 21;
}

function courseCard(batch) {
  const title = escapeHtml(batch.name || "Untitled course");
  const description = escapeHtml(batch.byName || "Structured learning for your next milestone");
  const language = escapeHtml(batch.language || "Self-paced");
  const category = categoryFor(batch);
  const image = escapeHtml(batch.previewImage || FALLBACK_THUMB);
  const id = escapeHtml(batch._id || batch.batch_id || "");
  const favActive = isFavorite(id);
  const startDate = formatDate(batch.startDate);
  const fresh = isRecent(batch.startDate);
  return `
    <article class="course-card" data-id="${id}" tabindex="0" role="button" aria-label="Open ${title}">
      <div class="course-thumb">
        <div class="thumb-fallback thumb-shimmer"></div>
        <img src="${image}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.classList.add('loaded');this.previousElementSibling.style.display='none'" onerror="this.style.display='none'">
        <span class="course-tag">${escapeHtml(category)}</span>
        ${fresh ? '<span class="course-tag course-tag-new">NEW</span>' : ""}
        <button class="fav-btn${favActive ? " active" : ""}" type="button" data-fav-id="${id}" aria-label="${favActive ? "Remove from favorites" : "Add to favorites"}" aria-pressed="${favActive}">
          <svg viewBox="0 0 24 24" fill="${favActive ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.2-4.5-9.6-9C.6 8.1 2.4 4.5 6 4.2c2.1-.15 3.6 1.05 6 3.3 2.4-2.25 3.9-3.45 6-3.3 3.6.3 5.4 3.9 3.6 7.8-2.4 4.5-9.6 9-9.6 9Z"/></svg>
        </button>
        <button class="info-btn" type="button" data-info-id="${id}" aria-label="Quick view details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.6"/></svg>
        </button>
        ${getNote(id) ? '<span class="note-badge">📝 Note</span>' : ""}
      </div>
      <div class="course-chips"><span class="chip">${language}</span><span class="chip chip-accent">${escapeHtml(category)}</span></div>
      <div class="course-body">
        <h3 class="course-title">${title}</h3>
        <p class="course-description">${description}</p>
        <div class="course-meta"><span>${startDate ? `📅 ${startDate}` : language}</span><button class="course-cta" type="button">Let's Study <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>
      </div>
    </article>`;
}

function syncUrlParams() {
  const params = new URLSearchParams();
  if (activeFilter !== UA_DEFAULT_GOAL) params.set("filter", activeFilter);
  if (searchQuery.trim()) params.set("q", searchQuery.trim());
  if (sortMode !== "relevance") params.set("sort", sortMode);
  if (langFilter !== "all") params.set("lang", langFilter);
  const query = params.toString();
  const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, "", newUrl);
}

function renderBatches() {
  const grid = $("#batchGrid");
  const loadMoreBtn = $("#loadMoreBtn");
  const batches = filteredBatches();
  const visible = batches.slice(0, visibleCount);
  const goalMode = activeFilter !== "favorites";
  const filterLabel = !goalMode ? "favorite courses" : `${goalShort(activeFilter)} courses${UA.teacher ? " by " + teacherName(UA.teacher) : ""}`;
  const totalLabel = goalMode && !searchQuery.trim() && langFilter === "all" ? Math.max(UA.cTotal, batches.length) : batches.length;
  const noteText = batches.length
    ? `Showing ${visible.length} of ${totalLabel.toLocaleString()} ${filterLabel}.`
    : activeFilter === "favorites" ? "No favorites yet. Tap the heart on any course to save it here." : "No courses matched that filter yet.";
  $("#resultsNote").textContent = noteText;
  const announcer = $("#filterAnnouncer");
  if (announcer) announcer.textContent = noteText;
  grid.innerHTML = visible.length ? visible.map(courseCard).join("") : '<div class="empty">Try another category or search the full library.</div>';
  $$(".course-card").forEach((card, index) => {
    card.addEventListener("click", () => openBatch(visible[index]));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openBatch(visible[index]);
      }
    });
  });
  $$(".fav-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const nowActive = toggleFavorite(button.dataset.favId);
      button.classList.toggle("active", nowActive);
      button.setAttribute("aria-pressed", String(nowActive));
      button.querySelector("svg").setAttribute("fill", nowActive ? "currentColor" : "none");
      if (nowActive) {
        button.classList.remove("pop");
        void button.offsetWidth;
        button.classList.add("pop");
      }
      if (activeFilter === "favorites" && !nowActive) renderBatches();
      updateFavoritesCount();
    });
  });
  $$(".info-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const batch = visible.find((item) => (item._id || item.batch_id || "") === button.dataset.infoId);
      if (batch) openDetail(batch);
    });
  });
  if (loadMoreBtn) {
    const remaining = batches.length - visible.length;
    const more = remaining > 0 || hasMoreCourses();
    loadMoreBtn.style.display = more ? "inline-flex" : "none";
    loadMoreBtn.textContent = more ? "Loading more courses…" : "";
  }
  const clearBtn = $("#clearFiltersBtn");
  if (clearBtn) clearBtn.style.display = (activeFilter === "favorites" || searchQuery.trim() || langFilter !== "all" || sortMode !== "relevance") ? "inline-flex" : "none";
  syncUrlParams();
}

function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem("codex-studys-search-history") || "[]"); }
  catch { return []; }
}

function addSearchHistory(term) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const history = getSearchHistory().filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  history.unshift(trimmed);
  localStorage.setItem("codex-studys-search-history", JSON.stringify(history.slice(0, 6)));
}

function highlightMatch(text, query) {
  const safe = escapeHtml(text || "");
  if (!query) return safe;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean).map((w) => escapeHtml(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return safe;
  return safe.replace(new RegExp(`(${words.join("|")})`, "gi"), "<mark>$1</mark>");
}

function renderSearchResults(query = "") {
  const results = $("#searchResults");
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    const history = getSearchHistory();
    const recent = getRecentlyViewed();
    if (!history.length && !recent.length) {
      results.innerHTML = '<div class="search-hint">Start typing to find your next course.</div>';
      return;
    }
    let html = "";
    if (history.length) {
      html += `<div class="search-hint" style="text-align:left;margin-bottom:2px;">Recent searches</div>
        <div class="search-history-row">${history.map((term) => `<button type="button" class="search-history-chip">${escapeHtml(term)}</button>`).join("")}</div>`;
    }
    if (recent.length) {
      html += `<div class="search-hint" style="text-align:left;margin-bottom:2px;">Recently viewed</div>` + recent.map((batch) => `
        <div class="search-result" data-id="${escapeHtml(batch._id)}">
          <div class="search-result-thumb">${batch.previewImage ? `<img src="${escapeHtml(batch.previewImage)}" alt="" referrerpolicy="no-referrer" onerror="window.__thumbFallback(this)">` : THUMB_PLACEHOLDER_SVG}</div>
          <div><strong>${escapeHtml(batch.name)}</strong><small>${escapeHtml(batch.byName || batch.language || "Course")}</small></div>
        </div>`).join("");
    }
    results.innerHTML = html;
    $$(".search-history-chip").forEach((chip, index) => chip.addEventListener("click", () => {
      const input = $("#searchInput");
      if (input) { input.value = history[index]; renderSearchResults(history[index]); }
    }));
    $$(".search-result").forEach((result, index) => result.addEventListener("click", () => {
      openBatch(recent[index]);
      closeModal("searchModal");
    }));
    return;
  }
  const matches = deepSearch(allBatches, normalized).slice(0, 40);
  if (!matches.length) {
    results.innerHTML = '<div class="search-hint">No matches yet. Try a subject, exam or class.</div>';
    return;
  }
  results.innerHTML = `<div class="search-hint" style="text-align:left;margin-bottom:2px;">${matches.length} result${matches.length === 1 ? "" : "s"}</div>` + matches.map((batch) => `
    <div class="search-result" data-id="${escapeHtml(batch._id || batch.batch_id || "")}">
      <div class="search-result-thumb">${batch.previewImage ? `<img src="${escapeHtml(batch.previewImage)}" alt="" referrerpolicy="no-referrer" onerror="window.__thumbFallback(this)">` : THUMB_PLACEHOLDER_SVG}</div>
      <div><strong>${highlightMatch(batch.name || "Untitled course", normalized)}</strong><small>${escapeHtml(batch.byName || batch.language || "Course")}</small></div>
      ${isRecent(batch.startDate) ? '<span class="search-new-badge">new</span>' : ""}
    </div>`).join("");
  $$(".search-result").forEach((result, index) => result.addEventListener("click", () => {
    openBatch(matches[index]);
    closeModal("searchModal");
  }));
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  $$(".overlay.visible").forEach((other) => { if (other.id !== id) other.classList.remove("visible"); });
  modal.classList.add("visible");
  document.body.classList.add("modal-open");
  modal.querySelector("input")?.focus();
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("visible");
  if (!$$(".overlay.visible").length) document.body.classList.remove("modal-open");
}

function showToast(message) {
  const oldToast = $(".toast");
  oldToast?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2800);
}

const UA_CACHE_KEY = "cx-ua-cache-v1";

function saveUaCache() {
  try {
    if (!UA.teacher || activeFilter === "favorites") return;
    sessionStorage.setItem(UA_CACHE_KEY, JSON.stringify({ goal: UA.goal, teachers: UA.teachers, tOff: UA.tOff, tTotal: UA.tTotal, teacher: UA.teacher, cOff: UA.cOff, cTotal: UA.cTotal, batches: allBatches }));
  } catch (e) {}
}

function restoreUaCache() {
  try {
    const raw = sessionStorage.getItem(UA_CACHE_KEY);
    const c = raw ? JSON.parse(raw) : null;
    if (!c || c.goal !== activeFilter || !Array.isArray(c.batches) || !c.batches.length) return false;
    UA.token++;
    Object.assign(UA, { goal: c.goal, teachers: c.teachers || [], tOff: c.tOff || 0, tTotal: c.tTotal || 0, teacher: c.teacher, cOff: c.cOff || 0, cTotal: c.cTotal || 0, busy: false, loadingMore: false, error: "" });
    allBatches = c.batches;
    allBatches.forEach((b) => { seenBatches[b._id] = b; });
    visibleCount = PAGE_SIZE;
    renderEduRow();
    updateStats();
    renderBatches();
    return true;
  } catch (e) { return false; }
}

function restoreScroll() {
  try {
    const y = Number(sessionStorage.getItem("cx-scroll") || 0);
    sessionStorage.removeItem("cx-scroll");
    if (y > 0) window.requestAnimationFrame(() => window.scrollTo(0, y));
  } catch (e) {}
}

async function loadBatches(force) {
  $("#globalPreloader")?.classList.add("hidden");
  try {
    if (!force && activeFilter !== "favorites" && restoreUaCache()) {
      restoreScroll();
    } else if (activeFilter === "favorites") {
      updateStats();
      showFavorites();
    } else {
      await selectGoal(activeFilter);
    }
    sessionStorage.setItem("cx-loaded", "1");
    const updatedNote = $("#dataUpdatedNote");
    if (updatedNote) updatedNote.textContent = `· library refreshed ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    console.error(error);
  } finally {
    $("#globalPreloader")?.classList.add("hidden");
  }
}

function setupNavigation() {
  const menu = $("#navLinks");
  const menuButton = $("#menuBtn");
  menuButton.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
  $$(".nav-link").forEach((link) => link.addEventListener("click", () => {
    menu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }));
  const sections = $$("main section[id]");
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      $$(".nav-link").forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    }
  }), { rootMargin: "-35% 0px -55% 0px" });
  sections.forEach((section) => observer.observe(section));
}

function setupHeaderActions() {
  const refreshBtn = $("#refreshBtn");
  refreshBtn?.addEventListener("click", async () => {
    if (refreshBtn.classList.contains("spinning")) return;
    refreshBtn.classList.add("spinning");
    await loadBatches(true);
    showToast("Course library refreshed.");
    refreshBtn.classList.remove("spinning");
  });
  $("#favNavBtn")?.addEventListener("click", () => {
    showFavorites();
    $("#courses")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupModals() {
  $("#searchBtn").addEventListener("click", () => {
    openModal("searchModal");
    renderSearchResults($("#searchInput").value);
  });
  let modalSearchDebounce;
  $("#searchInput").addEventListener("input", (event) => {
    const value = event.target.value;
    clearTimeout(modalSearchDebounce);
    modalSearchDebounce = setTimeout(() => renderSearchResults(value), 120);
  });
  $("#searchInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.value.trim()) addSearchHistory(event.target.value);
  });
  $$("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
  $$(".overlay").forEach((overlay) => overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal(overlay.id);
  }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") $$(".overlay.visible").forEach((modal) => closeModal(modal.id));
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openModal("searchModal");
      renderSearchResults($("#searchInput").value);
    }
  });
}

function setupFilters() {
  renderGoalChips();
  setupEducators();
  updateFavoritesCount();
  const filterKey = "codex-studys-last-filter";
  const urlParams = new URLSearchParams(window.location.search);
  const urlFilter = urlParams.get("filter");
  const urlQuery = urlParams.get("q");
  const urlSort = urlParams.get("sort");
  const savedFilter = urlFilter || localStorage.getItem(filterKey);
  activeFilter = savedFilter === "favorites" || UA_GOALS[savedFilter] ? savedFilter : UA_DEFAULT_GOAL;
  $$(".filter-row .filter").forEach((item) => item.classList.toggle("active", item.dataset.filter === activeFilter));
  updateEduVisibility();
  if (urlQuery) {
    searchQuery = urlQuery;
    const inlineSearchEl = $("#inlineSearchInput");
    if (inlineSearchEl) inlineSearchEl.value = urlQuery;
  }
  if (urlSort && ["relevance", "newest", "az", "za"].includes(urlSort)) {
    sortMode = urlSort;
    const sortSelectEl = $("#sortSelect");
    if (sortSelectEl) sortSelectEl.value = urlSort;
  }
  const urlLang = urlParams.get("lang");
  if (urlLang && ["hindi", "english", "hinglish"].includes(urlLang)) {
    langFilter = urlLang;
    const langSelectEl = $("#langSelect");
    if (langSelectEl) langSelectEl.value = urlLang;
  }
  $$(".filter-row .filter").forEach((button) => button.addEventListener("click", () => {
    visibleCount = PAGE_SIZE;
    if (button.dataset.filter === "favorites") showFavorites();
    else selectGoal(button.dataset.filter);
  }));
  const inlineSearch = $("#inlineSearchInput");
  let searchDebounce;
  inlineSearch?.addEventListener("input", (event) => {
    const value = event.target.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = value;
      visibleCount = PAGE_SIZE;
      renderBatches();
    }, 150);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
    const active = document.activeElement;
    const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
    if (typing) return;
    event.preventDefault();
    inlineSearch?.focus();
  });
  $("#sortSelect")?.addEventListener("change", (event) => {
    sortMode = event.target.value;
    visibleCount = PAGE_SIZE;
    renderBatches();
  });
  $("#langSelect")?.addEventListener("change", (event) => {
    langFilter = event.target.value;
    visibleCount = PAGE_SIZE;
    renderBatches();
  });
  $("#copyLinkBtn")?.addEventListener("click", () => {
    syncUrlParams();
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast("Link copied!")).catch(() => showToast("Could not copy link"));
    } else {
      showToast("Copy not supported on this browser");
    }
  });
  $("#clearFiltersBtn")?.addEventListener("click", () => {
    searchQuery = "";
    sortMode = "relevance";
    langFilter = "all";
    const langSelectEl = $("#langSelect");
    if (langSelectEl) langSelectEl.value = "all";
    visibleCount = PAGE_SIZE;
    if (inlineSearch) inlineSearch.value = "";
    const sortSelectEl = $("#sortSelect");
    if (sortSelectEl) sortSelectEl.value = "relevance";
    if (activeFilter === "favorites") selectGoal(UA_DEFAULT_GOAL); else renderBatches();
  });
}

function setupLoadMore() {
  const loadMoreBtn = $("#loadMoreBtn");
  if (!loadMoreBtn) return;
  const loadNext = async () => {
    if (visibleCount < filteredBatches().length) {
      visibleCount += PAGE_SIZE;
      renderBatches();
      return;
    }
    if (hasMoreCourses() && !UA.loadingMore) {
      await loadMoreCourses();
      visibleCount += PAGE_SIZE;
      renderBatches();
    }
  };
  loadMoreBtn.addEventListener("click", loadNext);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && loadMoreBtn.style.display !== "none") loadNext();
    });
  }, { rootMargin: "600px" });
  observer.observe(loadMoreBtn);
}

function setupAnnouncements() {
  const key = "codex-studys-announce-seen";
  const badge = document.querySelector("#announceBtn .icon-badge");
  if (localStorage.getItem(key) === "true") badge?.remove();
  $("#announceBtn")?.addEventListener("click", () => {
    openModal("announceModal");
    localStorage.setItem(key, "true");
    badge?.remove();
  });
  $("#announceCopyLink")?.addEventListener("click", () => {
    const url = window.location.origin + window.location.pathname;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast("Link copied!")).catch(() => showToast("Could not copy link"));
    } else {
      showToast("Copy not supported on this browser");
    }
  });
}

const THEME_COLORS = {
  light: "#f4f5f9", dark: "#090b10", sandalwood: "#1c130c", "forest-emerald": "#06140f",
  "ocean-deep": "#050e17", "sakura-blossom": "#fff3f6", "dracula-midnight": "#14121f",
  "lavender-mist": "#f5f2fc", "cyberpunk-neon": "#05020a"
};

function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const current = document.documentElement.getAttribute("data-theme");
  meta.setAttribute("content", THEME_COLORS[current] || THEME_COLORS.dark);
}

function setupThemePicker() {
  syncThemeColor();
  const key = "codex-studys-theme";
  const markActive = () => {
    const current = localStorage.getItem(key) || "system";
    $$(".theme-option").forEach((option) => option.classList.toggle("active", option.dataset.theme === current));
  };
  $("#themeBtn")?.addEventListener("click", () => {
    markActive();
    openModal("themeModal");
  });
  $$(".theme-option").forEach((option) => option.addEventListener("click", () => {
    const theme = option.dataset.theme;
    localStorage.setItem(key, theme);
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      if (prefersLight) document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    syncThemeColor();
    markActive();
  }));
}

/* ================= Animation Effects ================= */
function setupFxEngine() {
  const ENABLED_KEY = "codex-studys-fx-enabled";
  const EFFECT_KEY = "codex-studys-fx-effect";
  const INTENSITY_KEY = "codex-studys-fx-intensity";
  const SCALE = [0.55, 1, 1.85];

  const enableToggle = $("#fxEnableToggle");
  const grid = $("#effectsGrid");
  const intensityInput = $("#fxIntensity");
  const fxBtn = $("#fxBtn");
  if (!grid) return;

  let canvas = null, ctx = null, rafId = null, dpr = 1, running = false, last = 0;
  let particles = [], bolts = [], flash = 0, burstTimer = 0, boltTimer = 0;
  let effect = localStorage.getItem(EFFECT_KEY) || "rain";
  let intensity = Number(localStorage.getItem(INTENSITY_KEY));
  if (!Number.isInteger(intensity) || intensity < 0 || intensity > 2) intensity = 1;
  let enabled = localStorage.getItem(ENABLED_KEY) === "true";

  const reducedMotion = () =>
    document.documentElement.getAttribute("data-reduced-motion") === "true" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "fxCanvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function density(base) {
    const w = window.innerWidth;
    const dscale = w < 480 ? 0.5 : w < 900 ? 0.75 : 1;
    return Math.max(6, Math.round(base * dscale * SCALE[intensity]));
  }

  function seed() {
    const w = window.innerWidth, h = window.innerHeight;
    particles = []; bolts = []; flash = 0; burstTimer = 0; boltTimer = 0;
    if (effect === "rain" || effect === "storm") {
      const n = density(effect === "storm" ? 100 : 75);
      for (let i = 0; i < n; i++) particles.push({
        x: Math.random() * w, y: Math.random() * h - h,
        len: 14 + Math.random() * 16, speed: 7 + Math.random() * 7,
        drift: effect === "storm" ? 2.6 : 0.7
      });
    } else if (effect === "snow") {
      const n = density(70);
      for (let i = 0; i < n; i++) particles.push({
        x: Math.random() * w, y: Math.random() * h,
        r: 1.5 + Math.random() * 2.6, speed: 0.6 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2, amp: 10 + Math.random() * 20
      });
    } else if (effect === "hail") {
      const n = density(55);
      for (let i = 0; i < n; i++) particles.push({
        x: Math.random() * w, y: Math.random() * h - h,
        r: 2 + Math.random() * 2, speed: 10 + Math.random() * 6, drift: 1.4
      });
    } else if (effect === "fireball") {
      const n = density(40);
      for (let i = 0; i < n; i++) particles.push({
        x: Math.random() * w, y: h + Math.random() * 100,
        r: 2 + Math.random() * 3.2, speed: 0.7 + Math.random() * 1.3,
        drift: Math.random() * 1.2 - 0.6, flick: Math.random() * Math.PI * 2
      });
    }
  }

  function spawnBurst(w, h) {
    const cx = 40 + Math.random() * (w - 80);
    const cy = 60 + Math.random() * (h * 0.45);
    const hue = Math.floor(Math.random() * 360);
    const count = density(26);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const sp = 1.6 + Math.random() * 2.2;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, hue });
    }
  }

  function spawnBolt(w, h) {
    const points = [];
    let x = 60 + Math.random() * Math.max(w - 120, 20), y = 0;
    points.push({ x, y });
    while (y < h * 0.7) {
      y += 18 + Math.random() * 22;
      x += (Math.random() - 0.5) * 40;
      points.push({ x, y });
    }
    bolts.push({ points, life: 1 });
    flash = 0.35;
  }

  function step(dt, w, h) {
    ctx.clearRect(0, 0, w, h);
    if (effect === "rain" || effect === "storm") {
      ctx.strokeStyle = "rgba(160,200,255,.55)";
      ctx.lineWidth = 1.3;
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.drift * 3, p.y + p.len);
        ctx.stroke();
        p.y += p.speed * dt * 60; p.x += p.drift * dt * 60;
        if (p.y > h) { p.y = -p.len; p.x = Math.random() * w; }
      });
      if (effect === "storm") {
        boltTimer -= dt;
        if (boltTimer <= 0) { spawnBolt(w, h); boltTimer = 2.5 + Math.random() * 4; }
      }
    } else if (effect === "snow") {
      ctx.fillStyle = "rgba(255,255,255,.85)";
      particles.forEach((p) => {
        p.phase += dt;
        const x = p.x + Math.sin(p.phase) * p.amp * 0.02;
        ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        p.y += p.speed * dt * 60;
        if (p.y > h) { p.y = -4; p.x = Math.random() * w; }
      });
    } else if (effect === "hail") {
      ctx.fillStyle = "rgba(220,235,255,.9)";
      particles.forEach((p) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        p.y += p.speed * dt * 60; p.x += p.drift * dt * 60;
        if (p.y > h) { p.y = -6; p.x = Math.random() * w; }
      });
    } else if (effect === "fireball") {
      particles.forEach((p) => {
        p.flick += dt * 6;
        const alpha = 0.5 + Math.sin(p.flick) * 0.3;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(255,180,80,${alpha})`);
        grad.addColorStop(1, "rgba(255,80,20,0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
        p.y -= p.speed * dt * 60; p.x += p.drift * dt * 30;
        if (p.y < -10) { p.y = h + Math.random() * 40; p.x = Math.random() * w; }
      });
    } else if (effect === "firecracker") {
      burstTimer -= dt;
      if (burstTimer <= 0) { spawnBurst(w, h); burstTimer = 1.1 + Math.random() * (2.6 - intensity * 0.7); }
      particles = particles.filter((p) => p.life > 0);
      particles.forEach((p) => {
        p.vy += dt * 1.6; p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt * 0.9;
        ctx.fillStyle = `hsla(${p.hue},95%,65%,${Math.max(p.life, 0)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
      });
    } else if (effect === "lightning") {
      boltTimer -= dt;
      if (boltTimer <= 0) { spawnBolt(w, h); boltTimer = 2.6 + Math.random() * (5 - intensity); }
    }

    if (effect === "storm" || effect === "lightning") {
      bolts = bolts.filter((b) => b.life > 0);
      bolts.forEach((b) => {
        ctx.strokeStyle = `rgba(220,235,255,${b.life})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        b.points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();
        b.life -= dt * 1.8;
      });
      if (flash > 0) {
        ctx.fillStyle = `rgba(210,225,255,${flash})`;
        ctx.fillRect(0, 0, w, h);
        flash -= dt * 0.9;
      }
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - last) / 1000 || 0, 0.05);
    last = ts;
    step(dt, window.innerWidth, window.innerHeight);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    ensureCanvas();
    seed();
    running = true;
    last = 0;
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function apply() {
    if (enabled && !reducedMotion() && !document.hidden) start(); else stop();
  }

  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else apply(); });
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", apply);
  window.__codexFxApply = apply;

  function markActive() {
    $$(".effect-option").forEach((btn) => btn.classList.toggle("active", btn.dataset.effect === effect));
  }
  enableToggle?.setAttribute("aria-checked", String(enabled));
  if (intensityInput) intensityInput.value = String(intensity);
  markActive();

  enableToggle?.addEventListener("click", () => {
    enabled = enableToggle.getAttribute("aria-checked") !== "true";
    enableToggle.setAttribute("aria-checked", String(enabled));
    localStorage.setItem(ENABLED_KEY, String(enabled));
    apply();
  });

  grid.addEventListener("click", (event) => {
    const btn = event.target.closest(".effect-option");
    if (!btn) return;
    effect = btn.dataset.effect;
    localStorage.setItem(EFFECT_KEY, effect);
    markActive();
    if (running) { stop(); apply(); }
  });

  intensityInput?.addEventListener("input", () => {
    intensity = Number(intensityInput.value);
    localStorage.setItem(INTENSITY_KEY, String(intensity));
    if (running) seed();
  });

  fxBtn?.addEventListener("click", () => openModal("effectsModal"));

  if (enabled) apply();
}

/* ================= Network Status ================= */
function setupNetworkStatus() {
  const netBtn = $("#netBtn");
  const typeEl = $("#netType");
  const pingEl = $("#netPing");
  const latencyEl = $("#netLatency");
  const bwEl = $("#netBandwidth");
  const statusEl = $("#netStatus");
  const refreshBtn = $("#netRefreshBtn");
  if (!netBtn || !typeEl) return;

  let pollTimer = null;
  const PING_ASSET = "assets/icon-192.png";

  function connInfo() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }
  function typeLabel() {
    const c = connInfo();
    if (c) {
      const t = c.type && c.type !== "unknown" ? c.type : c.effectiveType;
      if (t) return t === "wifi" ? "Wi-Fi" : t.toUpperCase();
    }
    return "Unknown";
  }
  function bandwidthLabel() {
    const c = connInfo();
    return c && typeof c.downlink === "number" ? `${c.downlink} Mbps` : "—";
  }
  function setStatus(online) {
    statusEl.innerHTML = `<span class="net-status-dot${online ? "" : " offline"}"></span>${online ? "Online" : "Offline"}`;
  }

  async function measure() {
    if (!navigator.onLine) {
      typeEl.textContent = "Offline"; pingEl.textContent = "—"; latencyEl.textContent = "—";
      bwEl.textContent = "—"; setStatus(false);
      return;
    }
    typeEl.textContent = typeLabel();
    bwEl.textContent = bandwidthLabel();
    setStatus(true);
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      try {
        await fetch(`${PING_ASSET}?_=${Date.now()}_${i}`, { method: "HEAD", cache: "no-store" });
        samples.push(performance.now() - t0);
      } catch (error) { /* ignore a single dropped sample */ }
    }
    if (samples.length) {
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      pingEl.textContent = `${Math.round(avg)} ms`;
      const entries = performance.getEntriesByType("resource").filter((r) => r.name.includes(PING_ASSET));
      const lastEntry = entries[entries.length - 1];
      const ttfb = lastEntry ? Math.max(0, lastEntry.responseStart - lastEntry.requestStart) : avg * 0.4;
      latencyEl.textContent = `${Math.round(ttfb || avg * 0.4)} ms`;
    } else {
      pingEl.textContent = "Timeout"; latencyEl.textContent = "—"; setStatus(false);
    }
  }

  function startPolling() {
    measure();
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = window.setInterval(() => {
      const modal = document.getElementById("networkModal");
      if (!modal || !modal.classList.contains("visible")) {
        window.clearInterval(pollTimer); pollTimer = null; return;
      }
      measure();
    }, 8000);
  }

  netBtn.addEventListener("click", () => { openModal("networkModal"); startPolling(); });
  refreshBtn?.addEventListener("click", measure);
}

const POPUP_SNOOZE_KEY = "codex-studys-popups-snooze";
const POPUP_SNOOZE_MS = 24 * 60 * 60 * 1000;

function popupsSnoozed() {
  try {
    const until = Number(localStorage.getItem(POPUP_SNOOZE_KEY) || 0);
    return until > Date.now();
  } catch (e) { return false; }
}

function setupTelegramPopup() {
  document.querySelectorAll("[data-snooze-popups]").forEach((btn) => {
    btn.addEventListener("click", () => {
      try { localStorage.setItem(POPUP_SNOOZE_KEY, String(Date.now() + POPUP_SNOOZE_MS)); } catch (e) {}
      closeModal("telegramModal");
      closeModal("installModal");
      showToast("Popups 24 ghante ke liye band");
    });
  });
  if (popupsSnoozed()) return;
  let seen = false;
  try { seen = sessionStorage.getItem("cx-popups-shown") === "1"; } catch (e) {}
  if (seen) return; // already shown this session (e.g. coming back from a batch)
  window.setTimeout(() => {
    try { sessionStorage.setItem("cx-popups-shown", "1"); } catch (e) {}
    openModal("telegramModal");
    const modal = document.getElementById("telegramModal");
    if (!modal) return;
    const watcher = window.setInterval(() => {
      if (!modal.classList.contains("visible")) {
        window.clearInterval(watcher);
        window.setTimeout(() => { if (!isStandaloneApp() && !popupsSnoozed()) openModal("installModal"); }, 200);
      }
    }, 150);
  }, 700);
}

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function setupInstallPrompt() {
  if (isStandaloneApp()) return;
  const installBtn = $("#installActionBtn");
  const iosSteps = $("#iosInstallSteps");
  const body = $("#installBody");

  const showForIOS = () => {
    if (installBtn) installBtn.style.display = "none";
    if (iosSteps) iosSteps.style.display = "grid";
    if (body) body.textContent = "Add CODEX STUDYS to your home screen for a faster, app-like experience.";
  };

  installBtn?.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    closeModal("installModal");
    if (outcome === "accepted") showToast("Installing CODEX STUDYS…");
  });

  window.addEventListener("appinstalled", () => {
    closeModal("installModal");
    showToast("CODEX STUDYS installed!");
  });

  if (isIOSDevice()) showForIOS();
}

function setupOfflineBanner() {
  const banner = $("#offlineBanner");
  if (!banner) return;
  const update = () => banner.classList.toggle("visible", !navigator.onLine);
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

function setupViewToggle() {
  const key = "codex-studys-view";
  const grid = $("#batchGrid");
  const gridBtn = $("#gridViewBtn");
  const listBtn = $("#listViewBtn");
  if (!grid || !gridBtn || !listBtn) return;
  const apply = (mode) => {
    grid.classList.toggle("list-view", mode === "list");
    gridBtn.classList.toggle("active", mode !== "list");
    gridBtn.setAttribute("aria-pressed", String(mode !== "list"));
    listBtn.classList.toggle("active", mode === "list");
    listBtn.setAttribute("aria-pressed", String(mode === "list"));
  };
  apply(localStorage.getItem(key) || "grid");
  gridBtn.addEventListener("click", () => { localStorage.setItem(key, "grid"); apply("grid"); });
  listBtn.addEventListener("click", () => { localStorage.setItem(key, "list"); apply("list"); });
}

function setupPreferences() {
  const contrastToggle = $("#contrastToggle");
  const motionToggle = $("#motionToggle");

  const applyContrast = (on) => {
    document.documentElement.setAttribute("data-contrast", on ? "high" : "normal");
    contrastToggle?.setAttribute("aria-checked", String(on));
  };
  const applyMotion = (on) => {
    document.documentElement.setAttribute("data-reduced-motion", String(on));
    motionToggle?.setAttribute("aria-checked", String(on));
  };
  applyContrast(localStorage.getItem("codex-studys-contrast") === "true");
  applyMotion(localStorage.getItem("codex-studys-reduced-motion") === "true");

  contrastToggle?.addEventListener("click", () => {
    const on = contrastToggle.getAttribute("aria-checked") !== "true";
    localStorage.setItem("codex-studys-contrast", String(on));
    applyContrast(on);
  });
  motionToggle?.addEventListener("click", () => {
    const on = motionToggle.getAttribute("aria-checked") !== "true";
    localStorage.setItem("codex-studys-reduced-motion", String(on));
    applyMotion(on);
    window.__codexFxApply?.();
  });

  $("#exportFavBtn")?.addEventListener("click", () => {
    const favorites = getFavorites();
    if (!favorites.length) return showToast("No favorites to export yet.");
    const details = allBatches.filter((batch) => favorites.includes(batch._id || batch.batch_id || ""));
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), favorites: details }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codex-studys-favorites.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Favorites exported.");
  });

  const importInput = $("#importFavFile");
  $("#importFavBtn")?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const ids = (data.favorites || []).map((batch) => batch._id || batch.batch_id).filter(Boolean);
        const current = getFavorites();
        const merged = [...new Set([...current, ...ids])];
        localStorage.setItem("codex-studys-favorites", JSON.stringify(merged));
        updateFavoritesCount();
        renderBatches();
        showToast(`Imported ${ids.length} favorite${ids.length === 1 ? "" : "s"}.`);
      } catch {
        showToast("That file could not be read.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  });

  $("#clearDataBtn")?.addEventListener("click", () => {
    if (!confirm("This clears favorites, theme, search history and all saved preferences on this device. Continue?")) return;
    Object.keys(localStorage).filter((key) => key.startsWith("codex-studys")).forEach((key) => localStorage.removeItem(key));
    showToast("App data cleared. Reloading…");
    setTimeout(() => window.location.reload(), 900);
  });
}

function animateCount(element, target) {
  if (!element) return;
  if (target <= 0) { element.textContent = "0"; return; }
  const duration = 700;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function updateStats() {
  const strip = $("#statsStrip");
  if (!strip) return;
  strip.style.display = "grid";
  const freshCount = allBatches.filter((batch) => isRecent(batch.startDate)).length;
  animateCount($("#statTotal"), allBatches.length);
  animateCount($("#statNew"), freshCount);
  const statFav = $("#statFav");
  if (statFav) statFav.textContent = getFavorites().length.toLocaleString();
  const statRecent = $("#statRecent");
  if (statRecent) statRecent.textContent = String(getRecentlyViewed().length);
}

function setupBackToTop() {
  const button = $("#backToTopBtn");
  if (!button) return;
  const onScroll = () => button.classList.toggle("visible", window.scrollY > 480);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}


/* ---------- Personal notes ---------- */
function getNotes() {
  try { return JSON.parse(localStorage.getItem("codex-studys-notes") || "{}"); }
  catch { return {}; }
}

function getNote(id) {
  return getNotes()[id] || "";
}

function setNote(id, text) {
  const notes = getNotes();
  if (text.trim()) notes[id] = text.trim(); else delete notes[id];
  localStorage.setItem("codex-studys-notes", JSON.stringify(notes));
}

/* ---------- Quick view ---------- */
let detailBatch = null;

function openDetail(batch) {
  detailBatch = batch;
  const id = batch._id || batch.batch_id || "";
  const hero = document.getElementById("detailHero");
  if (hero) {
    hero.src = batch.previewImage || FALLBACK_THUMB;
    hero.onerror = () => { hero.onerror = null; hero.src = FALLBACK_THUMB; };
  }
  const titleEl = document.getElementById("detailTitle");
  if (titleEl) titleEl.textContent = batch.name || "Untitled course";
  const subEl = document.getElementById("detailSub");
  if (subEl) subEl.textContent = batch.byName || "Structured learning for your next milestone";
  const facts = [
    ["Category", categoryFor(batch).toUpperCase()],
    ["Language", batch.language || "Self-paced"],
    ["Starts", formatDate(batch.startDate) || "Anytime"],
    ["Lectures", String(batch.lectureCount || "—")],
    ["Notes", String(batch.noteCount || "—")]
  ];
  const factsEl = document.getElementById("detailFacts");
  if (factsEl) factsEl.innerHTML = facts.map(([k, v]) => `<div class="detail-fact"><span>${escapeHtml(k)}</span><span>${escapeHtml(String(v))}</span></div>`).join("");
  const noteEl = document.getElementById("detailNote");
  if (noteEl) noteEl.value = getNote(id);
  syncDetailFavButton(id);
  openModal("detailModal");
}

function syncDetailFavButton(id) {
  const favBtn = document.getElementById("detailFavBtn");
  if (favBtn) favBtn.textContent = isFavorite(id) ? "❤ Saved" : "❤ Save";
}

function setupDetailModal() {
  document.getElementById("detailFavBtn")?.addEventListener("click", () => {
    if (!detailBatch) return;
    const id = detailBatch._id || detailBatch.batch_id || "";
    const active = toggleFavorite(id);
    syncDetailFavButton(id);
    updateFavoritesCount();
    renderBatches();
    showToast(active ? "Added to favorites." : "Removed from favorites.");
  });
  document.getElementById("detailOpenBtn")?.addEventListener("click", () => {
    if (detailBatch) openBatch(detailBatch);
  });
  const noteEl = document.getElementById("detailNote");
  let noteTimer;
  noteEl?.addEventListener("input", () => {
    if (!detailBatch) return;
    const id = detailBatch._id || detailBatch.batch_id || "";
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      setNote(id, noteEl.value);
      renderBatches();
    }, 400);
  });
}

/* ---------- Reading progress ---------- */
function setupScrollProgress() {
  const bar = document.getElementById("scrollProgress");
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${max > 0 ? Math.min((window.scrollY / max) * 100, 100) : 0}%`;
  };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ---------- Shortcuts ---------- */
function setupShortcuts() {
  document.getElementById("shortcutsBtn")?.addEventListener("click", () => openModal("shortcutsModal"));
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
    const key = event.key.toLowerCase();
    if (event.key === "?") { event.preventDefault(); openModal("shortcutsModal"); }
    else if (key === "f") { event.preventDefault(); document.getElementById("favNavBtn")?.click(); }
    else if (key === "t") { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupDetailModal();
  setupScrollProgress();
  setupShortcuts();
  setupNavigation();
  setupModals();
  setupFilters();
  setupLoadMore();
  setupViewToggle();
  setupThemePicker();
  setupPreferences();
  setupFxEngine();
  setupNetworkStatus();
  setupAnnouncements();
  setupHeaderActions();
  setupTelegramPopup();
  setupInstallPrompt();
  setupQuickInstall();
  setupRecentlyWatched();
  setupBackToTop();
  setupOfflineBanner();
  registerServiceWorker();
  loadBatches();
});


/* Disable page zoom (pinch, double-tap, ctrl+wheel, ctrl +/-) */
(() => {
  ["gesturestart", "gesturechange", "gestureend"].forEach((t) =>
    document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener("touchmove", (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let lastTouch = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouch < 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
  document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault();
  });
})();
