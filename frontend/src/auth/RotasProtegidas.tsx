import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Perfil } from '@/api/types'
import { useAuth } from './AuthContext'

/** Página inicial de cada perfil: o vendedor não tem acesso ao dashboard financeiro. */
export function paginaInicial(perfil: Perfil): string {
  return perfil === 'VENDEDOR' ? '/clientes' : '/dashboard'
}

/** Exige login; sem sessão, manda para /login lembrando o destino. */
export function RequerLogin() {
  const { usuario, carregando } = useAuth()
  const local = useLocation()
  if (carregando) return <p className="p-8 text-sm text-muted-foreground">Carregando…</p>
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  return <Outlet />
}

/** Exige um dos perfis informados; os demais são redirecionados à sua página inicial. */
export function RequerPerfil({ perfis }: { perfis: Perfil[] }) {
  const { usuario } = useAuth()
  if (!usuario) return null
  if (!perfis.includes(usuario.perfil)) return <Navigate to={paginaInicial(usuario.perfil)} replace />
  return <Outlet />
}
