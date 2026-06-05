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
// Используется для полного значения (нативный title карточки).
export function formatDuration(ageMs: number): string {
  const totalMin = Math.floor(ageMs / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours === 0) return `${minutes} мин`
  return `${hours} ч ${minutes} мин`
}

// Компактная длительность для пилюли-индикатора: «5 ч 12 м» / «9 ч» / «42 мин».
// Короче formatDuration, чтобы умещаться в узкой карточке рядом с текстом.
export function formatDurationShort(ageMs: number): string {
  const totalMin = Math.floor(ageMs / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours === 0) return `${minutes} мин`
  if (minutes === 0) return `${hours} ч`
  return `${hours} ч ${minutes} м`
}
