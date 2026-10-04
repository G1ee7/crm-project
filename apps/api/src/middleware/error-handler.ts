import type { ErrorHandler } from 'hono'
import type { Bindings } from '../types'
import { ApiError } from '../catalog/common'

export const errorHandler: ErrorHandler<{ Bindings: Bindings }> = (error, context) => {
  if (error instanceof ApiError) return context.json({ error: { code: error.code, message: error.message } }, error.status as 400)
  console.error(error)
  return context.json({ error: { code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' } }, 500)
}
