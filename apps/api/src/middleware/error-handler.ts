import type { ErrorHandler } from 'hono'
import type { Bindings } from '../types'

export const errorHandler: ErrorHandler<{ Bindings: Bindings }> = (error, context) => {
  console.error(error)
  return context.json({ error: 'Внутренняя ошибка сервера' }, 500)
}
