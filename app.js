// DOM Elemente basierend auf der Timer-App Struktur
const setupView = document.getElementById("setupView");
const trainingView = document.getElementById("trainingView");
const modeSelect = document.getElementById("modeSelect");
const dynamicSettings = document.getElementById("dynamicSettings");
const trainingStatus = document.getElementById("trainingStatus");
const heroTime = document.getElementById("heroTime");
const actionArea = document.getElementById("actionArea");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");
const themeToggle = document.getElementById("themeToggle");

let currentMode = "timed";
let timerId = null;
let audioContext = null;

const state = {
  timed: { interval: 5, group: "beginner", round: "single", running: false, sequence: [], index: 0, remaining: 5 },
  highscore: { totalTime: 300, group: "beginner", running: false, score: 0, sequence: [], index: 0, remaining: 300 },
  situations: { interval: 60, group: "beginner", round: "single", count: 3, situation: true, running: false, sequence: [], index: 0, remaining: 60 },
  situationHighscore: { totalTime: 600, group: "beginner", count: 3, situation: true, running: false, score: 0, sequence: [], index: 0, remaining: 600 }
};

function stopTimer() {
  if (timerId !== null) { clearInterval(timerId); timerId = null; }
}

function playTone(type = "change") {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = type === "end" ? 440 : 700;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + (type === "end" ? 0.7 : 0.18));
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + (type === "end" ? 0.7 : 0.18));
  } catch (_) {}
}

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function groupThrows(group) { return THROW_DATA.groups[group].throws; }
function nextRoundSequence(group) { return shuffle(groupThrows(group)); }

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function renderSettings() {
  if (!dynamicSettings) return;
  const s = state[currentMode];
  let html = `<div class="settings">`;

  if (currentMode === "timed" || currentMode === "situations") {
    html += `
      <div class="setting" style="margin-bottom: 12px;">
        <label class="field-label">Zeitintervall</label>
        <div class="setting-control" style="display:flex; gap:10px; align-items:center;">
          <button class="secondary-button" data-action="adjust" data-field="interval" data-value="-1">−1s</button>
          <div class="setting-value" style="flex:1; text-align:center; padding:8px; background:var(--surface); border-radius:8px;">${s.interval} Sekunden</div>
          <button class="secondary-button" data-action="adjust" data-field="interval" data-value="1">+1s</button>
        </div>
      </div>`;
  }

  if (currentMode === "highscore" || currentMode === "situationHighscore") {
    html += `
      <div class="setting" style="margin-bottom: 12px;">
        <label class="field-label">Gesamtzeit</label>
        <div class="setting-control" style="display:flex; gap:10px; align-items:center;">
          <button class="secondary-button" data-action="adjust" data-field="totalTime" data-value="-30">−30s</button>
          <div class="setting-value" style="flex:1; text-align:center; padding:8px; background:var(--surface); border-radius:8px;">${formatTime(s.totalTime)}</div>
          <button class="secondary-button" data-action="adjust" data-field="totalTime" data-value="30">+30s</button>
        </div>
      </div>`;
  }

  html += `
    <div class="setting" style="margin-bottom: 12px;">
      <label class="field-label">Wurfgruppe</label>
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:6px; margin-top:4px;">
        ${Object.entries(THROW_DATA.groups).map(([key, item]) =>
          `<button class="secondary-button ${key === s.group ? "primary-button" : ""}" data-action="group" data-value="${key}" style="min-height:40px; padding:6px; ${key === s.group ? 'background:var(--text); color:var(--bg);' : ''}">${item.name}</button>`
        ).join("")}
      </div>
    </div>`;

  if (currentMode === "timed" || currentMode === "situations") {
    html += `
      <div class="setting" style="margin-bottom: 12px;">
        <label class="field-label">Runde</label>
        <div style="display:flex; gap:8px; margin-top:4px;">
          <button class="secondary-button" data-action="round" data-value="single" style="flex:1; min-height:40px; ${s.round === 'single' ? 'background:var(--text); color:var(--bg);' : ''}">Single Round</button>
          <button class="secondary-button" data-action="round" data-value="loop" style="flex:1; min-height:40px; ${s.round === 'loop' ? 'background:var(--text); color:var(--bg);' : ''}">Loop</button>
        </div>
      </div>`;
  }

  if (currentMode === "situations" || currentMode === "situationHighscore") {
    html += `
      <div class="setting" style="margin-bottom: 12px;">
        <label class="field-label">Wurfanzahl</label>
        <div style="display:flex; gap:6px; margin-top:4px;">
          ${[2, 3, 4, 5].map(cnt => `
            <button class="secondary-button" data-action="count" data-value="${cnt}" style="flex:1; min-height:40px; ${s.count === cnt ? 'background:var(--text); color:var(--bg);' : ''}">${cnt}</button>
          `).join("")}
        </div>
      </div>
      <div class="setting" style="margin-bottom: 12px;">
        <label class="field-label">Situationsvorgabe</label>
        <div style="display:flex; gap:8px; margin-top:4px;">
          <button class="secondary-button" data-action="situation" data-value="true" style="flex:1; min-height:40px; ${s.situation ? 'background:var(--text); color:var(--bg);' : ''}">Ja</button>
          <button class="secondary-button" data-action="situation" data-value="false" style="flex:1; min-height:40px; ${!s.situation ? 'background:var(--text); color:var(--bg);' : ''}">Nein</button>
        </div>
      </div>`;
  }

  html += `</div>`;
  dynamicSettings.innerHTML = html;
}

function showSetupView() {
  stopTimer();
  setupView.classList.remove("hidden");
  trainingView.classList.add("hidden");
  renderSettings();
}

function showTrainingView() {
  setupView.classList.add("hidden");
  trainingView.classList.remove("hidden");
}

function showThrow(name) {
  const el = document.querySelector(".throw-name");
  if (!el) return;
  el.classList.remove("change");
  void el.offsetWidth;
  el.textContent = name;
  el.classList.add("change");
}

// --- Modus 1: Würfe auf Zeit ---
function startTimed() {
  const s = state.timed;
  s.running = true;
  s.sequence = nextRoundSequence(s.group);
  s.index = 0;
  s.remaining = s.interval;

  showTrainingView();
  trainingStatus.innerHTML = "";
  heroTime.innerHTML = "";
  
  actionArea.innerHTML = `
    <div class="training-main-center">
      <div class="throw-name" style="font-size:clamp(2.5rem, 9vw, 6rem); font-weight:800; line-height:1.1;"></div>
      <div class="countdown" id="timedCountdown" style="margin-top:16px; font-size:clamp(2rem, 7vw, 4rem); font-variant-numeric:tabular-nums;">${s.remaining}</div>
    </div>`;
  
  const btnRow = trainingView.querySelector(".button-row");
  btnRow.innerHTML = `<button id="stopButton" class="secondary-button stop-button" data-action="stop" style="width:100%; min-height:70px; font-size:clamp(1.5rem, 6vw, 2.5rem); font-weight:bold; color:#f44336; border-color:#f44336; background:var(--surface-3);">Stop</button>`;
  
  showThrow(s.sequence[s.index]);
  startTimedTimer();
}

function startTimedTimer() {
  stopTimer();
  timerId = setInterval(() => {
    const s = state.timed;
    s.remaining -= 1;
    const cd = document.getElementById("timedCountdown");
    if (cd) cd.textContent = s.remaining;

    if (s.remaining <= 0) {
      if (s.index >= s.sequence.length - 1) {
        if (s.round === "loop") {
          s.sequence = nextRoundSequence(s.group);
          s.index = 0;
          playTone("change");
          showThrow(s.sequence[s.index]);
          s.remaining = s.interval;
        } else {
          finishTimed();
        }
      } else {
        s.index += 1;
        s.remaining = s.interval;
        playTone("change");
        showThrow(s.sequence[s.index]);
      }
    }
  }, 1000);
}

function finishTimed() {
  stopTimer();
  playTone("end");
  state.timed.running = false;
  showSetupView();
}

// --- Modus 2: Würfe Highscore ---
function startHighscore() {
  const s = state.highscore;
  s.running = true;
  s.score = 0;
  s.sequence = nextRoundSequence(s.group);
  s.index = 0;
  s.remaining = s.totalTime;

  showTrainingView();
  renderHighscoreTraining();
  startHighscoreTimer();
}

function renderHighscoreTraining() {
  const s = state.highscore;
  // Score links, Zeit rechts
  trainingStatus.innerHTML = `
    <div class="training-header-row">
      <span>Score: ${s.score}</span>
      <span>${formatTime(s.remaining)}</span>
    </div>`;
  heroTime.innerHTML = "";

  actionArea.innerHTML = `
    <div class="training-main-center">
      <div class="throw-name" style="font-size:clamp(2.5rem, 9vw, 6rem); font-weight:800; line-height:1.1;"></div>
    </div>`;

  const btnRow = trainingView.querySelector(".button-row");
  btnRow.innerHTML = `
    <div class="bottom-actions three" style="display:flex; justify-content:center; gap:8px; width:100%;">
      <button class="large-action stop-button" data-action="stop" style="flex:1; min-height:65px; font-size:clamp(1.2rem, 4vw, 2rem); font-weight:bold; color:#f44336; border-color:#f44336; background:var(--surface-3);">Stop</button>
      <button class="large-action" data-action="skip" style="flex:1; min-height:65px; font-size:clamp(1.2rem, 4vw, 2rem); font-weight:bold; color:#ffeb3b; border-color:#ffeb3b; background:var(--surface-2);">Skip</button>
      <button class="large-action" data-action="next" style="flex:1; min-height:65px; font-size:clamp(1.2rem, 4vw, 2rem); font-weight:bold; color:#4caf50; border-color:#4caf50; background:var(--surface-2);">Next</button>
    </div>`;

  showThrow(s.sequence[s.index]);
}

function startHighscoreTimer() {
  stopTimer();
  timerId = setInterval(() => {
    const s = state.highscore;
    s.remaining -= 1;
    const timeSpan = trainingStatus.querySelector("span:last-child");
    if (timeSpan) timeSpan.textContent = formatTime(s.remaining);
    if (s.remaining <= 0) finishHighscore();
  }, 1000);
}

function finishHighscore() {
  stopTimer();
  playTone("end");
  state.highscore.running = false;
  trainingStatus.innerHTML = "";
  actionArea.innerHTML = `
    <div class="training-main-center">
      <div class="result-label" style="color:var(--muted); font-size:clamp(1.2rem, 4vw, 2rem);">Gesamtscore</div>
      <div class="result-score" style="font-size:clamp(4rem, 15vw, 10rem); font-weight:900; line-height:1;">${state.highscore.score}</div>
    </div>`;
  trainingView.querySelector(".button-row").innerHTML = `<button class="reset-button" data-action="reset" style="width:100%; min-height:70px; font-size:clamp(1.5rem, 6vw, 2.5rem); font-weight:bold;">Reset</button>`;
}

// --- Modus 3: Würfe in Situationen ---
function situationThrows(s) {
  let pool = groupThrows(s.group);
  return pool.length < s.count ? shuffle(pool) : shuffle(pool).slice(0, s.count);
}

function startSituations() {
  const s = state.situations;
  s.running = true;
  s.sequence = nextRoundSequence(s.group);
  s.index = 0;
  s.remaining = s.interval;

  showTrainingView();
  renderSituationTraining();
  startSituationTimer();
}

function randomSituation() {
  return THROW_DATA.situations[Math.floor(Math.random() * THROW_DATA.situations.length)];
}

function renderSituationTraining() {
  const s = state.situations;
  const throws = situationThrows(s);

  trainingStatus.innerHTML = s.situation ? `<div style="text-align:center; font-size:clamp(1.3rem, 4vw, 2.2rem); color:var(--muted); text-transform:uppercase; width:100%;">${randomSituation()}</div>` : "";
  heroTime.innerHTML = "";

  actionArea.innerHTML = `
    <div class="training-main-center">
      <div class="throw-grid count-${s.count}" style="width:100%; display:grid; gap:8px; grid-template-columns: repeat(${s.count > 3 ? 2 : (s.count === 3 ? 3 : s.count)}, 1fr);">
        ${throws.map(name => `<div class="throw-card" style="min-height:90px; display:flex; align-items:center; justify-content:center; text-align:center; padding:10px; border:2px solid var(--border); border-radius:10px; background:var(--surface); font-size:clamp(1.2rem, 4vw, 2.5rem); font-weight:bold;">${name}</div>`).join("")}
      </div>
      <div class="countdown" style="margin-top:16px; font-size:clamp(2rem, 7vw, 4rem); font-variant-numeric:tabular-nums;">${formatTime(s.remaining)}</div>
    </div>`;

  const btnRow = trainingView.querySelector(".button-row");
  btnRow.innerHTML = `<button id="stopButton" class="secondary-button stop-button" data-action="stop" style="width:100%; min-height:70px; font-size:clamp(1.5rem, 6vw, 2.5rem); font-weight:bold; color:#f44336; border-color:#f44336; background:var(--surface-3);">Stop</button>`;
}

function startSituationTimer() {
  stopTimer();
  timerId = setInterval(() => {
    const s = state.situations;
    s.remaining -= 1;
    const cd = actionArea.querySelector(".countdown");
    if (cd) cd.textContent = formatTime(s.remaining);

    if (s.remaining <= 0) {
      s.index += 1;
      if (s.index >= s.sequence.length) {
        if (s.round === "loop") {
          s.sequence = nextRoundSequence(s.group);
          s.index = 0;
        } else {
          stopTimer();
          playTone("end");
          showSetupView();
          return;
        }
      }
      s.remaining = s.interval;
      playTone("change");
      renderSituationTraining();
    }
  }, 1000);
}

// --- Modus 4: Situationen Highscore ---
function startSituationHighscore() {
  const s = state.situationHighscore;
  s.running = true;
  s.score = 0;
  s.sequence = nextRoundSequence(s.group);
  s.index = 0;
  s.remaining = s.totalTime;

  showTrainingView();
  renderSituationHighscoreTraining();
  startSituationHighscoreTimer();
}

function renderSituationHighscoreTraining() {
  const s = state.situationHighscore;
  const throws = situationThrows(s);

  // Score links, Zeit rechts, darunter Situation
  trainingStatus.innerHTML = `
    <div class="training-header-row">
      <span>Score: ${s.score}</span>
      <span>${formatTime(s.remaining)}</span>
    </div>
    ${s.situation ? `<div style="text-align:center; font-size:clamp(1.3rem, 4vw, 2.2rem); color:var(--muted); text-transform:uppercase; width:100%; margin-top:4px;">${randomSituation()}</div>` : ""}`;
  heroTime.innerHTML = "";

  actionArea.innerHTML = `
    <div class="training-main-center">
      <div class="throw-grid count-${s.count}" style="width:100%; display:grid; gap:8px; grid-template-columns: repeat(${s.count > 3 ? 2 : (s.count === 3 ? 3 : s.count)}, 1fr);">
        ${throws.map(name => `<div class="throw-card" style="min-height:90px; display:flex; align-items:center; justify-content:center; text-align:center; padding:10px; border:2px solid var(--border); border-radius:10px; background:var(--surface); font-size:clamp(1.2rem, 4vw, 2.5rem); font-weight:bold;">${name}</div>`).join("")}
      </div>
    </div>`;

  const btnRow = trainingView.querySelector(".button-row");
  btnRow.innerHTML = `
    <div class="bottom-actions three" style="display:flex; justify-content:center; gap:8px; width:100%;">
      <button class="large-action stop-button" data-action="stop" style="flex:1; min-height:65px; font-size:clamp(1.2rem, 4vw, 2rem); font-weight:bold; color:#f44336; border-color:#f44336; background:var(--surface-3);">Stop</button>
      <button class="large-action" data-action="skip" style="flex:1; min-height:65px; font-size:clamp(1.2rem, 4vw, 2rem); font-weight:bold; color:#ffeb3b; border-color:#ffeb3b; background:var(--surface-2);">Skip</button>
      <button class="large-action" data-action="next" style="flex:1; min-height:65px; font-size:clamp(1.2rem, 4vw, 2rem); font-weight:bold; color:#4caf50; border-color:#4caf50; background:var(--surface-2);">Next</button>
    </div>`;
}

function startSituationHighscoreTimer() {
  stopTimer();
  timerId = setInterval(() => {
    const s = state.situationHighscore;
    s.remaining -= 1;
    const timeSpan = trainingStatus.querySelector("span:last-child");
    if (timeSpan) timeSpan.textContent = formatTime(s.remaining);

    if (s.remaining <= 0) {
      stopTimer();
      playTone("end");
      state.situationHighscore.running = false;
      trainingStatus.innerHTML = "";
      actionArea.innerHTML = `
        <div class="training-main-center">
          <div class="result-label" style="color:var(--muted); font-size:clamp(1.2rem, 4vw, 2rem);">Gesamtscore</div>
          <div class="result-score" style="font-size:clamp(4rem, 15vw, 10rem); font-weight:900; line-height:1;">${s.score}</div>
        </div>`;
      trainingView.querySelector(".button-row").innerHTML = `<button class="reset-button" data-action="reset" style="width:100%; min-height:70px; font-size:clamp(1.5rem, 6vw, 2.5rem); font-weight:bold;">Reset</button>`;
    }
  }, 1000);
}

function handleAction(action, value) {
  if (action === "go") {
    if (currentMode === "timed") startTimed();
    if (currentMode === "highscore") startHighscore();
    if (currentMode === "situations") startSituations();
    if (currentMode === "situationHighscore") startSituationHighscore();
  }
  if (action === "stop") { stopTimer(); showSetupView(); }
  if (action === "reset") { showSetupView(); }
  if (action === "adjust") {
    const s = state[currentMode];
    if (value.field === "interval") s.interval = Math.max(1, s.interval + Number(value.amount));
    if (value.field === "totalTime") s.totalTime = Math.max(30, s.totalTime + Number(value.amount));
    renderSettings();
  }
  if (action === "group") { state[currentMode].group = value; renderSettings(); }
  if (action === "round") { state[currentMode].round = value; renderSettings(); }
  if (action === "count") { state[currentMode].count = Number(value); renderSettings(); }
  if (action === "situation") { state[currentMode].situation = value === "true"; renderSettings(); }
  if (action === "next") {
    if (currentMode === "highscore") { state.highscore.score++; renderHighscoreTraining(); }
    if (currentMode === "situationHighscore") { state.situationHighscore.score++; renderSituationHighscoreTraining(); }
  }
  if (action === "skip") {
    if (currentMode === "highscore") { state.highscore.score = Math.max(0, state.highscore.score - 1); renderHighscoreTraining(); }
    if (currentMode === "situationHighscore") { state.situationHighscore.score = Math.max(0, state.situationHighscore.score - 1); renderSituationHighscoreTraining(); }
  }
}

function toggleTraining() {
  if (!setupView.classList.contains("hidden")) { handleAction("go"); } else { handleAction("next"); }
}

if (modeSelect) {
  modeSelect.addEventListener("change", (e) => { currentMode = e.target.value; renderSettings(); });
}

if (startButton) startButton.addEventListener("click", () => handleAction("go"));

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;
  if (!action) return;
  if (action === "adjust") {
    handleAction(action, { field: btn.dataset.field, amount: btn.dataset.value });
  } else {
    handleAction(action, btn.dataset.value);
  }
});

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "bright") {
    root.style.setProperty("--bg", "#fff");
    root.style.setProperty("--surface", "#f0f0f0");
    root.style.setProperty("--text", "#111");
    if (themeToggle) themeToggle.textContent = "☀";
  } else {
    root.style.setProperty("--bg", "#111");
    root.style.setProperty("--surface", "#202020");
    root.style.setProperty("--text", "#fff");
    if (themeToggle) themeToggle.textContent = "☾";
  }
  localStorage.setItem("judo-theme", theme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = localStorage.getItem("judo-theme") || "dark";
    applyTheme(current === "dark" ? "bright" : "dark");
  });
}

applyTheme(localStorage.getItem("judo-theme") || "dark");
renderSettings();