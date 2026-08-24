import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Package,
  Wallet,
  BarChart3,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from './ui'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: false },
  { to: '/atletas', label: 'Atletas', icon: Users, end: false },
  { to: '/produtos', label: 'Produtos', icon: Package, end: false },
  { to: '/pagamentos', label: 'Pagamentos', icon: Wallet, end: false },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, end: false },
]

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <SidebarContent onNavigate={() => {}} onSignOut={handleSignOut} />
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="flex justify-end p-3">
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} onSignOut={handleSignOut} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100">
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold text-gray-900">Gestão de Atletas</span>
          <span className="w-8" />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate, onSignOut }: { onNavigate: () => void; onSignOut: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <p className="text-sm font-semibold text-gray-900">Fábio Nascimento</p>
        <p className="text-xs text-gray-400">Gestão de Atletas</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100',
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-100 px-3 py-4">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  )
}
