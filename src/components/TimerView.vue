<script setup lang="ts">
import { nextTick } from 'vue'
import Mascot from './Mascot.vue'
import { modeOrder, modes, type TimerMode } from '../composables/usePomodoro'

const props = defineProps<{
  mode: TimerMode
  currentMode: { label: string; prompt: string }
  formattedTime: string
  datetime: string
  isRunning: boolean
  completedFocusSessions: number
}>()

const emit = defineEmits<{
  toggle: []
  reset: []
  switchMode: [mode: TimerMode]
}>()

async function handleTabKey(event: KeyboardEvent, currentMode: TimerMode) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const currentIndex = modeOrder.indexOf(currentMode)
  const direction = event.key === 'ArrowRight' ? 1 : -1
  const nextMode = modeOrder[(currentIndex + direction + modeOrder.length) % modeOrder.length]
  emit('switchMode', nextMode)

  await nextTick()
  document.querySelector<HTMLButtonElement>(`[data-mode="${nextMode}"]`)?.focus()
}
</script>

<template>
  <section
    class="timer-panel"
    :class="{ 'break-mode': props.mode !== 'focus' }"
    aria-labelledby="timer-heading"
  >
    <div class="mode-switcher" role="tablist" aria-label="Timer mode">
      <button
        v-for="timerMode in modeOrder"
        :key="timerMode"
        class="mode-button"
        type="button"
        role="tab"
        :data-mode="timerMode"
        :aria-selected="timerMode === props.mode"
        :tabindex="timerMode === props.mode ? 0 : -1"
        @click="emit('switchMode', timerMode)"
        @keydown="handleTabKey($event, timerMode)"
      >
        {{ modes[timerMode].label }}
      </button>
    </div>

    <div class="timer-workspace">
      <Mascot />

      <div class="timer-content">
        <p id="timer-heading" class="eyebrow">{{ props.currentMode.label }} session</p>
        <time class="timer-display" :datetime="props.datetime">{{ props.formattedTime }}</time>
        <p class="timer-prompt">{{ props.currentMode.prompt }}</p>

        <div class="timer-actions">
          <button
            class="primary-action"
            type="button"
            :aria-label="`${props.isRunning ? 'Pause' : 'Start'} ${props.currentMode.label.toLowerCase()} timer`"
            @click="emit('toggle')"
          >
            <span class="action-icon" aria-hidden="true">{{ props.isRunning ? 'Ⅱ' : '▶' }}</span>
            {{ props.isRunning ? 'Pause' : 'Start' }}
          </button>
          <button class="secondary-action" type="button" @click="emit('reset')">Reset</button>
        </div>
      </div>
    </div>

    <footer class="session-footer">
      <div>
        <p class="session-label">Today’s little harvest</p>
        <div
          class="session-dots"
          :aria-label="`${props.completedFocusSessions} of 4 focus sessions complete`"
        >
          <span
            v-for="index in 4"
            :key="index"
            class="session-dot"
            :class="{ 'is-complete': index <= props.completedFocusSessions }"
            aria-hidden="true"
          />
        </div>
      </div>
      <p class="session-count"><strong>{{ props.completedFocusSessions }}</strong> / 4</p>
    </footer>
  </section>
</template>

<style scoped>
.timer-panel {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(20, 25, 21, 0.04);
}

.mode-switcher {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin: 8px;
  padding: 4px;
  border-radius: 6px;
  background: var(--soft);
}

.mode-button {
  min-width: 0;
  min-height: 38px;
  padding: 0 8px;
  border: 0;
  border-radius: 4px;
  color: var(--muted);
  background: transparent;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.mode-button:hover { color: var(--ink); }

.mode-button[aria-selected='true'] {
  color: var(--ink);
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(20, 25, 21, 0.08);
}

.timer-workspace {
  display: grid;
  justify-items: center;
  padding: 30px 32px 38px;
}

.timer-content {
  min-width: 0;
  text-align: center;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.timer-display {
  display: block;
  color: var(--ink);
  font-size: 5.25rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.timer-prompt {
  min-height: 24px;
  margin: 14px 0 26px;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.5;
}

.timer-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.action-icon {
  display: inline-block;
  width: 16px;
  margin-right: 4px;
  font-size: 0.72rem;
}

.break-mode .primary-action {
  border-color: var(--leaf);
  background: var(--leaf);
}

.break-mode .primary-action:hover {
  border-color: #315f43;
  background: #315f43;
}

.session-footer {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}

.session-label {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.session-dots { display: flex; gap: 7px; }

.session-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d8ddda;
}

.session-dot.is-complete { background: var(--leaf); }

.session-count {
  margin: 0;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
}

.session-count strong {
  color: var(--ink);
  font-size: 1rem;
}

@media (max-width: 520px) {
  .mode-switcher { margin: 6px; }

  .mode-button {
    min-height: 36px;
    padding: 0 4px;
    font-size: 0.76rem;
  }

  .timer-workspace { padding: 22px 18px 30px; }
  .timer-display { font-size: 4.3rem; }
  .timer-prompt { margin-bottom: 22px; }
  .session-footer { padding: 13px 16px; }
}
</style>
