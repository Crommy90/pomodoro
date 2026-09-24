<script setup lang="ts">
import { ref } from 'vue'
import SettingsDialog from './components/SettingsDialog.vue'
import TimerView from './components/TimerView.vue'
import { usePomodoro } from './composables/usePomodoro'

const settingsOpen = ref(false)
const {
  mode,
  currentMode,
  formattedTime,
  datetime,
  isRunning,
  completedFocusSessions,
  settings,
  status,
  toggleTimer,
  resetTimer,
  switchMode,
  saveSettings,
  resetProgress,
} = usePomodoro(settingsOpen)
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true" />
        <span>Tomato Time</span>
      </div>
      <button class="settings-trigger" type="button" @click="settingsOpen = true">Settings</button>
    </header>

    <TimerView
      :mode="mode"
      :current-mode="currentMode"
      :formatted-time="formattedTime"
      :datetime="datetime"
      :is-running="isRunning"
      :completed-focus-sessions="completedFocusSessions"
      @toggle="toggleTimer"
      @reset="resetTimer"
      @switch-mode="switchMode"
    />

    <p class="keyboard-hint">Space to start or pause · R to reset</p>
    <p class="sr-only" aria-live="polite">{{ status }}</p>
  </main>

  <SettingsDialog
    :open="settingsOpen"
    :settings="settings"
    @close="settingsOpen = false"
    @save="saveSettings"
    @reset-progress="resetProgress"
  />
</template>

<style scoped>
.app-shell {
  width: min(100% - 32px, 560px);
  min-height: 100svh;
  margin: 0 auto;
  padding: 32px 0 24px;
  display: grid;
  align-content: center;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 2px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  font-size: 0.95rem;
  font-weight: 700;
}

.brand-mark {
  position: relative;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--tomato);
}

.brand-mark::before {
  content: '';
  position: absolute;
  width: 6px;
  height: 3px;
  top: -2px;
  left: 3px;
  border-radius: 4px 1px;
  background: var(--leaf);
  transform: rotate(-18deg);
}

.settings-trigger {
  padding: 6px 2px;
  border: 0;
  color: var(--muted);
  background: transparent;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.settings-trigger:hover { color: var(--ink); }

.keyboard-hint {
  margin: 12px 0 0;
  color: #959b97;
  font-size: 0.72rem;
  text-align: center;
}

@media (max-width: 520px) {
  .app-shell {
    width: min(100% - 20px, 440px);
    padding: 16px 0 12px;
  }

  .topbar { margin-bottom: 10px; }
  .keyboard-hint { display: none; }
}
</style>
