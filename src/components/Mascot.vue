<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const poseB = ref(false)
let danceTimer: number | null = null
let reducedMotion: MediaQueryList | null = null

function updateDancePreference() {
  if (danceTimer !== null) window.clearInterval(danceTimer)
  poseB.value = false

  if (!reducedMotion?.matches) {
    danceTimer = window.setInterval(() => {
      poseB.value = !poseB.value
    }, 1000)
  }
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.addEventListener('change', updateDancePreference)
  updateDancePreference()
})

onUnmounted(() => {
  if (danceTimer !== null) window.clearInterval(danceTimer)
  reducedMotion?.removeEventListener('change', updateDancePreference)
})
</script>

<template>
  <div class="mascot-wrap" aria-hidden="true">
    <svg
      class="mascot"
      :class="{ 'pose-b': poseB }"
      viewBox="0 0 140 130"
      width="140"
      height="130"
    >
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
        <path
          class="mascot-tomato"
          d="M70 28C43 24 28 41 29 69c1 26 16 39 41 39s40-13 41-39c1-28-14-45-41-41Z"
        />
        <path
          class="mascot-leaf"
          d="M70 35c-4-7-9-9-14-6 4 2 7 6 8 10-5-2-10 0-13 4 8 0 13 3 19 7 6-4 11-7 19-7-3-4-8-6-13-4 1-4 4-8 8-10-5-3-10-1-14 6Z"
        />
        <circle class="mascot-eye" cx="56" cy="61" r="3.5" />
        <circle class="mascot-eye" cx="84" cy="61" r="3.5" />
        <path class="mascot-mouth" d="M61 70c5 7 13 8 18 0" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.mascot-wrap {
  width: 166px;
  height: 154px;
  margin: -8px 0 2px;
}

.mascot {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.mascot-body,
.mascot-arm,
.mascot-leg {
  transform-box: fill-box;
  transform-origin: center;
}

.mascot-tomato { fill: #df5047; }
.mascot-leaf { fill: #37664a; }
.mascot-eye { fill: var(--ink); }

.mascot-mouth {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.5;
  stroke-linecap: round;
}

.mascot-arm path,
.mascot-leg path { fill: #4a3834; }

.mascot-arm-left { transform: translateY(-2px) rotate(-10deg); }
.mascot-arm-right { transform: translateY(-4px) rotate(-18deg); }
.mascot-leg-left { transform: translateY(-2px) rotate(-7deg); }
.mascot-leg-right { transform: translateY(2px) rotate(7deg); }

.mascot.pose-b .mascot-body { transform: translateY(-4px) rotate(2deg); }
.mascot.pose-b .mascot-arm-left { transform: translateY(-4px) rotate(18deg); }
.mascot.pose-b .mascot-arm-right { transform: translateY(-2px) rotate(10deg); }
.mascot.pose-b .mascot-leg-left { transform: translateY(2px) rotate(7deg); }
.mascot.pose-b .mascot-leg-right { transform: translateY(-2px) rotate(-7deg); }

@media (max-width: 520px) {
  .mascot-wrap {
    width: 142px;
    height: 132px;
    margin-top: -4px;
  }
}
</style>
