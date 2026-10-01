import { Suspense, createContext, lazy, useContext, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Box, ChartNoAxesCombined, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, House, Menu, Package, Settings, Truck, Users, Warehouse } from 'lucide-react'
import { warehouses } from '../data/demo'
import { Button, Drawer, Dropdown, DropdownItem, SearchInput, Select, Skeleton, ToastProvider, useToast } from '../components/ui'
import { cn } from '../lib/utils'

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const ProductsPage = lazy(() => import('../features/products/ProductsPage'))
const InventoryPage = lazy(() => import('../features/inventory/InventoryPage'))

const WarehouseContext = createContext<{ warehouseId: string; setWarehouseId: (id: string) => void }>({ warehouseId: 'all', setWarehouseId: () => {} })
export const useCurrentWarehouse = () => useContext(WarehouseContext)

const primaryNav = [
  { label: 'Главная', to: '/', icon: House },
  { label: 'Товары', to: '/products', icon: Package },
]
const warehouseNav = [
  { label: 'Остатки', to: '/inventory' },
  { label: 'Приходы', to: '/receipts' },
  { label: 'Расходы', to: '/issues' },
  { label: 'Перемещения', to: '/transfers' },
  { label: 'Списания', to: '/writeoffs' },
]
const secondaryNav = [
  { label: 'Продажи', to: '/sales', icon: Box },
  { label: 'Контрагенты', to: '/counterparties', icon: Users },
  { label: 'Движения', to: '/movements', icon: ClipboardList },
  { label: 'Отчёты', to: '/reports', icon: ChartNoAxesCombined },
]

function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const location = useLocation()
  const [warehouseOpen, setWarehouseOpen] = useState(true)
  const isWarehouseActive = warehouseNav.some(item => item.to === location.pathname)
  return <aside className={cn('sidebar', collapsed && 'sidebar--collapsed')}>
    <div className="sidebar-brand"><div className="brand-mark"><Warehouse size={19} strokeWidth={2.2} /></div><div className="brand-copy"><strong>Склад</strong><span>DEMO WORKSPACE</span></div><button className="sidebar-collapse icon-button" aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'} onClick={onToggle}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button></div>
    <div className="sidebar-org"><div className="org-avatar">D</div><div className="org-text"><strong>Demo Company</strong><span>Рабочее пространство</span></div><ChevronDown className="org-chevron" size={14} /></div>
    <nav aria-label="Основная навигация"><span className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</span>{primaryNav.map(({ label, to, icon: Icon }) => <NavLink onClick={onNavigate} key={to} to={to} end className={({ isActive }) => cn('nav-link', isActive && 'is-active')} title={collapsed ? label : undefined}><Icon size={18} /><span>{label}</span></NavLink>)}
      <button className={cn('nav-link', 'nav-group', isWarehouseActive && 'is-group-active')} aria-expanded={warehouseOpen} onClick={() => { if (collapsed) onToggle(); setWarehouseOpen(!warehouseOpen) }} title={collapsed ? 'Склад' : undefined}><Warehouse size={18} /><span>Склад</span><ChevronDown size={15} className={cn('nav-group-chevron', !warehouseOpen && 'is-closed')} /></button>
      {warehouseOpen && <div className="nav-subitems">{warehouseNav.map(({ label, to }) => <NavLink onClick={onNavigate} key={to} to={to} className={({ isActive }) => cn('nav-sublink', isActive && 'is-active')}><span className="sub-dot" />{label}</NavLink>)}</div>}
      {secondaryNav.map(({ label, to, icon: Icon }) => <NavLink onClick={onNavigate} key={to} to={to} className={({ isActive }) => cn('nav-link', isActive && 'is-active')} title={collapsed ? label : undefined}><Icon size={18} /><span>{label}</span></NavLink>)}
      <div className="nav-separator" /><NavLink onClick={onNavigate} to="/settings" className={({ isActive }) => cn('nav-link', isActive && 'is-active')} title={collapsed ? 'Настройки' : undefined}><Settings size={18} /><span>Настройки</span></NavLink>
    </nav><div className="sidebar-footer"><span className="status-dot" /><span>Демо-режим</span><small>v 0.1</small></div>
  </aside>
}

function Header({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { warehouseId, setWarehouseId } = useCurrentWarehouse()
  const [query, setQuery] = useState('')
  return <header className="topbar"><button className="mobile-menu icon-button" aria-label="Открыть меню" onClick={onMenu}><Menu size={21} /></button><Link to="/" className="mobile-brand">Склад</Link><form className="topbar-search" onSubmit={event => { event.preventDefault(); navigate(`/products?q=${encodeURIComponent(query)}`) }}><SearchInput value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск товара, артикула, штрихкода..." aria-label="Глобальный поиск" /><kbd>⌘ K</kbd></form><div className="topbar-actions"><div className="topbar-warehouse"><Select value={warehouseId} onValueChange={setWarehouseId} options={warehouses.map(item => ({ value: item.id, label: item.name }))} placeholder="Текущий склад" /></div><Button className="notification-button" size="icon" variant="ghost" aria-label="Уведомления" onClick={() => toast('Новых уведомлений нет')}><Bell size={19} /><i /></Button><Dropdown trigger={<button className="profile-trigger"><span className="profile-avatar">АБ</span><span className="profile-name"><strong>Айдос Б.</strong><small>Администратор</small></span><ChevronDown size={15} /></button>}><DropdownItem className="dropdown-item" onSelect={() => toast('Профиль будет доступен в следующих этапах')}>Профиль</DropdownItem><DropdownItem className="dropdown-item" onSelect={() => navigate('/settings')}>Настройки</DropdownItem></Dropdown></div></header>
}

function ComingSoon() {
  const location = useLocation()
  const all = [...warehouseNav, ...secondaryNav, { label: 'Настройки', to: '/settings' }]
  const label = all.find(item => item.to === location.pathname)?.label ?? 'Раздел'
  return <div className="coming-soon"><div className="coming-soon-icon"><Truck size={23} /></div><span className="eyebrow">СЛЕДУЮЩИЙ ЭТАП</span><h1>{label}</h1><p>Раздел появится на следующем этапе разработки. Сейчас доступен фундамент интерфейса, товары и остатки.</p><Link to="/" className="ui-button ui-button--primary">Вернуться на главную</Link></div>
}

function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [warehouseId, setWarehouseId] = useState('all')
  return <WarehouseContext.Provider value={{ warehouseId, setWarehouseId }}><div className={cn('app-shell', collapsed && 'app-shell--collapsed')}><div className="desktop-sidebar"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /></div><Drawer open={mobileOpen} onOpenChange={setMobileOpen} title="Меню"><Sidebar collapsed={false} onToggle={() => {}} onNavigate={() => setMobileOpen(false)} /></Drawer><div className="app-main"><Header onMenu={() => setMobileOpen(true)} /><main className="page-container"><Suspense fallback={<div className="page-loading"><Skeleton className="skeleton-title" /><Skeleton className="skeleton-large" /><Skeleton className="skeleton-large" /></div>}><Routes><Route path="/" element={<DashboardPage />} /><Route path="/products" element={<ProductsPage />} /><Route path="/inventory" element={<InventoryPage />} /><Route path="/receipts" element={<ComingSoon />} /><Route path="/issues" element={<ComingSoon />} /><Route path="/transfers" element={<ComingSoon />} /><Route path="/writeoffs" element={<ComingSoon />} /><Route path="/sales" element={<ComingSoon />} /><Route path="/counterparties" element={<ComingSoon />} /><Route path="/movements" element={<ComingSoon />} /><Route path="/reports" element={<ComingSoon />} /><Route path="/settings" element={<ComingSoon />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense></main></div></div></WarehouseContext.Provider>
}

export function App() { return <ToastProvider><AppShell /></ToastProvider> }
