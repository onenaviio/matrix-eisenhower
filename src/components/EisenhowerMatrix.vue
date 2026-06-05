<template>
  <div class="page">
    <header class="page__head">
      <img class="page__logo" src="@/assets/logo.png" alt="Матрица Эйзенхауэра" />
      <h1 class="page__title">Матрица Эйзенхауэра</h1>
      <p class="page__subtitle">
        Кликните по любой области, чтобы добавить задачу. Перетаскивайте
        задачи между квадрантами.
      </p>
    </header>

    <div class="matrix">
      <div class="matrix__corner" />
      <div class="matrix__col-labels">
        <span>СРОЧНО</span>
        <span>НЕСРОЧНО</span>
      </div>

      <div class="matrix__row-labels">
        <span>ВАЖНО</span>
        <span>НЕВАЖНО</span>
      </div>

      <div class="matrix__grid">
        <section
          v-for="q in quadrants"
          :key="q.id"
          class="quadrant"
          :class="{ 'quadrant--over': dragOver === q.id }"
          :style="{ '--accent': q.accent, '--ink': q.textOnAccent }"
          @click="onSurfaceClick($event, q.id)"
          @dragover.prevent="onQuadrantDragOver(q.id)"
          @dragleave="onDragLeave(q.id)"
          @drop.prevent="onDrop(q.id)"
        >
          <div class="quadrant__header">
            <h2 class="quadrant__title">{{ q.title }}</h2>
            <span v-if="tasksByQuadrant[q.id].length" class="quadrant__count">
              {{ tasksByQuadrant[q.id].length }}
            </span>
          </div>

          <div
            class="quadrant__tasks"
            @dragover.prevent.stop="onListDragOver($event, q.id)"
            @drop.prevent.stop="onDrop(q.id)"
          >
            <article
              v-for="task in tasksByQuadrant[q.id]"
              :key="task.id"
              class="task"
              :data-id="task.id"
              :class="{
                'task--dragging': dragging === task.id,
                'task--drop-before': dropBeforeId(q.id) === task.id,
                'task--drop-after':
                  dropBeforeId(q.id) === 'end' && lastTaskId(q.id) === task.id
              }"
              draggable="true"
              @click.stop="onTaskClick($event, task)"
              @dragstart="onDragStart(task)"
              @dragend="onDragEnd"
            >
              <span
                v-if="isUrgent(q.id)"
                class="task__age"
                :class="`task__age--${taskAgeLevel(task)}`"
                :title="`висит ${taskAgeLabel(task)}`"
              >
                <!-- Иконка по статусу: часы → песочные часы → огонь. -->
                <svg
                  v-if="taskAgeLevel(task) === 'fresh'"
                  class="task__age-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
                <svg
                  v-else-if="taskAgeLevel(task) === 'warning'"
                  class="task__age-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 3h12M6 21h12" />
                  <path
                    d="M7 3v3.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V3"
                  />
                  <path
                    d="M7 21v-3.2a2 2 0 0 1 .6-1.4L12 12l4.4 4.4a2 2 0 0 1 .6 1.4V21"
                  />
                </svg>
                <svg
                  v-else
                  class="task__age-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 2.5-2.5c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  />
                </svg>
                <span class="task__age-label">{{ taskAgeShort(task) }}</span>
              </span>
              <span class="task__text">{{ task.title }}</span>
              <button
                class="task__remove"
                type="button"
                aria-label="Удалить задачу"
                @click.stop="removeTask(task.id)"
              >
                ×
              </button>
            </article>

            <p v-if="!tasksByQuadrant[q.id].length" class="quadrant__empty">
              + добавить задачу
            </p>
          </div>
        </section>
      </div>
    </div>

    <TaskPopover
      v-if="popover"
      :key="popover.key"
      :mode="popover.mode"
      :x="popover.x"
      :y="popover.y"
      :initial-title="popover.initialTitle"
      :quadrant="popover.quadrant"
      :accent="accentOf(popover.quadrant)"
      @save="onPopoverSave"
      @move="onPopoverMove"
      @delete="onPopoverDelete"
      @close="popover = null"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import TaskPopover from '@/components/TaskPopover.vue'
import {
  QUADRANTS,
  QuadrantId,
  Task,
  getQuadrant
} from '@/types/task'
import { loadTasks, makeTask, saveTasks } from '@/storage/taskStorage'
import {
  normalizeOrders,
  nextOrder,
  reorderWithinQuadrant
} from '@/storage/ordering'
import {
  taskAge,
  ageLevel,
  formatDuration,
  formatDurationShort,
  AgeLevel
} from '@/storage/taskAge'

interface PopoverState {
  key: string
  mode: 'create' | 'edit'
  x: number
  y: number
  quadrant: QuadrantId
  initialTitle: string
  taskId: string | null
}

export default defineComponent({
  name: 'EisenhowerMatrix',
  components: { TaskPopover },
  data() {
    return {
      quadrants: QUADRANTS,
      tasks: [] as Task[],
      popover: null as PopoverState | null,
      dragging: null as string | null,
      dragOver: null as QuadrantId | null,
      // Позиция линии-индикатора вставки при перестановке внутри квадранта.
      dropIndicator: null as { quadrant: QuadrantId; index: number } | null,
      // Текущее время для пересчёта возраста задач; тикает раз в минуту.
      now: Date.now(),
      // id интервала-таймера, чтобы очистить его при размонтировании.
      ageTimer: 0
    }
  },
  computed: {
    // Группировка задач по квадрантам, порядок — ручной (order ↑).
    tasksByQuadrant(): Record<QuadrantId, Task[]> {
      const map: Record<QuadrantId, Task[]> = {
        do: [],
        plan: [],
        delegate: [],
        delete: []
      }
      for (const task of this.tasks) {
        map[task.quadrant].push(task)
      }
      for (const id of Object.keys(map) as QuadrantId[]) {
        map[id].sort((a, b) => a.order - b.order)
      }
      return map
    }
  },
  watch: {
    // Любое изменение списка сразу пишем в localStorage.
    tasks: {
      deep: true,
      handler(value: Task[]) {
        saveTasks(value)
      }
    }
  },
  created() {
    // Загрузка + разовая миграция: у старых данных нет order, normalizeOrders
    // присваивает его по текущему видимому порядку. Watcher сразу запишет
    // нормализованный список обратно в localStorage.
    this.tasks = normalizeOrders(loadTasks())
  },
  mounted() {
    // Раз в минуту двигаем now — возраст и цвет индикаторов пересчитываются.
    this.ageTimer = window.setInterval(() => {
      this.now = Date.now()
    }, 60000)
  },
  beforeUnmount() {
    window.clearInterval(this.ageTimer)
  },
  methods: {
    accentOf(id: QuadrantId): string {
      return getQuadrant(id).accent
    },
    // Срочный ли квадрант — индикатор показываем только в срочной колонке.
    isUrgent(quadrant: QuadrantId): boolean {
      return getQuadrant(quadrant).urgency === 'urgent'
    },
    // Уровень индикатора (цвет) для задачи на текущий момент now.
    taskAgeLevel(task: Task): AgeLevel {
      return ageLevel(taskAge(task.createdAt, this.now))
    },
    // Полная длительность ожидания — для нативного title карточки.
    taskAgeLabel(task: Task): string {
      return formatDuration(taskAge(task.createdAt, this.now))
    },
    // Компактная длительность — видимый текст пилюли-индикатора.
    taskAgeShort(task: Task): string {
      return formatDurationShort(taskAge(task.createdAt, this.now))
    },
    // Клик по фону квадранта — создание новой задачи в точке клика.
    onSurfaceClick(event: MouseEvent, quadrant: QuadrantId) {
      this.openPopover({
        mode: 'create',
        x: event.clientX,
        y: event.clientY,
        quadrant,
        initialTitle: '',
        taskId: null
      })
    },
    // Клик по задаче — редактирование/перемещение/удаление.
    onTaskClick(event: MouseEvent, task: Task) {
      this.openPopover({
        mode: 'edit',
        x: event.clientX,
        y: event.clientY,
        quadrant: task.quadrant,
        initialTitle: task.title,
        taskId: task.id
      })
    },
    openPopover(state: Omit<PopoverState, 'key'>) {
      this.popover = { ...state, key: `${Date.now()}` }
    },
    onPopoverSave(title: string) {
      if (!this.popover) return
      if (this.popover.mode === 'create') {
        const order = nextOrder(this.tasks, this.popover.quadrant)
        this.tasks.push(makeTask(title, this.popover.quadrant, order))
      } else if (this.popover.taskId) {
        const task = this.tasks.find((t) => t.id === this.popover?.taskId)
        if (task) task.title = title.trim()
      }
      this.popover = null
    },
    onPopoverMove(quadrant: QuadrantId) {
      if (!this.popover?.taskId) return
      const task = this.tasks.find((t) => t.id === this.popover?.taskId)
      if (task && task.quadrant !== quadrant) {
        // Считаем order до смены квадранта, чтобы задача ушла вниз целевого.
        const order = nextOrder(this.tasks, quadrant)
        task.quadrant = quadrant
        task.order = order
      }
      this.popover = null
    },
    onPopoverDelete() {
      if (!this.popover?.taskId) return
      this.removeTask(this.popover.taskId)
      this.popover = null
    },
    removeTask(id: string) {
      this.tasks = this.tasks.filter((t) => t.id !== id)
    },
    onDragStart(task: Task) {
      this.dragging = task.id
    },
    onDragEnd() {
      this.dragging = null
      this.dragOver = null
      this.dropIndicator = null
    },
    onDragLeave(quadrant: QuadrantId) {
      if (this.dragOver === quadrant) this.dragOver = null
    },
    // Перетаскиваемая задача (текущий drag).
    draggedTask(): Task | null {
      if (!this.dragging) return null
      return this.tasks.find((t) => t.id === this.dragging) ?? null
    },
    // Курсор над фоном/заголовком квадранта (вне списка задач).
    // Позицию внутри своего квадранта считает onListDragOver — здесь
    // обрабатываем только межквадрантную подсветку, чтобы не сбить индикатор.
    onQuadrantDragOver(quadrant: QuadrantId) {
      const dragged = this.draggedTask()
      if (dragged && dragged.quadrant === quadrant) return
      this.dragOver = quadrant
      this.dropIndicator = null
    },
    // Единый обработчик на контейнере списка. Индекс вставки считается
    // непрерывно по серединам карточек (зазоры включены — нет провала
    // «в конец»). Индикатор — псевдоэлемент вне потока, layout не двигается.
    onListDragOver(event: DragEvent, quadrant: QuadrantId) {
      const dragged = this.draggedTask()
      if (!dragged) return
      if (dragged.quadrant !== quadrant) {
        // Перенос из другого квадранта — подсветка, вниз целевого (onDrop).
        this.dragOver = quadrant
        this.dropIndicator = null
        return
      }
      this.dragOver = null
      const container = event.currentTarget as HTMLElement
      const cards = Array.from(
        container.querySelectorAll<HTMLElement>('.task')
      )
      // index в терминах усечённого списка (без перетаскиваемой задачи):
      // сколько чужих карточек, чья середина выше курсора.
      let index = 0
      for (const el of cards) {
        if (el.dataset.id === this.dragging) continue
        const rect = el.getBoundingClientRect()
        if (event.clientY < rect.top + rect.height / 2) break
        index++
      }
      this.dropIndicator = { quadrant, index }
    },
    // id задачи, ПЕРЕД которой рисуется индикатор, либо 'end', либо null.
    dropBeforeId(quadrant: QuadrantId): string | 'end' | null {
      const ind = this.dropIndicator
      if (!ind || ind.quadrant !== quadrant || !this.dragging) return null
      const trimmed = this.tasksByQuadrant[quadrant].filter(
        (t) => t.id !== this.dragging
      )
      if (ind.index >= trimmed.length) return 'end'
      return trimmed[ind.index].id
    },
    // id последней карточки квадранта без перетаскиваемой — на неё вешаем
    // индикатор «в конец» (никогда не на приглушённую перетаскиваемую).
    lastTaskId(quadrant: QuadrantId): string | null {
      const list = this.tasksByQuadrant[quadrant].filter(
        (t) => t.id !== this.dragging
      )
      return list.length ? list[list.length - 1].id : null
    },
    onDrop(quadrant: QuadrantId) {
      const id = this.dragging
      const indicator = this.dropIndicator
      this.dragOver = null
      this.dragging = null
      this.dropIndicator = null
      if (!id) return
      const task = this.tasks.find((t) => t.id === id)
      if (!task) return
      if (task.quadrant === quadrant) {
        // Перестановка внутри квадранта по позиции индикатора.
        if (indicator && indicator.quadrant === quadrant) {
          this.tasks = reorderWithinQuadrant(
            this.tasks,
            quadrant,
            id,
            indicator.index
          )
        }
      } else {
        // Перенос между квадрантами — вниз целевого квадранта.
        const order = nextOrder(this.tasks, quadrant)
        task.quadrant = quadrant
        task.order = order
      }
    }
  }
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 32px 24px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.page__head {
  text-align: center;
  margin-bottom: 22px;
}

.page__logo {
  display: block;
  width: 72px;
  height: 72px;
  margin: 0 auto 10px;
  object-fit: contain;
  filter: drop-shadow(0 6px 16px rgba(15, 42, 45, 0.18));
}

.page__title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #16323a;
}

.page__subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: #6c8389;
}

/* Сетка: угол + верхние подписи / левые подписи + квадранты. */
.matrix {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  grid-template-rows: 34px minmax(0, 1fr);
  gap: 10px;
  width: min(900px, 100%);
  aspect-ratio: 1 / 1.04;
}

.matrix__corner {
  grid-column: 1;
  grid-row: 1;
}

.matrix__col-labels {
  grid-column: 2;
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
}

.matrix__col-labels span {
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #5a7378;
}

.matrix__row-labels {
  grid-column: 1;
  grid-row: 2;
  display: grid;
  grid-template-rows: 1fr 1fr;
  align-items: center;
}

.matrix__row-labels span {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #5a7378;
}

.matrix__grid {
  grid-column: 2;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 14px;
}

.quadrant {
  background: var(--accent);
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.18s ease, transform 0.18s ease,
    outline-color 0.18s ease;
  outline: 3px solid transparent;
}

.quadrant:hover {
  box-shadow: 0 12px 30px rgba(15, 42, 45, 0.16);
}

.quadrant--over {
  outline-color: rgba(255, 255, 255, 0.85);
  transform: scale(0.992);
  box-shadow: 0 14px 34px rgba(15, 42, 45, 0.22);
}

.quadrant__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  pointer-events: none;
}

.quadrant__title {
  margin: 0;
  font-size: clamp(16px, 1.7vw, 22px);
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.quadrant__count {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.4);
  border-radius: 999px;
  padding: 2px 9px;
}

.quadrant__tasks {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 2px;
}

.task {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  padding: 9px 10px 9px 12px;
  box-shadow: 0 2px 6px rgba(15, 42, 45, 0.1);
  cursor: grab;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.task:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(15, 42, 45, 0.16);
}

.task:active {
  cursor: grabbing;
}

.task--dragging {
  opacity: 0.4;
}

/* Линия-индикатор вставки. Абсолютный псевдоэлемент в 8px-зазоре —
   не занимает место в потоке, поэтому карточки не дёргаются, и
   pointer-events:none — не перехватывает события dragover. */
.task--drop-before::before,
.task--drop-after::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  box-shadow: 0 0 6px rgba(15, 42, 45, 0.3);
  pointer-events: none;
}

.task--drop-before::before {
  top: -5px;
}

.task--drop-after::after {
  bottom: -5px;
}

.task__text {
  flex: 1;
  font-size: 14px;
  line-height: 1.35;
  color: #1c3338;
  word-break: break-word;
}

.task__remove {
  border: none;
  background: transparent;
  color: #9bb0b3;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  border-radius: 6px;
  flex: none;
}

.task__remove:hover {
  color: #c0473b;
  background: rgba(192, 71, 59, 0.12);
}

/* Пилюля-индикатор возраста срочной задачи: иконка + длительность.
   Видна всегда (без всплывающего тултипа), поэтому не обрезается
   overflow родительских контейнеров. Цвет несёт статус. */
.task__age {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
  padding: 3px 8px 3px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: help;
}

.task__age-icon {
  width: 13px;
  height: 13px;
  flex: none;
}

.task__age--fresh {
  color: #1f7a3d;
  background: rgba(47, 170, 85, 0.14);
}

.task__age--warning {
  color: #946800;
  background: rgba(224, 163, 0, 0.16);
}

.task__age--stale {
  color: #c0392b;
  background: rgba(210, 64, 47, 0.13);
  /* Просроченные задачи мягко пульсируют, привлекая внимание. */
  animation: age-pulse 1.8s ease-in-out infinite;
}

@keyframes age-pulse {
  0%,
  100% {
    background: rgba(210, 64, 47, 0.13);
  }
  50% {
    background: rgba(210, 64, 47, 0.26);
  }
}

@media (prefers-reduced-motion: reduce) {
  .task__age--stale {
    animation: none;
  }
}

.quadrant__empty {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  opacity: 0.5;
  pointer-events: none;
}

@media (max-width: 640px) {
  .page {
    padding: 20px 12px 32px;
  }

  .matrix {
    aspect-ratio: auto;
    height: auto;
  }

  .matrix__grid {
    min-height: 70vh;
  }

  .page__title {
    font-size: 24px;
  }

  .page__logo {
    width: 56px;
    height: 56px;
  }
}
</style>
