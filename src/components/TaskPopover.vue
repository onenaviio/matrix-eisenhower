<template>
  <div class="popover-layer" @pointerdown.self="$emit('close')">
    <div
      ref="card"
      class="popover"
      :style="positionStyle"
      role="dialog"
      aria-modal="true"
      @keydown.esc.stop.prevent="$emit('close')"
    >
      <header class="popover__head">
        <span class="popover__dot" :style="{ background: accent }" />
        <span class="popover__title">{{ headTitle }}</span>
        <button
          class="popover__x"
          type="button"
          aria-label="Закрыть"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>

      <textarea
        ref="input"
        v-model="draft"
        class="popover__input"
        rows="2"
        placeholder="Что нужно сделать?"
        @keydown.enter.exact.prevent="submit"
      />

      <div v-if="mode === 'edit'" class="popover__move">
        <span class="popover__move-label">Переместить в</span>
        <div class="popover__move-grid">
          <button
            v-for="q in otherQuadrants"
            :key="q.id"
            type="button"
            class="popover__move-btn"
            :style="{ '--c': q.accent }"
            @click="$emit('move', q.id)"
          >
            {{ q.title }}
          </button>
        </div>
      </div>

      <footer class="popover__foot">
        <button
          v-if="mode === 'edit'"
          type="button"
          class="popover__btn popover__btn--danger"
          @click="$emit('delete')"
        >
          Удалить
        </button>
        <span class="popover__spacer" />
        <button
          type="button"
          class="popover__btn popover__btn--ghost"
          @click="$emit('close')"
        >
          Отмена
        </button>
        <button
          type="button"
          class="popover__btn popover__btn--primary"
          :disabled="!draft.trim()"
          @click="submit"
        >
          Сохранить
        </button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { QUADRANTS, QuadrantId, QuadrantMeta } from '@/types/task'

export default defineComponent({
  name: 'TaskPopover',
  props: {
    mode: {
      type: String as PropType<'create' | 'edit'>,
      required: true
    },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    initialTitle: { type: String, default: '' },
    quadrant: {
      type: String as PropType<QuadrantId>,
      required: true
    },
    accent: { type: String, default: '#4a7b82' }
  },
  emits: ['save', 'move', 'delete', 'close'],
  data() {
    return {
      draft: this.initialTitle,
      pos: { left: this.x, top: this.y }
    }
  },
  computed: {
    headTitle(): string {
      return this.mode === 'create' ? 'Новая задача' : 'Редактировать задачу'
    },
    otherQuadrants(): QuadrantMeta[] {
      return QUADRANTS.filter((q) => q.id !== this.quadrant)
    },
    positionStyle(): Record<string, string> {
      return {
        left: `${this.pos.left}px`,
        top: `${this.pos.top}px`
      }
    }
  },
  mounted() {
    this.clampToViewport()
    const input = this.$refs.input as HTMLTextAreaElement | undefined
    input?.focus()
    input?.select()
  },
  methods: {
    submit() {
      const value = this.draft.trim()
      if (!value) return
      this.$emit('save', value)
    },
    // Удерживаем карточку в пределах окна рядом с точкой клика.
    clampToViewport() {
      const card = this.$refs.card as HTMLElement | undefined
      if (!card) return
      const margin = 12
      const rect = card.getBoundingClientRect()
      let left = this.x
      let top = this.y
      const maxLeft = window.innerWidth - rect.width - margin
      const maxTop = window.innerHeight - rect.height - margin
      left = Math.max(margin, Math.min(left, maxLeft))
      top = Math.max(margin, Math.min(top, maxTop))
      this.pos = { left, top }
    }
  }
})
</script>

<style scoped>
.popover-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.popover {
  position: fixed;
  width: 320px;
  max-width: calc(100vw - 24px);
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(15, 42, 45, 0.28),
    0 2px 8px rgba(15, 42, 45, 0.12);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: pop-in 0.16s ease-out;
  transform-origin: top left;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.popover__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.popover__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

.popover__title {
  font-weight: 700;
  font-size: 14px;
  color: #16323a;
  flex: 1;
}

.popover__x {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: #8aa0a4;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 8px;
}

.popover__x:hover {
  background: #eef3f3;
  color: #16323a;
}

.popover__input {
  width: 100%;
  resize: none;
  border: 1.5px solid #dde7e7;
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  font-size: 15px;
  color: #16323a;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}

.popover__input:focus {
  border-color: #4a7b82;
  box-shadow: 0 0 0 3px rgba(74, 123, 130, 0.16);
}

.popover__move-label {
  font-size: 12px;
  font-weight: 600;
  color: #7c9296;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.popover__move-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 6px;
}

.popover__move-btn {
  border: 1.5px solid var(--c);
  background: transparent;
  color: #16323a;
  border-radius: 10px;
  padding: 7px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.popover__move-btn:hover {
  background: var(--c);
  transform: translateY(-1px);
}

.popover__foot {
  display: flex;
  align-items: center;
  gap: 8px;
}

.popover__spacer {
  flex: 1;
}

.popover__btn {
  border: none;
  border-radius: 10px;
  padding: 9px 16px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease, background 0.15s ease;
}

.popover__btn--primary {
  background: #4a7b82;
  color: #fff;
}

.popover__btn--primary:hover {
  filter: brightness(1.08);
}

.popover__btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.popover__btn--ghost {
  background: transparent;
  color: #5a7378;
}

.popover__btn--ghost:hover {
  background: #eef3f3;
}

.popover__btn--danger {
  background: transparent;
  color: #c0473b;
  padding-left: 4px;
}

.popover__btn--danger:hover {
  background: #fbecea;
}
</style>
