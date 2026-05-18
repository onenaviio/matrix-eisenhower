// Типы данных для матрицы Эйзенхауэра.

// Идентификаторы квадрантов матрицы.
export type QuadrantId = 'do' | 'plan' | 'delegate' | 'delete'

// Одна задача пользователя.
export interface Task {
  id: string
  title: string
  quadrant: QuadrantId
  createdAt: number
}

// Описание квадранта для отрисовки сетки.
export interface QuadrantMeta {
  id: QuadrantId
  title: string // подпись внутри квадранта
  urgency: 'urgent' | 'not-urgent' // колонка (срочно / несрочно)
  importance: 'important' | 'not-important' // строка (важно / неважно)
  accent: string // основной цвет фона квадранта
  textOnAccent: string // цвет подписи поверх фона
}

// Порядок важен: соответствует визуальной сетке 2×2
// (слева направо, сверху вниз).
export const QUADRANTS: QuadrantMeta[] = [
  {
    id: 'do',
    title: 'СДЕЛАТЬ',
    urgency: 'urgent',
    importance: 'important',
    accent: '#4a7b82',
    textOnAccent: '#0f2a2d'
  },
  {
    id: 'plan',
    title: 'ЗАПЛАНИРОВАТЬ',
    urgency: 'not-urgent',
    importance: 'important',
    accent: '#85d3dc',
    textOnAccent: '#0f3438'
  },
  {
    id: 'delegate',
    title: 'ДЕЛЕГИРОВАТЬ',
    urgency: 'urgent',
    importance: 'not-important',
    accent: '#9cc4a7',
    textOnAccent: '#1f3a2a'
  },
  {
    id: 'delete',
    title: 'УДАЛИТЬ',
    urgency: 'not-urgent',
    importance: 'not-important',
    accent: '#d6ecd8',
    textOnAccent: '#2a3f30'
  }
]

export function getQuadrant(id: QuadrantId): QuadrantMeta {
  const found = QUADRANTS.find((q) => q.id === id)
  if (!found) {
    throw new Error(`Неизвестный квадрант: ${id}`)
  }
  return found
}
