import { computed, onMounted, onUnmounted, reactive, ref, watch, type Ref } from 'vue'

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

export type Settings = {
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

export const modes: Record<TimerMode, { label: string; prompt: string }> = {
  focus: { label: 'Focus', prompt: 'Settle in and do one thing well.' },
  shortBreak: { label: 'Short break', prompt: 'Stretch, sip, and look away.' },
  longBreak: { label: 'Long break', prompt: 'A proper pause. You earned it.' },
}

export const modeOrder = Object.keys(modes) as TimerMode[]

const STORAGE_KEY = 'tomato-time-state-v1'
const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  soundEnabled: true,
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

export function usePomodoro(settingsOpen: Ref<boolean>) {
  const storedState = loadState()
  const storedSettings = storedState.settings
  const settings = reactive<Settings>({
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
  })

  const durationFor = (timerMode: TimerMode) => {
    const minutes =
      timerMode === 'focus'
        ? settings.focusMinutes
        : timerMode === 'shortBreak'
          ? settings.shortBreakMinutes
          : settings.longBreakMinutes

    return minutes * 60
  }

  const initialMode: TimerMode = isTimerMode(storedState.mode) ? storedState.mode : 'focus'
  const mode = ref<TimerMode>(initialMode)
  const remainingSeconds = ref(
    typeof storedState.remainingSeconds === 'number' && storedState.remainingSeconds >= 0
      ? Math.round(storedState.remainingSeconds)
      : durationFor(initialMode),
  )
  const completedFocusSessions = ref(
    typeof storedState.completedFocusSessions === 'number'
      ? Math.min(4, Math.max(0, Math.round(storedState.completedFocusSessions)))
      : 0,
  )
  const isRunning = ref(
    Boolean(storedState.isRunning && typeof storedState.endTime === 'number'),
  )
  const endTime = ref<number | null>(isRunning.value ? (storedState.endTime ?? null) : null)
  const status = ref('')
  const soundStatus = ref('')
  const currentMode = computed(() => modes[mode.value])
  const formattedTime = computed(() => {
    const minutes = Math.floor(remainingSeconds.value / 60)
    const seconds = remainingSeconds.value % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  })
  const datetime = computed(
    () =>
      `PT${Math.floor(remainingSeconds.value / 60)}M${remainingSeconds.value % 60}S`,
  )

  let timerId: number | null = null
  let announcementId: number | null = null
  let audioContext: AudioContext | null = null

  const persistState = () => {
    const state: StoredState = {
      mode: mode.value,
      remainingSeconds: remainingSeconds.value,
      completedFocusSessions: completedFocusSessions.value,
      isRunning: isRunning.value,
      endTime: endTime.value,
      settings: { ...settings },
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // The timer remains usable when browser storage is unavailable.
    }
  }

  const announce = (message: string) => {
    status.value = ''
    if (announcementId !== null) window.clearTimeout(announcementId)
    announcementId = window.setTimeout(() => {
      status.value = message
    }, 50)
  }

  const stopInterval = () => {
    if (timerId !== null) {
      window.clearInterval(timerId)
      timerId = null
    }
  }

  const prepareAudio = async (force = false) => {
    if (!force && !settings.soundEnabled) return false

    try {
      audioContext ??= new AudioContext()
      if (audioContext.state === 'suspended') await audioContext.resume()
      return audioContext.state === 'running'
    } catch {
      soundStatus.value = 'Sound is unavailable in this browser.'
      return false
    }
  }

  const playCompletionSound = async (force = false) => {
    if (!(await prepareAudio(force)) || !audioContext) return false

    const now = audioContext.currentTime
    const end = now + 5

    ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = audioContext!.createOscillator()
      const gain = audioContext!.createGain()
      const start = now + index * 0.12

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.07, start + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      oscillator.connect(gain)
      gain.connect(audioContext!.destination)
      oscillator.start(start)
      oscillator.stop(end)
    })

    return true
  }

  const testSound = async () => {
    soundStatus.value = 'Starting test chime...'
    if (await playCompletionSound(true)) {
      soundStatus.value = 'Playing a 5-second test chime.'
    }
  }

  const completeSession = () => {
    isRunning.value = false
    endTime.value = null
    stopInterval()
    void playCompletionSound()

    if (mode.value === 'focus') {
      completedFocusSessions.value += 1
      announce(`Focus complete.`)
    } else {
      if (mode.value === 'longBreak') completedFocusSessions.value = 0
      announce('Break complete. Your next focus session is ready.')
    }

    persistState()
  }

  const syncRemainingTime = () => {
    if (!isRunning.value || endTime.value === null) return

    const nextRemaining = Math.max(0, Math.ceil((endTime.value - Date.now()) / 1000))
    if (nextRemaining !== remainingSeconds.value) {
      remainingSeconds.value = nextRemaining
      persistState()
    }

    if (remainingSeconds.value === 0) completeSession()
  }

  const startTimer = async () => {
    if (isRunning.value) return
    if (remainingSeconds.value === 0) remainingSeconds.value = durationFor(mode.value)

    await prepareAudio()
    isRunning.value = true
    endTime.value = Date.now() + remainingSeconds.value * 1000
    timerId = window.setInterval(syncRemainingTime, 250)
    persistState()
  }

  const pauseTimer = () => {
    if (!isRunning.value) return
    syncRemainingTime()
    isRunning.value = false
    endTime.value = null
    stopInterval()
    persistState()
  }

  const toggleTimer = () => {
    if (isRunning.value) pauseTimer()
    else void startTimer()
  }

  const finishInFiveSeconds = async () => {
    stopInterval()
    await prepareAudio()
    remainingSeconds.value = 5
    endTime.value = Date.now() + 5_000
    isRunning.value = true
    timerId = window.setInterval(syncRemainingTime, 250)
    persistState()
    announce('Test countdown started.')
  }

  const resetTimer = () => {
    isRunning.value = false
    endTime.value = null
    stopInterval()
    remainingSeconds.value = durationFor(mode.value)
    persistState()
    announce(`${modes[mode.value].label} timer reset.`)
  }

  const switchMode = (nextMode: TimerMode) => {
    isRunning.value = false
    endTime.value = null
    stopInterval()
    mode.value = nextMode
    remainingSeconds.value = durationFor(nextMode)
    persistState()
    announce(`${modes[nextMode].label} selected.`)
  }

  const saveSettings = (nextSettings: Settings) => {
    const wasIdle = !isRunning.value
    settings.focusMinutes = validMinutes(nextSettings.focusMinutes, settings.focusMinutes)
    settings.shortBreakMinutes = validMinutes(
      nextSettings.shortBreakMinutes,
      settings.shortBreakMinutes,
    )
    settings.longBreakMinutes = validMinutes(
      nextSettings.longBreakMinutes,
      settings.longBreakMinutes,
    )
    settings.soundEnabled = nextSettings.soundEnabled

    if (wasIdle) remainingSeconds.value = durationFor(mode.value)
    persistState()
    announce('Settings saved.')
  }

  const resetProgress = () => {
    completedFocusSessions.value = 0
    persistState()
    announce('Session progress reset.')
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (settingsOpen.value) return
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return
    if (event.code === 'Space') {
      event.preventDefault()
      toggleTimer()
    }
    if (event.key.toLowerCase() === 'r') resetTimer()
  }

  const handleVisibilityChange = () => {
    if (!document.hidden) syncRemainingTime()
  }

  watch(
    [formattedTime, mode],
    () => {
      document.title = `${formattedTime.value} · ${currentMode.value.label} | Tomato Time`
    },
    { immediate: true },
  )

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (isRunning.value) {
      timerId = window.setInterval(syncRemainingTime, 250)
      syncRemainingTime()
    } else {
      persistState()
    }
  })

  onUnmounted(() => {
    stopInterval()
    if (announcementId !== null) window.clearTimeout(announcementId)
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    if (audioContext) void audioContext.close()
  })

  return {
    mode,
    currentMode,
    remainingSeconds,
    formattedTime,
    datetime,
    isRunning,
    completedFocusSessions,
    settings,
    status,
    soundStatus,
    toggleTimer,
    resetTimer,
    switchMode,
    saveSettings,
    resetProgress,
    testSound,
    finishInFiveSeconds,
  }
}
