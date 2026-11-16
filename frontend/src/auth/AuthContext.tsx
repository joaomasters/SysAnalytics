import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, EVENTO_SESSAO_EXPIRADA, tokenStorage } from '@/api/client'
import type { LoginResposta, Perfil, Usuario } from '@/api/types'

interface AuthState {
  usuario: Usuario | null
  /** true enquanto valida o token guardado ao abrir o app */
  carregando: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
  /** Troca a própria senha; as demais sessões caem e esta recebe um token novo. */
  trocarSenha: (senhaAtual: string, novaSenha: string) => Promise<void>
  /** Aviso para a tela de login (ex.: sessão expirada). */
  aviso: string | null
  temPerfil: (...perfis: Perfil[]) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(() => tokenStorage.get() !== null)
  const [aviso, setAviso] = useState<string | null>(null)

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUsuario(null)
    qc.clear() // não deixar dados de uma empresa/usuário em cache para o próximo login
  }, [qc])

  // Restaura a sessão a partir do token guardado
  useEffect(() => {
    if (!tokenStorage.get()) return
    let ativo = true
    api
      .me()
      .then((u) => ativo && setUsuario(u))
      .catch(() => ativo && tokenStorage.clear())
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    const aoExpirar = () => {
      setAviso('Sua sessão expirou ou foi encerrada. Entre novamente.')
      logout()
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
  }, [logout])

  const login = useCallback(
    async (email: string, senha: string) => {
      const resposta = await api.login(email, senha)
      qc.clear()
      setAviso(null)
      tokenStorage.set(resposta.token)
      setUsuario(resposta.usuario)
    },
    [qc],
  )

  const trocarSenha = useCallback(async (senhaAtual: string, novaSenha: string) => {
    const resposta: LoginResposta = await api.trocarSenha(senhaAtual, novaSenha)
    tokenStorage.set(resposta.token)
    setUsuario(resposta.usuario)
  }, [])

  const valor = useMemo<AuthState>(
    () => ({
      usuario,
      carregando,
      login,
      logout,
      trocarSenha,
      aviso,
      temPerfil: (...perfis) => !!usuario && perfis.includes(usuario.perfil),
    }),
    [usuario, carregando, login, logout, trocarSenha, aviso],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
