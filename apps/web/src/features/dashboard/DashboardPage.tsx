import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Boxes, CircleAlert, PackageCheck, TrendingUp } from 'lucide-react'
import { Badge, PageHeader, Panel, Select, StatCard } from '../../components/ui'
import { movements } from '../../data/demo'
import type { CatalogProduct, WarehouseRecord } from '@warehouse/types'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/utils'

const chartLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const sales = [43, 59, 52, 76, 68, 89, 83]
const profit = [24, 34, 31, 44, 39, 55, 49]
const linePoints = (values: number[]) => values.map((value, index) => `${44 + index * 74},${156 - value * 1.28}`).join(' ')

function SalesChart({ period }: { period: string }) {
  const factor = period === 'week' ? 1 : period === 'month' ? .82 : .66
  return <div className="chart-wrap"><div className="chart-legend"><span><i className="legend-dot legend-blue" />Продажи</span><span><i className="legend-dot legend-green" />Прибыль</span></div><svg className="sales-chart" viewBox="0 0 550 210" role="img" aria-label="График продаж и прибыли за выбранный период" preserveAspectRatio="none"><line x1="44" y1="38" x2="526" y2="38" /><line x1="44" y1="88" x2="526" y2="88" /><line x1="44" y1="138" x2="526" y2="138" /><line x1="44" y1="188" x2="526" y2="188" /><text x="0" y="42">3 млн</text><text x="0" y="92">2 млн</text><text x="0" y="142">1 млн</text><polyline className="sales-line" points={linePoints(sales.map(v => v * factor))} /><polyline className="profit-line" points={linePoints(profit.map(v => v * factor))} />{sales.map((value, index) => <circle key={index} className="sales-point" cx={44 + index * 74} cy={156 - value * factor * 1.28} r="3" />)}</svg><div className="chart-axis">{chartLabels.map(label => <span key={label}>{label}</span>)}</div></div>
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('week')
  const [low, setLow] = useState<CatalogProduct[]>([])
  const [lowTotal, setLowTotal] = useState(0)
  const [total, setTotal] = useState(0)
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  useEffect(() => { Promise.all([api.products({ status: 'low', pageSize: 5 }), api.products({ status: 'out', pageSize: 5 }), api.inventory({ pageSize: 1 }), api.warehouses()]).then(([lowItems, outItems, inventory, warehouseItems]) => { setLow([...outItems.items, ...lowItems.items].slice(0, 5)); setLowTotal(lowItems.total + outItems.total); setTotal(inventory.summary.quantity); setWarehouses(warehouseItems) }).catch(() => {}) }, [])
  const warehouseTotal = warehouses.reduce((sum, warehouse) => sum + (warehouse.quantity ?? 0), 0)
  return <div className="page-enter"><PageHeader eyebrow="ОБЗОР · DEMO COMPANY" title="Здравствуйте, Айдос!" description="Вот что происходит на вашем складе сегодня" action={<Select value={period} onValueChange={setPeriod} options={[{ value: 'week', label: 'Последние 7 дней' }, { value: 'month', label: 'Последние 30 дней' }, { value: 'quarter', label: 'Последние 90 дней' }]} placeholder="Период" />} />
    <div className="stats-grid"><StatCard label="Общий остаток" value={formatNumber(total)} change="единицы на всех складах" icon={<Boxes size={19} />} /><StatCard label="Продажи · демо" value="245" change="за выбранный период" icon={<PackageCheck size={19} />} /><StatCard label="Валовая прибыль · демо" value="2 130 000 ₸" change="+12,8% к прошлому периоду" icon={<TrendingUp size={19} />} tone="green" /><StatCard label="Товаров на минимуме" value={formatNumber(lowTotal)} change="требуют внимания" icon={<CircleAlert size={19} />} tone="red" /></div>
    <div className="dashboard-main-grid"><Panel title="Продажи и прибыль · демо" action={<span className="panel-subtitle">Динамика за период</span>}><SalesChart period={period} /></Panel><Panel title="Остатки по складам" action={<BarChart3 size={17} className="muted-icon" />}><div className="warehouse-overview">{warehouses.map(warehouse => { const percent = warehouseTotal ? Math.round((warehouse.quantity ?? 0) / warehouseTotal * 100) : 0; return <div className="warehouse-row" key={warehouse.id}><div><strong>{warehouse.name}</strong><span>{formatNumber(warehouse.quantity ?? 0)} ед. · {percent}%</span></div><div className="progress-track"><div style={{ width: `${percent}%` }} /></div></div> })}</div><Link className="panel-footer-link" to="/inventory">Все остатки <ArrowRight size={16} /></Link></Panel></div>
    <div className="dashboard-bottom-grid"><Panel title="Низкие остатки" action={<Link className="text-link" to="/inventory">Смотреть все <ArrowRight size={15} /></Link>}><div className="low-list">{low.map(product => <Link to={`/products?product=${product.id}`} className="low-item" key={product.id}><div className="product-thumb product-thumb--small"><span>{(product.category ?? '—').slice(0, 2).toUpperCase()}</span></div><div><strong>{product.name}</strong><span>{product.sku}</span></div><div className="low-item-end"><strong>{formatNumber(product.quantity)} шт.</strong><Badge tone={product.status === 'out' ? 'danger' : 'warning'}>{product.status === 'out' ? 'Нет в наличии' : 'Низкий остаток'}</Badge></div></Link>)}</div></Panel><Panel title="Последние движения · демо" action={<Link className="text-link" to="/movements">Все движения <ArrowRight size={15} /></Link>}><div className="movement-list">{movements.map(movement => <div className="movement-item" key={movement.id}><div className={`movement-icon movement-icon--${movement.type}`}>{movement.type === 'receipt' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</div><div><strong>{movement.title}</strong><span>{movement.detail}</span></div><div className="movement-end"><strong className={movement.type === 'receipt' ? 'positive' : ''}>{movement.quantity}</strong><span>{movement.time}</span></div></div>)}</div></Panel></div><p className="demo-caption">Продажи, прибыль и движения на этом экране демонстрационные. Остатки товаров загружаются из D1.</p>
  </div>
}
