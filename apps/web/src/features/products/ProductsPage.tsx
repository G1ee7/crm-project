import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MoreHorizontal, Plus } from 'lucide-react'
import { productInputSchema, type ProductInput } from '@warehouse/shared'
import type { CatalogProduct, Category, PageResult, ProductDetail, StockMovement, WarehouseRecord } from '@warehouse/types'
import { Badge, Button, ConfirmDialog, DataState, Dropdown, DropdownItem, EmptyState, FilterBar, Input, Modal, PageHeader, Pagination, SearchInput, Select, Table, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/utils'

const labels = { ok: 'В наличии', low: 'Мало', out: 'Нет в наличии', archived: 'Архив' }
const tones = { ok: 'success', low: 'warning', out: 'danger', archived: 'neutral' } as const
const money = (minor: number) => `${new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 2 }).format(minor / 100)} ₸`
const options = (items: { id: string; name: string }[], all: string) => [{ value: 'all', label: all }, ...items.map(item => ({ value: item.id, label: item.name }))]

function ProductForm({ product, categories, onCancel, onSave }: { product?: ProductDetail; categories: Category[]; onCancel: () => void; onSave: (input: ProductInput) => Promise<void> }) {
  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? 'none')
  const [barcode, setBarcode] = useState(product?.barcodes.join(', ') ?? '')
  const [unit, setUnit] = useState(product?.unit ?? 'шт.')
  const [purchasePrice, setPurchasePrice] = useState(String((product?.purchasePrice ?? 0) / 100))
  const [salePrice, setSalePrice] = useState(String((product?.salePrice ?? 0) / 100))
  const [minimumStock, setMinimumStock] = useState(String(product?.minimumStock ?? 0))
  const [description, setDescription] = useState(product?.description ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const price = (value: string) => /^\d+(?:[.,]\d{1,2})?$/.test(value) ? Math.round(Number(value.replace(',', '.')) * 100) : NaN
    const parsed = productInputSchema.safeParse({ name, sku, categoryId: categoryId === 'none' ? null : categoryId, barcodes: barcode.split(',').map(item => item.trim()).filter(Boolean), unit, purchasePrice: price(purchasePrice), salePrice: price(salePrice), minimumStock: Number(minimumStock), description: description || null })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Проверьте поля формы'); return }
    setSaving(true); setError('')
    try { await onSave(parsed.data) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить товар') } finally { setSaving(false) }
  }
  return <form className="product-form" onSubmit={submit}><div className="form-section-title">Основная информация</div><label>Название *<Input value={name} onChange={e => setName(e.target.value)} required /></label><label>Артикул *<Input value={sku} onChange={e => setSku(e.target.value)} required /></label><label>Категория<Select value={categoryId} onValueChange={setCategoryId} options={[{ value: 'none', label: 'Без категории' }, ...categories.map(item => ({ value: item.id, label: item.name }))]} placeholder="Категория" /></label><label>Штрихкоды <small>Через запятую</small><Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Например, 0195949038957" /></label><label>Единица измерения<Input value={unit} onChange={e => setUnit(e.target.value)} required /></label><div className="form-section-title">Цены</div><div className="form-grid"><label>Закупочная цена, ₸<Input inputMode="decimal" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} /></label><label>Розничная цена, ₸<Input inputMode="decimal" value={salePrice} onChange={e => setSalePrice(e.target.value)} /></label></div><div className="form-section-title">Склад</div><label>Минимальный остаток<Input type="number" min="0" step="1" value={minimumStock} onChange={e => setMinimumStock(e.target.value)} /></label><label>Описание<textarea className="ui-input form-textarea" value={description} onChange={e => setDescription(e.target.value)} rows={3} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><Button type="button" onClick={onCancel}>Отмена</Button><Button type="submit" variant="primary" loading={saving}>{product ? 'Сохранить' : 'Создать товар'}</Button></div></form>
}

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [debounced, setDebounced] = useState(search)
  const [category, setCategory] = useState('all')
  const [warehouse, setWarehouse] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<PageResult<CatalogProduct> | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [history, setHistory] = useState<StockMovement[]>([])
  const [archiveOpen, setArchiveOpen] = useState(false)
  const toast = useToast()
  const productId = params.get('product')

  useEffect(() => { const timeout = window.setTimeout(() => setDebounced(search), 300); return () => clearTimeout(timeout) }, [search])
  useEffect(() => { setSearch(params.get('q') ?? '') }, [params])
  useEffect(() => { Promise.all([api.categories(), api.warehouses()]).then(([c, w]) => { setCategories(c); setWarehouses(w) }).catch(() => {}) }, [version])
  useEffect(() => { let cancelled = false; api.products({ search: debounced, category, warehouse, status, page, pageSize: 10 }).then(value => { if (!cancelled) { setData(value); setState('ready') } }).catch(() => { if (!cancelled) setState('error') }); return () => { cancelled = true } }, [debounced, category, warehouse, status, page, version])
  useEffect(() => { if (!productId) { setDetail(null); setEditing(false); return } let cancelled = false; api.product(productId).then(value => { if (!cancelled) setDetail(value) }).catch(() => { if (!cancelled) toast('Не удалось открыть карточку товара') }); return () => { cancelled = true } }, [productId, version, toast])
  useEffect(() => { if (!productId) { setHistory([]); return } let cancelled = false; api.movements({ productId, pageSize: 8 }).then(value => { if (!cancelled) setHistory(value.items) }).catch(() => { if (!cancelled) setHistory([]) }); return () => { cancelled = true } }, [productId, version])
  const openProduct = (id: string) => setParams(current => { const next = new URLSearchParams(current); next.set('product', id); return next })
  const closeProduct = () => setParams(current => { const next = new URLSearchParams(current); next.delete('product'); return next })
  const save = async (input: ProductInput) => { if (editing && detail) { await api.updateProduct(detail.id, input); toast('Товар обновлён'); setEditing(false) } else { const created = await api.createProduct(input); toast('Товар создан'); setFormOpen(false); openProduct(created.id) } setVersion(v => v + 1) }
  const archive = async () => { if (!detail) return; try { await api.archiveProduct(detail.id); toast('Товар архивирован'); setArchiveOpen(false); setVersion(v => v + 1) } catch (error) { toast(error instanceof Error ? error.message : 'Не удалось архивировать товар') } }
  const changeSearch = (value: string) => { setSearch(value); setPage(1); setParams(current => { const next = new URLSearchParams(current); if (value) next.set('q', value); else next.delete('q'); return next }) }
  const filtered = !!(debounced || category !== 'all' || warehouse !== 'all' || status !== 'all')
  return <div className="page-enter"><PageHeader eyebrow="КАТАЛОГ" title="Товары" description="Управляйте ассортиментом и контролируйте наличие товаров." action={<Button variant="primary" onClick={() => setFormOpen(true)}><Plus size={17} />Добавить товар</Button>} /><div className="content-card"><div className="content-card-header"><div><h2>Все товары</h2><p>{formatNumber(data?.total ?? 0)} позиций в каталоге</p></div></div><FilterBar><SearchInput className="filter-search" placeholder="Поиск товара, артикула или штрихкода" value={search} onChange={e => changeSearch(e.target.value)} aria-label="Поиск товаров" /><div className="filter-selects"><Select value={category} onValueChange={v => { setCategory(v); setPage(1) }} options={options(categories, 'Все категории')} placeholder="Категория" /><Select value={warehouse} onValueChange={v => { setWarehouse(v); setPage(1) }} options={options(warehouses, 'Все склады')} placeholder="Склад" /><Select value={status} onValueChange={v => { setStatus(v); setPage(1) }} options={[{ value: 'all', label: 'Все статусы' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} placeholder="Статус" /></div></FilterBar><DataState status={state} isEmpty={false} onRetry={() => { setState('loading'); setVersion(v => v + 1) }}>{data?.items.length ? <><Table className="products-table catalog-table"><thead><tr><th>Товар</th><th>Артикул</th><th>Категория</th><th className="num-cell">Остаток</th><th className="num-cell">Доступно</th><th className="num-cell">Цена</th><th>Статус</th><th aria-label="Действия" /></tr></thead><tbody>{data.items.map(product => <tr key={product.id}><td className="product-name-cell"><button className="table-link" onClick={() => openProduct(product.id)}>{product.name}</button></td><td className="mono-cell">{product.sku}</td><td>{product.category ?? '—'}</td><td className="num-cell quantity-cell">{formatNumber(product.quantity)}</td><td className="num-cell">{formatNumber(product.available)}</td><td className="num-cell">{money(product.salePrice)}</td><td><Badge tone={tones[product.status]}>{labels[product.status]}</Badge></td><td><Dropdown trigger={<Button size="icon" variant="ghost" aria-label={`Действия с товаром ${product.name}`}><MoreHorizontal size={18} /></Button>}><DropdownItem className="dropdown-item" onSelect={() => openProduct(product.id)}>Открыть карточку</DropdownItem></Dropdown></td></tr>)}</tbody></Table><Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / 10))} onChange={setPage} /></> : <EmptyState title={filtered ? 'По вашему запросу ничего не найдено' : 'Товаров пока нет'} description={filtered ? 'Попробуйте изменить запрос или фильтры.' : 'Создайте первый товар в каталоге.'} action={!filtered && <Button variant="primary" onClick={() => setFormOpen(true)}>Добавить первый товар</Button>} />}</DataState></div>
    <Modal open={formOpen} onOpenChange={setFormOpen} title="Добавить товар"><ProductForm categories={categories} onCancel={() => setFormOpen(false)} onSave={save} /></Modal>
    <Modal open={!!productId} onOpenChange={open => { if (!open) closeProduct() }} title={editing ? 'Редактировать товар' : detail?.name ?? 'Загрузка товара'}>{detail && (editing ? <ProductForm key={detail.id} product={detail} categories={categories} onCancel={() => setEditing(false)} onSave={save} /> : <div className="product-detail"><div className="detail-meta"><span>Артикул <strong>{detail.sku}</strong></span><span>Категория <strong>{detail.category ?? 'Без категории'}</strong></span><span>Штрихкоды <strong>{detail.barcodes.join(', ') || '—'}</strong></span><span>Закупочная цена <strong>{money(detail.purchasePrice)}</strong></span><span>Розничная цена <strong>{money(detail.salePrice)}</strong></span><span>Статус <Badge tone={tones[detail.status]}>{labels[detail.status]}</Badge></span></div><div className="form-section-title">Остатки по складам</div>{detail.balances.length ? detail.balances.map(balance => <div className="detail-balance" key={balance.warehouseId}><span>{balance.warehouseName}</span><strong>{formatNumber(balance.quantity)}</strong></div>) : <p className="detail-empty">Остатков пока нет</p>}<div className="detail-totals"><span>Всего: <strong>{formatNumber(detail.quantity)}</strong></span><span>Резерв: <strong>{formatNumber(detail.reserved)}</strong></span><span>Доступно: <strong>{formatNumber(detail.available)}</strong></span></div><div className="form-section-title">Движения</div>{history.length ? history.map(row => <div className="detail-balance" key={row.id}><span>{new Date(row.createdAt).toLocaleDateString('ru-KZ')} · {row.documentNumber ?? row.type} · {row.warehouseName}</span><strong>{row.quantityDelta > 0 ? '+' : ''}{row.quantityDelta}</strong></div>) : <p className="detail-empty">Движений пока нет</p>}<div className="dialog-actions"><Link className="table-link" to={`/movements?productId=${detail.id}`}>История движений</Link><Button onClick={() => setEditing(true)}>Редактировать</Button>{detail.isActive && <Button variant="danger" onClick={() => setArchiveOpen(true)}>Архивировать</Button>}</div></div>)}</Modal>
    <ConfirmDialog open={archiveOpen} onOpenChange={setArchiveOpen} title="Архивировать товар?" description="Товар останется в истории и остатках, но получит статус «Архив»." onConfirm={() => { void archive() }} />
  </div>
}
