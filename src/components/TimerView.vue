<script setup lang="ts">
import { nextTick, ref } from 'vue'
import Mascot from './Mascot.vue'
import { modeOrder, modes, type TimerMode } from '../composables/usePomodoro'

const props = defineProps<{
  mode: TimerMode
  currentMode: { label: string; prompt: string }
  formattedTime: string
  datetime: string
  remainingSeconds: number
  isRunning: boolean
  completedFocusSessions: number
  devMode: boolean
}>()

const emit = defineEmits<{
  toggle: []
  reset: []
  switchMode: [mode: TimerMode]
  finishInSeconds: [seconds: number]
}>()

const testSeconds = ref(5)

function runTestCountdown() {
  const seconds = Math.min(3600, Math.max(1, Math.round(Number(testSeconds.value) || 1)))
  testSeconds.value = seconds
  emit('finishInSeconds', seconds)
}

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
      <Mascot
        :mode="props.mode"
        :is-running="props.isRunning"
        :remaining-seconds="props.remainingSeconds"
      />

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
        <form
          v-if="props.devMode"
          class="dev-test-control"
          @submit.prevent="runTestCountdown"
        >
          <label for="test-seconds">Finish in</label>
          <input
            id="test-seconds"
            v-model.number="testSeconds"
            type="number"
            min="1"
            max="3600"
            inputmode="numeric"
          />
          <span>seconds</span>
          <button type="submit">Run</button>
        </form>
      </div>
    </div>

    <footer class="session-footer">
      <div class="harvest-summary">
        <p class="session-label">Today’s little harvest</p>
        <div
          class="harvest-count"
          :aria-label="`${props.completedFocusSessions} focus sessions complete today`"
        >
          <div class="harvest-tomatoes" aria-hidden="true">
            <svg
              v-for="index in props.completedFocusSessions"
              :key="index"
              class="session-tomato is-complete"
              viewBox="0 0 28 28"
              fill="none"
            >
              <path
                class="tomato-body"
                d="M14 7.5c-5.3 0-9 3.25-9 7.85C5 20.35 8.82 24 14 24s9-3.65 9-8.65c0-4.6-3.7-7.85-9-7.85Z"
              />
              <path
                class="tomato-leaves"
                d="m14 8-3.7-2.1 1.3 3.25L8.2 10.3l4.3.3L14 13l1.5-2.4 4.3-.3-3.4-1.15 1.3-3.25L14 8Z"
              />
              <circle class="tomato-face" cx="11" cy="15.5" r="1" />
              <circle class="tomato-face" cx="17" cy="15.5" r="1" />
              <path class="tomato-smile" d="M11.5 18.2c.65.75 1.48 1.1 2.5 1.1s1.85-.35 2.5-1.1" />
            </svg>
          </div>
          <strong>{{ props.completedFocusSessions }}</strong>
        </div>
      </div>
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

.dev-test-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 600;
}

.dev-test-control input {
  width: 52px;
  height: 28px;
  padding: 0 5px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--ink);
  background: var(--surface);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.dev-test-control button {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--ink);
  background: var(--surface);
  font-weight: 700;
  cursor: pointer;
}

.dev-test-control button:hover { background: var(--soft); }

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
  justify-content: flex-start;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}

.session-label {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.harvest-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 0.8rem;
}

.harvest-summary { width: 100%; }

.harvest-tomatoes {
  min-height: 22px;
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 4px;
}

.harvest-count strong {
  color: var(--ink);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.session-tomato {
  width: 22px;
  height: 22px;
  --tomato-body: #cfd5d1;
  --tomato-leaf: #cfd5d1;
}

.session-tomato.is-complete {
  --tomato-body: var(--tomato);
  --tomato-leaf: var(--leaf);
}

.tomato-body {
  fill: var(--tomato-body);
  stroke: var(--tomato-body);
  stroke-width: 1.2;
}

.tomato-leaves { fill: var(--tomato-leaf); }

.tomato-face { fill: var(--surface); }

.tomato-smile {
  stroke: var(--surface);
  stroke-width: 1.2;
  stroke-linecap: round;
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
