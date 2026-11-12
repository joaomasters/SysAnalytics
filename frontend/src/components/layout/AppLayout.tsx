import { BarChart3, BellRing, ClipboardCheck, LayoutDashboard, LogOut, Target, Users } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { Perfil } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

const NAV: { to: string; rotulo: string; Icone: typeof Users; perfis?: Perfil[] }[] = [
  { to: '/dashboard', rotulo: 'Dashboard Executivo', Icone: LayoutDashboard, perfis: ['GESTOR', 'ADMIN'] },
  { to: '/clientes', rotulo: 'Clientes & Churn', Icone: Users },
  { to: '/funil', rotulo: 'Funil de Vendas', Icone: Target },
  { to: '/tarefas', rotulo: 'Tarefas', Icone: ClipboardCheck },
  { to: '/alertas', rotulo: 'Central de Alertas', Icone: BellRing },
]

function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function AppLayout() {
  const { pathname } = useLocation()
  const { usuario, logout } = useAuth()
  const nav = NAV.filter((n) => !n.perfis || (usuario && n.perfis.includes(usuario.perfil)))
  const atual = nav.find((n) => pathname.startsWith(n.to))

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">SysAnalytics</p>
            <p className="text-xs text-muted-foreground">CRM Analítico</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ to, rotulo, Icone }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icone className="size-4" />
              {rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-md border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Ambiente Piloto</p>
          Dados simulados pelo DataSeeder até a integração com o ERP.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-card/95 px-4 backdrop-blur md:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{atual?.rotulo ?? 'SysAnalytics'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{usuario?.nome}</p>
              <p className="text-xs text-muted-foreground">
                {usuario?.empresaNome} · {usuario?.perfil}
              </p>
            </div>
            <div
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white sm:flex"
              aria-hidden
            >
              {usuario ? iniciais(usuario.nome) : ''}
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sair"
              aria-label="Sair"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        {/* Navegação (mobile) */}
        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 md:hidden">
          {nav.map(({ to, rotulo, Icone }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icone className="size-4" />
              {rotulo}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
