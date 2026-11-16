import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { mensagemDeErro } from './api/client'
import { AuthProvider } from './auth/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/ui/toaster'
import { toast } from './lib/toast'
import './index.css'

const queryClient = new QueryClient({
  // Nenhuma ação do usuário falha em silêncio: se a tela não trata o erro por conta própria, vira um aviso.
  mutationCache: new MutationCache({
    onError: (erro, _variaveis, _contexto, mutation) => {
      if (mutation.options.onError || mutation.meta?.silencioso) return // a tela já mostra o erro
      if (axios.isAxiosError(erro) && erro.response?.status === 401) return // a sessão expirada já é tratada no login
      toast.erro(mensagemDeErro(erro))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
