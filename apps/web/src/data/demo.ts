import type { ProductSummary } from '@warehouse/types'

export const warehouses = [
  { id: 'all', name: 'Все склады' },
  { id: 'almaty', name: 'Алматы (Главный)' },
  { id: 'astana', name: 'Астана' },
  { id: 'shymkent', name: 'Шымкент' },
]

export const products: ProductSummary[] = [
  { id: 'p1', name: 'iPhone 15 128GB', sku: 'APL-IP15-128', category: 'Смартфоны', quantity: 42, minimum: 10, retailPrice: 389990, status: 'ok' },
  { id: 'p2', name: 'SSD Samsung 980 1TB', sku: 'SMS-980-1TB', category: 'Комплектующие', quantity: 8, minimum: 12, retailPrice: 45990, status: 'low' },
  { id: 'p3', name: 'Ray-Ban RB3025 Aviator', sku: 'RBN-RB3025', category: 'Оптика', quantity: 24, minimum: 5, retailPrice: 82500, status: 'ok' },
  { id: 'p4', name: 'Масляный фильтр MANN W 914/2', sku: 'MNN-W9142', category: 'Автозапчасти', quantity: 0, minimum: 8, retailPrice: 5900, status: 'out' },
  { id: 'p5', name: 'MacBook Air 13 M3', sku: 'APL-MBA-M3', category: 'Ноутбуки', quantity: 16, minimum: 6, retailPrice: 649990, status: 'ok' },
  { id: 'p6', name: 'Sony WH-1000XM5', sku: 'SNY-WH1000XM5', category: 'Аудио', quantity: 5, minimum: 8, retailPrice: 169990, status: 'low' },
  { id: 'p7', name: 'Logitech MX Master 3S', sku: 'LOG-MXM3S', category: 'Аксессуары', quantity: 31, minimum: 10, retailPrice: 54990, status: 'ok' },
  { id: 'p8', name: 'Bosch S4 60Ah', sku: 'BSH-S4-60', category: 'Автозапчасти', quantity: 11, minimum: 6, retailPrice: 47900, status: 'ok' },
]

export const balances = [
  { id: 'b1', productId: 'p1', warehouseId: 'almaty', quantity: 34, reserved: 4, minimum: 10 },
  { id: 'b2', productId: 'p1', warehouseId: 'astana', quantity: 8, reserved: 1, minimum: 5 },
  { id: 'b3', productId: 'p2', warehouseId: 'almaty', quantity: 8, reserved: 3, minimum: 12 },
  { id: 'b4', productId: 'p3', warehouseId: 'almaty', quantity: 18, reserved: 2, minimum: 5 },
  { id: 'b5', productId: 'p3', warehouseId: 'shymkent', quantity: 6, reserved: 0, minimum: 3 },
  { id: 'b6', productId: 'p4', warehouseId: 'almaty', quantity: 0, reserved: 0, minimum: 8 },
  { id: 'b7', productId: 'p5', warehouseId: 'almaty', quantity: 16, reserved: 2, minimum: 6 },
  { id: 'b8', productId: 'p6', warehouseId: 'astana', quantity: 5, reserved: 1, minimum: 8 },
  { id: 'b9', productId: 'p7', warehouseId: 'almaty', quantity: 31, reserved: 6, minimum: 10 },
  { id: 'b10', productId: 'p8', warehouseId: 'shymkent', quantity: 11, reserved: 0, minimum: 6 },
]

export const movements = [
  { id: 'm1', type: 'receipt', title: 'Приход товара', detail: 'iPhone 15 128GB · Алматы (Главный)', quantity: '+20 шт.', time: 'Сегодня, 10:42' },
  { id: 'm2', type: 'sale', title: 'Продажа', detail: 'Ray-Ban RB3025 Aviator · Алматы (Главный)', quantity: '−2 шт.', time: 'Сегодня, 09:18' },
  { id: 'm3', type: 'transfer', title: 'Перемещение', detail: 'SSD Samsung 980 1TB · Алматы → Астана', quantity: '−5 шт.', time: 'Вчера, 16:24' },
  { id: 'm4', type: 'receipt', title: 'Приход товара', detail: 'Logitech MX Master 3S · Алматы (Главный)', quantity: '+15 шт.', time: 'Вчера, 11:05' },
]
