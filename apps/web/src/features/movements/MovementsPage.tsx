import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { PageResult, StockMovement, WarehouseRecord } from '@warehouse/types'
import { Badge, DataState, EmptyState, Input, PageHeader, Pagination, SearchInput, Select, Table } from '../../components/ui'
import { api } from '../../lib/api'

const labels: Record<string, string> = { RECEIPT: 'Приход', ISSUE: 'Расход', WRITEOFF: 'Списание', TRANSFER_OUT: 'Перемещение · расход', TRANSFER_IN: 'Перемещение · приход' }
const kinds = [{ value: 'all', label: 'Все документы' }, { value: 'receipts', label: 'Приходы' }, { value: 'issues', label: 'Расходы' }, { value: 'writeoffs', label: 'Списания' }, { value: 'transfers', label: 'Перемещения' }]

export default function MovementsPage() {
  const [params] = useSearchParams()
  const [warehouse, setWarehouse] = useState(params.get('warehouseId') ?? 'all')
  const [documentType, setDocumentType] = useState(params.get('documentType') ?? 'all')
  const [type, setType] = useState('all')
  const [actor, setActor] = useState('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [data, setData] = useState<PageResult<StockMovement> | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const productId = params.get('productId') ?? undefined
  const documentId = params.get('documentId') ?? undefined
  useEffect(() => { api.warehouses().then(setWarehouses).catch(() => {}) }, [])
  useEffect(() => { let active = true; setState('loading'); api.movements({ page, pageSize: 20, productId, documentId, warehouseId: warehouse, documentType, type, actor, search, from, to }).then(result => { if (active) { setData(result); setState('ready') } }).catch(() => { if (active) setState('error') }); return () => { active = false } }, [page, productId, documentId, warehouse, documentType, type, actor, search, from, to, version])
  return <div className="page-enter"><PageHeader eyebrow="СКЛАД / ИСТОРИЯ" title="Движения товаров" description="Неизменяемый журнал проведённых складских операций." /><div className="content-card"><div className="content-card-header"><div><h2>История движений</h2><p>{data?.total ?? 0} записей</p></div><div className="filter-selects"><Select value={warehouse} onValueChange={value => { setWarehouse(value); setPage(1) }} options={[{ value: 'all', label: 'Все склады' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))]} placeholder="Склад" /><Select value={documentType} onValueChange={value => { setDocumentType(value); setPage(1) }} options={kinds} placeholder="Документ" /></div></div><div className="document-filters"><SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Товар, SKU, штрихкод, номер" aria-label="Поиск движений" /><Select value={type} onValueChange={value => { setType(value); setPage(1) }} options={[{ value: 'all', label: 'Все операции' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} placeholder="Операция" /><Select value={actor} onValueChange={value => { setActor(value); setPage(1) }} options={[{ value: 'all', label: 'Все сотрудники' }, { value: 'demo-admin', label: 'Айдос Б.' }]} placeholder="Сотрудник" /><label>С<Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} /></label><label>По<Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} /></label></div><DataState status={state} isEmpty={false} onRetry={() => setVersion(v => v + 1)}>{data?.items.length ? <><Table className="catalog-table movement-table"><thead><tr><th>Дата</th><th>Товар</th><th>Склад</th><th>Операция</th><th>Документ</th><th>Автор</th><th className="num-cell">Количество</th></tr></thead><tbody>{data.items.map(row => <tr key={row.id}><td data-label="Дата">{new Date(row.createdAt).toLocaleString('ru-KZ')}</td><td data-label="Товар"><Link className="table-link" to={`/products?product=${row.productId}`}>{row.productName}</Link><small className="mono-cell"> {row.sku}</small></td><td data-label="Склад">{row.warehouseName}</td><td data-label="Операция"><Badge tone={row.quantityDelta > 0 ? 'success' : 'warning'}>{labels[row.type] ?? row.type}</Badge></td><td data-label="Документ"><Link className="table-link" to={`/${row.documentType}`}>{row.documentNumber ?? row.documentType}</Link></td><td data-label="Автор">{row.actorName ?? '—'}</td><td data-label="Количество" className="num-cell quantity-cell">{row.quantityDelta > 0 ? '+' : ''}{row.quantityDelta}</td></tr>)}</tbody></Table><Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / 20))} onChange={setPage} /></> : <EmptyState title="Движений пока нет" description="Они появятся после проведения первого складского документа." />}</DataState></div></div>
}
