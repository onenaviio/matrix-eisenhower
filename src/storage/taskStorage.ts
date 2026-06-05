// Хранилище задач в localStorage (JSON).
// Модуль намеренно не зависит от Vue — чистая логика чтения/записи.

import type { QuadrantId, Task } from '@/types/task'

const STORAGE_KEY = 'eisenhower-matrix:v1'

interface StoredState {
  version: 1
  tasks: Task[]
}

const VALID_QUADRANTS: QuadrantId[] = ['do', 'plan', 'delegate', 'delete']

function isValidTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  // order необязателен: старые данные его не содержат. Если присутствует —
  // должен быть числом. Финальную нормализацию делает normalizeOrders.
  if (t.order !== undefined && typeof t.order !== 'number') return false
  // createdAt не проверяем строго: записи старше фичи «возраста» (или
  // импортированные извне) таймстампа не содержат. Отсутствующий/битый
  // createdAt подставляет withCreatedAt при чтении — задачу не теряем.
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    typeof t.quadrant === 'string' &&
    VALID_QUADRANTS.includes(t.quadrant as QuadrantId)
  )
}

// Гарантирует валидный createdAt у каждой задачи: записи без таймстампа
// (созданные до появления фичи «возраста» или импортированные) либо с битым
// значением получают текущее время. Без этого normalizeOrders (сортировка по
// createdAt) и индикатор возраста получили бы NaN. Number.isFinite сам
// отсекает undefined/NaN/Infinity/нечисловые значения без приведения типов.
function withCreatedAt(tasks: Task[]): Task[] {
  return tasks.map((t) =>
    Number.isFinite(t.createdAt) ? t : { ...t, createdAt: Date.now() }
  )
}

// Читает задачи из localStorage. Любые повреждённые данные игнорируются,
// возвращается пустой список — приложение не должно падать из-за хранилища.
export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredState>
    if (!parsed || !Array.isArray(parsed.tasks)) return []
    return withCreatedAt(parsed.tasks.filter(isValidTask))
  } catch (error) {
    console.warn('Не удалось прочитать задачи из localStorage:', error)
    return []
  }
}

// Сохраняет весь список задач в localStorage в JSON-формате.
export function saveTasks(tasks: Task[]): void {
  try {
    const state: StoredState = { version: 1, tasks }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Не удалось сохранить задачи в localStorage:', error)
  }
}

// Генерирует идентификатор задачи (с запасным вариантом для старых браузеров).
export function createTaskId(): string {
  const g = globalThis as {
    crypto?: { randomUUID?: () => string }
  }
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID()
  }
  return `t_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`
}

// Создаёт новую задачу в указанном квадранте.
// order вычисляет вызывающий код через nextOrder (обычно — вниз списка).
export function makeTask(
  title: string,
  quadrant: QuadrantId,
  order: number
): Task {
  return {
    id: createTaskId(),
    title: title.trim(),
    quadrant,
    createdAt: Date.now(),
    order
  }
}
