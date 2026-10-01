import { createContext, useContext, useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { cn } from '../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'default' | 'small' | 'icon'; loading?: boolean }
export function Button({ variant = 'secondary', size = 'default', loading, className, children, disabled, ...props }: ButtonProps) {
  return <button className={cn('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)} disabled={disabled || loading} {...props}>{loading ? <span className="spinner" aria-hidden="true" /> : children}</button>
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('ui-input', className)} {...props} />
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <div className={cn('search-input', className)}><Search size={17} aria-hidden="true" /><Input type="search" {...props} /></div>
}

export function Select({ value, onValueChange, options, placeholder, className }: { value: string; onValueChange: (value: string) => void; options: { value: string; label: string }[]; placeholder?: string; className?: string }) {
  return <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
    <SelectPrimitive.Trigger className={cn('ui-select', className)} aria-label={placeholder}><SelectPrimitive.Value placeholder={placeholder} /><SelectPrimitive.Icon><ChevronDown size={15} /></SelectPrimitive.Icon></SelectPrimitive.Trigger>
    <SelectPrimitive.Portal><SelectPrimitive.Content className="select-content" position="popper" sideOffset={5}><SelectPrimitive.Viewport>{options.map(option => <SelectPrimitive.Item className="select-item" key={option.value} value={option.value}><SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText></SelectPrimitive.Item>)}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>
  </SelectPrimitive.Root>
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="ui-checkbox"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>
}

export function Tabs({ value, onChange, items }: { value: string; onChange: (value: string) => void; items: { value: string; label: string }[] }) {
  return <div className="ui-tabs" role="tablist">{items.map(item => <button key={item.value} role="tab" aria-selected={value === item.value} className={cn('ui-tab', value === item.value && 'is-active')} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue'; children: ReactNode }) {
  return <span className={cn('ui-badge', `ui-badge--${tone}`)}>{children}</span>
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('table-scroll', className)}><table className="ui-table">{children}</table></div>
}

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  return <div className="pagination"><span>Страница {page} из {pageCount}</span><Button size="icon" aria-label="Предыдущая страница" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /></Button><Button size="icon" aria-label="Следующая страница" disabled={page >= pageCount} onClick={() => onChange(page + 1)}><ChevronRight size={16} /></Button></div>
}

export function Dropdown({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return <DropdownPrimitive.Root><DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger><DropdownPrimitive.Portal><DropdownPrimitive.Content align="end" sideOffset={6} className="dropdown-content">{children}</DropdownPrimitive.Content></DropdownPrimitive.Portal></DropdownPrimitive.Root>
}
export const DropdownItem = DropdownPrimitive.Item

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={300}><TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content className="tooltip-content" sideOffset={5}>{content}</TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root></TooltipPrimitive.Provider>
}

export function Modal({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay" /><DialogPrimitive.Content className="dialog-content"><div className="dialog-heading"><div><DialogPrimitive.Title>{title}</DialogPrimitive.Title>{description && <DialogPrimitive.Description>{description}</DialogPrimitive.Description>}</div><DialogPrimitive.Close className="icon-button" aria-label="Закрыть"><X size={18} /></DialogPrimitive.Close></div>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>
}

export function Drawer({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay" /><DialogPrimitive.Content className="drawer-content"><DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title><DialogPrimitive.Close className="drawer-close icon-button" aria-label="Закрыть"><X size={19} /></DialogPrimitive.Close>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>
}

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; onConfirm: () => void }) {
  return <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}><div className="dialog-actions"><Button onClick={() => onOpenChange(false)}>Отмена</Button><Button variant="danger" onClick={() => { onConfirm(); onOpenChange(false) }}>Подтвердить</Button></div></Modal>
}

const ToastContext = createContext<(message: string) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const notify = (value: string) => { setMessage(value); window.setTimeout(() => setMessage(''), 3500) }
  return <ToastContext.Provider value={notify}>{children}{message && <div className="toast" role="status">{message}<button aria-label="Закрыть" onClick={() => setMessage('')}><X size={16} /></button></div>}</ToastContext.Provider>
}
export const useToast = () => useContext(ToastContext)

export function Skeleton({ className }: { className?: string }) { return <div className={cn('skeleton', className)} aria-hidden="true" /> }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-state-icon"><Search size={20} /></div><h3>{title}</h3><p>{description}</p>{action}</div> }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) { return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div> }
export function FilterBar({ children }: { children: ReactNode }) { return <div className="filter-bar">{children}</div> }
export function StatCard({ label, value, change, icon, tone = 'blue' }: { label: string; value: string; change?: string; icon: ReactNode; tone?: 'blue' | 'green' | 'red' }) { return <article className="stat-card"><div className="stat-card-top"><span>{label}</span><div className={cn('stat-icon', `stat-icon--${tone}`)}>{icon}</div></div><strong>{value}</strong>{change && <small>{change}</small>}</article> }
export function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="empty-state"><h3>Не удалось загрузить данные</h3><p>Проверьте соединение и попробуйте ещё раз.</p>{onRetry && <Button onClick={onRetry}>Повторить</Button>}</div> }
export function DataState({ status, isEmpty, onRetry, children }: { status: 'loading' | 'ready' | 'error'; isEmpty: boolean; onRetry?: () => void; children: ReactNode }) { if (status === 'loading') return <div className="table-skeleton">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} />)}</div>; if (status === 'error') return <ErrorState onRetry={onRetry} />; if (isEmpty) return <EmptyState title="Ничего не найдено" description="Попробуйте изменить поисковый запрос или фильтры." />; return children }
export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) { return <section className={cn('panel', className)}><div className="panel-header"><h2>{title}</h2>{action}</div>{children}</section> }
export function Divider() { return <div className="divider" /> }
export function IconLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) { return <span className="icon-label">{icon}{children}</span> }
export function InfoHint({ children }: { children: ReactNode }) { return <p className="info-hint">{children}</p> }
export function SectionHeader({ title, description }: { title: string; description?: string }) { return <div className="section-header"><h2>{title}</h2>{description && <p>{description}</p>}</div> }
export function SelectChevron() { return <ChevronDown size={16} aria-hidden="true" /> }
export function VisuallyHidden({ children }: { children: ReactNode }) { return <span className="sr-only">{children}</span> }
export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('panel', className)} {...props}>{children}</div> }
