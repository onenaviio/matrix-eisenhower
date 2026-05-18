// Чистая логика порядка задач внутри квадранта.
// Модуль намеренно не зависит от Vue — только работа со списком Task.

import type { QuadrantId, Task } from '@/types/task'

const VALID_QUADRANTS: QuadrantId[] = ['do', 'plan', 'delegate', 'delete']

// true, если у всех задач есть корректный числовой order.
// Старые данные из localStorage поля order не содержат (undefined) —
// такой квадрант считается «не нормализованным».
function allHaveOrder(tasks: Task[]): boolean {
  return tasks.every(
    (t) => typeof t.order === 'number' && Number.isFinite(t.order)
  )
}

// Приводит order в норму по каждому квадранту: компактные индексы 0..n-1.
// Если у всех задач квадранта есть order — сохраняем их относительный
// порядок (сортировка по order). Если хотя бы у одной order нет (старые
// данные) — сортируем по createdAt по убыванию (новые сверху — текущий
// видимый порядок) и нумеруем заново. Это разовая миграция без видимого
// пользователю скачка.
export function normalizeOrders(tasks: Task[]): Task[] {
  const byQuadrant: Record<QuadrantId, Task[]> = {
    do: [],
    plan: [],
    delegate: [],
    delete: []
  }
  for (const t of tasks) {
    byQuadrant[t.quadrant].push(t)
  }

  const result: Task[] = []
  for (const q of VALID_QUADRANTS) {
    const group = byQuadrant[q]
    const ordered = allHaveOrder(group)
      ? [...group].sort((a, b) => a.order - b.order)
      : [...group].sort((a, b) => b.createdAt - a.createdAt)
    ordered.forEach((task, index) => {
      result.push({ ...task, order: index })
    })
  }
  return result
}

// Следующий order для нового элемента квадранта = max(order)+1,
// либо 0, если квадрант пуст. Задача уходит вниз списка.
export function nextOrder(tasks: Task[], quadrant: QuadrantId): number {
  let max = -1
  for (const t of tasks) {
    if (
      t.quadrant === quadrant &&
      typeof t.order === 'number' &&
      t.order > max
    ) {
      max = t.order
    }
  }
  return max + 1
}

// Перемещает задачу draggedId внутри quadrant на позицию targetIndex и
// пересчитывает order всех задач этого квадранта в 0..n-1.
//
// Семантика targetIndex: задача сначала удаляется из упорядоченного списка
// квадранта, затем вставляется в позицию targetIndex уже усечённого списка
// (0..n, где n — длина списка без перетаскиваемой задачи). targetIndex
// зажимается в допустимый диапазон. Задачи других квадрантов не меняются.
export function reorderWithinQuadrant(
  tasks: Task[],
  quadrant: QuadrantId,
  draggedId: string,
  targetIndex: number
): Task[] {
  const group = tasks
    .filter((t) => t.quadrant === quadrant)
    .sort((a, b) => a.order - b.order)

  const fromIndex = group.findIndex((t) => t.id === draggedId)
  if (fromIndex === -1) return tasks // задача не из этого квадранта

  const [dragged] = group.splice(fromIndex, 1)
  const clamped = Math.max(0, Math.min(targetIndex, group.length))
  group.splice(clamped, 0, dragged)

  const orderById = new Map<string, number>()
  group.forEach((t, index) => orderById.set(t.id, index))

  return tasks.map((t) =>
    t.quadrant === quadrant
      ? { ...t, order: orderById.get(t.id) as number }
      : t
  )
}
