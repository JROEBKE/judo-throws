const app = document.getElementById("app");
const topbar = document.querySelector(".topbar");
const navButtons = [...document.querySelectorAll(".nav-button")];
const themeToggle = document.getElementById("themeToggle");

let currentMode = "timed";
let timerId = null;
let audioContext = null;

const state = {
  timed: {
    interval: 30,
    group: "basic",
    round: "single",
    running: false,
    sequence: [],
    index: 0,
    remaining: 30
  },
  highscore: {
    totalTime: 300,
    group: "basic",
    running: false,
    score: 0,
    sequence: [],
    index: 0,
    remaining: 300
  },
  situations: {
    interval: 60,
    group: "basic",
    round: "single",
    count: 3,
    situation: true,
    running: false,
    sequence: [],
    index: 0,
    remaining: 60
  },
  situationHighscore: {
    totalTime: 600,
    group: "basic",
    count: 3,
    situation: true,
    running: false,
    score: 0,
    sequence: [],
    index: 0,
    remaining: 600
  }
};

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function playTone(type = "change") {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
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

function groupThrows(group) {
  return THROW_DATA.groups[group].throws;
}

function nextRoundSequence(group) {
  return shuffle(groupThrows(group));
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function renderSettings({
  interval = null,
  totalTime = null,
  group,
  round = null,
  count = null,
  situation = null
}) {
  let html = `<section class="settings">`;

  if (interval !== null) {
    html += `
      <div class="setting">
        <div class="setting-label">Zeitintervall</div>
        <div class="setting-control">
          <button data-action="adjust" data-field="interval" data-value="-10">−10</button>
          <div class="setting-value">${interval} Sekunden</div>
          <button data-action="adjust" data-field="interval" data-value="10">+10</button>
        </div>
      </div>`;
  }

  if (totalTime !== null) {
    html += `
      <div class="setting">
        <div class="setting-label">Gesamtzeit</div>
        <div class="setting-control">
          <button data-action="adjust" data-field="totalTime" data-value="-30">−30</button>
          <div class="setting-value">${formatTime(totalTime)}</div>
          <button data-action="adjust" data-field="totalTime" data-value="30">+30</button>
        </div>
      </div>`;
  }

  html += `
    <div class="setting">
      <div class="setting-label">Wurfgruppe</div>
      <div class="setting-control two">
        ${Object.entries(THROW_DATA.groups).map(([key, item]) =>
          `<button class="choice-button ${key === group ? "selected" : ""}" data-action="group" data-value="${key}">${item.name}</button>`
        ).join("")}
      </div>
    </div>`;

  if (round !== null) {
    html += `
      <div class="setting">
        <div class="setting-label">Runde</div>
        <div class="setting-control two">
          <button class="choice-button ${round === "single" ? "selected" : ""}" data-action="round" data-value="single">Single Round</button>
          <button class="choice-button ${round === "loop" ? "selected" : ""}" data-action="round" data-value="loop">Loop</button>
        </div>
      </div>`;
  }

  if (count !== null) {
    html += `
      <div class="setting">
        <div class="setting-label">Wurfanzahl</div>
        <div class="setting-control two">
          <button class="choice-button ${count === 2 ? "selected" : ""}" data-action="count" data-value="2">2</button>
          <button class="choice-button ${count === 3 ? "selected" : ""}" data-action="count" data-value="3">3</button>
          <button class="choice-button ${count === 4 ? "selected" : ""}" data-action="count" data-value="4">4</button>
          <button class="choice-button ${count === 5 ? "selected" : ""}" data-action="count" data-value="5">5</button>
        </div>
      </div>`;
  }

  if (situation !== null) {
    html += `
      <div class="setting">
        <div class="setting-label">Situationsvorgabe</div>
        <div class="setting-control two">
          <button class="choice-button ${situation ? "selected" : ""}" data-action="situation" data-value="true">Ja</button>
          <button class="choice-button ${!situation ? "selected" : ""}" data-action="situation" data-value="false">Nein</button>
        </div>
      </div>`;
  }

  html += `</section>`;
  return html;
}

function settingsScreen(title, settingsHtml) {
  app.innerHTML = `
    <section class="mode-screen">
      <h1>${title}</h1>
      ${settingsHtml}
      <div class="action-area">
        <button class="go-button" data-action="go">Go</button>
      </div>
    </section>`;
}

function renderModeSettings() {
  topbar.classList.remove("mode-nav-hidden");
  stopTimer();

  if (currentMode === "timed") {
    const s = state.timed;
    settingsScreen("Würfe auf Zeit", renderSettings({
      interval: s.interval, group: s.group, round: s.round
    }));
  }

  if (currentMode === "highscore") {
    const s = state.highscore;
    settingsScreen("Würfe Highscore", renderSettings({
      totalTime: s.totalTime, group: s.group
    }));
  }

  if (currentMode === "situations") {
    const s = state.situations;
    settingsScreen("Würfe in Situationen", renderSettings({
      interval: s.interval, group: s.group, round: s.round,
      count: s.count, situation: s.situation
    }));
  }

  if (currentMode === "situationHighscore") {
    const s = state.situationHighscore;
    settingsScreen("Situationen Highscore", renderSettings({
      totalTime: s.totalTime, group: s.group,
      count: s.count, situation: s.situation
    }));
  }
}

function showThrow(name) {
  const el = document.querySelector(".throw-name");
  if (!el) return;
  el.classList.remove("change");
  void el.offsetWidth;
  el.textContent = name;
  el.classList.add("change");
}

function renderTimedTraining() {
  const s = state.timed;
  app.innerHTML = `
    <section class="training-screen">
      <div class="throw-display">
        <div class="throw-name"></div>
        <div class="countdown">${s.remaining}</div>
      </div>
      <div class="bottom-actions">
        <button class="large-action stop-button" data-action="stop">Stop</button>
      </div>
    </section>`;
  showThrow(s.sequence[s.index]);
  startTimedTimer();
}

function startTimedTimer() {
  stopTimer();
  timerId = setInterval(() => {
    const s = state.timed;
    s.remaining -= 1;
    const cd = document.querySelector(".countdown");
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
  renderModeSettings();
}

function startTimed() {
  const s = state.timed;
  s.running = true;
  s.sequence = nextRoundSequence(s.group);
  s.index = 0;
  s.remaining = s.interval;
  renderTimedTraining();
}

function stopTimed() {
  stopTimer();
  state.timed.running = false;
  renderModeSettings();
}

function startHighscore() {
  const s = state.highscore;
  s.running = true;
  s.score = 0;
  s.sequence = nextRoundSequence(s.group);
  s.index = 0;
  s.remaining = s.totalTime;
  renderHighscoreTraining();
}

function renderHighscoreTraining() {
  const s = state.highscore;
  app.innerHTML = `
    <section class="training-screen">
      <div class="score">Score: ${s.score}</div>
      <div class="throw-display">
        <div class="throw-name"></div>
        <div class="countdown">${formatTime(s.remaining)}</div>
      </div>
      <div class="bottom-actions three">
        <button class="large-action stop-button" data-action="stop">Stop</button>
        <button class="large-action" data-action="skip">Skip</button>
        <button class="large-action" data-action="next">Next</button>        
      </div>
    </section>`;
  showThrow(s.sequence[s.index]);
  startHighscoreTimer();
}

function nextHighscore() {
  const s = state.highscore;
  s.score += 1;
  advanceHighscoreThrow();
}

function skipHighscore() {
  const s = state.highscore;
  s.score = Math.max(0, s.score - 1);
  advanceHighscoreThrow();
}

function advanceHighscoreThrow() {
  const s = state.highscore;
  s.index += 1;
  if (s.index >= s.sequence.length) {
    s.sequence = nextRoundSequence(s.group);
    s.index = 0;
  }
  renderHighscoreTraining();
}

function startHighscoreTimer() {
  stopTimer();
  timerId = setInterval(() => {
    const s = state.highscore;
    s.remaining -= 1;
    const cd = document.querySelector(".countdown");
    if (cd) cd.textContent = formatTime(s.remaining);

    if (s.remaining <= 0) finishHighscore();
  }, 1000);
}

function finishHighscore() {
  stopTimer();
  playTone("end");
  state.highscore.running = false;
  const score = state.highscore.score;
  app.innerHTML = `
    <section class="training-screen">
      <div class="result">
        <div class="result-label">Gesamtscore</div>
        <div class="result-score">${score}</div>
      </div>
      <div class="action-area">
        <button class="reset-button" data-action="reset">Reset</button>
      </div>
    </section>`;
}

function startSituations() {
  const s = state.situations;
  s.running = true;
  s.sequence = nextRoundSequence(s.group);
  s.index = 0;
  s.remaining = s.interval;
  renderSituationTraining();
}

function situationThrows(s) {
  let pool = groupThrows(s.group);
  if (pool.length < s.count) {
    return shuffle(pool);
  }
  return shuffle(pool).slice(0, s.count);
}

function renderSituationTraining() {
  const s = state.situations;
  const throws = situationThrows(s);
  s.currentThrows = throws;

  app.innerHTML = `
    <section class="training-screen">
      ${s.situation ? `<div class="situation-title">${randomSituation()}</div>` : ""}
      <div class="throw-grid count-${s.count}">
        ${throws.map(name => `<div class="throw-card">${name}</div>`).join("")}
      </div>
      <div class="countdown">${formatTime(s.remaining)}</div>
      <div class="bottom-actions">
        <button class="large-action stop-button" data-action="stop">Stop</button>
      </div>
    </section>`;
  startSituationTimer();
}

function randomSituation() {
  return THROW_DATA.situations[Math.floor(Math.random() * THROW_DATA.situations.length)];
}

function advanceSituation() {
  const s = state.situations;
  s.index += 1;

  if (s.index >= s.sequence.length) {
    if (s.round === "loop") {
      s.sequence = nextRoundSequence(s.group);
      s.index = 0;
    } else {
      finishSituations();
      return;
    }
  }

  s.remaining = s.interval;
  playTone("change");
  renderSituationTraining();
}

function startSituationTimer() {
  stopTimer();
  timerId = setInterval(() => {
    const s = state.situations;
    s.remaining -= 1;
    const cd = document.querySelector(".countdown");
    if (cd) cd.textContent = formatTime(s.remaining);

    if (s.remaining <= 0) advanceSituation();
  }, 1000);
}

function finishSituations() {
  stopTimer();
  playTone("end");
  state.situations.running = false;
  renderModeSettings();
}

function stopSituations() {
  stopTimer();
  state.situations.running = false;
  renderModeSettings();
}

function startSituationHighscore() {
  const s = state.situationHighscore;
  s.running = true;
  s.score = 0;
  s.sequence = nextRoundSequence(s.group);
  s.index = 0;
  s.remaining = s.totalTime;
  renderSituationHighscoreTraining();
}

function renderSituationHighscoreTraining() {
  const s = state.situationHighscore;
  const throws = situationThrows(s);
  s.currentThrows = throws;

  app.innerHTML = `
    <section class="training-screen">
      <div class="status-bar">
        <div class="score">Score: ${s.score}</div>
        <div class="countdown">${formatTime(s.remaining)}</div>
      </div>
      ${s.situation ? `<div class="situation-title">${randomSituation()}</div>` : ""}
      <div class="throw-grid count-${s.count}">
        ${throws.map(name => `<div class="throw-card">${name}</div>`).join("")}
      </div>
      <div class="bottom-actions three">
        <button class="large-action stop-button" data-action="stop">Stop</button>        
        <button class="large-action" data-action="skip">Skip</button>
        <button class="large-action" data-action="next">Next</button>
      </div>
    </section>`;
  startSituationHighscoreTimer();
}

function nextSituationHighscore() {
  const s = state.situationHighscore;
  s.score += 1;
  advanceSituationHighscore();
}

function skipSituationHighscore() {
  const s = state.situationHighscore;
  s.score = Math.max(0, s.score - 1);
  advanceSituationHighscore();
}

function advanceSituationHighscore() {
  const s = state.situationHighscore;
  s.index += 1;

  if (s.index >= s.sequence.length) {
    s.sequence = nextRoundSequence(s.group);
    s.index = 0;
  }

  renderSituationHighscoreTraining();
}

function startSituationHighscoreTimer() {
  stopTimer();
  timerId = setInterval(() => {
    const s = state.situationHighscore;
    s.remaining -= 1;
    const cd = document.querySelector(".countdown");
    if (cd) cd.textContent = formatTime(s.remaining);

    if (s.remaining <= 0) finishSituationHighscore();
  }, 1000);
}

function finishSituationHighscore() {
  stopTimer();
  playTone("end");
  state.situationHighscore.running = false;
  const score = state.situationHighscore.score;

  app.innerHTML = `
    <section class="training-screen">
      <div class="result">
        <div class="result-label">Gesamtscore</div>
        <div class="result-score">${score}</div>
      </div>
      <div class="action-area">
        <button class="reset-button" data-action="reset">Reset</button>
      </div>
    </section>`;
}

function stopSituationHighscore() {
  stopTimer();
  state.situationHighscore.running = false;
  renderModeSettings();
}

function adjust(field, amount) {
  const s = state[currentMode];

  if (field === "interval") {
    s.interval = Math.max(10, s.interval + amount);
  }

  if (field === "totalTime") {
    s.totalTime = Math.max(30, s.totalTime + amount);
  }

  renderModeSettings();
}

function handleAction(action, value) {
  if (action === "go") {
    topbar.classList.add("mode-nav-hidden");
    if (currentMode === "timed") startTimed();
    if (currentMode === "highscore") startHighscore();
    if (currentMode === "situations") startSituations();
    if (currentMode === "situationHighscore") startSituationHighscore();
  }

  if (action === "stop") {
    if (currentMode === "timed") stopTimed();
    if (currentMode === "highscore") {
      stopTimer();
      state.highscore.running = false;
      renderModeSettings();
    }
    if (currentMode === "situations") stopSituations();
    if (currentMode === "situationHighscore") stopSituationHighscore();
  }

  if (action === "reset") renderModeSettings();

  if (action === "adjust") adjust(value.field, Number(value.amount));

  if (action === "group") {
    state[currentMode].group = value;
    renderModeSettings();
  }

  if (action === "round") {
    state[currentMode].round = value;
    renderModeSettings();
  }

  if (action === "count") {
    state[currentMode].count = Number(value);
    renderModeSettings();
  }

  if (action === "situation") {
    state[currentMode].situation = value === "true";
    renderModeSettings();
  }

  if (action === "next") {
    if (currentMode === "highscore") nextHighscore();
    if (currentMode === "situationHighscore") nextSituationHighscore();
  }

  if (action === "skip") {
    if (currentMode === "highscore") skipHighscore();
    if (currentMode === "situationHighscore") skipSituationHighscore();
  }
}

document.addEventListener("pointerdown", () => {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
  } catch (_) {}
}, { once: true });

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  if (!action) return;

  if (action === "adjust") {
    handleAction(action, {
      field: button.dataset.field,
      amount: button.dataset.value
    });
  } else {
    handleAction(action, button.dataset.value);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
  if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;

  const actions = { d: "go", a: "stop", s: "skip" };
  const action = actions[event.key.toLowerCase()];
  if (!action) return;

  const button = app.querySelector(`button[data-action="${action}"]`);
  if (!button) return;

  event.preventDefault();
  button.click();
});

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentMode = button.dataset.mode;
    navButtons.forEach(b => b.classList.toggle("active", b === button));
    renderModeSettings();
  });
});

function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === "bright") {
    root.style.setProperty("--bg", "#fff");
    root.style.setProperty("--surface", "#f0f0f0");
    root.style.setProperty("--surface-2", "#ddd");
    root.style.setProperty("--surface-3", "#ccc");
    root.style.setProperty("--text", "#111");
    root.style.setProperty("--muted", "#555");
    root.style.setProperty("--border", "#999");
    themeToggle.textContent = "☀";
  } else {
    root.style.setProperty("--bg", "#111");
    root.style.setProperty("--surface", "#202020");
    root.style.setProperty("--surface-2", "#2d2d2d");
    root.style.setProperty("--surface-3", "#3a3a3a");
    root.style.setProperty("--text", "#fff");
    root.style.setProperty("--muted", "#bdbdbd");
    root.style.setProperty("--border", "#555");
    themeToggle.textContent = "☾";
  }

  localStorage.setItem("judo-theme", theme);
}

themeToggle.addEventListener("click", () => {
  const current = localStorage.getItem("judo-theme") || "dark";
  applyTheme(current === "dark" ? "bright" : "dark");
});

applyTheme(localStorage.getItem("judo-theme") || "dark");
renderModeSettings();
