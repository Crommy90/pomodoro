import './style.css'

type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

type Settings = {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  soundEnabled: boolean
}

type StoredState = {
  mode: TimerMode
  remainingSeconds: number
  completedFocusSessions: number
  isRunning: boolean
  endTime: number | null
  settings: Settings
}

const STORAGE_KEY = 'tomato-time-state-v1'
const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  soundEnabled: true,
}

const modes: Record<TimerMode, { label: string; prompt: string }> = {
  focus: { label: 'Focus', prompt: 'Settle in and do one thing well.' },
  shortBreak: { label: 'Short break', prompt: 'Stretch, sip, and look away.' },
  longBreak: { label: 'Long break', prompt: 'A proper pause. You earned it.' },
}

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'focus' || value === 'shortBreak' || value === 'longBreak'
}

function validMinutes(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(120, Math.max(1, Math.round(value)))
    : fallback
}

function loadState(): Partial<StoredState> {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY)
    return rawState ? (JSON.parse(rawState) as Partial<StoredState>) : {}
  } catch {
    return {}
  }
}

const storedState = loadState()
const storedSettings = storedState.settings
const settings: Settings = {
  focusMinutes: validMinutes(storedSettings?.focusMinutes, DEFAULT_SETTINGS.focusMinutes),
  shortBreakMinutes: validMinutes(
    storedSettings?.shortBreakMinutes,
    DEFAULT_SETTINGS.shortBreakMinutes,
  ),
  longBreakMinutes: validMinutes(
    storedSettings?.longBreakMinutes,
    DEFAULT_SETTINGS.longBreakMinutes,
  ),
  soundEnabled:
    typeof storedSettings?.soundEnabled === 'boolean'
      ? storedSettings.soundEnabled
      : DEFAULT_SETTINGS.soundEnabled,
}

function durationFor(timerMode: TimerMode) {
  const minutes =
    timerMode === 'focus'
      ? settings.focusMinutes
      : timerMode === 'shortBreak'
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes

  return minutes * 60
}

let mode: TimerMode = isTimerMode(storedState.mode) ? storedState.mode : 'focus'
let remainingSeconds =
  typeof storedState.remainingSeconds === 'number' && storedState.remainingSeconds >= 0
    ? Math.round(storedState.remainingSeconds)
    : durationFor(mode)
let completedFocusSessions =
  typeof storedState.completedFocusSessions === 'number'
    ? Math.min(4, Math.max(0, Math.round(storedState.completedFocusSessions)))
    : 0
let isRunning = Boolean(storedState.isRunning && typeof storedState.endTime === 'number')
let endTime = isRunning ? (storedState.endTime ?? null) : null
let timerId: number | null = null
let audioContext: AudioContext | null = null

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>Tomato Time</span>
      </div>
      <button class="settings-trigger" id="open-settings" type="button">Settings</button>
    </header>

    <section class="timer-panel" aria-labelledby="timer-heading">
      <div class="mode-switcher" role="tablist" aria-label="Timer mode">
        ${Object.entries(modes)
          .map(
            ([key, config]) => `
              <button
                class="mode-button"
                type="button"
                role="tab"
                data-mode="${key}"
                aria-selected="${key === mode}"
              >${config.label}</button>
            `,
          )
          .join('')}
      </div>

      <div class="timer-workspace">
        <div class="mascot-wrap" aria-hidden="true">
          <svg class="mascot" viewBox="0 0 140 130" width="140" height="130">
            <g class="mascot-arm mascot-arm-left">
              <path d="M40 61c-7-6-11-13-13-21-1-3-4-5-7-4s-5 4-4 7c3 11 9 20 19 27Z" />
            </g>
            <g class="mascot-arm mascot-arm-right">
              <path d="M100 61c7-6 11-13 13-21 1-3 4-5 7-4s5 4 4 7c-3 11-9 20-19 27Z" />
            </g>
            <g class="mascot-leg mascot-leg-left">
              <path d="M52 96c-8 6-12 14-8 19 5 5 13-2 17-13Z" />
            </g>
            <g class="mascot-leg mascot-leg-right">
              <path d="M88 96c8 6 12 14 8 19-5 5-13-2-17-13Z" />
            </g>
            <g class="mascot-body">
              <path class="mascot-tomato" d="M70 28C43 24 28 41 29 69c1 26 16 39 41 39s40-13 41-39c1-28-14-45-41-41Z" />
              <path class="mascot-leaf" d="M70 35c-4-7-9-9-14-6 4 2 7 6 8 10-5-2-10 0-13 4 8 0 13 3 19 7 6-4 11-7 19-7-3-4-8-6-13-4 1-4 4-8 8-10-5-3-10-1-14 6Z" />
              <circle class="mascot-eye" cx="56" cy="61" r="3.5" />
              <circle class="mascot-eye" cx="84" cy="61" r="3.5" />
              <path class="mascot-mouth" d="M61 70c5 7 13 8 18 0" />
            </g>
          </svg>
        </div>

        <div class="timer-content">
          <p class="eyebrow" id="timer-heading">Focus session</p>
          <time class="timer-display" datetime="PT25M" aria-live="off">25:00</time>
          <p class="timer-prompt">${modes.focus.prompt}</p>

          <div class="timer-actions">
            <button class="primary-action" id="toggle-timer" type="button">
              <span class="action-icon" aria-hidden="true">▶</span>
              <span class="action-label">Start</span>
            </button>
            <button class="secondary-action" id="reset-timer" type="button">Reset</button>
          </div>
        </div>
      </div>

      <footer class="session-footer">
        <div>
          <p class="session-label">Today’s little harvest</p>
          <div class="session-dots" aria-label="0 of 4 focus sessions complete">
            ${Array.from(
              { length: 4 },
              (_, index) => `<span class="session-dot" data-session="${index}" aria-hidden="true"></span>`,
            ).join('')}
          </div>
        </div>
        <p class="session-count"><strong>0</strong> / 4</p>
      </footer>
    </section>

    <p class="keyboard-hint">Space to start or pause · R to reset</p>
    <p class="sr-only" id="timer-status" aria-live="polite"></p>
  </main>

  <dialog class="settings-dialog" id="settings-dialog" aria-labelledby="settings-title">
    <form class="settings-form" id="settings-form">
      <div class="dialog-heading">
        <div>
          <h2 id="settings-title">Settings</h2>
          <p>Adjust your rhythm.</p>
        </div>
        <button class="close-button" type="button" id="close-settings" aria-label="Close settings">×</button>
      </div>

      <fieldset class="duration-settings">
        <legend>Durations</legend>
        <label>
          <span>Focus</span>
          <span class="number-field"><input id="focus-minutes" name="focusMinutes" type="number" min="1" max="120" required /><span>min</span></span>
        </label>
        <label>
          <span>Short break</span>
          <span class="number-field"><input id="short-break-minutes" name="shortBreakMinutes" type="number" min="1" max="120" required /><span>min</span></span>
        </label>
        <label>
          <span>Long break</span>
          <span class="number-field"><input id="long-break-minutes" name="longBreakMinutes" type="number" min="1" max="120" required /><span>min</span></span>
        </label>
      </fieldset>

      <label class="switch-row">
        <span>
          <strong>Completion sound</strong>
          <small>Play a soft chime when time is up.</small>
        </span>
        <input id="sound-enabled" name="soundEnabled" type="checkbox" role="switch" />
      </label>

      <div class="progress-setting">
        <span>
          <strong>Session progress</strong>
          <small>Clear today’s completed focus sessions.</small>
        </span>
        <button class="text-button" id="reset-progress" type="button">Reset</button>
      </div>

      <div class="dialog-actions">
        <button class="secondary-action" id="cancel-settings" type="button">Cancel</button>
        <button class="primary-action" type="submit">Save</button>
      </div>
    </form>
  </dialog>
`

const display = document.querySelector<HTMLTimeElement>('.timer-display')!
const prompt = document.querySelector<HTMLParagraphElement>('.timer-prompt')!
const heading = document.querySelector<HTMLParagraphElement>('.eyebrow')!
const toggleButton = document.querySelector<HTMLButtonElement>('#toggle-timer')!
const actionIcon = document.querySelector<HTMLSpanElement>('.action-icon')!
const actionLabel = document.querySelector<HTMLSpanElement>('.action-label')!
const resetButton = document.querySelector<HTMLButtonElement>('#reset-timer')!
const modeButtons = document.querySelectorAll<HTMLButtonElement>('.mode-button')
const sessionDots = document.querySelectorAll<HTMLSpanElement>('.session-dot')
const sessionDotsGroup = document.querySelector<HTMLDivElement>('.session-dots')!
const sessionCount = document.querySelector<HTMLElement>('.session-count strong')!
const status = document.querySelector<HTMLParagraphElement>('#timer-status')!
const mascot = document.querySelector<SVGSVGElement>('.mascot')!
const settingsDialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!
const settingsForm = document.querySelector<HTMLFormElement>('#settings-form')!
const focusMinutesInput = document.querySelector<HTMLInputElement>('#focus-minutes')!
const shortBreakMinutesInput = document.querySelector<HTMLInputElement>(
  '#short-break-minutes',
)!
const longBreakMinutesInput = document.querySelector<HTMLInputElement>(
  '#long-break-minutes',
)!
const soundEnabledInput = document.querySelector<HTMLInputElement>('#sound-enabled')!

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function persistState() {
  const state: StoredState = {
    mode,
    remainingSeconds,
    completedFocusSessions,
    isRunning,
    endTime,
    settings,
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The timer remains usable when browser storage is unavailable.
  }
}

function updateView() {
  const config = modes[mode]
  const formattedTime = formatTime(remainingSeconds)

  display.textContent = formattedTime
  display.dateTime = `PT${Math.floor(remainingSeconds / 60)}M${remainingSeconds % 60}S`
  prompt.textContent = config.prompt
  heading.textContent = `${config.label} session`
  actionLabel.textContent = isRunning ? 'Pause' : 'Start'
  actionIcon.textContent = isRunning ? 'Ⅱ' : '▶'
  toggleButton.setAttribute(
    'aria-label',
    isRunning
      ? `Pause ${config.label.toLowerCase()} timer`
      : `Start ${config.label.toLowerCase()} timer`,
  )
  document.body.dataset.mode = mode
  document.title = `${formattedTime} · ${config.label} | Tomato Time`

  modeButtons.forEach((button) => {
    const isSelected = button.dataset.mode === mode
    button.setAttribute('aria-selected', String(isSelected))
    button.tabIndex = isSelected ? 0 : -1
  })

  sessionDots.forEach((dot, index) => {
    dot.classList.toggle('is-complete', index < completedFocusSessions)
  })
  sessionCount.textContent = String(completedFocusSessions)
  sessionDotsGroup.setAttribute(
    'aria-label',
    `${completedFocusSessions} of 4 focus sessions complete`,
  )
}

function announce(message: string) {
  status.textContent = ''
  window.setTimeout(() => {
    status.textContent = message
  }, 50)
}

function stopInterval() {
  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

function prepareAudio() {
  if (!settings.soundEnabled) return
  audioContext ??= new AudioContext()
  if (audioContext.state === 'suspended') void audioContext.resume()
}

function playCompletionSound() {
  if (!settings.soundEnabled) return
  prepareAudio()
  if (!audioContext) return

  const now = audioContext.currentTime
  ;[660, 880].forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator()
    const gain = audioContext!.createGain()
    const start = now + index * 0.14

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13)
    oscillator.connect(gain)
    gain.connect(audioContext!.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.14)
  })
}

function syncRemainingTime() {
  if (!isRunning || endTime === null) return

  const nextRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
  if (nextRemaining !== remainingSeconds) {
    remainingSeconds = nextRemaining
    persistState()
    updateView()
  }

  if (remainingSeconds === 0) completeSession()
}

function startTimer() {
  if (isRunning) return
  if (remainingSeconds === 0) remainingSeconds = durationFor(mode)

  prepareAudio()
  isRunning = true
  endTime = Date.now() + remainingSeconds * 1000
  timerId = window.setInterval(syncRemainingTime, 250)
  persistState()
  updateView()
}

function pauseTimer() {
  if (!isRunning) return
  syncRemainingTime()
  isRunning = false
  endTime = null
  stopInterval()
  persistState()
  updateView()
}

function toggleTimer() {
  if (isRunning) pauseTimer()
  else startTimer()
}

function resetTimer() {
  isRunning = false
  endTime = null
  stopInterval()
  remainingSeconds = durationFor(mode)
  persistState()
  updateView()
  announce(`${modes[mode].label} timer reset.`)
}

function switchMode(nextMode: TimerMode) {
  isRunning = false
  endTime = null
  stopInterval()
  mode = nextMode
  remainingSeconds = durationFor(mode)
  persistState()
  updateView()
  announce(`${modes[mode].label} selected.`)
}

function completeSession() {
  isRunning = false
  endTime = null
  stopInterval()
  playCompletionSound()

  let nextMode: TimerMode
  if (mode === 'focus') {
    completedFocusSessions += 1
    nextMode = completedFocusSessions === 4 ? 'longBreak' : 'shortBreak'
    announce(`Focus complete. ${modes[nextMode].label} is ready.`)
  } else {
    if (mode === 'longBreak') completedFocusSessions = 0
    nextMode = 'focus'
    announce('Break complete. Your next focus session is ready.')
  }

  mode = nextMode
  remainingSeconds = durationFor(mode)
  persistState()
  updateView()
}

function populateSettingsForm() {
  focusMinutesInput.value = String(settings.focusMinutes)
  shortBreakMinutesInput.value = String(settings.shortBreakMinutes)
  longBreakMinutesInput.value = String(settings.longBreakMinutes)
  soundEnabledInput.checked = settings.soundEnabled
}

function closeSettings() {
  settingsDialog.close()
}

toggleButton.addEventListener('click', toggleTimer)
resetButton.addEventListener('click', resetTimer)

modeButtons.forEach((button) => {
  button.addEventListener('click', () => switchMode(button.dataset.mode as TimerMode))
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const buttons = [...modeButtons]
    const currentIndex = buttons.indexOf(button)
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextButton = buttons[(currentIndex + direction + buttons.length) % buttons.length]
    nextButton.focus()
    switchMode(nextButton.dataset.mode as TimerMode)
  })
})

document.querySelector('#open-settings')!.addEventListener('click', () => {
  populateSettingsForm()
  settingsDialog.showModal()
})
document.querySelector('#close-settings')!.addEventListener('click', closeSettings)
document.querySelector('#cancel-settings')!.addEventListener('click', closeSettings)
document.querySelector('#reset-progress')!.addEventListener('click', () => {
  completedFocusSessions = 0
  persistState()
  updateView()
  announce('Session progress reset.')
})

settingsDialog.addEventListener('click', (event) => {
  if (event.target === settingsDialog) closeSettings()
})

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault()
  const wasIdle = !isRunning

  settings.focusMinutes = validMinutes(Number(focusMinutesInput.value), settings.focusMinutes)
  settings.shortBreakMinutes = validMinutes(
    Number(shortBreakMinutesInput.value),
    settings.shortBreakMinutes,
  )
  settings.longBreakMinutes = validMinutes(
    Number(longBreakMinutesInput.value),
    settings.longBreakMinutes,
  )
  settings.soundEnabled = soundEnabledInput.checked

  if (wasIdle) remainingSeconds = durationFor(mode)
  persistState()
  updateView()
  closeSettings()
  announce('Settings saved.')
})

document.addEventListener('keydown', (event) => {
  if (settingsDialog.open) return
  if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return
  if (event.code === 'Space') {
    event.preventDefault()
    toggleTimer()
  }
  if (event.key.toLowerCase() === 'r') resetTimer()
})

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) syncRemainingTime()
})

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let danceTimer: number | null = null

function updateMascotDance() {
  if (danceTimer !== null) window.clearInterval(danceTimer)
  mascot.classList.remove('pose-b')

  if (!reducedMotion.matches) {
    danceTimer = window.setInterval(() => {
      mascot.classList.toggle('pose-b')
    }, 1000)
  }
}

reducedMotion.addEventListener('change', updateMascotDance)
updateMascotDance()

if (isRunning) {
  timerId = window.setInterval(syncRemainingTime, 250)
  syncRemainingTime()
} else {
  updateView()
  persistState()
}
