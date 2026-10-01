import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
export const formatMoney = (value: number) => `${new Intl.NumberFormat('ru-KZ').format(value)} ₸`
export const formatNumber = (value: number) => new Intl.NumberFormat('ru-KZ').format(value)
