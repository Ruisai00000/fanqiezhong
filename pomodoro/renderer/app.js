const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
};

const PHASES = {
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
};

// State
let settings = { ...DEFAULT_SETTINGS };
let phase = PHASES.WORK;
let timeRemaining = settings.workDuration * 60;
let totalTime = settings.workDuration * 60;
let isRunning = false;
let isPaused = false;
let completedPomodoros = 0;
let timerInterval = null;
let targetTimestamp = null;

// DOM refs
const timerDisplay = document.getElementById('timerDisplay');
const phaseLabel = document.getElementById('phaseLabel');
const progressRing = document.getElementById('progressRing');
const pomodoroCount = document.getElementById('pomodoroCount');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const closeBtn = document.getElementById('closeBtn');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const settingsSave = document.getElementById('settingsSave');

const ringCircumference = 2 * Math.PI * 88; // ~553

// Load settings from localStorage
function loadSettings() {
  try {
    const saved = localStorage.getItem('pomodoro-settings');
    if (saved) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) { /* ignore */ }
}

function saveSettings() {
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(timeRemaining);
  const progress = 1 - timeRemaining / totalTime;
  progressRing.style.strokeDashoffset = ringCircumference * progress;
}

function updatePhaseLabel() {
  const labels = {
    [PHASES.WORK]: '工作中',
    [PHASES.SHORT_BREAK]: '休息中',
    [PHASES.LONG_BREAK]: '长休息',
  };
  phaseLabel.textContent = labels[phase];
  document.body.className = phase === PHASES.WORK ? 'work' : 'break';
}

function updatePomodoroCount() {
  pomodoroCount.textContent = `第 ${completedPomodoros} 个番茄`;
}

function setTotalTime(seconds) {
  totalTime = seconds;
  progressRing.style.strokeDasharray = ringCircumference;
  progressRing.style.strokeDashoffset = 0;
}

function getPhaseDuration() {
  if (phase === PHASES.WORK) return settings.workDuration * 60;
  if (phase === PHASES.SHORT_BREAK) return settings.shortBreak * 60;
  return settings.longBreak * 60;
}

function transitionTo(nextPhase) {
  phase = nextPhase;
  timeRemaining = getPhaseDuration();
  setTotalTime(getPhaseDuration());
  updateDisplay();
  updatePhaseLabel();
  updatePomodoroCount();
}

// Web Audio API beep
let audioCtx = null;

function playBeep() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) { /* audio not available */ }
}

function notify(title, body) {
  if (window.electronAPI) {
    window.electronAPI.showNotification(title, body);
  }
  playBeep();
}

function onTimerTick() {
  const elapsed = Math.floor((targetTimestamp - Date.now()) / 1000);
  timeRemaining = Math.max(0, elapsed);
  updateDisplay();

  if (timeRemaining <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    targetTimestamp = null;

    if (phase === PHASES.WORK) {
      completedPomodoros++;
      notify('番茄钟', '工作完成！该休息了');
      if (completedPomodoros % settings.longBreakInterval === 0) {
        transitionTo(PHASES.LONG_BREAK);
      } else {
        transitionTo(PHASES.SHORT_BREAK);
      }
    } else {
      notify('番茄钟', '休息结束，继续工作');
      transitionTo(PHASES.WORK);
    }

    // Auto-start next phase
    startTimer();
  }
}

function startTimer() {
  if (timerInterval) return;
  if (timeRemaining <= 0) return;
  isRunning = true;
  isPaused = false;
  startBtn.textContent = '工作中';
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  targetTimestamp = Date.now() + timeRemaining * 1000;
  timerInterval = setInterval(onTimerTick, 1000);
}

function pauseTimer() {
  if (!isRunning || isPaused) return;
  isPaused = true;
  clearInterval(timerInterval);
  timerInterval = null;
  timeRemaining = Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000));
  targetTimestamp = null;
  startBtn.textContent = '继续';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  isPaused = false;
  targetTimestamp = null;
  startBtn.textContent = '开始';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  completedPomodoros = 0;
  transitionTo(PHASES.WORK);
}

function resetUIState() {
  startBtn.textContent = '开始';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

// Settings
function openSettings() {
  document.getElementById('workDuration').value = settings.workDuration;
  document.getElementById('shortBreak').value = settings.shortBreak;
  document.getElementById('longBreak').value = settings.longBreak;
  document.getElementById('longBreakInterval').value = settings.longBreakInterval;
  settingsPanel.classList.remove('hidden');
}

function closeSettings() {
  settingsPanel.classList.add('hidden');
}

function applySettings() {
  const newWork = parseInt(document.getElementById('workDuration').value) || 25;
  const newShort = parseInt(document.getElementById('shortBreak').value) || 5;
  const newLong = parseInt(document.getElementById('longBreak').value) || 15;
  const newInterval = parseInt(document.getElementById('longBreakInterval').value) || 4;

  settings.workDuration = Math.max(1, Math.min(60, newWork));
  settings.shortBreak = Math.max(1, Math.min(30, newShort));
  settings.longBreak = Math.max(1, Math.min(60, newLong));
  settings.longBreakInterval = Math.max(2, Math.min(10, newInterval));

  saveSettings();
  closeSettings();

  // Apply to current timer if not running
  if (!isRunning) {
    transitionTo(phase);
  }
}

// Event listeners
startBtn.addEventListener('click', () => {
  if (isPaused) {
    // Resume
    isPaused = false;
    targetTimestamp = Date.now() + timeRemaining * 1000;
    timerInterval = setInterval(onTimerTick, 1000);
    startBtn.textContent = '工作中';
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    return;
  }
  startTimer();
});

pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
closeBtn.addEventListener('click', () => window.close());
settingsToggle.addEventListener('click', openSettings);
settingsSave.addEventListener('click', applySettings);

// Click outside settings to close
document.addEventListener('click', (e) => {
  if (!settingsPanel.classList.contains('hidden') &&
      !settingsPanel.contains(e.target) &&
      e.target !== settingsToggle) {
    closeSettings();
  }
});

// Init
loadSettings();
transitionTo(PHASES.WORK);
resetUIState();
