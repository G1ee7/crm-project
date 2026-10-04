import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import type { Category, InventoryRow, PageResult, WarehouseRecord } from '@warehouse/types'
import { Badge, DataState, EmptyState, FilterBar, PageHeader, Pagination, SearchInput, Select, Table, Tooltip, Button } from '../../components/ui'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/utils'
import { useCurrentWarehouse } from '../../app/App'

type InventoryResult = PageResult<InventoryRow> & { summary: { quantity: number; reserved: number; available: number } }

export default function InventoryPage() {
  const { warehouseId, setWarehouseId } = useCurrentWarehouse()
  const [params] = useSearchParams()
  const initialWarehouse = useRef(params.get('warehouse'))
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [data, setData] = useState<InventoryResult | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  useEffect(() => { if (initialWarehouse.current) { setWarehouseId(initialWarehouse.current); initialWarehouse.current = null } }, [setWarehouseId])
  useEffect(() => { const timeout = window.setTimeout(() => setDebounced(search), 300); return () => clearTimeout(timeout) }, [search])
  useEffect(() => { Promise.all([api.categories(), api.warehouses()]).then(([c, w]) => { setCategories(c); setWarehouses(w) }).catch(() => {}) }, [version])
  useEffect(() => { let cancelled = false; api.inventory({ search: debounced, category, warehouse: warehouseId, status, page, pageSize: 12 }).then(value => { if (!cancelled) { setData(value); setState('ready') } }).catch(() => { if (!cancelled) setState('error') }); return () => { cancelled = true } }, [debounced, category, warehouseId, status, page, version])
  const summary = data?.summary ?? { quantity: 0, reserved: 0, available: 0 }
  const filtered = !!(debounced || category !== 'all' || warehouseId !== 'all' || status !== 'all')
  return <div className="page-enter"><PageHeader eyebrow="СКЛАД / ОСТАТКИ" title="Остатки" description="Актуальное наличие по товарам и складам." /><div className="inventory-summary"><div><span>Фактический остаток</span><strong>{formatNumber(summary.quantity)} <small>ед.</small></strong></div><div><span>В резерве</span><strong>{formatNumber(summary.reserved)} <small>ед.</small></strong></div><div><span>Доступно</span><strong>{formatNumber(summary.available)} <small>ед.</small></strong></div></div><div className="content-card"><div className="content-card-header"><div><h2>Остатки по складам</h2><p>Фактическое количество, резерв и доступный остаток</p></div><Tooltip content="Доступно = фактический остаток − резерв"><Button size="icon" variant="ghost" aria-label="Как рассчитывается доступный остаток"><Info size={17} /></Button></Tooltip></div><FilterBar><SearchInput className="filter-search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Поиск товара или артикула" aria-label="Поиск остатков" /><div className="filter-selects"><Select value={warehouseId} onValueChange={v => { setWarehouseId(v); setPage(1) }} options={[{ value: 'all', label: 'Все склады' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))]} placeholder="Склад" /><Select value={category} onValueChange={v => { setCategory(v); setPage(1) }} options={[{ value: 'all', label: 'Все категории' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} placeholder="Категория" /><Select value={status} onValueChange={v => { setStatus(v); setPage(1) }} options={[{ value: 'all', label: 'Все остатки' }, { value: 'low', label: 'Только низкие' }]} placeholder="Состояние" /></div></FilterBar><DataState status={state} isEmpty={false} onRetry={() => { setState('loading'); setVersion(v => v + 1) }}>{data?.items.length ? <><Table className="inventory-table catalog-table"><thead><tr><th>Товар</th><th>Артикул</th><th>Склад</th><th className="num-cell">Фактический остаток</th><th className="num-cell">Резерв</th><th className="num-cell">Доступно</th><th className="num-cell">Минимум</th><th>Статус</th></tr></thead><tbody>{data.items.map(row => <tr key={`${row.productId}-${row.warehouseId}`}><td className="product-name-cell"><strong>{row.name}</strong></td><td className="mono-cell">{row.sku}</td><td>{row.warehouseName}</td><td className="num-cell quantity-cell">{formatNumber(row.quantity)}</td><td className="num-cell">{formatNumber(row.reserved)}</td><td className="num-cell">{formatNumber(row.available)}</td><td className="num-cell">{formatNumber(row.minimumStock)}</td><td><Badge tone={row.status === 'ok' ? 'success' : row.status === 'low' ? 'warning' : row.status === 'out' ? 'danger' : 'neutral'}>{row.status === 'ok' ? 'В наличии' : row.status === 'low' ? 'Мало' : row.status === 'out' ? 'Нет в наличии' : 'Архив'}</Badge></td></tr>)}</tbody></Table><Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / 12))} onChange={setPage} /></> : <EmptyState title={filtered ? 'По вашему запросу ничего не найдено' : 'Остатков пока нет'} description={filtered ? 'Измените фильтры или поисковый запрос.' : 'Остатки появятся после складских операций.'} />}</DataState></div></div>
}
