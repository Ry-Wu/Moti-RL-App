const STORAGE_KEY = "moti-state-v2";

// Notion renders embeds inside an iframe. Compact the surrounding chrome there,
// while keeping the same full dashboard and locally saved state.
if (new URLSearchParams(window.location.search).has("embed") || window.self !== window.top) {
  document.documentElement.classList.add("embedded");
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function freshState() {
  return { tasks: [], events: [], activeSession: null, dayKey: getLocalDateKey() };
}

let state = loadState();
let timerInterval;
let toastTimer;
let pendingDeleteEventId = null;

const $ = (selector) => document.querySelector(selector);
const els = {
  dateChip: $("#dateChip"),
  sessionCard: $("#sessionCard"),
  statusPill: $("#statusPill"),
  sessionKicker: $("#sessionKicker"),
  sessionTitle: $("#sessionTitle"),
  timerWrap: $("#timerWrap"),
  timer: $("#timer"),
  timerTask: $("#timerTask"),
  sessionInputWrap: $("#sessionInputWrap"),
  sessionInput: $("#sessionInput"),
  sessionButton: $("#sessionButton"),
  sessionButtonText: $("#sessionButtonText"),
  sessionFootnote: $("#sessionFootnote"),
  totalScore: $("#totalScore"),
  scoreTrend: $("#scoreTrend"),
  sessionCount: $("#sessionCount"),
  scoreChart: $("#scoreChart"),
  taskForm: $("#taskForm"),
  taskInput: $("#taskInput"),
  taskList: $("#taskList"),
  taskCount: $("#taskCount"),
  emptyTasks: $("#emptyTasks"),
  penaltyInput: $("#penaltyInput"),
  penaltyButton: $("#penaltyButton"),
  activityList: $("#activityList"),
  emptyActivity: $("#emptyActivity"),
  clearLogButton: $("#clearLogButton"),
  resetButton: $("#resetButton"),
  confirmDialog: $("#confirmDialog"),
  deleteDialog: $("#deleteDialog"),
  toast: $("#toast"),
  toastScore: $("#toastScore"),
  toastTitle: $("#toastTitle"),
  toastMessage: $("#toastMessage"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return freshState();
    if (saved.dayKey && saved.dayKey !== getLocalDateKey()) return freshState();

    const migrated = { ...freshState(), ...saved, dayKey: getLocalDateKey() };
    if (!saved.dayKey) {
      migrated.events = Array.isArray(saved.events) ? saved.events.filter((event) => isToday(event.timestamp)) : [];
      migrated.tasks = Array.isArray(saved.tasks) ? saved.tasks.filter((task) => isToday(task.createdAt)) : [];
      migrated.activeSession = saved.activeSession && isToday(saved.activeSession.startedAt) ? saved.activeSession : null;
    }
    return migrated;
  } catch {
    return freshState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureCurrentDay(showNotice = false) {
  if (state.dayKey === getLocalDateKey()) return false;
  state = freshState();
  saveState();
  render();
  if (showNotice) showToast(0, "A new day", "Yesterday is cleared. Today starts fresh.");
  return true;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function relativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isToday(timestamp) {
  const a = new Date(timestamp);
  const b = new Date();
  return a.toDateString() === b.toDateString();
}

function addEvent(type, score, label, sessionId = null) {
  state.events.unshift({ id: makeId(), type, score, label, sessionId, timestamp: Date.now() });
}

function startSession(intentionOverride = "", taskId = null) {
  ensureCurrentDay();
  if (state.activeSession) return;
  const intention = intentionOverride || els.sessionInput.value.trim() || "Open work session";
  const sessionId = makeId();
  const score = randomBetween(1, 50);
  state.activeSession = { id: sessionId, intention, taskId, startedAt: Date.now() };
  addEvent("start", score, intention, sessionId);
  els.sessionInput.value = "";
  saveState();
  render();
  showToast(score, "Session started", "The first reward is in. Now make it count.");
}

function endSession() {
  if (ensureCurrentDay()) return;
  if (!state.activeSession) return;
  const score = randomBetween(1, 50);
  const { id, intention } = state.activeSession;
  addEvent("end", score, intention, id);
  state.activeSession = null;
  saveState();
  render();
  showToast(score, "Session complete", "You showed up twice: once to start, once to finish.");
}

function logPenalty() {
  ensureCurrentDay();
  const label = els.penaltyInput.value.trim() || "Unhelpful detour";
  const score = -randomBetween(1, 100);
  addEvent("penalty", score, label);
  els.penaltyInput.value = "";
  saveState();
  render();
  showToast(score, "Detour logged", "Not a verdict—just a nudge back on course.", true);
}

function showToast(score, title, message, negative = false) {
  clearTimeout(toastTimer);
  els.toastScore.textContent = score > 0 ? `+${score}` : score;
  els.toastTitle.textContent = title;
  els.toastMessage.textContent = message;
  els.toast.classList.toggle("negative", negative);
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 3600);
}

function renderSession() {
  const active = state.activeSession;
  els.sessionCard.classList.toggle("active", Boolean(active));
  els.sessionInputWrap.hidden = Boolean(active);
  els.timerWrap.hidden = !active;
  els.sessionButtonText.textContent = active ? "End session" : "Start session";
  els.sessionKicker.textContent = active ? "Stay with the next useful action." : "Put some skin in the game.";
  els.sessionTitle.innerHTML = active ? "You’re in<br />the work." : "What will you<br />move forward?";
  els.sessionFootnote.textContent = active ? "Finishing earns another surprise score from +1 to +50." : "Starting earns a surprise score from +1 to +50.";
  els.statusPill.querySelector("span").textContent = active ? "Active" : "Ready";

  clearInterval(timerInterval);
  if (active) {
    els.timerTask.textContent = active.intention;
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }
}

function updateTimer() {
  if (!state.activeSession) return;
  els.timer.textContent = formatTime(Date.now() - state.activeSession.startedAt);
}

function renderScore() {
  const total = state.events.reduce((sum, event) => sum + event.score, 0);
  const completedSessionIds = new Set(state.events.filter((event) => event.type === "end").map((event) => event.sessionId));
  els.totalScore.textContent = total.toLocaleString();
  els.scoreTrend.textContent = state.events.length ? `${state.events.length} ${state.events.length === 1 ? "entry" : "entries"}` : "saved today";
  els.sessionCount.textContent = `${completedSessionIds.size} session${completedSessionIds.size === 1 ? "" : "s"}`;
  els.totalScore.classList.remove("bump");
  requestAnimationFrame(() => els.totalScore.classList.add("bump"));

  const recent = state.events.slice(0, 22).reverse();
  const max = Math.max(20, ...recent.map((event) => Math.abs(event.score)));
  els.scoreChart.innerHTML = recent.length
    ? recent.map((event, index) => {
        const height = Math.max(9, Math.round((Math.abs(event.score) / max) * 66));
        return `<i class="score-bar ${event.score < 0 ? "negative" : ""}" style="height:${height}px;animation-delay:${index * 18}ms" title="${event.label}: ${event.score > 0 ? "+" : ""}${event.score}"></i>`;
      }).join("")
    : `<i class="score-bar" style="height:9px;opacity:.12"></i><i class="score-bar" style="height:16px;opacity:.12"></i><i class="score-bar" style="height:12px;opacity:.12"></i>`;
}

function renderTasks() {
  const open = state.tasks.filter((task) => !task.done).length;
  els.taskCount.textContent = `${open} open`;
  els.emptyTasks.hidden = state.tasks.length > 0;
  els.taskList.innerHTML = state.tasks.map((task) => {
    const isActiveTask = state.activeSession?.taskId === task.id;
    return `
    <li class="task-item ${task.done ? "done" : ""}" data-id="${task.id}">
      <button class="task-check" data-action="toggle" aria-label="${task.done ? "Mark incomplete" : "Complete task"}">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>
      </button>
      <span class="task-text"></span>
      <button class="task-start ${isActiveTask ? "active" : ""}" data-action="start" ${task.done ? "hidden" : ""} ${state.activeSession ? "disabled" : ""} aria-label="${isActiveTask ? "This task has an active session" : `Start a work session for this task`}">${isActiveTask ? "Active" : "Start"}</button>
      <button class="task-delete" data-action="delete" aria-label="Delete task">×</button>
    </li>
  `;
  }).join("");

  state.tasks.forEach((task) => {
    const row = els.taskList.querySelector(`[data-id="${CSS.escape(task.id)}"]`);
    if (row) row.querySelector(".task-text").textContent = task.text;
  });
}

function renderActivity() {
  const recent = state.events.slice(0, 8);
  els.emptyActivity.hidden = recent.length > 0;
  els.clearLogButton.hidden = recent.length === 0;
  const labels = { start: "Session started", end: "Session finished", penalty: "Detour logged" };
  const icons = { start: "↗", end: "✓", penalty: "↘" };
  els.activityList.innerHTML = recent.map((event) => `
    <div class="activity-row ${event.type === "penalty" ? "penalty" : ""}">
      <span class="activity-icon">${icons[event.type]}</span>
      <span class="activity-copy">
        <strong></strong>
        <span>${labels[event.type]} · ${relativeTime(event.timestamp)}</span>
      </span>
      <span class="activity-score">${event.score > 0 ? "+" : ""}${event.score}</span>
      <button class="activity-delete" data-action="delete-event" data-id="${event.id}" aria-label="Delete ${labels[event.type].toLowerCase()} record" title="Delete record">×</button>
    </div>
  `).join("");
  recent.forEach((event, index) => {
    els.activityList.children[index]?.querySelector("strong").replaceChildren(document.createTextNode(event.label));
  });
}

function render() {
  renderSession();
  renderScore();
  renderTasks();
  renderActivity();
}

els.dateChip.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());

els.sessionButton.addEventListener("click", () => state.activeSession ? endSession() : startSession());
els.sessionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") startSession();
});
els.penaltyButton.addEventListener("click", logPenalty);
els.penaltyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") logPenalty();
});

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  ensureCurrentDay();
  const text = els.taskInput.value.trim();
  if (!text) return;
  state.tasks.unshift({ id: makeId(), text, done: false, createdAt: Date.now() });
  els.taskInput.value = "";
  saveState();
  renderTasks();
});

els.taskList.addEventListener("click", (event) => {
  if (ensureCurrentDay()) return;
  const button = event.target.closest("button");
  const row = event.target.closest(".task-item");
  if (!button || !row) return;
  const index = state.tasks.findIndex((task) => task.id === row.dataset.id);
  if (index < 0) return;
  if (button.dataset.action === "start" && !button.disabled && !state.tasks[index].done) {
    startSession(state.tasks[index].text, state.tasks[index].id);
    return;
  }
  if (button.dataset.action === "toggle") state.tasks[index].done = !state.tasks[index].done;
  if (button.dataset.action === "delete") state.tasks.splice(index, 1);
  saveState();
  renderTasks();
});

els.clearLogButton.addEventListener("click", () => {
  if (ensureCurrentDay()) return;
  state.events = [];
  saveState();
  renderScore();
  renderActivity();
});

els.activityList.addEventListener("click", (event) => {
  if (ensureCurrentDay()) return;
  const button = event.target.closest('[data-action="delete-event"]');
  if (!button) return;
  pendingDeleteEventId = button.dataset.id;
  els.deleteDialog.returnValue = "";
  els.deleteDialog.showModal();
});

els.deleteDialog.addEventListener("close", () => {
  if (ensureCurrentDay()) {
    pendingDeleteEventId = null;
    return;
  }
  if (els.deleteDialog.returnValue === "confirm" && pendingDeleteEventId) {
    state.events = state.events.filter((event) => event.id !== pendingDeleteEventId);
    saveState();
    renderScore();
    renderActivity();
    showToast(0, "Record deleted", "Your score total has been recalculated.");
  }
  pendingDeleteEventId = null;
});

els.resetButton.addEventListener("click", () => {
  els.confirmDialog.returnValue = "";
  els.confirmDialog.showModal();
});
els.confirmDialog.addEventListener("close", () => {
  if (els.confirmDialog.returnValue !== "confirm") return;
  state = freshState();
  saveState();
  render();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && ensureCurrentDay(true)) return;
  if (!document.hidden && state.activeSession) updateTimer();
});

setInterval(() => ensureCurrentDay(true), 60_000);

render();
