import {
  BarChart3,
  BellRing,
  ChevronRight,
  ClipboardCheck,
  Flag,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Target,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { Perfil } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

interface ItemNav {
  to: string
  rotulo: string
  Icone: typeof Users
  perfis?: Perfil[]
  /** Prefixos de rota que também pertencem a este item (telas de detalhe). */
  prefixos?: string[]
}

interface GrupoNav {
  titulo: string | null
  itens: ItemNav[]
}

const GRUPOS: GrupoNav[] = [
  {
    titulo: null,
    itens: [{ to: '/dashboard', rotulo: 'Painel executivo', Icone: LayoutDashboard, perfis: ['GESTOR', 'ADMIN'] }],
  },
  {
    titulo: 'Relacionamento',
    itens: [
      { to: '/clientes', rotulo: 'Clientes & Churn', Icone: Users },
      { to: '/tarefas', rotulo: 'Tarefas', Icone: ClipboardCheck },
      { to: '/alertas', rotulo: 'Central de alertas', Icone: BellRing },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [{ to: '/financeiro/receber', rotulo: 'Contas a receber', Icone: HandCoins }],
  },
  {
    titulo: 'Vendas',
    itens: [
      { to: '/funil', rotulo: 'Funil de vendas', Icone: Target, prefixos: ['/oportunidades', '/propostas'] },
      { to: '/metas', rotulo: 'Metas', Icone: Flag },
      { to: '/produtos', rotulo: 'Catálogo de produtos', Icone: Package },
    ],
  },
]

const CHAVE_RECOLHIDO = 'sysanalytics.nav.recolhido'

function lerRecolhido() {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDO) === '1'
  } catch {
    return false
  }
}

function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

function pertence(item: ItemNav, pathname: string) {
  return [item.to, ...(item.prefixos ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()
  const [recolhido, setRecolhido] = useState(lerRecolhido)
  const [gaveta, setGaveta] = useState(false)
  const [busca, setBusca] = useState('')

  const grupos = GRUPOS.map((g) => ({
    ...g,
    itens: g.itens.filter((i) => !i.perfis || (usuario && i.perfis.includes(usuario.perfil))),
  })).filter((g) => g.itens.length > 0)

  const atual = grupos.flatMap((g) => g.itens.map((i) => ({ grupo: g.titulo, item: i }))).find((x) => pertence(x.item, pathname))
  const emDetalhe = atual ? pathname !== atual.item.to : false

  useEffect(() => setGaveta(false), [pathname])

  function alternarRecolhido() {
    setRecolhido((v) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDO, v ? '0' : '1')
      } catch {
        /* preferência visual: ignorar falha de armazenamento */
      }
      return !v
    })
  }

  function pesquisar(e: FormEvent) {
    e.preventDefault()
    const termo = busca.trim()
    navigate(termo ? `/clientes?busca=${encodeURIComponent(termo)}` : '/clientes')
  }

  const navegacao = (compacta: boolean) => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-2" aria-label="Navegação principal">
      {grupos.map((g, i) => (
        <div key={g.titulo ?? `g${i}`} className={cn(i > 0 && 'mt-2')}>
          {g.titulo && !compacta && (
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.titulo}</p>
          )}
          {g.titulo && compacta && <div className="mx-3 my-1 border-t" />}
          {g.itens.map(({ to, rotulo, Icone, prefixos }) => {
            const ativo = pertence({ to, rotulo, Icone, prefixos }, pathname)
            return (
              <NavLink
                key={to}
                to={to}
                title={compacta ? rotulo : undefined}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'relative flex h-9 items-center gap-3 text-sm transition-colors',
                  compacta ? 'justify-center px-0' : 'px-4',
                  ativo
                    ? 'bg-nav-hover font-semibold text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r before:bg-primary'
                    : 'text-foreground/80 hover:bg-nav-hover hover:text-foreground',
                )}
              >
                <Icone className="size-[18px] shrink-0" aria-hidden />
                {!compacta && <span className="truncate">{rotulo}</span>}
                {compacta && <span className="sr-only">{rotulo}</span>}
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 bg-topbar px-2 text-topbar-foreground print:hidden">
        <button
          type="button"
          aria-label="Alternar navegação"
          onClick={() => (window.matchMedia('(min-width: 768px)').matches ? alternarRecolhido() : setGaveta((v) => !v))}
          className="flex h-9 w-9 items-center justify-center rounded-sm hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
        <Link to="/" className="flex items-center gap-2 pr-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary">
            <BarChart3 className="size-4" />
          </span>
          <span className="hidden text-sm font-semibold sm:inline">SysAnalytics</span>
          <span className="hidden border-l border-white/30 pl-2 text-sm font-light text-white/80 lg:inline">CRM</span>
        </Link>

        <form onSubmit={pesquisar} role="search" className="mx-auto hidden w-full max-w-xl sm:block">
          <label className="relative block">
            <span className="sr-only">Pesquisar clientes</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/70" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar clientes por nome, CNPJ…"
              className="h-8 w-full rounded-sm border border-transparent bg-white/15 pl-8 pr-3 text-sm text-white placeholder:text-white/70 focus:border-white/40 focus:bg-white focus:text-foreground focus:placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <NotificationBell />
          <div className="hidden px-2 text-right leading-tight lg:block">
            <p className="text-sm font-semibold">{usuario?.nome}</p>
            <p className="text-[11px] text-white/70">
              {usuario?.empresaNome} · {usuario?.perfil}
            </p>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold ring-1 ring-white/40"
            title={usuario?.nome}
            aria-hidden
          >
            {usuario ? iniciais(usuario.nome) : ''}
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sair"
            aria-label="Sair"
            className="flex h-9 w-9 items-center justify-center rounded-sm hover:bg-white/10"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Navegação lateral (desktop) */}
        <aside
          className={cn(
            'sticky top-12 hidden h-[calc(100vh-3rem)] shrink-0 flex-col border-r bg-nav transition-[width] duration-150 print:hidden md:flex',
            recolhido ? 'w-12' : 'w-56',
          )}
        >
          {navegacao(recolhido)}
          {!recolhido && (
            <div className="m-3 rounded-sm border border-dashed bg-muted/60 p-2.5 text-[11px] leading-snug text-muted-foreground">
              <p className="font-semibold text-foreground">Ambiente piloto</p>
              Dados simulados até a integração com o ERP.
            </div>
          )}
        </aside>

        {/* Gaveta (mobile) */}
        {gaveta && (
          <div className="fixed inset-0 top-12 z-30 md:hidden print:hidden">
            <button type="button" aria-label="Fechar navegação" className="absolute inset-0 bg-black/40" onClick={() => setGaveta(false)} />
            <aside className="relative flex h-full w-64 flex-col bg-nav shadow-flutuante">
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setGaveta(false)}
                className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground hover:bg-nav-hover"
              >
                <X className="size-4" />
              </button>
              {navegacao(false)}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Trilha de navegação */}
          {atual && (
            <div className="flex h-9 items-center gap-1 border-b bg-card px-4 text-xs text-muted-foreground print:hidden md:px-6">
              {atual.grupo && (
                <>
                  <span>{atual.grupo}</span>
                  <ChevronRight className="size-3" aria-hidden />
                </>
              )}
              {emDetalhe ? (
                <>
                  <Link to={atual.item.to} className="hover:text-primary hover:underline">
                    {atual.item.rotulo}
                  </Link>
                  <ChevronRight className="size-3" aria-hidden />
                  <span className="font-semibold text-foreground">Detalhe</span>
                </>
              ) : (
                <span className="font-semibold text-foreground">{atual.item.rotulo}</span>
              )}
            </div>
          )}
          <main className="flex-1 px-4 py-5 md:px-6 print:p-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
