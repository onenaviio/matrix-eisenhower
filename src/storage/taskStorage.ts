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
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    typeof t.createdAt === 'number' &&
    typeof t.quadrant === 'string' &&
    VALID_QUADRANTS.includes(t.quadrant as QuadrantId)
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
    return parsed.tasks.filter(isValidTask)
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
export function makeTask(title: string, quadrant: QuadrantId): Task {
  return {
    id: createTaskId(),
    title: title.trim(),
    quadrant,
    createdAt: Date.now()
  }
}
