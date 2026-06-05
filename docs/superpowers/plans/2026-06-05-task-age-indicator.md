# Индикатор времени ожидания задач — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать на карточках срочных задач цветной индикатор возраста (зелёный/жёлтый/красный) с тултипом «висит N ч M мин», обновляющийся раз в минуту.

**Architecture:** Чистый модуль `taskAge.ts` считает возраст, уровень и подпись. Компонент `EisenhowerMatrix` держит реактивное `now` (тикает раз в минуту) и рисует индикатор только в срочных квадрантах. Тултип — кастомный CSS на `:hover`.

**Tech Stack:** Vue 3 (Options API) + TypeScript 4.5, Vue CLI. Тест-раннера нет — верификация через `yarn lint` + `yarn build` + браузер.

---

### Task 1: Модуль расчёта возраста `taskAge.ts`

**Files:**
- Create: `src/storage/taskAge.ts`

- [ ] **Step 1: Создать модуль с чистыми функциями**

```ts
// Логика «возраста» задачи: расчёт, уровень по порогам и форматирование.
// Модуль намеренно не зависит от Vue — чистые функции (в духе ordering.ts).

const HOUR = 60 * 60 * 1000

// Пороги возраста в миллисекундах.
export const WARNING_THRESHOLD = 3 * HOUR // от 3 ч — жёлтый
export const STALE_THRESHOLD = 8 * HOUR // от 8 ч — красный

export type AgeLevel = 'fresh' | 'warning' | 'stale'

// Возраст задачи в миллисекундах (никогда не отрицательный — защита от
// рассинхронизации часов / правок createdAt).
export function taskAge(createdAt: number, now: number): number {
  return Math.max(0, now - createdAt)
}

// Уровень по порогам: <3 ч fresh, 3–8 ч warning, ≥8 ч stale.
export function ageLevel(ageMs: number): AgeLevel {
  if (ageMs >= STALE_THRESHOLD) return 'stale'
  if (ageMs >= WARNING_THRESHOLD) return 'warning'
  return 'fresh'
}

// Человекочитаемая длительность: «5 ч 12 мин» / «42 мин».
export function formatDuration(ageMs: number): string {
  const totalMin = Math.floor(ageMs / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours === 0) return `${minutes} мин`
  return `${hours} ч ${minutes} мин`
}
```

- [ ] **Step 2: Проверить компиляцию/линт**

Run: `yarn lint`
Expected: без ошибок по новому файлу.

- [ ] **Step 3: Commit**

```bash
git add src/storage/taskAge.ts
git commit -m "feat: модуль расчёта возраста задачи taskAge"
```

---

### Task 2: Таймер `now` и методы возраста в компоненте

**Files:**
- Modify: `src/components/EisenhowerMatrix.vue` (script)

- [ ] **Step 1: Импортировать функции возраста**

В блоке импортов после импорта `ordering` добавить:

```ts
import {
  taskAge,
  ageLevel,
  formatDuration,
  AgeLevel
} from '@/storage/taskAge'
```

- [ ] **Step 2: Добавить реактивные поля `now` и `ageTimer`**

В `data()` к возвращаемому объекту добавить:

```ts
      // Текущее время для пересчёта возраста задач; тикает раз в минуту.
      now: Date.now(),
      // id интервала-таймера, чтобы очистить его при размонтировании.
      ageTimer: 0
```

- [ ] **Step 3: Запустить таймер в `mounted`, очистить в `beforeUnmount`**

После хука `created()` добавить два хука:

```ts
  mounted() {
    // Раз в минуту двигаем now — возраст и цвет индикаторов пересчитываются.
    this.ageTimer = window.setInterval(() => {
      this.now = Date.now()
    }, 60000)
  },
  beforeUnmount() {
    window.clearInterval(this.ageTimer)
  },
```

- [ ] **Step 4: Добавить методы `isUrgent`, `taskAgeLevel`, `taskAgeLabel`**

В объект `methods` добавить (рядом с `accentOf`):

```ts
    // Срочный ли квадрант — индикатор показываем только в срочной колонке.
    isUrgent(quadrant: QuadrantId): boolean {
      return getQuadrant(quadrant).urgency === 'urgent'
    },
    // Уровень индикатора (цвет) для задачи на текущий момент now.
    taskAgeLevel(task: Task): AgeLevel {
      return ageLevel(taskAge(task.createdAt, this.now))
    },
    // Подпись тултипа: длительность ожидания задачи.
    taskAgeLabel(task: Task): string {
      return formatDuration(taskAge(task.createdAt, this.now))
    },
```

- [ ] **Step 5: Проверить линт**

Run: `yarn lint`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add src/components/EisenhowerMatrix.vue
git commit -m "feat: таймер now и методы возраста задачи в матрице"
```

---

### Task 3: Разметка индикатора и тултипа

**Files:**
- Modify: `src/components/EisenhowerMatrix.vue` (template)

- [ ] **Step 1: Вставить индикатор в карточку задачи**

Внутри `<article class="task" ...>` перед `<span class="task__text">` добавить:

```html
              <span
                v-if="isUrgent(q.id)"
                class="task__age"
                :class="`task__age--${taskAgeLevel(task)}`"
              >
                <span class="task__age-tip">висит {{ taskAgeLabel(task) }}</span>
              </span>
```

- [ ] **Step 2: Проверить в браузере**

Run: `yarn serve`
Expected: в квадрантах СДЕЛАТЬ и ДЕЛЕГИРОВАТЬ у задач слева цветной кружок; в ЗАПЛАНИРОВАТЬ/УДАЛИТЬ — нет.

- [ ] **Step 3: Commit**

```bash
git add src/components/EisenhowerMatrix.vue
git commit -m "feat: разметка индикатора возраста и тултипа"
```

---

### Task 4: Стили индикатора и тултипа

**Files:**
- Modify: `src/components/EisenhowerMatrix.vue` (style)

- [ ] **Step 1: Добавить CSS**

В блок `<style scoped>` после правил `.task__remove` добавить:

```css
/* Кружок-индикатор возраста срочной задачи. */
.task__age {
  position: relative;
  flex: none;
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
  cursor: help;
}

.task__age--fresh {
  background: #2faa55;
}

.task__age--warning {
  background: #e0a300;
}

.task__age--stale {
  background: #d2402f;
}

/* Кастомный тултип над кружком, появляется на hover. */
.task__age-tip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: #16323a;
  color: #fff;
  font-size: 12px;
  line-height: 1;
  padding: 5px 8px;
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
  z-index: 5;
}

.task__age:hover .task__age-tip {
  opacity: 1;
}
```

- [ ] **Step 2: Проверить в браузере**

Run: `yarn serve`
Expected: цвета кружка соответствуют возрасту; при наведении видна подсказка «висит N ч M мин».

- [ ] **Step 3: Финальная проверка сборки и линта**

Run: `yarn lint && yarn build`
Expected: линт чистый, сборка успешна.

- [ ] **Step 4: Commit**

```bash
git add src/components/EisenhowerMatrix.vue
git commit -m "feat: стили индикатора возраста и тултипа"
```

---

## Проверка плана против спеки

- Индикатор на `do`/`delegate` — Task 3 (`v-if="isUrgent(q.id)"`). ✓
- Пороги 3 ч / 8 ч и цвета — Task 1 (`ageLevel`) + Task 4 (CSS). ✓
- Тултип «висит N ч M мин» кастомный CSS — Task 3 + Task 4. ✓
- Живое обновление раз в минуту — Task 2 (таймер). ✓
- Данные не меняем (`createdAt` уже есть) — нет задачи на модель. ✓
- Чистый модуль без раннера — Task 1. ✓
