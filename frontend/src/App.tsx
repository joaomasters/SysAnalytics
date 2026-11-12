import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { paginaInicial, RequerLogin, RequerPerfil } from '@/auth/RotasProtegidas'
import { AppLayout } from '@/components/layout/AppLayout'
import { AlertasPage } from '@/pages/AlertasPage'
import { ClienteDetalhePage } from '@/pages/ClienteDetalhePage'
import { ClientesPage } from '@/pages/ClientesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FunilPage } from '@/pages/FunilPage'
import { LoginPage } from '@/pages/LoginPage'
import { TarefasPage } from '@/pages/TarefasPage'

function Inicio() {
  const { usuario } = useAuth()
  return <Navigate to={usuario ? paginaInicial(usuario.perfil) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequerLogin />}>
        <Route element={<AppLayout />}>
          <Route index element={<Inicio />} />
          <Route element={<RequerPerfil perfis={['GESTOR', 'ADMIN']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/:id" element={<ClienteDetalhePage />} />
          <Route path="/funil" element={<FunilPage />} />
          <Route path="/tarefas" element={<TarefasPage />} />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="*" element={<Inicio />} />
        </Route>
      </Route>
    </Routes>
  )
}
