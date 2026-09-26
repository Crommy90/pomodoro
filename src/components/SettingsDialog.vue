<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'
import type { Settings } from '../composables/usePomodoro'

const props = defineProps<{
  open: boolean
  settings: Settings
  soundStatus: string
}>()

const emit = defineEmits<{
  close: []
  save: [settings: Settings]
  resetProgress: []
  testSound: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const draft = reactive<Settings>({ ...props.settings })

function copySettings() {
  Object.assign(draft, props.settings)
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      copySettings()
      await nextTick()
      if (!dialog.value?.open) dialog.value?.showModal()
    } else if (dialog.value?.open) {
      dialog.value.close()
    }
  },
  { immediate: true },
)

function submit() {
  emit('save', { ...draft })
  emit('close')
}

function handleBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) emit('close')
}

function handleCancel(event: Event) {
  event.preventDefault()
  emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="settings-dialog"
    aria-labelledby="settings-title"
    @click="handleBackdrop"
    @cancel="handleCancel"
    @close="emit('close')"
  >
    <form class="settings-form" @submit.prevent="submit">
      <div class="dialog-heading">
        <div>
          <h2 id="settings-title">Settings</h2>
          <p>Adjust your rhythm.</p>
        </div>
        <button class="close-button" type="button" aria-label="Close settings" @click="emit('close')">
          ×
        </button>
      </div>

      <fieldset class="duration-settings">
        <legend>Durations</legend>
        <label>
          <span>Focus</span>
          <span class="number-field">
            <input v-model.number="draft.focusMinutes" type="number" min="1" max="120" required />
            <span>min</span>
          </span>
        </label>
        <label>
          <span>Short break</span>
          <span class="number-field">
            <input v-model.number="draft.shortBreakMinutes" type="number" min="1" max="120" required />
            <span>min</span>
          </span>
        </label>
        <label>
          <span>Long break</span>
          <span class="number-field">
            <input v-model.number="draft.longBreakMinutes" type="number" min="1" max="120" required />
            <span>min</span>
          </span>
        </label>
      </fieldset>

      <div class="switch-row">
        <span>
          <strong>Completion sound</strong>
          <small>Play a soft chime when time is up.</small>
        </span>
        <div class="sound-controls">
          <button class="text-button" type="button" @click="emit('testSound')">Test</button>
          <label class="switch-control">
            <span class="sr-only">Enable completion sound</span>
            <input v-model="draft.soundEnabled" type="checkbox" role="switch" />
          </label>
        </div>
      </div>
      <p v-if="props.soundStatus" class="sound-status" aria-live="polite">
        {{ props.soundStatus }}
      </p>

      <div class="progress-setting">
        <span>
          <strong>Session progress</strong>
          <small>Clear today’s completed focus sessions.</small>
        </span>
        <button class="text-button" type="button" @click="emit('resetProgress')">Reset</button>
      </div>

      <div class="dialog-actions">
        <button class="secondary-action" type="button" @click="emit('close')">Cancel</button>
        <button class="primary-action" type="submit">Save</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.settings-dialog {
  width: min(100% - 32px, 420px);
  max-height: min(720px, calc(100svh - 32px));
  padding: 0;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
  background: var(--surface);
  box-shadow: 0 18px 60px rgba(20, 25, 21, 0.18);
}

.settings-dialog::backdrop { background: rgba(22, 27, 23, 0.38); }
.settings-form { padding: 24px; }

.dialog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.dialog-heading h2 {
  margin: 0 0 4px;
  font-size: 1.2rem;
  line-height: 1.3;
}

.dialog-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
}

.close-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--muted);
  background: var(--surface);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.close-button:hover {
  color: var(--ink);
  background: var(--soft);
}

.duration-settings {
  margin: 0;
  padding: 0;
  border: 0;
}

.duration-settings legend {
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.duration-settings label {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-top: 1px solid var(--line);
  font-size: 0.88rem;
  font-weight: 600;
}

.number-field {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 500;
}

.number-field input {
  width: 60px;
  height: 34px;
  padding: 0 7px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--ink);
  background: var(--surface);
  font-variant-numeric: tabular-nums;
}

.number-field input:focus {
  border-color: #2563eb;
  outline: 2px solid rgba(37, 99, 235, 0.18);
}

.switch-row,
.progress-setting {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-top: 1px solid var(--line);
}

.switch-row strong,
.progress-setting strong {
  display: block;
  margin-bottom: 3px;
  font-size: 0.88rem;
}

.switch-row small,
.progress-setting small {
  display: block;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.sound-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.switch-control { line-height: 0; }

.switch-control input {
  position: relative;
  flex: 0 0 auto;
  width: 40px;
  height: 22px;
  margin: 0;
  appearance: none;
  border: 1px solid #c9cfcb;
  border-radius: 11px;
  background: #dfe3e0;
  cursor: pointer;
}

.switch-control input::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(20, 25, 21, 0.16);
  transition: transform 140ms ease;
}

.switch-control input:checked {
  border-color: var(--leaf);
  background: var(--leaf);
}

.switch-control input:checked::before { transform: translateX(18px); }

.switch-control input:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}

.sound-status {
  margin: -5px 0 12px;
  color: var(--muted);
  font-size: 0.72rem;
}

.text-button {
  padding: 6px 0;
  border: 0;
  color: var(--tomato-dark);
  background: transparent;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.text-button:hover { text-decoration: underline; }

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

.dialog-actions .primary-action { min-width: 88px; }

@media (max-width: 520px) {
  .settings-form { padding: 20px; }
}
</style>
