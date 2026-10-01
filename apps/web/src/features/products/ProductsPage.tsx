import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MoreHorizontal, Plus, SlidersHorizontal } from 'lucide-react'
import type { ProductSummary } from '@warehouse/types'
import { Badge, Button, DataState, Dropdown, DropdownItem, FilterBar, Input, Modal, PageHeader, Pagination, SearchInput, Select, Table, useToast } from '../../components/ui'
import { balances, products as initialProducts, warehouses } from '../../data/demo'
import { formatMoney, formatNumber } from '../../lib/utils'

const statusLabel = { ok: 'В наличии', low: 'Мало', out: 'Нет в наличии' }
const statusTone = { ok: 'success', low: 'warning', out: 'danger' } as const

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<ProductSummary[]>(initialProducts)
  const [category, setCategory] = useState('all')
  const [warehouse, setWarehouse] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const toast = useToast()
  const query = searchParams.get('q') ?? ''
  const categoryOptions = [{ value: 'all', label: 'Все категории' }, ...Array.from(new Set(items.map(item => item.category))).map(value => ({ value, label: value }))]
  const filtered = useMemo(() => items.map(item => {
    if (warehouse === 'all') return item
    const quantity = balances.filter(balance => balance.productId === item.id && balance.warehouseId === warehouse).reduce((sum, balance) => sum + balance.quantity, 0)
    return { ...item, quantity, status: quantity === 0 ? 'out' as const : quantity <= item.minimum ? 'low' as const : 'ok' as const }
  }).filter(item => {
    const haystack = `${item.name} ${item.sku} ${item.category}`.toLocaleLowerCase('ru')
    return haystack.includes(query.toLocaleLowerCase('ru')) && (category === 'all' || item.category === category) && (status === 'all' || item.status === status)
  }), [items, query, category, status, warehouse])
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6))
  const visible = filtered.slice((page - 1) * 6, page * 6)
  const createProduct = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !sku.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) { toast('Заполните название, артикул и корректную цену'); return }
    if (items.some(item => item.sku.toLocaleLowerCase() === sku.trim().toLocaleLowerCase())) { toast('Товар с таким артикулом уже есть'); return }
    setItems(current => [{ id: crypto.randomUUID(), name: name.trim(), sku: sku.trim(), category: 'Без категории', quantity: 0, minimum: 0, retailPrice: Number(price), status: 'out' }, ...current])
    setName(''); setSku(''); setPrice(''); setOpen(false); setPage(1); setSearchParams({}); toast('Товар добавлен в демо-список')
  }
  return <div className="page-enter"><PageHeader eyebrow="КАТАЛОГ" title="Товары" description="Управляйте ассортиментом и контролируйте наличие товаров." action={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={17} />Добавить товар</Button>} />
    <div className="content-card"><div className="content-card-header"><div><h2>Все товары</h2><p>{formatNumber(filtered.length)} позиций в каталоге</p></div><span className="table-count">{formatNumber(items.length)} товаров</span></div><FilterBar><SearchInput className="filter-search" placeholder="Поиск по названию или артикулу" value={query} onChange={event => { setSearchParams(event.target.value ? { q: event.target.value } : {}); setPage(1) }} aria-label="Поиск товаров" /><div className="filter-selects"><Select value={category} onValueChange={value => { setCategory(value); setPage(1) }} options={categoryOptions} placeholder="Категория" /><Select value={warehouse} onValueChange={value => { setWarehouse(value); setPage(1) }} options={warehouses.map(item => ({ value: item.id, label: item.name }))} placeholder="Склад" /><Select value={status} onValueChange={value => { setStatus(value); setPage(1) }} options={[{ value: 'all', label: 'Все статусы' }, { value: 'ok', label: 'В наличии' }, { value: 'low', label: 'Мало' }, { value: 'out', label: 'Нет в наличии' }]} placeholder="Статус" /></div><Button size="icon" variant="secondary" aria-label="Фильтры" className="filter-icon-button" disabled><SlidersHorizontal size={17} /></Button></FilterBar>
    <DataState status="ready" isEmpty={visible.length === 0}><Table className="products-table"><thead><tr><th>Фото</th><th>Товар</th><th>Артикул</th><th>Категория</th><th className="num-cell">Остаток</th><th className="num-cell">Розничная цена</th><th>Статус</th><th aria-label="Действия" /></tr></thead><tbody>{visible.map(product => <tr key={product.id}><td><div className="product-thumb"><span>{product.category.slice(0, 2).toUpperCase()}</span></div></td><td className="product-name-cell"><strong>{product.name}</strong><small>{product.category}</small></td><td className="mono-cell">{product.sku}</td><td>{product.category}</td><td className="num-cell quantity-cell">{formatNumber(product.quantity)}</td><td className="num-cell">{formatMoney(product.retailPrice)}</td><td><Badge tone={statusTone[product.status]}>{statusLabel[product.status]}</Badge></td><td><Dropdown trigger={<Button size="icon" variant="ghost" aria-label={`Действия с товаром ${product.name}`}><MoreHorizontal size={18} /></Button>}><DropdownItem className="dropdown-item" onSelect={() => toast('Редактирование товара появится в следующем этапе')}>Открыть карточку</DropdownItem></Dropdown></td></tr>)}</tbody></Table><Pagination page={page} pageCount={pageCount} onChange={setPage} /></DataState></div>
    <Modal open={open} onOpenChange={setOpen} title="Добавить товар" description="Новый товар появится только в текущей демо-сессии."><form onSubmit={createProduct} className="product-form"><label>Название товара<Input value={name} onChange={event => setName(event.target.value)} placeholder="Например, iPhone 15 128GB" required /></label><label>Артикул<Input value={sku} onChange={event => setSku(event.target.value)} placeholder="APL-IP15-128" required /></label><label>Розничная цена, ₸<Input type="number" min="0" step="1" value={price} onChange={event => setPrice(event.target.value)} placeholder="0" required /></label><div className="dialog-actions"><Button type="button" onClick={() => setOpen(false)}>Отмена</Button><Button type="submit" variant="primary">Добавить товар</Button></div></form></Modal>
  </div>
}
